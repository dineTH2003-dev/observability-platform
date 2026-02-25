const ServerModel = require("../models/host.model");
const ApiError = require("../utils/apiError");

exports.createServer = async (data) => {
  if (!data.hostname) {
    throw new ApiError(400, "Hostname is required");
  }

  if (!data.ip_address) {
    throw new ApiError(400, "IP address is required");
  }

  return await ServerModel.create(data);
};

exports.getServers = async () => {
  return await ServerModel.findAll();
};

exports.getServerById = async (id) => {
  const server = await ServerModel.findById(id);

  if (!server) {
    throw new ApiError(404, "Server not found");
  }

  return server;
};

exports.updateServer = async (id, data) => {
  const updated = await ServerModel.update(id, data);

  if (!updated) {
    throw new ApiError(404, "Server not found");
  }

  return updated;
};

exports.deleteServer = async (id) => {
  const server = await ServerModel.findById(id);

  if (!server) {
    throw new ApiError(404, "Server not found");
  }

  await ServerModel.remove(id);
};

exports.generateInstaller = async (id) => {
  const server = await ServerModel.findById(id);

  if (!server) {
    throw new Error("Server not found");
  }

  const backend = process.env.BACKEND_URL;

  return `#!/bin/bash
set -e

echo "Installing OneAgent..."

mkdir -p /opt/oneagent

cat <<EOF > /opt/oneagent/config.ini
[agent]
server_id=${id}
backend=${backend}
interval=30
EOF

curl -s -o /opt/oneagent/agent.py ${backend}/static/agent/agent.py
curl -s -o /opt/oneagent/discovery.py ${backend}/static/agent/discovery.py
curl -s -o /opt/oneagent/utils.py ${backend}/static/agent/utils.py

chmod +x /opt/oneagent/agent.py

cat <<EOF > /etc/systemd/system/oneagent.service
[Unit]
Description=OneAgent
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/oneagent/agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable oneagent
systemctl restart oneagent

echo "OneAgent installed successfully."
`;
};