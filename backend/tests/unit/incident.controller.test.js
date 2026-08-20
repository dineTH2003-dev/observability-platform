/**
 * Unit Tests — incident.controller.js
 *
 * The incident controller delegates to incidentService.
 * We mock the service so no real DB is needed.
 */

// ── Mock incidentService before importing the controller ──────────────────────
jest.mock('../../src/services/incident.service', () => ({
  getIncidents:               jest.fn(),
  getEngineers:               jest.fn(),
  getIncidentById:            jest.fn(),
  createIncidentFromAnomaly:  jest.fn(),
  assignEngineer:             jest.fn(),
  acknowledgeIncident:        jest.fn(),
  resolveIncident:            jest.fn(),
}));

const incidentService    = require('../../src/services/incident.service');
const incidentController = require('../../src/controllers/incident.controller');

// ── Helper ────────────────────────────────────────────────────────────────────
function makeReqRes({
  body   = {},
  params = {},
  user   = { id: 1, userId: 1, role: 'admin' },
} = {}) {
  const req = { body, params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — getIncidents()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns list of incidents', async () => {
    const { req, res } = makeReqRes();

    incidentService.getIncidents.mockResolvedValue([
      { id: 1, title: 'CPU Spike',    status: 'open'        },
      { id: 2, title: 'Memory Leak',  status: 'acknowledged' },
    ]);

    await incidentController.getIncidents(req, res);

    expect(incidentService.getIncidents).toHaveBeenCalledWith(req.user);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it('returns empty array when no incidents exist', async () => {
    const { req, res } = makeReqRes();

    incidentService.getIncidents.mockResolvedValue([]);

    await incidentController.getIncidents(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('returns 500 when the service throws', async () => {
    const { req, res } = makeReqRes();

    incidentService.getIncidents.mockRejectedValue(new Error('DB connection failed'));

    await incidentController.getIncidents(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB connection failed' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — getIncidentById()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns incident when found', async () => {
    const { req, res } = makeReqRes({ params: { id: '3' } });

    incidentService.getIncidentById.mockResolvedValue({
      id: 3, title: 'Disk Full', status: 'open',
    });

    await incidentController.getIncidentById(req, res);

    expect(incidentService.getIncidentById).toHaveBeenCalledWith('3');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 })
    );
  });

  it('returns 404 when incident does not exist', async () => {
    const { req, res } = makeReqRes({ params: { id: '999' } });

    const err = new Error('Incident not found');
    err.statusCode = 404;
    incidentService.getIncidentById.mockRejectedValue(err);

    await incidentController.getIncidentById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Incident not found' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — createIncident()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 201 on successful incident creation', async () => {
    const { req, res } = makeReqRes({
      body: { anomaly_id: 5, title: 'CPU Spike on Host A', severity: 'high' },
    });

    incidentService.createIncidentFromAnomaly.mockResolvedValue({
      id: 10, title: 'CPU Spike on Host A', status: 'open',
    });

    await incidentController.createIncident(req, res);

    expect(incidentService.createIncidentFromAnomaly).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10, status: 'open' })
    );
  });

  it('returns 500 if service throws on missing anomaly_id', async () => {
    const { req, res } = makeReqRes({ body: {} }); // empty body

    incidentService.createIncidentFromAnomaly.mockRejectedValue(
      new Error('anomaly_id is required')
    );

    await incidentController.createIncident(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'anomaly_id is required' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — assignEngineer()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns updated incident with engineer assigned', async () => {
    const { req, res } = makeReqRes({
      params: { id: '4' },
      body:   { engineerId: 2 },
    });

    incidentService.assignEngineer.mockResolvedValue({
      id: 4, assigned_to: 2, status: 'open',
    });

    await incidentController.assignEngineer(req, res);

    expect(incidentService.assignEngineer).toHaveBeenCalledWith('4', 2, 1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_to: 2 })
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — acknowledgeIncident()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns updated incident with acknowledged status', async () => {
    const { req, res } = makeReqRes({ params: { id: '6' } });

    incidentService.acknowledgeIncident.mockResolvedValue({
      id: 6, status: 'acknowledged',
    });

    await incidentController.acknowledgeIncident(req, res);

    expect(incidentService.acknowledgeIncident).toHaveBeenCalledWith('6', 1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'acknowledged' })
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — resolveIncident()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns updated incident with resolved status', async () => {
    const { req, res } = makeReqRes({ params: { id: '8' } });

    incidentService.resolveIncident.mockResolvedValue({
      id: 8, status: 'resolved', resolved_at: new Date().toISOString(),
    });

    await incidentController.resolveIncident(req, res);

    expect(incidentService.resolveIncident).toHaveBeenCalledWith('8', 1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'resolved' })
    );
  });

  it('returns 500 when resolve fails', async () => {
    const { req, res } = makeReqRes({ params: { id: '8' } });

    incidentService.resolveIncident.mockRejectedValue(new Error('Already resolved'));

    await incidentController.resolveIncident(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Already resolved' });
  });

});
