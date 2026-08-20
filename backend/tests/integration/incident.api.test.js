/**
 * API Integration Tests — /api/incidents
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/incident.service', () => ({
  getIncidents: jest.fn(),
  getEngineers: jest.fn(),
  getIncidentById: jest.fn(),
  createIncidentFromAnomaly: jest.fn(),
  assignEngineer: jest.fn(),
  acknowledgeIncident: jest.fn(),
  resolveIncident: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const incidentService = require('../../src/services/incident.service');
const db = require('../../src/config/db');

describe('API Integration — /api/incidents Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/incidents — requires authentication token', async () => {
    const res = await request(app).get('/api/incidents');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/incidents — returns incident list with valid Bearer token', async () => {
    incidentService.getIncidents.mockResolvedValue([{ id: 1, title: 'CPU Spike' }]);

    const res = await request(app)
      .get('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, title: 'CPU Spike' }]);
  });

  it('GET /api/incidents/engineers — returns on-call engineers list', async () => {
    incidentService.getEngineers.mockResolvedValue([{ id: 10, name: 'Alice' }]);

    const res = await request(app)
      .get('/api/incidents/engineers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 10, name: 'Alice' }]);
  });

  it('POST /api/incidents — creates incident from anomaly', async () => {
    incidentService.createIncidentFromAnomaly.mockResolvedValue({ id: 5, title: 'Memory Exhaustion' });

    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ anomaly_id: 12 });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Memory Exhaustion');
  });
});
