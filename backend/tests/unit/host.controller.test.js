/**
 * Unit Tests — host.controller.js
 */

jest.mock('../../src/services/host.service', () => ({
  createServer: jest.fn(),
  getServers: jest.fn(),
  getServerById: jest.fn(),
  updateServer: jest.fn(),
  deleteServer: jest.fn(),
  generateInstaller: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const ServerService = require('../../src/services/host.service');
const hostController = require('../../src/controllers/host.controller');

function makeReqRes(body = {}, params = {}) {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  return { req, res };
}

describe('Host Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create() creates a host and returns 201', async () => {
    const { req, res } = makeReqRes({ hostname: 'server1' });
    ServerService.createServer.mockResolvedValue({ id: 1, hostname: 'server1' });

    await hostController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, hostname: 'server1' } });
  });

  it('getAll() returns all servers', async () => {
    const { req, res } = makeReqRes();
    ServerService.getServers.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await hostController.getAll(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }, { id: 2 }] });
  });

  it('getById() returns single server', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ServerService.getServerById.mockResolvedValue({ id: 1, hostname: 'server1' });

    await hostController.getById(req, res);

    expect(ServerService.getServerById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, hostname: 'server1' } });
  });

  it('update() updates server', async () => {
    const { req, res } = makeReqRes({ hostname: 'updated-server' }, { id: '1' });
    ServerService.updateServer.mockResolvedValue({ id: 1, hostname: 'updated-server' });

    await hostController.update(req, res);

    expect(ServerService.updateServer).toHaveBeenCalledWith('1', { hostname: 'updated-server' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, hostname: 'updated-server' } });
  });

  it('remove() deletes server', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ServerService.deleteServer.mockResolvedValue();

    await hostController.remove(req, res);

    expect(ServerService.deleteServer).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Server deleted successfully' });
  });

  it('downloadInstaller() sets headers and sends script', async () => {
    const { req, res } = makeReqRes({}, { id: '42' });
    const mockScript = '#!/bin/bash\necho "Installing OneAgent"';
    ServerService.generateInstaller.mockResolvedValue(mockScript);

    await hostController.downloadInstaller(req, res);

    expect(ServerService.generateInstaller).toHaveBeenCalledWith('42');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/x-sh');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="install-oneagent-42.sh"');
    expect(res.send).toHaveBeenCalledWith(mockScript);
  });
});
