/**
 * Unit Tests — anomaly.controller.js
 *
 * The anomaly controller delegates to AnomalyService and emits
 * socket events. We mock both so nothing external is needed.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock('../../src/services/anomaly.service', () => ({
  getAnomalies:    jest.fn(),
  getAnomalyById:  jest.fn(),
  updateStatus:    jest.fn(),
  addFeedback:     jest.fn(),
}));

jest.mock('../../src/socket', () => ({
  broadcastAnomalyEvent: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () =>
  (fn) => fn   // unwrap the async handler so tests can call the function directly
);

const AnomalyService     = require('../../src/services/anomaly.service');
const { broadcastAnomalyEvent } = require('../../src/socket');
const anomalyController  = require('../../src/controllers/anomaly.controller');

// ── Helper ────────────────────────────────────────────────────────────────────
function makeReqRes({ body = {}, query = {}, params = {}, user = { id: 1, role: 'admin' } } = {}) {
  const req = { body, query, params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Anomaly Controller — getAll()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns success:true with a list of anomalies', async () => {
    const { req, res } = makeReqRes({ query: { status: 'open', limit: '20' } });

    AnomalyService.getAnomalies.mockResolvedValue([
      { anomaly_id: 1, severity: 'high',   metric_type: 'cpu',    status: 'open' },
      { anomaly_id: 2, severity: 'medium', metric_type: 'memory', status: 'open' },
    ]);

    await anomalyController.getAll(req, res);

    expect(AnomalyService.getAnomalies).toHaveBeenCalledWith(
      { status: 'open', severity: undefined, limit: '20' },
      req.user
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.any(Array) })
    );
  });

  it('returns success:true with empty array when no anomalies exist', async () => {
    const { req, res } = makeReqRes();

    AnomalyService.getAnomalies.mockResolvedValue([]);

    await anomalyController.getAll(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('passes severity filter to the service', async () => {
    const { req, res } = makeReqRes({ query: { severity: 'critical' } });

    AnomalyService.getAnomalies.mockResolvedValue([]);

    await anomalyController.getAll(req, res);

    expect(AnomalyService.getAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' }),
      req.user
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Anomaly Controller — getById()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns success:true with anomaly data when found', async () => {
    const { req, res } = makeReqRes({ params: { id: '5' } });

    AnomalyService.getAnomalyById.mockResolvedValue({
      anomaly_id: 5, severity: 'high', metric_type: 'cpu',
    });

    await anomalyController.getById(req, res);

    expect(AnomalyService.getAnomalyById).toHaveBeenCalledWith('5', req.user);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ anomaly_id: 5 }) })
    );
  });

  it('throws when anomaly id does not exist (service throws)', async () => {
    const { req, res } = makeReqRes({ params: { id: '999' } });

    const err = new Error('Anomaly not found');
    err.statusCode = 404;
    AnomalyService.getAnomalyById.mockRejectedValue(err);

    // Since asyncHandler is unwrapped, the error propagates — verify it rejects
    await expect(anomalyController.getById(req, res)).rejects.toThrow('Anomaly not found');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Anomaly Controller — updateStatus()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('updates status and broadcasts socket event', async () => {
    const { req, res } = makeReqRes({
      params: { id: '3' },
      body:   { status: 'resolved' },
    });

    AnomalyService.updateStatus.mockResolvedValue({
      anomaly_id:  3,
      status:      'resolved',
      resolved_at: new Date().toISOString(),
    });

    await anomalyController.updateStatus(req, res);

    expect(AnomalyService.updateStatus).toHaveBeenCalledWith('3', 'resolved', req.user);
    expect(broadcastAnomalyEvent).toHaveBeenCalledWith(
      'anomaly_updated',
      expect.objectContaining({ anomaly_id: 3, status: 'resolved' })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it('still returns 200 even if socket broadcast fails', async () => {
    const { req, res } = makeReqRes({
      params: { id: '3' },
      body:   { status: 'acknowledged' },
    });

    AnomalyService.updateStatus.mockResolvedValue({ anomaly_id: 3, status: 'acknowledged' });
    broadcastAnomalyEvent.mockImplementation(() => { throw new Error('Socket error'); });

    // Should NOT throw — the controller catches socket errors
    await anomalyController.updateStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Anomaly Controller — addFeedback()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with feedback data on success', async () => {
    const { req, res } = makeReqRes({
      params: { id: '7' },
      body:   { comment: 'False positive', is_true_positive: false },
    });

    AnomalyService.addFeedback.mockResolvedValue({
      feedback_id: 10, anomaly_id: 7, comment: 'False positive',
    });

    await anomalyController.addFeedback(req, res);

    expect(AnomalyService.addFeedback).toHaveBeenCalledWith('7', req.body, req.user);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ feedback_id: 10 }) })
    );
  });

  it('broadcasts socket event after feedback is added', async () => {
    const { req, res } = makeReqRes({
      params: { id: '7' },
      body:   { comment: 'True positive' },
    });

    AnomalyService.addFeedback.mockResolvedValue({ feedback_id: 11 });

    await anomalyController.addFeedback(req, res);

    expect(broadcastAnomalyEvent).toHaveBeenCalledWith(
      'anomaly_updated',
      expect.objectContaining({ anomaly_id: '7', action: 'feedback_added' })
    );
  });

});
