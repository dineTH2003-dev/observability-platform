/**
 * Unit Tests — dashboard.controller.js
 */

jest.mock('../../src/models/dashboard.model', () => ({
  getDashboardSummary: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const DashboardModel = require('../../src/models/dashboard.model');
const dashboardController = require('../../src/controllers/dashboard.controller');

describe('Dashboard Controller', () => {
  it('getDashboardSummary() returns dashboard metrics summary', async () => {
    const req = {};
    const res = { json: jest.fn() };
    const mockSummary = { servers_count: 5, anomalies_count: 2 };
    DashboardModel.getDashboardSummary.mockResolvedValue(mockSummary);

    await dashboardController.getDashboardSummary(req, res);

    expect(DashboardModel.getDashboardSummary).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockSummary });
  });
});
