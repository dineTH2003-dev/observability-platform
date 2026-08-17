import time
import requests
import random
from datetime import datetime, timezone

BASE_URL = "http://localhost:9000/api/agent"
# The database only contains active data for server_id = 5 (hostname: App_Server_1)
SERVER_ID = 5
SLEEP_INTERVAL = 30 # seconds

SERVICES = [
    {"name": "mysqld", "service_identifier": "mysql.service", "command": "/usr/sbin/mysqld", "process_id": 20587, "technology": "MySQL", "cpu_range": (0.1, 0.4), "mem_range": (13.2, 13.5)},
    {"name": "discovery-service", "service_identifier": "", "command": "java -jar discovery-service.jar", "process_id": 5756, "technology": "Java", "cpu_range": (0.0, 0.7), "mem_range": (9.8, 11.2)},
    {"name": "api-gateway", "service_identifier": "", "command": "java -jar api-gateway.jar", "process_id": 6202, "technology": "Java", "cpu_range": (0.0, 1.2), "mem_range": (8.6, 10.2)},
    {"name": "location-service", "service_identifier": "", "command": "java -jar location-service.jar", "process_id": 6296, "technology": "Java", "cpu_range": (0.0, 0.5), "mem_range": (11.1, 11.4)},
    {"name": "car-service", "service_identifier": "", "command": "java -jar car-service.jar", "process_id": 6419, "technology": "Java", "cpu_range": (0.0, 0.6), "mem_range": (11.6, 11.8)},
    {"name": "reservation-service", "service_identifier": "", "command": "java -jar reservation-service.jar", "process_id": 6553, "technology": "Java", "cpu_range": (0.0, 0.4), "mem_range": (11.3, 11.6)},
    {"name": "apache2", "service_identifier": "apache2.service", "command": "/usr/sbin/apache2", "process_id": 7376, "technology": "Apache", "cpu_range": (0.0, 0.1), "mem_range": (0.6, 0.7)}
]

def send_heartbeat():
    try:
        res = requests.post(f"{BASE_URL}/heartbeat", json={"server_id": SERVER_ID})
        print(f"Heartbeat: {res.status_code}")
    except Exception as e:
        print(f"Failed to send heartbeat: {e}")

def send_server_metrics(is_anomaly=False):
    # Accurate normal ranges from database analysis for App_Server_1
    cpu_usage = round(random.uniform(0.0, 1.5), 2)
    memory_usage = round(random.uniform(78.0, 82.0), 2)
    disk_usage = round(random.uniform(63.6, 65.4), 2)
    thread_count = random.randint(474, 506)
    
    if is_anomaly:
        print(">>> INJECTING SERVER ANOMALY <<<")
        # Spike CPU and Memory significantly outside normal behavior
        cpu_usage = round(random.uniform(90.0, 99.0), 2)
        memory_usage = round(random.uniform(92.0, 98.0), 2)
        thread_count = random.randint(800, 1000)

    payload = {
        "server_id": SERVER_ID,
        "cpu_usage": cpu_usage,
        "memory_usage": memory_usage,
        "disk_usage": disk_usage,
        "thread_count": thread_count
    }
    try:
        res = requests.post(f"{BASE_URL}/metrics", json=payload)
        print(f"Server Metrics (Anomaly={is_anomaly}): {res.status_code}")
    except Exception as e:
        print(f"Failed to send server metrics: {e}")

def send_service_metrics(is_anomaly=False):
    services_payload = []
    
    for svc in SERVICES:
        svc_cpu = round(random.uniform(*svc["cpu_range"]), 2)
        svc_mem = round(random.uniform(*svc["mem_range"]), 2)
        
        if is_anomaly and svc["name"] == "api-gateway":
            print(f">>> INJECTING SERVICE ANOMALY FOR {svc['name']} <<<")
            svc_cpu = round(random.uniform(85.0, 95.0), 2)
            svc_mem = round(random.uniform(80.0, 90.0), 2)
            
        services_payload.append({
            "name": svc["name"],
            "service_identifier": svc["service_identifier"],
            "command": svc["command"],
            "process_id": svc["process_id"],
            "technology": svc["technology"],
            "cpu_usage": svc_cpu,
            "memory_usage": svc_mem
        })
        
    payload = {
        "server_id": SERVER_ID,
        "services": services_payload
    }
    try:
        res = requests.post(f"{BASE_URL}/services", json=payload)
        print(f"Service Metrics: {res.status_code}")
    except Exception as e:
        print(f"Failed to send service metrics: {e}")

def send_logs(is_anomaly=False):
    logs_payload = []
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Generate realistic debug/info logs based on DB distribution
    if random.random() < 0.8: # Frequent api-gateway debug logs
        logs_payload.append({
            "service_id": 3, # api-gateway
            "timestamp": timestamp,
            "level": "debug",
            "message": "Processing routing configuration for incoming gateway request."
        })
        
    if random.random() < 0.1: # Occasional info logs for other services
        service_id = random.choice([4, 5, 6]) # location, car, reservation
        logs_payload.append({
            "service_id": service_id,
            "timestamp": timestamp,
            "level": "info",
            "message": "Health check ok - Service is operating nominally."
        })
        
    if is_anomaly:
        logs_payload.append({
            "service_id": 3, # api-gateway
            "timestamp": timestamp,
            "level": "error",
            "message": "java.lang.OutOfMemoryError: Java heap space"
        })
        logs_payload.append({
            "service_id": 1, # mysqld
            "timestamp": timestamp,
            "level": "warn",
            "message": "Too many connections."
        })
        
    if logs_payload:
        payload = {
            "server_id": SERVER_ID,
            "logs": logs_payload
        }
        try:
            res = requests.post(f"{BASE_URL}/logs", json=payload)
            print(f"Logs: {res.status_code} ({len(logs_payload)} messages)")
        except Exception as e:
            print(f"Failed to send logs: {e}")

def main():
    print("Starting Local Data Simulator (Mock Agent)...")
    print(f"Targeting Server ID: {SERVER_ID} (App_Server_1)")
    print(f"Sending metrics every {SLEEP_INTERVAL}s; triggering 1 anomaly every 1 minute (60s). Press Ctrl+C to stop.\n")
    
    cycle_count = 0
    while True:
        cycle_count += 1
        print(f"--- Cycle {cycle_count} ---")
        
        # Trigger 1 anomaly every 1 minute (every 2 cycles = 60 seconds)
        is_anomaly = (cycle_count % 2 == 0)
        
        send_heartbeat()
        send_server_metrics(is_anomaly=is_anomaly)
        send_service_metrics(is_anomaly=is_anomaly)
        send_logs(is_anomaly=is_anomaly)
        
        time.sleep(SLEEP_INTERVAL)

if __name__ == "__main__":
    main()
