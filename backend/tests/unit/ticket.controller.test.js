/**
 * Unit Tests — ticket.controller.js
 */

jest.mock('../../src/services/ticket.service', () => ({
  createTicket: jest.fn(),
  getTickets: jest.fn(),
}));

const ticketService = require('../../src/services/ticket.service');
const ApiError = require('../../src/utils/apiError');
const ticketController = require('../../src/controllers/ticket.controller');

function makeReqRes(user = { userId: 1 }, body = {}, query = {}) {
  const req = { user, body, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Ticket Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTicket()', () => {
    it('creates ticket and returns 201', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, { title: 'Ticket 1' });
      ticketService.createTicket.mockResolvedValue({ id: 10, title: 'Ticket 1', requester_id: 1 });

      await ticketController.createTicket(req, res);

      expect(ticketService.createTicket).toHaveBeenCalledWith({ title: 'Ticket 1', requester_id: 1 });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 10, title: 'Ticket 1', requester_id: 1 });
    });

    it('handles ApiError instance with custom status code', async () => {
      const { req, res } = makeReqRes();
      ticketService.createTicket.mockRejectedValue(new ApiError(400, 'Invalid title'));

      await ticketController.createTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid title' });
    });

    it('handles unexpected non-ApiError with 500', async () => {
      const { req, res } = makeReqRes();
      ticketService.createTicket.mockRejectedValue(new Error('DB failure'));

      await ticketController.createTicket(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error creating ticket' });
    });
  });

  describe('getTickets()', () => {
    it('returns tickets list', async () => {
      const { req, res } = makeReqRes({ userId: 1 }, {}, { status: 'open' });
      ticketService.getTickets.mockResolvedValue([{ id: 1, title: 'Ticket 1' }]);

      await ticketController.getTickets(req, res);

      expect(ticketService.getTickets).toHaveBeenCalledWith({ status: 'open' });
      expect(res.json).toHaveBeenCalledWith([{ id: 1, title: 'Ticket 1' }]);
    });

    it('handles ApiError instance', async () => {
      const { req, res } = makeReqRes();
      ticketService.getTickets.mockRejectedValue(new ApiError(403, 'Access denied'));

      await ticketController.getTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access denied' });
    });

    it('handles generic error with 500', async () => {
      const { req, res } = makeReqRes();
      ticketService.getTickets.mockRejectedValue(new Error('Fatal error'));

      await ticketController.getTickets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching tickets' });
    });
  });
});
