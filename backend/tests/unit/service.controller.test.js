/**
 * Unit Tests — service.controller.js
 */

jest.mock('../../src/services/service.service', () => ({
  getServices: jest.fn(),
  getServiceById: jest.fn(),
  updateApplication: jest.fn(),
  deleteService: jest.fn(),
  getLogConfig: jest.fn(),
  saveLogConfig: jest.fn(),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const ServiceService = require('../../src/services/service.service');
const serviceController = require('../../src/controllers/service.controller');

function makeReqRes(body = {}, params = {}) {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Service Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll() returns all services', async () => {
    const { req, res } = makeReqRes();
    ServiceService.getServices.mockResolvedValue([{ id: 1, name: 'auth-service' }]);

    await serviceController.getAll(req, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1, name: 'auth-service' }] });
  });

  it('getById() returns single service', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ServiceService.getServiceById.mockResolvedValue({ id: 1, name: 'auth-service' });

    await serviceController.getById(req, res);

    expect(ServiceService.getServiceById).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'auth-service' } });
  });

  describe('updateApplication()', () => {
    it('returns 400 if application_id is missing', async () => {
      const { req, res } = makeReqRes({}, { id: '1' });

      await serviceController.updateApplication(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'application_id is required' });
    });

    it('updates service application_id successfully', async () => {
      const { req, res } = makeReqRes({ application_id: 10 }, { id: '1' });
      ServiceService.updateApplication.mockResolvedValue({ id: 1, application_id: 10 });

      await serviceController.updateApplication(req, res);

      expect(ServiceService.updateApplication).toHaveBeenCalledWith('1', 10);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, application_id: 10 } });
    });
  });

  it('remove() deletes service', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    ServiceService.deleteService.mockResolvedValue();

    await serviceController.remove(req, res);

    expect(ServiceService.deleteService).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Service deleted successfully' });
  });

  it('getLogConfig() returns log configuration', async () => {
    const { req, res } = makeReqRes({}, { id: '1' });
    const mockConfig = { log_path: '/var/log/app.log', is_enabled: true };
    ServiceService.getLogConfig.mockResolvedValue(mockConfig);

    await serviceController.getLogConfig(req, res);

    expect(ServiceService.getLogConfig).toHaveBeenCalledWith('1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockConfig });
  });

  it('saveLogConfig() creates/updates log config and returns 201', async () => {
    const { req, res } = makeReqRes(
      { log_path: '/var/log/app.log', is_enabled: true },
      { id: '1' }
    );
    const mockSaved = { service_id: 1, log_path: '/var/log/app.log', is_enabled: true };
    ServiceService.saveLogConfig.mockResolvedValue(mockSaved);

    await serviceController.saveLogConfig(req, res);

    expect(ServiceService.saveLogConfig).toHaveBeenCalledWith('1', {
      log_path: '/var/log/app.log',
      is_enabled: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockSaved });
  });
});
