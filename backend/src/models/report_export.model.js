const db = require("../config/db");

/**
 * Insert a new report export record.
 * @param {object} params
 * @param {string} params.reportType  - e.g. "infrastructure"
 * @param {string} params.scope       - "Global" | "Server" | "Service"
 * @param {string|null} params.scopeId
 * @param {string} params.timeRange   - human-readable, e.g. "2026-08-01 to 2026-08-18"
 * @param {string} params.fileName    - e.g. "infrastructure-2026-08-18-103045.pdf"
 * @param {string} params.filePath    - absolute path on disk
 * @param {string} params.exportedBy  - UUID of the user
 * @returns {Promise<object>} The inserted row
 */
const createExportRecord = async ({
  reportType,
  scope,
  scopeId,
  timeRange,
  fileName,
  filePath,
  exportedBy,
}) => {
  const result = await db.query(
    `INSERT INTO report_exports
       (report_type, scope, scope_id, time_range, file_name, file_path, exported_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [reportType, scope, scopeId || null, timeRange, fileName, filePath, exportedBy]
  );
  return result.rows[0];
};

/**
 * Return all export records, newest first.
 * Joins users table to include the exporter's email.
 */
const getAllExports = async () => {
  const result = await db.query(
    `SELECT
       re.id,
       re.report_type,
       re.scope,
       re.scope_id,
       re.time_range,
       re.file_name,
       re.exported_by,
       u.email AS exported_by_email,
       re.created_at
     FROM report_exports re
     LEFT JOIN users u ON u.id = re.exported_by
     ORDER BY re.created_at DESC`
  );
  return result.rows;
};

/**
 * Find a single export record by its numeric ID.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
const getExportById = async (id) => {
  const result = await db.query(
    `SELECT * FROM report_exports WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  createExportRecord,
  getAllExports,
  getExportById,
};
