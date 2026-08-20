/**
 * Unit Tests — metric.controller.js
 *
 * The metric controller delegates to MetricModel.
 * We mock the model so no real DB is touched.
 */

// ── Mock MetricModel before importing the controller ──────────────────────────
jest.mock('../../src/models/metric.model', () => ({
  getAggregatedServerMetrics: jest.fn(),
  getServerMetrics:           jest.fn(),
  getServiceMetrics:          jest.fn(),
  getServerBaselines:         jest.fn(),
  getServiceBaselines:        jest.fn(),
}));

// asyncHandler is a thin wrapper — use the real one so controller logic runs
jest.mock('../../src/middlewares/asyncHandler', () =>
  (fn) => fn   // return the function as-is; tests call it directly
);

const MetricModel      = require('../../src/models/metric.model');
const metricController = require('../../src/controllers/metric.controller');

// ── Helper: build fake req / res ───────────────────────────────────────────────
function makeReqRes({ query = {}, params = {} } = {}) {
  const req = { query, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Metric Controller — getAggregatedServerMetrics()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns success:true with data array', async () => {
    const { req, res } = makeReqRes({ query: { limit: '10' } });

    MetricModel.getAggregatedServerMetrics.mockResolvedValue([
      { server_id: 1, avg_cpu: 55.2, avg_memory: 70.1 },
    ]);

    await metricController.getAggregatedServerMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.any(Array),
      })
    );
  });

  it('uses default limit of 20 when not supplied', async () => {
    const { req, res } = makeReqRes(); // no query params

    MetricModel.getAggregatedServerMetrics.mockResolvedValue([]);

    await metricController.getAggregatedServerMetrics(req, res);

    expect(MetricModel.getAggregatedServerMetrics).toHaveBeenCalledWith(20);
  });

  it('uses custom limit when limit query param is provided', async () => {
    const { req, res } = makeReqRes({ query: { limit: '5' } });

    MetricModel.getAggregatedServerMetrics.mockResolvedValue([]);

    await metricController.getAggregatedServerMetrics(req, res);

    expect(MetricModel.getAggregatedServerMetrics).toHaveBeenCalledWith(5);
  });

  it('returns empty data array when no metrics exist', async () => {
    const { req, res } = makeReqRes();

    MetricModel.getAggregatedServerMetrics.mockResolvedValue([]);

    await metricController.getAggregatedServerMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Metric Controller — getServerMetrics()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns metrics for the given server id', async () => {
    const { req, res } = makeReqRes({ params: { id: '42' } });

    MetricModel.getServerMetrics.mockResolvedValue([
      { id: 1, host_id: 42, cpu_usage: 66.3, timestamp: new Date() },
    ]);

    await metricController.getServerMetrics(req, res);

    expect(MetricModel.getServerMetrics).toHaveBeenCalledWith('42', 60);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.any(Array) })
    );
  });

  it('uses custom limit from query', async () => {
    const { req, res } = makeReqRes({ params: { id: '1' }, query: { limit: '10' } });

    MetricModel.getServerMetrics.mockResolvedValue([]);

    await metricController.getServerMetrics(req, res);

    expect(MetricModel.getServerMetrics).toHaveBeenCalledWith('1', 10);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Metric Controller — getServiceMetrics()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns metrics for the given service id', async () => {
    const { req, res } = makeReqRes({
      params: { id: '7' },
      query:  { timeRange: '6h', limit: '30' },
    });

    MetricModel.getServiceMetrics.mockResolvedValue([
      { id: 1, service_id: 7, response_time_ms: 120 },
    ]);

    await metricController.getServiceMetrics(req, res);

    expect(MetricModel.getServiceMetrics).toHaveBeenCalledWith('7', '6h', 30);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('defaults to timeRange 1h and limit 60 when not specified', async () => {
    const { req, res } = makeReqRes({ params: { id: '3' } });

    MetricModel.getServiceMetrics.mockResolvedValue([]);

    await metricController.getServiceMetrics(req, res);

    expect(MetricModel.getServiceMetrics).toHaveBeenCalledWith('3', '1h', 60);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Metric Controller — getServerBaselines()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns baselines for a server', async () => {
    const { req, res } = makeReqRes({ params: { id: '2' }, query: { minutes: '30' } });

    MetricModel.getServerBaselines.mockResolvedValue({ avg_cpu: 52.1, avg_memory: 68.0 });

    await metricController.getServerBaselines(req, res);

    expect(MetricModel.getServerBaselines).toHaveBeenCalledWith('2', 30);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('defaults to 60 minutes when not specified', async () => {
    const { req, res } = makeReqRes({ params: { id: '2' } });

    MetricModel.getServerBaselines.mockResolvedValue({});

    await metricController.getServerBaselines(req, res);

    expect(MetricModel.getServerBaselines).toHaveBeenCalledWith('2', 60);
  });

});
