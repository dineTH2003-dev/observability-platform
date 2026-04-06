const asyncHandler = require("../middlewares/asyncHandler");
const AgentService = require("../services/agent.service");

// POST /api/agent/heartbeat  { server_id }
exports.heartbeat = asyncHandler(async (req, res) => {
  const { server_id } = req.body;

  if (!server_id) {
    return res
      .status(400)
      .json({ success: false, message: "server_id is required" });
  }

  req.log("info", {
    msg: "Agent heartbeat",
    server_id,
  });

  const server = await AgentService.heartbeat(Number(server_id));

  return res.json({
    success: true,
    data: server,
  });
});

// POST /api/agent/metrics  { server_id, cpu_usage, memory_usage, disk_usage, thread_count }
exports.ingestMetrics = asyncHandler(async (req, res) => {
  const { server_id, cpu_usage, memory_usage, disk_usage, thread_count } =
    req.body;
  if (!server_id)
    return res
      .status(400)
      .json({ success: false, message: "server_id is required" });
  req.log("info", {
    msg: "Agent metrics",
    server_id,
    cpu_usage,
    memory_usage,
    disk_usage,
  });
  const result = await AgentService.ingestMetrics(Number(server_id), {
    cpu_usage,
    memory_usage,
    disk_usage,
    thread_count,
  });
  res.json({ success: true, data: result });
});

// POST /api/agent/services  { server_id, services: [{ name, service_identifier, command, process_id, technology, cpu_usage, memory_usage }] }
exports.ingestServices = asyncHandler(async (req, res) => {
  const { server_id, services } = req.body;
  if (!server_id)
    return res
      .status(400)
      .json({ success: false, message: "server_id is required" });
  if (!Array.isArray(services))
    return res
      .status(400)
      .json({ success: false, message: "services must be an array" });
  req.log("info", {
    msg: "Agent service discovery",
    server_id,
    count: services.length,
  });
  const result = await AgentService.ingestDiscoveredServices(
    Number(server_id),
    services,
  );
  res.json({ success: true, data: result });
});
