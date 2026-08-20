/**
 * Unit Tests — incident.controller.js (extending existing coverage)
 * Covers the previously uncovered functions:
 *   - getEngineers() (lines 14-20)
 *   - assignEngineer() error branch (line 53)
 *   - acknowledgeIncident() error branch (line 63)
 */

jest.mock('../../src/services/incident.service', () => ({
  getIncidents:              jest.fn(),
  getEngineers:              jest.fn(),
  getIncidentById:           jest.fn(),
  createIncidentFromAnomaly: jest.fn(),
  assignEngineer:            jest.fn(),
  acknowledgeIncident:       jest.fn(),
  resolveIncident:           jest.fn(),
}));

const incidentService    = require('../../src/services/incident.service');
const incidentController = require('../../src/controllers/incident.controller');

function makeReqRes({ body = {}, params = {}, user = { userId: 1, role: 'admin' } } = {}) {
  const req = { body, params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — getEngineers() [lines 14-20]', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns list of engineers', async () => {
    const { req, res } = makeReqRes();
    incidentService.getEngineers.mockResolvedValue([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);

    await incidentController.getEngineers(req, res);

    expect(incidentService.getEngineers).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  it('returns 500 when service throws', async () => {
    const { req, res } = makeReqRes();
    incidentService.getEngineers.mockRejectedValue(new Error('DB error'));

    await incidentController.getEngineers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB error' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — assignEngineer() error branch [line 53]', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns correct statusCode from error when assignEngineer throws with statusCode', async () => {
    const { req, res } = makeReqRes({ params: { id: '5' }, body: { engineerId: 99 } });

    const err = new Error('Engineer not found');
    err.statusCode = 404;
    incidentService.assignEngineer.mockRejectedValue(err);

    await incidentController.assignEngineer(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Engineer not found' });
  });

  it('returns 500 when assignEngineer throws without statusCode', async () => {
    const { req, res } = makeReqRes({ params: { id: '5' }, body: { engineerId: 99 } });

    incidentService.assignEngineer.mockRejectedValue(new Error('DB error'));

    await incidentController.assignEngineer(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Incident Controller — acknowledgeIncident() error branch [line 63]', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 500 when acknowledgeIncident throws', async () => {
    const { req, res } = makeReqRes({ params: { id: '7' } });

    incidentService.acknowledgeIncident.mockRejectedValue(new Error('Already acknowledged'));

    await incidentController.acknowledgeIncident(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Already acknowledged' });
  });

  it('uses statusCode from error when present', async () => {
    const { req, res } = makeReqRes({ params: { id: '7' } });

    const err = new Error('Not found');
    err.statusCode = 404;
    incidentService.acknowledgeIncident.mockRejectedValue(err);

    await incidentController.acknowledgeIncident(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

});
