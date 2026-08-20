/**
 * API Integration Tests — /api/agent & /api/metrics
 * Uses Supertest to verify agent ingestion & metrics API endpoints.
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/agent.service', () => ({
  heartbeat: jest.fn(),
  ingestMetrics: jest.fn(),
  ingestDiscoveredServices: jest.fn(),
  ingestLogs: jest.fn(),
}));

jest.mock('../../src/models/metric.model', () => ({
  getAggregatedServerMetrics: jest.fn(),
  getServerMetrics: jest.fn(),
  getServiceMetrics: jest.fn(),
  getServerBaselines: jest.fn(),
  getServiceBaselines: jest.fn(),
}));

jest.mock('../../src/socket', () => ({
  getIO: jest.fn().mockReturnValue({ emit: jest.fn(), to: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const agentService = require('../../src/services/agent.service');
const metricModel = require('../../src/models/metric.model');
const db = require('../../src/config/db');

describe('API Integration — Agent & Metrics Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  describe('POST /api/agent/heartbeat', () => {
    it('returns 400 when server_id is missing', async () => {
      const res = await request(app)
        .post('/api/agent/heartbeat')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('server_id is required');
    });

    it('returns 200 OK on valid heartbeat', async () => {
      agentService.heartbeat.mockResolvedValue({ id: 1, name: 'Web-01' });

      const res = await request(app)
        .post('/api/agent/heartbeat')
        .send({ server_id: '1' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });
  });

  describe('POST /api/agent/metrics', () => {
    it('returns 200 OK on successful metric ingestion', async () => {
      agentService.ingestMetrics.mockResolvedValue({
        metric: { id: 10, cpu_usage: 45.5 },
        server_status: 'online',
      });

      const res = await request(app)
        .post('/api/agent/metrics')
        .send({ server_id: 1, cpu_usage: 45.5, memory_usage: 60 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/metrics/servers', () => {
    it('returns 200 OK with server performance aggregations', async () => {
      metricModel.getAggregatedServerMetrics.mockResolvedValue([
        { server_id: 1, avg_cpu: 55.2 },
      ]);

      const res = await request(app)
        .get('/api/metrics/servers?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(metricModel.getAggregatedServerMetrics).toHaveBeenCalledWith(5);
    });
  });
});
