/**
 * Unit Tests — agent.controller.js
 */

jest.mock('../../src/services/agent.service', () => ({
  heartbeat: jest.fn(),
  ingestMetrics: jest.fn(),
  ingestDiscoveredServices: jest.fn(),
  ingestLogs: jest.fn(),
}));

jest.mock('../../src/socket', () => ({
  getIO: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const AgentService = require('../../src/services/agent.service');
const { getIO } = require('../../src/socket');
const agentController = require('../../src/controllers/agent.controller');

function makeReqRes(body = {}) {
  const req = {
    body,
    log: jest.fn(),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Agent Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('heartbeat()', () => {
    it('returns 400 if server_id is missing', async () => {
      const { req, res } = makeReqRes({});
      await agentController.heartbeat(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'server_id is required' });
    });

    it('calls AgentService.heartbeat and returns server data', async () => {
      const { req, res } = makeReqRes({ server_id: '1' });
      AgentService.heartbeat.mockResolvedValue({ id: 1, name: 'Server 1' });

      await agentController.heartbeat(req, res);

      expect(AgentService.heartbeat).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'Server 1' } });
    });
  });

  describe('ingestMetrics()', () => {
    it('returns 400 if server_id is missing', async () => {
      const { req, res } = makeReqRes({});
      await agentController.ingestMetrics(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('ingests metrics and emits socket event on success', async () => {
      const { req, res } = makeReqRes({
        server_id: 1,
        cpu_usage: 45.5,
        memory_usage: 60.0,
        disk_usage: 30.0,
        thread_count: 12,
      });

      const mockMetricResult = {
        metric: { id: 10, cpu_usage: 45.5 },
        server_status: 'online',
      };
      AgentService.ingestMetrics.mockResolvedValue(mockMetricResult);

      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      getIO.mockReturnValue({ emit: mockEmit, to: mockTo });

      await agentController.ingestMetrics(req, res);

      expect(AgentService.ingestMetrics).toHaveBeenCalledWith(1, {
        cpu_usage: 45.5,
        memory_usage: 60.0,
        disk_usage: 30.0,
        thread_count: 12,
      });
      expect(mockEmit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockMetricResult });
    });

    it('handles socket error gracefully without throwing', async () => {
      const { req, res } = makeReqRes({ server_id: 1, cpu_usage: 45.5 });
      AgentService.ingestMetrics.mockResolvedValue({ metric: {}, server_status: 'online' });
      getIO.mockImplementation(() => { throw new Error('Socket error'); });

      await agentController.ingestMetrics(req, res);

      expect(req.log).toHaveBeenCalledWith('error', expect.objectContaining({ msg: 'WebSocket emit failed' }));
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
    });
  });

  describe('ingestServices()', () => {
    it('returns 400 if server_id missing or services is not an array', async () => {
      const { req, res: res1 } = makeReqRes({});
      await agentController.ingestServices(req, res1);
      expect(res1.status).toHaveBeenCalledWith(400);

      const { req: req2, res: res2 } = makeReqRes({ server_id: 1, services: 'not-array' });
      await agentController.ingestServices(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('ingests services and emits live metrics via socket', async () => {
      const services = [{ name: 'api-service', service_identifier: 'api' }];
      const { req, res } = makeReqRes({ server_id: 1, services });

      const mockResult = {
        metrics: [{ service_id: 5, cpu_usage: 10 }],
      };
      AgentService.ingestDiscoveredServices.mockResolvedValue(mockResult);

      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      getIO.mockReturnValue({ emit: mockEmit, to: mockTo });

      await agentController.ingestServices(req, res);

      expect(AgentService.ingestDiscoveredServices).toHaveBeenCalledWith(1, services);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });

    it('handles socket error during service ingestion gracefully', async () => {
      const { req, res } = makeReqRes({ server_id: 1, services: [] });
      AgentService.ingestDiscoveredServices.mockResolvedValue({ metrics: [] });
      getIO.mockImplementation(() => { throw new Error('Socket fail'); });

      await agentController.ingestServices(req, res);

      expect(req.log).toHaveBeenCalledWith('error', expect.objectContaining({ msg: 'WebSocket emit failed for services' }));
      expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Object) });
    });
  });

  describe('ingestLogs()', () => {
    it('returns 400 if server_id is missing or logs is not an array', async () => {
      const { req, res: res1 } = makeReqRes({});
      await agentController.ingestLogs(req, res1);
      expect(res1.status).toHaveBeenCalledWith(400);

      const { req: req2, res: res2 } = makeReqRes({ server_id: 1, logs: 'invalid' });
      await agentController.ingestLogs(req2, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('ingests logs successfully and returns count', async () => {
      const logs = [{ level: 'info', message: 'Test log' }];
      const { req, res } = makeReqRes({ server_id: 1, logs });
      AgentService.ingestLogs.mockResolvedValue(1);

      await agentController.ingestLogs(req, res);

      expect(AgentService.ingestLogs).toHaveBeenCalledWith(1, logs);
      expect(res.json).toHaveBeenCalledWith({ success: true, count: 1 });
    });
  });
});
