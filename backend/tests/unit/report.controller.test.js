/**
 * Unit Tests — report.controller.js
 */

jest.mock('../../src/services/report.service', () => ({
  getReport: jest.fn(),
}));

jest.mock('../../src/utils/format', () => ({
  generateReportPDF: jest.fn(),
}));

jest.mock('../../src/models/report_export.model', () => ({
  createExportRecord: jest.fn(),
  getAllExports: jest.fn(),
  getExportById: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  error: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const reportService = require('../../src/services/report.service');
const { generateReportPDF } = require('../../src/utils/format');
const reportExportModel = require('../../src/models/report_export.model');
const reportController = require('../../src/controllers/report.controller');

function makeReqRes(query = {}, params = {}, user = { userId: 1 }) {
  const req = { query, params, user };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
    sendFile: jest.fn(),
  };
  return { req, res };
}

describe('Report Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getReport()', () => {
    it('returns report JSON array and count', async () => {
      const { req, res } = makeReqRes({ type: 'summary' });
      reportService.getReport.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await reportController.getReport(req, res);

      expect(reportService.getReport).toHaveBeenCalledWith({ type: 'summary' });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        data: [{ id: 1 }, { id: 2 }],
      });
    });

    it('returns 400 on service error', async () => {
      const { req, res } = makeReqRes();
      reportService.getReport.mockRejectedValue(new Error('Invalid type'));

      await reportController.getReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid type' });
    });
  });

  describe('downloadReportPDF()', () => {
    it('generates PDF buffer and streams response', async () => {
      const { req, res } = makeReqRes({ type: 'infrastructure', from: '2024-01-01', to: '2024-01-02', scopeId: '10' });
      const mockData = [{ metric: 'cpu', value: 80 }];
      const mockPdfBuffer = Buffer.from('PDF_CONTENT');

      reportService.getReport.mockResolvedValue(mockData);
      generateReportPDF.mockResolvedValue(mockPdfBuffer);
      reportExportModel.createExportRecord.mockResolvedValue({});

      await reportController.downloadReportPDF(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename=report.pdf');
      expect(res.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('returns 500 when PDF generation throws', async () => {
      const { req, res } = makeReqRes();
      reportService.getReport.mockRejectedValue(new Error('PDF error'));

      await reportController.downloadReportPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'PDF error' });
    });
  });

  describe('getExportHistory()', () => {
    it('returns export history records', async () => {
      const { req, res } = makeReqRes();
      const mockHistory = [{ id: 1, file_name: 'test.pdf' }];
      reportExportModel.getAllExports.mockResolvedValue(mockHistory);

      await reportController.getExportHistory(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: mockHistory,
      });
    });

    it('returns 500 when history fetch throws', async () => {
      const { req, res } = makeReqRes();
      reportExportModel.getAllExports.mockRejectedValue(new Error('DB error'));

      await reportController.getExportHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('downloadHistoricalReport()', () => {
    const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'reports');

    it('returns 400 for invalid non-numeric ID', async () => {
      const { req, res } = makeReqRes({}, { id: 'abc' });

      await reportController.downloadHistoricalReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid report ID' });
    });

    it('returns 404 if record is not found', async () => {
      const { req, res } = makeReqRes({}, { id: '999' });
      reportExportModel.getExportById.mockResolvedValue(null);

      await reportController.downloadHistoricalReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Export record not found' });
    });

    it('returns 403 for path traversal attempts outside upload dir', async () => {
      const invalidPath = path.join(__dirname, '..', '..', 'package.json');
      const { req, res } = makeReqRes({}, { id: '5' });
      reportExportModel.getExportById.mockResolvedValue({ id: 5, file_path: invalidPath });

      await reportController.downloadHistoricalReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied' });
    });

    it('returns 404 if file does not exist on disk', async () => {
      const fakeFilePath = path.join(uploadDir, 'report.pdf');

      const { req, res } = makeReqRes({}, { id: '5' });
      reportExportModel.getExportById.mockResolvedValue({
        id: 5,
        file_path: fakeFilePath,
      });
      fs.existsSync.mockReturnValue(false);

      await reportController.downloadHistoricalReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'The exported PDF no longer exists on the server',
      });
    });

    it('sends PDF file when record and file exist', async () => {
      const validFilePath = path.join(uploadDir, 'report.pdf');

      const { req, res } = makeReqRes({}, { id: '5' });
      reportExportModel.getExportById.mockResolvedValue({
        id: 5,
        file_path: validFilePath,
      });
      fs.existsSync.mockReturnValue(true);

      await reportController.downloadHistoricalReport(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.sendFile).toHaveBeenCalledWith(validFilePath);
    });

    it('returns 500 when downloadHistoricalReport throws', async () => {
      const { req, res } = makeReqRes({}, { id: '5' });
      reportExportModel.getExportById.mockRejectedValue(new Error('DB failure'));

      await reportController.downloadHistoricalReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
