/**
 * Unit Tests — log.controller.js
 */

jest.mock('../../src/services/log.service', () => ({
  getLogs: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const LogService = require('../../src/services/log.service');
const logController = require('../../src/controllers/log.controller');

describe('Log Controller', () => {
  it('getLogs() fetches logs with provided query params', async () => {
    const req = {
      query: { level: 'error', service: 'auth', host: 'web1', search: 'failed', limit: '50' },
    };
    const res = { json: jest.fn() };
    const mockLogs = [{ id: 1, message: 'failed' }];
    LogService.getLogs.mockResolvedValue(mockLogs);

    await logController.getLogs(req, res);

    expect(LogService.getLogs).toHaveBeenCalledWith({
      level: 'error',
      service: 'auth',
      host: 'web1',
      search: 'failed',
      limit: 50,
    });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockLogs });
  });

  it('getLogs() defaults limit to 100 when limit query param is omitted', async () => {
    const req = { query: {} };
    const res = { json: jest.fn() };
    LogService.getLogs.mockResolvedValue([]);

    await logController.getLogs(req, res);

    expect(LogService.getLogs).toHaveBeenCalledWith({
      level: undefined,
      service: undefined,
      host: undefined,
      search: undefined,
      limit: 100,
    });
  });
});
