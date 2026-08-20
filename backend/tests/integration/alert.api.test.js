/**
 * API Integration Tests — /api/alerts & /api/alert-settings
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/alert.service', () => ({
  getAllAlerts: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  toggleAlert: jest.fn(),
  deleteAlert: jest.fn(),
  getAlertSettings: jest.fn(),
  updateAlertSettings: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const alertService = require('../../src/services/alert.service');
const db = require('../../src/config/db');

describe('API Integration — /api/alerts Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/alerts — returns alert rules array', async () => {
    alertService.getAllAlerts.mockResolvedValue([{ id: 1, rule_name: 'CPU High' }]);

    const res = await request(app)
      .get('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, rule_name: 'CPU High' }]);
  });

  it('POST /api/alerts — creates alert rule', async () => {
    alertService.createAlert.mockResolvedValue({ id: 2, rule_name: 'Memory High' });

    const res = await request(app)
      .post('/api/alerts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ rule_name: 'Memory High', threshold: 85 });

    expect(res.statusCode).toBe(200);
    expect(res.body.rule_name).toBe('Memory High');
  });

  it('GET /api/alert-settings — retrieves alert configuration settings', async () => {
    alertService.getAlertSettings.mockResolvedValue({
      alert_events: { cpu: true },
      recipients: { email: 'admin@test.com' },
      email_channel_enabled: true,
      email_address: 'admin@test.com',
    });

    const res = await request(app)
      .get('/api/alert-settings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.emailAddress).toBe('admin@test.com');
  });
});
