/**
 * API Integration Tests — /api/tickets
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/ticket.service', () => ({
  createTicket: jest.fn(),
  getTickets: jest.fn(),
  getTicketById: jest.fn(),
  updateTicket: jest.fn(),
  deleteTicket: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const ticketService = require('../../src/services/ticket.service');
const db = require('../../src/config/db');

describe('API Integration — /api/tickets Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/tickets — returns tickets array', async () => {
    ticketService.getTickets.mockResolvedValue([{ id: 1, subject: 'Issue with agent' }]);

    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: 1, subject: 'Issue with agent' }]);
  });

  it('POST /api/tickets — creates new support ticket', async () => {
    ticketService.createTicket.mockResolvedValue({ id: 2, subject: 'Database high CPU' });

    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ subject: 'Database high CPU', description: 'CPU at 99%' });

    expect(res.statusCode).toBe(201);
    expect(res.body.subject).toBe('Database high CPU');
  });
});
