"""
utils.py - OneAgent shared utilities
Config loading and API client used by agent.py and discovery.py.
"""

import configparser, logging, sys
from pathlib import Path
import requests

CONFIG_PATH = Path("/opt/oneagent/config.ini")

def get_logger(name):
    log = logging.getLogger(name)
    if log.handlers:
        return log
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.addHandler(sh)
    try:
        fh = logging.FileHandler("/var/log/oneagent.log", mode="a")
        fh.setFormatter(fmt)
        log.addHandler(fh)
    except PermissionError:
        pass
    return log

def load_config():
    if not CONFIG_PATH.exists():
        get_logger("utils").error("Config not found: %s", CONFIG_PATH)
        sys.exit(1)
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH)
    return cfg

class ApiClient:
    def __init__(self, backend, server_id, timeout=10):
        self.backend = backend.rstrip("/")
        self.server_id = server_id
        self.timeout = timeout
        self._s = requests.Session()
        self._s.headers.update({"Content-Type": "application/json"})

    def _post(self, path, body):
        url = f"{self.backend}{path}"
        try:
            r = self._s.post(url, json=body, timeout=self.timeout)
            r.raise_for_status()
            return True
        except requests.ConnectionError:
            get_logger("api").warning("Cannot reach %s", url)
        except requests.Timeout:
            get_logger("api").warning("Timeout: %s", url)
        except requests.HTTPError as e:
            get_logger("api").error("HTTP %s from %s", e.response.status_code, url)
        except Exception as e:
            get_logger("api").error("Error posting to %s: %s", url, e)
        return False

    def heartbeat(self):
        return self._post("/api/agent/heartbeat", {"server_id": self.server_id})

    def send_metrics(self, cpu, memory, disk, threads):
        return self._post(
            "/api/agent/metrics",
            {
                "server_id": self.server_id,
                "cpu_usage": cpu,
                "memory_usage": memory,
                "disk_usage": disk,
                "thread_count": threads,
            },
        )

    def send_services(self, services):
        return self._post(
            "/api/agent/services",
            {
                "server_id": self.server_id,
                "services": services,
            },
        )
