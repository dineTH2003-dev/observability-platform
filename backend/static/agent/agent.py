#!/usr/bin/env python3
"""
agent.py - Nebula Monitor OneAgent
Runs as a systemd service on managed Linux/Ubuntu servers.

Every heartbeat_interval  (default 60s):  POST /api/agent/heartbeat
Every metrics_interval    (default 30s):  POST /api/agent/metrics
Every discovery_interval  (default 120s): POST /api/agent/services
Every log_interval        (default 5s):   POST /api/agent/logs

Install deps: pip3 install psutil requests
Config: /opt/oneagent/config.ini
"""

import sys
import time
import os
import re
from datetime import datetime
import psutil
from utils import load_config, ApiClient, get_logger
from discovery import collect_services

log = get_logger("agent")

# Common log levels regex
LEVEL_PATTERN = re.compile(r'\b(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL|FATAL)\b', re.IGNORECASE)

# ISO 8601 / YYYY-MM-DD HH:MM:SS timestamp regex
ISO_TS_PATTERN = re.compile(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)')


def parse_log_line(line):
    line = line.strip()
    if not line:
        return None

    # 1. Extract level
    level_match = LEVEL_PATTERN.search(line)
    if level_match:
        level = level_match.group(1).upper()
        if level == "WARN":
            level = "WARNING"
    else:
        level = "INFO"

    # 2. Extract timestamp
    ts_match = ISO_TS_PATTERN.search(line)
    if ts_match:
        timestamp = ts_match.group(1)
    else:
        timestamp = datetime.utcnow().isoformat() + "Z"

    return {
        "timestamp": timestamp,
        "level": level,
        "message": line
    }


class LogMonitor:
    def __init__(self):
        # Maps log_path -> { "service_id": int, "offset": int }
        self.active_paths = {}
        log.info("LogMonitor initialized")

    def update_configs(self, log_configs):
        """
        log_configs is a list of dicts:
        [ { "service_id": 1, "service_name": "foo", "log_path": "/path/to/log" } ]
        """
        new_paths = {}
        for cfg in log_configs:
            path = cfg.get("log_path")
            service_id = cfg.get("service_id")
            if not path or not service_id:
                continue
            
            # Normalize path
            path = os.path.abspath(path)
            new_paths[path] = service_id

        # Remove paths that are no longer active
        removed = set(self.active_paths.keys()) - set(new_paths.keys())
        for path in removed:
            log.info("Stopping log monitoring for path: %s", path)
            del self.active_paths[path]

        # Add new paths
        for path, service_id in new_paths.items():
            if path not in self.active_paths:
                log.info("Starting log monitoring for path: %s (service_id: %d)", path, service_id)
                offset = 0
                if os.path.exists(path):
                    try:
                        # Start tailing from the end of the file
                        offset = os.path.getsize(path)
                    except Exception as e:
                        log.warning("Failed to get size for %s: %s", path, e)
                self.active_paths[path] = {
                    "service_id": service_id,
                    "offset": offset
                }
            else:
                self.active_paths[path]["service_id"] = service_id

    def collect_new_logs(self):
        entries = []
        for path, info in list(self.active_paths.items()):
            if not os.path.exists(path):
                continue

            try:
                file_size = os.path.getsize(path)
                current_offset = info["offset"]

                # Handle log rotation / truncation
                if file_size < current_offset:
                    log.info("Log file %s was truncated or rotated. Resetting offset to 0.", path)
                    current_offset = 0

                if file_size == current_offset:
                    continue

                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    f.seek(current_offset)
                    lines = f.readlines()
                    info["offset"] = f.tell()

                for line in lines:
                    parsed = parse_log_line(line)
                    if parsed:
                        parsed["service_id"] = info["service_id"]
                        entries.append(parsed)

            except Exception as e:
                log.warning("Error reading log file %s: %s", path, e)

        return entries


def collect_server_metrics():
    cpu = psutil.cpu_percent(interval=1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    threads = sum(
        p.num_threads()
        for p in psutil.process_iter(["num_threads"])
        if p.info.get("num_threads") is not None
    )
    return {
        "cpu": round(cpu, 2),
        "memory": round(mem.percent, 2),
        "disk": round(disk.percent, 2),
        "threads": threads,
    }


def main():
    cfg = load_config()
    backend = cfg.get("agent", "backend")
    server_id = cfg.getint("agent", "server_id")
    metrics_interval = cfg.getint("agent", "interval", fallback=30)
    heartbeat_interval = cfg.getint("agent", "heartbeat_interval", fallback=60)
    discovery_interval = cfg.getint("agent", "discovery_interval", fallback=120)
    log_interval = 5  # Check logs every 5 seconds

    client = ApiClient(backend, server_id)
    log_monitor = LogMonitor()

    log.info(
        "OneAgent started  server_id=%d  backend=%s  metrics=%ds  heartbeat=%ds  discovery=%ds",
        server_id,
        backend,
        metrics_interval,
        heartbeat_interval,
        discovery_interval,
    )

    last_heartbeat = 0.0
    last_metrics = 0.0
    last_discovery = 0.0
    last_logs = 0.0

    while True:
        now = time.monotonic()

        # Heartbeat
        if now - last_heartbeat >= heartbeat_interval or last_heartbeat == 0.0:
            res = client.heartbeat()
            if res and res.get("success"):
                last_heartbeat = now
                log_configs = res.get("data", {}).get("log_configs", [])
                log_monitor.update_configs(log_configs)
                if last_heartbeat == now:
                    log.info("Heartbeat OK - active log configs: %d", len(log_configs))
            else:
                log.warning("Heartbeat failed")
                # Retry heartbeat after 10s instead of waiting a full interval
                last_heartbeat = now - heartbeat_interval + 10

        # Server metrics
        if now - last_metrics >= metrics_interval:
            m = collect_server_metrics()
            if client.send_metrics(m["cpu"], m["memory"], m["disk"], m["threads"]):
                log.info(
                    "Metrics sent  CPU=%.1f%%  MEM=%.1f%%  DISK=%.1f%%",
                    m["cpu"],
                    m["memory"],
                    m["disk"],
                )
                last_metrics = now
            else:
                log.warning("Metrics send failed")
                last_metrics = now - metrics_interval + 10

        # Service discovery
        if now - last_discovery >= discovery_interval:
            services = collect_services()
            if client.send_services(services):
                log.info("Discovery sent  %d services", len(services))
                last_discovery = now
            else:
                log.warning("Discovery send failed")
                last_discovery = now - discovery_interval + 10

        # Log monitoring
        if now - last_logs >= log_interval:
            new_logs = log_monitor.collect_new_logs()
            if new_logs:
                if client.send_logs(new_logs):
                    log.info("Sent %d log entries to backend", len(new_logs))
                else:
                    log.warning("Failed to send %d log entries", len(new_logs))
            last_logs = now

        time.sleep(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Agent stopped")
        sys.exit(0)
    except Exception as exc:
        log.critical("Agent crashed: %s", exc, exc_info=True)
        sys.exit(1)
