"""
discovery.py - OneAgent service discovery
============================================
Two-track discovery:

  Track 1 - System services (allowlist):
    Process name matches a key in SYSTEM_SERVICES (nginx, postgres, redis …).

  Track 2 - Microservices (runtime detection):
    Runtime process (python3, java, node …) that is bound to a network port
    AND has a meaningful name extractable from the cmdline.

Health tracking: the backend uses (server_id, name) as the stable identity.
PID changes on restart are handled by the backend upsert automatically.
"""

import re
import subprocess
import time
from pathlib import Path

import psutil
from utils import get_logger

log = get_logger("discovery")

# Track 1: System services
SYSTEM_SERVICES = {
    "nginx": "Nginx",
    "apache2": "Apache",
    "httpd": "Apache",
    "mysqld": "MySQL",
    "postgres": "PostgreSQL",
    "redis": "Redis",
    "mongod": "MongoDB",
    "kafka": "Kafka",
    "zookeeper": "Zookeeper",
    "elasticsearch": "Elasticsearch",
    "rabbitmq": "RabbitMQ",
    "memcached": "Memcached",
    "haproxy": "HAProxy",
    "caddy": "Caddy",
    "prometheus": "Prometheus",
    "grafana": "Grafana",
}

# Track 2: Runtime process names
RUNTIME_NAMES = {
    "python": "Python",
    "python3": "Python",
    "python3.9": "Python",
    "python3.10": "Python",
    "python3.11": "Python",
    "python3.12": "Python",
    "node": "Node.js",
    "nodejs": "Node.js",
    "java": "Java",
    "ruby": "Ruby",
    "php": "PHP",
    "php-fpm": "PHP",
    "dotnet": ".NET",
}

# Version/build qualifiers that appear in jar filenames after the service name.
# e.g. discovery-service-0.0.1-SNAPSHOT.jar  =>  stop at 0.0.1 and SNAPSHOT
VERSION_QUALIFIERS = {"SNAPSHOT", "RELEASE", "FINAL", "GA", "BETA", "ALPHA", "RC"}

# Cmdline fragments that indicate a tooling/install process, not a service.
NOISE_CMDLINE_FRAGMENTS = {
    "pip",
    "pip3",
    "pip install",
    "apt",
    "apt-get",
    "yum",
    "dnf",
    "npm install",
    "npm ci",
    "yarn install",
    "webpack",
    "babel",
    "tsc",
    "pytest",
    "unittest",
    "coverage",
    "setup.py",
    "collectstatic",
    "migrate",
    "ansible",
    "fabric",
    "/usr/bin/",
    "/usr/lib/",
    "/usr/share/",
    "site-packages/supervisor",
}

# Script/file stems that are too generic to be a meaningful service name.
GENERIC_STEMS = {
    "main",
    "app",
    "run",
    "server",
    "start",
    "index",
    "manage",
    "wsgi",
    "asgi",
    "worker",
}

MIN_UPTIME_SECS = 30


# Port helper
def get_listening_ports(pid):
    """Return list of TCP ports the process is actively listening on."""
    ports = []
    try:
        for conn in psutil.Process(pid).net_connections(kind="inet"):
            if conn.status == "LISTEN" and conn.laddr:
                ports.append(conn.laddr.port)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        pass
    return list(set(ports))


# Service name extractors
def _best_name_from_path(path_str):
    """
    Extract a service name from a file path.
    Prefers the parent directory name over the file stem.
      /app/user-service/main.py   => user-service
      /app/order-service.jar      => order-service
    """
    if not path_str or path_str.startswith("-"):
        return None
    path = Path(path_str)
    parent = path.parent.name
    if parent and parent not in (
        ".",
        "..",
        "app",
        "src",
        "bin",
        "dist",
        "build",
        "scripts",
        "usr",
        "",
    ):
        return parent.replace("_", "-")
    stem = path.stem
    if stem and stem not in GENERIC_STEMS:
        return stem.replace("_", "-")
    return None


def extract_service_name_java(cmdline):
    """
    Extract the real service name from a Java cmdline.

    -jar strategy:
        1. Find the -jar argument directly — no regex, no ambiguity.
        2. Take the filename stem (strips .jar).
            e.g. discovery-service-0.0.1-SNAPSHOT.jar => discovery-service-0.0.1-SNAPSHOT
        3. Split on "-" and collect parts until we hit a digit or a VERSION_QUALIFIER.
            "discovery" => keep
            "service"   => keep
            "0"         => starts with digit => stop
            result      => discovery-service

    This correctly handles:
        discovery-service-0.0.1-SNAPSHOT.jar  => discovery-service
        order-service-2.3.1-SNAPSHOT.jar      => order-service
        payment-gateway-1.0.0-RELEASE.jar     => payment-gateway
        myapp.jar                             => myapp
    """
    for i, arg in enumerate(cmdline):
        if arg == "-jar" and i + 1 < len(cmdline):
            jar_path = cmdline[i + 1]
            stem = Path(jar_path).stem  # strip .jar extension
            parts = stem.split("-")
            name_parts = []
            for part in parts:
                if not part:
                    continue
                # Stop at a version number (starts with digit) or a build qualifier
                if part[0].isdigit() or part.upper() in VERSION_QUALIFIERS:
                    break
                name_parts.append(part)
            if name_parts:
                return "-".join(name_parts)

    # No -jar found — try to extract from the main class name
    # e.g. com.mycompany.UserService => user-service
    for arg in reversed(cmdline):
        if "." in arg and not arg.startswith("-") and not arg.endswith(".jar"):
            class_name = arg.split(".")[-1]
            if class_name and class_name[0].isupper():
                return re.sub(r"(?<!^)(?=[A-Z])", "-", class_name).lower()

    return None


def extract_service_name_python(cmdline):
    """
    python3 /app/user-service/main.py            => user-service
    python3 -m uvicorn order_service.main:app    => order-service
    gunicorn payment.wsgi:application            => payment
    python3 manage.py runserver                  => None (noise)
    """
    cmd_str = " ".join(cmdline).lower()
    for fragment in NOISE_CMDLINE_FRAGMENTS:
        if fragment in cmd_str:
            return None

    # -m module invocation
    if "-m" in cmdline:
        try:
            m_idx = cmdline.index("-m")
            module = cmdline[m_idx + 1] if m_idx + 1 < len(cmdline) else None
            if module in ("uvicorn", "gunicorn", "hypercorn", "daphne", "flask"):
                app_arg = cmdline[m_idx + 2] if m_idx + 2 < len(cmdline) else None
                if app_arg:
                    return app_arg.split(".")[0].replace("_", "-")
            elif module:
                top = module.split(".")[0]
                if top not in GENERIC_STEMS:
                    return top.replace("_", "-")
        except (ValueError, IndexError):
            pass

    # gunicorn/uvicorn app arg: "myapp.wsgi:application"
    for arg in cmdline:
        if ":" in arg and "." in arg.split(":")[0] and not arg.startswith("-"):
            top = arg.split(".")[0]
            if top not in GENERIC_STEMS:
                return top.replace("_", "-")

    # Script file path
    for arg in cmdline:
        if arg.endswith(".py"):
            name = _best_name_from_path(arg)
            if name:
                return name

    return None


def extract_service_name_node(cmdline):
    """
    node /app/payment-service/index.js  => payment-service
    """
    cmd_str = " ".join(cmdline).lower()
    for fragment in NOISE_CMDLINE_FRAGMENTS:
        if fragment in cmd_str:
            return None
    for arg in cmdline:
        if arg.endswith(".js") and not arg.startswith("-"):
            name = _best_name_from_path(arg)
            if name:
                return name
    return None


def extract_service_name(proc_name, cmdline, runtime_tech):
    name = proc_name.lower()
    if "python" in name:
        return extract_service_name_python(cmdline)
    if name in ("node", "nodejs"):
        return extract_service_name_node(cmdline)
    if name == "java":
        return extract_service_name_java(cmdline)
    # Ruby, PHP, .NET — generic path fallback
    for arg in cmdline:
        if "/" in arg and not arg.startswith("-"):
            n = _best_name_from_path(arg)
            if n:
                return n
    return None


# Systemd unit lookup
def get_systemd_unit(pid):
    """
    Return the systemd unit name for a PID (e.g. 'discovery-service.service').
    Returns None if:
        - The process is not managed by systemd (launched directly, in a container, etc.)
        - systemctl is unavailable
    A None value is correct and expected for microservices launched directly
    via java -jar, python3 script.py, node index.js etc.
    """
    try:
        r = subprocess.run(
            ["systemctl", "status", str(pid)],
            capture_output=True,
            text=True,
            timeout=3,
        )
        for line in r.stdout.splitlines():
            for token in line.split():
                if token.endswith(".service"):
                    return token
    except Exception:
        pass
    return None


# Main
def collect_services():
    """
    Scan all running processes and return service descriptors for:
        Track 1: system services (nginx, postgres, redis …)
        Track 2: microservices (port-bound runtime processes with extractable names)

    Multiple instances of the same service name are merged (cpu/mem summed,
    lowest PID kept as the master process reference).
    """
    now = time.time()
    grouped = {}

    for proc in psutil.process_iter(
        [
            "pid",
            "name",
            "status",
            "cmdline",
            "cpu_percent",
            "memory_percent",
            "create_time",
            "ppid",
        ]
    ):
        try:
            info = proc.info
            pname = info.get("name") or ""

            if not pname:
                continue
            if info.get("ppid") in (0, 2):  # kernel thread
                continue
            create_time = info.get("create_time") or 0
            if (now - create_time) < MIN_UPTIME_SECS:  # too new / transient
                continue

            cpu = round(info.get("cpu_percent") or 0.0, 2)
            mem = round(info.get("memory_percent") or 0.0, 2)
            pname_lower = pname.lower()

            service_name = None
            technology = None

            # Track 1: System service
            for key, tech in SYSTEM_SERVICES.items():
                if key in pname_lower:
                    service_name = pname
                    technology = tech
                    break

            # Track 2: Microservice
            if service_name is None:
                runtime_tech = RUNTIME_NAMES.get(pname_lower) or RUNTIME_NAMES.get(
                    pname
                )
                if runtime_tech:
                    cmdline = info.get("cmdline") or []

                    # Port binding check - confirms this is a running service,
                    # not a one-off script, migration, pip install, test etc.
                    if not get_listening_ports(info["pid"]):
                        continue

                    extracted = extract_service_name(pname_lower, cmdline, runtime_tech)
                    if not extracted:
                        continue

                    service_name = extracted
                    technology = runtime_tech

            if service_name is None:
                continue

            # Track 3: Merge or create
            if service_name in grouped:
                grouped[service_name]["cpu_usage"] = round(
                    grouped[service_name]["cpu_usage"] + cpu, 2
                )
                grouped[service_name]["memory_usage"] = round(
                    grouped[service_name]["memory_usage"] + mem, 2
                )
                # Keep the lowest PID (master / parent process)
                if info["pid"] < grouped[service_name]["process_id"]:
                    grouped[service_name]["process_id"] = info["pid"]
            else:
                cmdline_str = " ".join(info.get("cmdline") or [])
                is_running = proc.is_running() and proc.status() not in (
                    psutil.STATUS_ZOMBIE,
                    psutil.STATUS_DEAD,
                )
                grouped[service_name] = {
                    "name": service_name,
                    "status": "RUNNING" if is_running else "STOPPED",
                    # service_identifier is the systemd unit name if the process is
                    # managed by systemd. NULL is correct for directly-launched
                    # microservices (java -jar, python3 script.py, node index.js).
                    "service_identifier": get_systemd_unit(info["pid"]),
                    "command": cmdline_str[:500],
                    "process_id": info["pid"],
                    "technology": technology,
                    "cpu_usage": cpu,
                    "memory_usage": mem,
                }

        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue

    services = list(grouped.values())
    system_count = sum(
        1 for s in services if s["technology"] in set(SYSTEM_SERVICES.values())
    )
    micro_count = len(services) - system_count
    log.info(
        "Discovery: %d services (%d system, %d microservices)",
        len(services),
        system_count,
        micro_count,
    )
    return services
