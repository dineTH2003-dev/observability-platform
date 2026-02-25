const asyncHandler = require("../middlewares/asyncHandler");
const ServerService = require("../services/host.service");


exports.create = asyncHandler(async (req, res) => {
  const server = await ServerService.createServer(req.body);

  res.status(201).json({
    success: true,
    data: server,
  });
});

exports.getAll = asyncHandler(async (req, res) => {
  const servers = await ServerService.getServers();

  res.json({
    success: true,
    data: servers,
  });
});

exports.getById = asyncHandler(async (req, res) => {
  const server = await ServerService.getServerById(req.params.id);

  res.json({
    success: true,
    data: server,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const updated = await ServerService.updateServer(req.params.id, req.body);

  res.json({
    success: true,
    data: updated,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  await ServerService.deleteServer(req.params.id);

  res.json({
    success: true,
    message: "Server deleted successfully",
  });
});

exports.downloadInstaller = asyncHandler(async (req, res) => {
  const serverId = req.params.id;

  const script = await ServerService.generateInstaller(serverId);

  res.setHeader("Content-Type", "application/x-sh");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="install-oneagent-${serverId}.sh"`
  );

  res.send(script);
});