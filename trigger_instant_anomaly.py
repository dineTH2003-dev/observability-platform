import requests

BASE_URL = "http://localhost:9000/api/agent"
SERVER_ID = 5

print(">>> TRIGGERING INSTANT METRIC SPIKE (CPU=98.5%, Memory=95.0%) <<<")

payload = {
    "server_id": SERVER_ID,
    "cpu_usage": 98.5,
    "memory_usage": 95.0,
    "disk_usage": 70.0,
    "thread_count": 950
}

try:
    res = requests.post(f"{BASE_URL}/metrics", json=payload)
    print(f"Metrics response: {res.status_code} - {res.json()}")
except Exception as e:
    print(f"Error: {e}")
