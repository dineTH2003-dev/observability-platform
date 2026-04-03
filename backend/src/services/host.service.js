// src/services/host.service.js
const ServerModel = require("../models/host.model");
const ApiError = require("../utils/apiError");

exports.createServer = async (data) => {
  if (!data.hostname) throw new ApiError(400, "Hostname is required");
  if (!data.ip_address) throw new ApiError(400, "IP address is required");
  return await ServerModel.create(data);
};

exports.getServers = async () => {
  return await ServerModel.findAll();
};

exports.getServerById = async (id) => {
  const server = await ServerModel.findById(id);
  if (!server) throw new ApiError(404, "Server not found");
  return server;
};

exports.updateServer = async (id, data) => {
  const updated = await ServerModel.update(id, data);
  if (!updated) throw new ApiError(404, "Server not found");
  return updated;
};

exports.deleteServer = async (id) => {
  const server = await ServerModel.findById(id);
  if (!server) throw new ApiError(404, "Server not found");
  await ServerModel.remove(id);
};

exports.generateInstaller = async (id) => {
  const server = await ServerModel.findById(id);
  if (!server) throw new ApiError(404, "Server not found");

  const backend = process.env.BACKEND_URL;
  if (!backend)
    throw new ApiError(500, "BACKEND_URL is not set in environment");

  return `#!/bin/bash
# =============================================================================
#  OneAgent Installer — Nebula Monitor
#  Server   : ${server.hostname} (ID: ${id})
#  Backend  : ${backend}
#  Target   : Ubuntu / Debian (AWS EC2 or any Linux host)
# =============================================================================
set -euo pipefail

SERVER_ID="${id}"
BACKEND_URL="${backend}"
INSTALL_DIR="/opt/oneagent"
SERVICE_FILE="/etc/systemd/system/oneagent.service"
LOG_FILE="/var/log/oneagent.log"

echo "========================================"
echo " Nebula Monitor OneAgent Installer"
echo " Server ID : $SERVER_ID"
echo " Backend   : $BACKEND_URL"
echo "========================================"

# 1. Must run as root
if [[ $EUID -ne 0 ]]; then
  echo "[ERROR] Run as root: sudo ./install-oneagent-${server.hostname}.sh"
  exit 1
fi

# 2. Install system dependencies
echo "[INFO] Updating package list..."
apt-get update -qq

echo "[INFO] Installing python3 and pip..."
apt-get install -y python3 python3-pip curl > /dev/null

# 3. Install Python packages
echo "[INFO] Installing psutil and requests..."
pip3 install --quiet psutil requests

python3 -c "import psutil, requests" || {
  echo "[ERROR] Python dependency install failed."
  exit 1
}
echo "[INFO] Python dependencies OK"

# 4. Create install directory and log file
mkdir -p "$INSTALL_DIR"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# 5. Write config.ini
cat > "$INSTALL_DIR/config.ini" << EOF
[agent]
server_id          = $SERVER_ID
backend            = $BACKEND_URL
interval           = 30
heartbeat_interval = 60
discovery_interval = 120
EOF
echo "[INFO] Config written to $INSTALL_DIR/config.ini"

# 6. Check backend is reachable before downloading
echo "[INFO] Checking backend connectivity..."
if ! curl -sf "$BACKEND_URL/" > /dev/null; then
  echo "[ERROR] Cannot reach backend at $BACKEND_URL"
  echo "        Ensure the backend is running and accessible from this server."
  exit 1
fi
echo "[INFO] Backend reachable"

# 7. Download Python agent files from backend
echo "[INFO] Downloading agent files..."
curl -sf -o "$INSTALL_DIR/agent.py"     "$BACKEND_URL/static/agent/agent.py"     || { echo "[ERROR] Failed to download agent.py";     exit 1; }
curl -sf -o "$INSTALL_DIR/discovery.py" "$BACKEND_URL/static/agent/discovery.py" || { echo "[ERROR] Failed to download discovery.py"; exit 1; }
curl -sf -o "$INSTALL_DIR/utils.py"     "$BACKEND_URL/static/agent/utils.py"     || { echo "[ERROR] Failed to download utils.py";     exit 1; }
echo "[INFO] Agent files downloaded to $INSTALL_DIR"

# 8. Create systemd service
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Nebula Monitor OneAgent (server_id=$SERVER_ID)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/python3 $INSTALL_DIR/agent.py
Restart=on-failure
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# 9. Enable and start
systemctl daemon-reload
systemctl enable oneagent
systemctl restart oneagent

# 10. Verify startup

sleep 3
if systemctl is-active --quiet oneagent; then
  echo ""
  echo "[OK] oneagent.service is running"
  echo ""
  echo "Useful commands:"
  echo "  Status : systemctl status oneagent"
  echo "  Logs   : tail -f $LOG_FILE"
  echo "  Stop   : systemctl stop oneagent"
  echo "  Restart: systemctl restart oneagent"
  echo ""
  echo "OneAgent installed successfully."
else
  echo ""
  echo "[WARN] oneagent.service did not start cleanly. Check logs:"
  echo "  journalctl -u oneagent -n 50"
  echo "  tail -50 $LOG_FILE"
  exit 1
fi
`;
};
