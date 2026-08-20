/**
 * Unit Tests — ml.controller.js
 */

jest.mock('../../src/services/anomaly.service', () => ({
  createFromMlDetection: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const AnomalyService = require('../../src/services/anomaly.service');
const mlController = require('../../src/controllers/ml.controller');

function makeReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('ML Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createAnomaly()', () => {
    it('returns 201 when new anomaly is created (duplicate = false)', async () => {
      const { req, res } = makeReqRes({ metric: 'cpu', value: 95 });
      const mockResult = { id: 10, duplicate: false };
      AnomalyService.createFromMlDetection.mockResolvedValue(mockResult);

      await mlController.createAnomaly(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });

    it('returns 200 when anomaly detection is a duplicate (duplicate = true)', async () => {
      const { req, res } = makeReqRes({ metric: 'cpu', value: 95 });
      const mockResult = { id: 10, duplicate: true };
      AnomalyService.createFromMlDetection.mockResolvedValue(mockResult);

      await mlController.createAnomaly(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });
  });

  describe('health()', () => {
    it('returns health check status ok', async () => {
      const req = {};
      const res = { json: jest.fn() };

      await mlController.health(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'ok',
          service: 'ml-ingestion',
        },
      });
    });
  });
});
