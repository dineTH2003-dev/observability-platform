/**
 * Unit Tests — application.controller.js
 */

jest.mock('../../src/services/application.service', () => ({
  createApplication: jest.fn(),
  getApplications: jest.fn(),
  getApplicationById: jest.fn(),
  updateApplication: jest.fn(),
  deleteApplication: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const ApplicationService = require('../../src/services/application.service');
const appController = require('../../src/controllers/application.controller');

function makeReqRes(body = {}, params = {}) {
  const req = { body, params, log: jest.fn() };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Application Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('create() creates application and returns 201', async () => {
    const { req, res } = makeReqRes({ name: 'Web App' });
    ApplicationService.createApplication.mockResolvedValue({ id: 1, name: 'Web App' });

    await appController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'Web App' } });
  });

  it('getAll() returns all applications', async () => {
    const { req, res } = makeReqRes();
    ApplicationService.getApplications.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await appController.getAll(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }, { id: 2 }] });
  });

  it('getById() returns single application', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ApplicationService.getApplicationById.mockResolvedValue({ id: 1, name: 'Web App' });

    await appController.getById(req, res);

    expect(ApplicationService.getApplicationById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'Web App' } });
  });

  it('update() updates application', async () => {
    const { req, res } = makeReqRes({ name: 'Updated App' }, { id: '1' });
    ApplicationService.updateApplication.mockResolvedValue({ id: 1, name: 'Updated App' });

    await appController.update(req, res);

    expect(ApplicationService.updateApplication).toHaveBeenCalledWith('1', { name: 'Updated App' });
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'Updated App' } });
  });

  it('remove() deletes application', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ApplicationService.deleteApplication.mockResolvedValue();

    await appController.remove(req, res);

    expect(ApplicationService.deleteApplication).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Application deleted successfully' });
  });
});
