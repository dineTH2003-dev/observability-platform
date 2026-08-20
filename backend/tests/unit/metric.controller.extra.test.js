/**
 * Unit Tests — metric.controller.js (extending existing coverage)
 * Covers getServiceBaselines() (lines 39-42).
 */

jest.mock('../../src/models/metric.model', () => ({
  getAggregatedServerMetrics: jest.fn(),
  getServerMetrics:           jest.fn(),
  getServiceMetrics:          jest.fn(),
  getServerBaselines:         jest.fn(),
  getServiceBaselines:        jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const MetricModel      = require('../../src/models/metric.model');
const metricController = require('../../src/controllers/metric.controller');

function makeReqRes({ query = {}, params = {} } = {}) {
  const req = { query, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

describe('Metric Controller — getServiceBaselines() [lines 39-42]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns service baselines with default minutes=60 when not specified', async () => {
    const { req, res } = makeReqRes({ params: { id: '10' } });

    MetricModel.getServiceBaselines.mockResolvedValue({ avg_cpu: 12.5, avg_memory: 45.0 });

    await metricController.getServiceBaselines(req, res);

    expect(MetricModel.getServiceBaselines).toHaveBeenCalledWith('10', 60);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { avg_cpu: 12.5, avg_memory: 45.0 },
    });
  });

  it('returns service baselines with custom minutes from query', async () => {
    const { req, res } = makeReqRes({ params: { id: '10' }, query: { minutes: '15' } });

    MetricModel.getServiceBaselines.mockResolvedValue({ avg_cpu: 10.0 });

    await metricController.getServiceBaselines(req, res);

    expect(MetricModel.getServiceBaselines).toHaveBeenCalledWith('10', 15);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { avg_cpu: 10.0 },
    });
  });
});
