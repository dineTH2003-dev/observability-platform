/**
 * API Integration Tests — /api/anomalies
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/anomaly.service', () => ({
  getAnomalies: jest.fn(),
  getAnomalyById: jest.fn(),
  createAnomaly: jest.fn(),
  updateStatus: jest.fn(),
  addFeedback: jest.fn(),
}));

jest.mock('../../src/socket', () => ({
  getIO: jest.fn().mockReturnValue({ emit: jest.fn(), to: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
  broadcastAnomalyEvent: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const anomalyService = require('../../src/services/anomaly.service');
const db = require('../../src/config/db');

describe('API Integration — /api/anomalies Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/anomalies — fetches anomalies list with filter queries', async () => {
    anomalyService.getAnomalies.mockResolvedValue([{ id: 1, severity: 'HIGH' }]);

    const res = await request(app)
      .get('/api/anomalies?severity=HIGH')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 1, severity: 'HIGH' }]);
  });

  it('PATCH /api/anomalies/:id/status — updates status and returns updated record', async () => {
    anomalyService.updateStatus.mockResolvedValue({ id: 1, status: 'resolved' });

    const res = await request(app)
      .patch('/api/anomalies/1/status')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'resolved' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('resolved');
  });

  it('POST /api/anomalies/:id/feedback — submits operator feedback', async () => {
    anomalyService.addFeedback.mockResolvedValue({ id: 1, feedback: 'true_positive' });

    const res = await request(app)
      .post('/api/anomalies/1/feedback')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ feedback: 'true_positive' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feedback).toBe('true_positive');
  });
});
