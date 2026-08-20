/**
 * Unit Tests — src/middlewares/errorHandler.js & notFound.js
 */

const errorHandler = require('../../src/middlewares/errorHandler');
const notFound = require('../../src/middlewares/notFound');

describe('Middlewares — errorHandler & notFound', () => {
  describe('notFound middleware', () => {
    it('calls next with an ApiError 404', () => {
      const req = { method: 'GET', originalUrl: '/api/unknown' };
      const res = {};
      const next = jest.fn();

      notFound(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route not found: GET /api/unknown',
        })
      );
    });
  });

  describe('errorHandler middleware', () => {
    it('uses err.statusCode and err.message when provided', () => {
      const err = new Error('Custom validation error');
      err.statusCode = 422;

      const req = { requestId: 'req-123', method: 'GET', originalUrl: '/test' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Custom validation error',
          requestId: 'req-123',
        })
      );
    });

    it('defaults to status 500 and generic message when unhandled error occurs', () => {
      const err = new Error();
      const req = { requestId: 'req-456' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal Server Error',
        })
      );
    });
  });
});
