#!/usr/bin/env python3
"""
agent.py - Nebula Monitor OneAgent
Runs as a systemd service on managed Linux/Ubuntu servers.

Every heartbeat_interval  (default 60s):  POST /api/agent/heartbeat
Every metrics_interval    (default 30s):  POST /api/agent/metrics
Every discovery_interval  (default 120s): POST /api/agent/services

Install deps: pip3 install psutil requests
Config: /opt/oneagent/config.ini
"""

import sys, time
import psutil
from utils import load_config, ApiClient, get_logger
from discovery import collect_services

log = get_logger("agent")


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

    client = ApiClient(backend, server_id)

    log.info(
        "OneAgent started  server_id=%d  backend=%s  metrics=%ds  heartbeat=%ds  discovery=%ds",
        server_id,
        backend,
        metrics_interval,
        heartbeat_interval,
        discovery_interval,
    )

    if client.heartbeat():
        log.info("Startup heartbeat OK - agent_status = ACTIVE")
    else:
        log.warning("Startup heartbeat failed")

    last_heartbeat = time.monotonic()
    last_discovery = 0.0

    while True:
        now = time.monotonic()

        # Heartbeat
        if now - last_heartbeat >= heartbeat_interval:
            if client.heartbeat():
                last_heartbeat = now
            else:
                log.warning("Heartbeat failed")

        # Server metrics
        m = collect_server_metrics()
        if client.send_metrics(m["cpu"], m["memory"], m["disk"], m["threads"]):
            log.info(
                "Metrics sent  CPU=%.1f%%  MEM=%.1f%%  DISK=%.1f%%",
                m["cpu"],
                m["memory"],
                m["disk"],
            )
        else:
            log.warning("Metrics send failed")

        # Service discovery
        if now - last_discovery >= discovery_interval:
            services = collect_services()
            if client.send_services(services):
                log.info("Discovery sent  %d services", len(services))
            else:
                log.warning("Discovery send failed")
            last_discovery = now

        time.sleep(metrics_interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Agent stopped")
        sys.exit(0)
    except Exception as exc:
        log.critical("Agent crashed: %s", exc, exc_info=True)
        sys.exit(1)
