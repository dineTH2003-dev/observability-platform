/**
 * Unit Tests — alert.controller.js
 */

jest.mock('../../src/services/alert.service', () => ({
  getAllAlerts: jest.fn(),
  createAlert: jest.fn(),
  updateAlert: jest.fn(),
  toggleAlert: jest.fn(),
  deleteAlert: jest.fn(),
  getAlertSettings: jest.fn(),
  updateAlertSettings: jest.fn(),
}));

const alertService = require('../../src/services/alert.service');
const alertController = require('../../src/controllers/alert.controller');

function makeReqRes(body = {}, params = {}) {
  const req = { body, params };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
}

describe('Alert Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAllAlerts()', () => {
    it('returns all alerts successfully', async () => {
      const { req, res } = makeReqRes();
      alertService.getAllAlerts.mockResolvedValue([{ id: 1, rule_name: 'CPU High' }]);

      await alertController.getAllAlerts(req, res);

      expect(res.json).toHaveBeenCalledWith([{ id: 1, rule_name: 'CPU High' }]);
    });

    it('handles 500 errors', async () => {
      const { req, res } = makeReqRes();
      alertService.getAllAlerts.mockRejectedValue(new Error('DB failure'));

      await alertController.getAllAlerts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'DB failure' });
    });
  });

  describe('createAlert()', () => {
    it('creates an alert successfully', async () => {
      const { req, res } = makeReqRes({ rule_name: 'Memory Alert' });
      alertService.createAlert.mockResolvedValue({ id: 2, rule_name: 'Memory Alert' });

      await alertController.createAlert(req, res);

      expect(res.json).toHaveBeenCalledWith({ id: 2, rule_name: 'Memory Alert' });
    });

    it('handles 500 errors during creation', async () => {
      const { req, res } = makeReqRes({});
      alertService.createAlert.mockRejectedValue(new Error('Validation error'));

      await alertController.createAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('toggleAlert()', () => {
    it('performs full update when rest params exist', async () => {
      const { req, res } = makeReqRes({ enabled: true, threshold: 90 }, { id: '5' });
      alertService.updateAlert.mockResolvedValue({ id: 5, enabled: true, threshold: 90 });

      await alertController.toggleAlert(req, res);

      expect(alertService.updateAlert).toHaveBeenCalledWith('5', { enabled: true, threshold: 90 });
      expect(res.json).toHaveBeenCalledWith({ id: 5, enabled: true, threshold: 90 });
    });

    it('performs toggle-only when only enabled property is sent', async () => {
      const { req, res } = makeReqRes({ enabled: false }, { id: '5' });
      alertService.toggleAlert.mockResolvedValue({ id: 5, enabled: false });

      await alertController.toggleAlert(req, res);

      expect(alertService.toggleAlert).toHaveBeenCalledWith('5', false);
      expect(res.json).toHaveBeenCalledWith({ id: 5, enabled: false });
    });

    it('returns 404 if alert rule is not found', async () => {
      const { req, res } = makeReqRes({ enabled: true }, { id: '999' });
      alertService.toggleAlert.mockResolvedValue(null);

      await alertController.toggleAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Alert rule not found' });
    });

    it('handles 500 errors', async () => {
      const { req, res } = makeReqRes({ enabled: true }, { id: '5' });
      alertService.toggleAlert.mockRejectedValue(new Error('Error updating'));

      await alertController.toggleAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteAlert()', () => {
    it('deletes an alert rule successfully', async () => {
      const { req, res } = makeReqRes({}, { id: '3' });
      alertService.deleteAlert.mockResolvedValue();

      await alertController.deleteAlert(req, res);

      expect(alertService.deleteAlert).toHaveBeenCalledWith('3');
      expect(res.json).toHaveBeenCalledWith({ message: 'Deleted' });
    });

    it('handles 500 errors', async () => {
      const { req, res } = makeReqRes({}, { id: '3' });
      alertService.deleteAlert.mockRejectedValue(new Error('Delete error'));

      await alertController.deleteAlert(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getAlertSettings()', () => {
    it('returns default object when no settings row exists', async () => {
      const { req, res } = makeReqRes();
      alertService.getAlertSettings.mockResolvedValue(null);

      await alertController.getAlertSettings(req, res);

      expect(res.json).toHaveBeenCalledWith({
        alertEvents: {},
        recipients: {},
        emailChannelEnabled: false,
        emailAddress: '',
      });
    });

    it('returns formatted settings when row exists', async () => {
      const { req, res } = makeReqRes();
      alertService.getAlertSettings.mockResolvedValue({
        alert_events: { cpu: true },
        recipients: { email: 'admin@test.com' },
        email_channel_enabled: true,
        email_address: 'admin@test.com',
      });

      await alertController.getAlertSettings(req, res);

      expect(res.json).toHaveBeenCalledWith({
        alertEvents: { cpu: true },
        recipients: { email: 'admin@test.com' },
        emailChannelEnabled: true,
        emailAddress: 'admin@test.com',
      });
    });

    it('handles 500 errors', async () => {
      const { req, res } = makeReqRes();
      alertService.getAlertSettings.mockRejectedValue(new Error('Settings fetch failed'));

      await alertController.getAlertSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateAlertSettings()', () => {
    it('updates alert settings successfully', async () => {
      const { req, res } = makeReqRes({ emailAddress: 'new@test.com' });
      alertService.updateAlertSettings.mockResolvedValue({
        alert_events: { memory: true },
        recipients: { email: 'new@test.com' },
        email_channel_enabled: true,
        email_address: 'new@test.com',
      });

      await alertController.updateAlertSettings(req, res);

      expect(res.json).toHaveBeenCalledWith({
        alertEvents: { memory: true },
        recipients: { email: 'new@test.com' },
        emailChannelEnabled: true,
        emailAddress: 'new@test.com',
      });
    });

    it('handles 500 errors', async () => {
      const { req, res } = makeReqRes({});
      alertService.updateAlertSettings.mockRejectedValue(new Error('Update settings error'));

      await alertController.updateAlertSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
