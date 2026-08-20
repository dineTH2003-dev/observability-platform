/**
 * API Integration Tests — /api/reports
 */

const request = require('supertest');
const app = require('../../src/app');
const { generateTestToken } = require('./helpers/testAuthHelper');

jest.mock('../../src/services/report.service', () => ({
  getReport: jest.fn(),
}));

jest.mock('../../src/utils/format', () => ({
  generateReportPDF: jest.fn(),
}));

jest.mock('../../src/models/report_export.model', () => ({
  createExportRecord: jest.fn().mockResolvedValue({ id: 1 }),
  getAllExports: jest.fn(),
  getExportById: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

const reportService = require('../../src/services/report.service');
const { generateReportPDF } = require('../../src/utils/format');
const reportExportModel = require('../../src/models/report_export.model');
const db = require('../../src/config/db');

describe('API Integration — /api/reports Endpoints', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateTestToken({ userId: 1, role: 'admin' });
    db.query.mockResolvedValue({ rows: [{ id: 1, email: 'admin@test.com', role: 'admin', is_active: true }] });
  });

  it('GET /api/reports — returns analytical summary JSON', async () => {
    reportService.getReport.mockResolvedValue([{ total_incidents: 10 }]);

    const res = await request(app)
      .get('/api/reports?type=summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(res.body.data).toEqual([{ total_incidents: 10 }]);
  });

  it('GET /api/reports/download — generates and streams PDF attachment', async () => {
    const mockPDFBuffer = Buffer.from('%PDF-1.4 Mock PDF Content');
    reportService.getReport.mockResolvedValue({ total_incidents: 5 });
    generateReportPDF.mockResolvedValue(mockPDFBuffer);

    const res = await request(app)
      .get('/api/reports/download?type=summary')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment; filename=report.pdf');
  });

  it('GET /api/reports/history — returns export history list', async () => {
    reportExportModel.getAllExports.mockResolvedValue([{ id: 1, file_name: 'report.pdf' }]);

    const res = await request(app)
      .get('/api/reports/history')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});
