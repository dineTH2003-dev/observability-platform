/**
 * API Integration Tests — /api/hosts
 * Tests host management and installer download API routes.
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/host.service', () => ({
  createServer: jest.fn(),
  getServers: jest.fn(),
  getServerById: jest.fn(),
  updateServer: jest.fn(),
  deleteServer: jest.fn(),
  generateInstaller: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const hostService = require('../../src/services/host.service');
const db = require('../../src/config/db');

describe('API Integration — /api/hosts Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/hosts — returns 200 OK with server list', async () => {
    hostService.getServers.mockResolvedValue([{ id: 1, hostname: 'server-01' }]);

    const res = await request(app)
      .get('/api/hosts')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /api/hosts — returns 201 Created', async () => {
    hostService.createServer.mockResolvedValue({ id: 2, hostname: 'server-02' });

    const res = await request(app)
      .post('/api/hosts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ hostname: 'server-02' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.hostname).toBe('server-02');
  });

  it('GET /api/hosts/:id/download-installer — sets attachment headers and streams shell script', async () => {
    const mockScript = '#!/bin/bash\necho "OneAgent Installer"';
    hostService.generateInstaller.mockResolvedValue(mockScript);

    const res = await request(app)
      .get('/api/hosts/42/download-installer')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/x-sh');
    expect(res.headers['content-disposition']).toContain('attachment; filename="install-oneagent-42.sh"');
    expect(res.text).toBe(mockScript);
  });
});
