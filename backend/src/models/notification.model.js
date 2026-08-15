const db = require('../config/db');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────
//  CREATE — insert a single notification row
// ─────────────────────────────────────────────────────────────
//  CREATE — insert a single notification row
// ─────────────────────────────────────────────────────────────
exports.create = async (data) => {
  const {
    recipient_user_id,
    sender_user_id = null,
    incident_id = null,
    anomaly_id = null,
    title,
    message,
    notification_type,
    is_read = false,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO notifications
       (recipient_user_id, sender_user_id, incident_id, anomaly_id, title, message, notification_type, is_read)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [recipient_user_id, sender_user_id, incident_id, anomaly_id, title, message, notification_type, is_read]
  );
  return rows[0];
};

// ─────────────────────────────────────────────────────────────
//  BULK CREATE — insert many rows in one round-trip
// ─────────────────────────────────────────────────────────────
exports.createMany = async (notifications) => {
  if (!notifications.length) return [];

  const values = [];
  const params = [];
  let idx = 1;

  for (const n of notifications) {
    values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
    params.push(
      n.recipient_user_id,
      n.sender_user_id || null,
      n.incident_id || null,
      n.anomaly_id || null,
      n.title,
      n.message,
      n.notification_type,
      n.is_read || false
    );
    idx += 8;
  }

  const { rows } = await db.query(
    `INSERT INTO notifications
       (recipient_user_id, sender_user_id, incident_id, anomaly_id, title, message, notification_type, is_read)
     VALUES ${values.join(',')}
     RETURNING *`,
    params
  );
  return rows;
};

// ─────────────────────────────────────────────────────────────
//  READ — paginated list for a single user (excludes soft-deleted)
// ─────────────────────────────────────────────────────────────
exports.findByUser = async (userId, { page = 1, limit = 20, type = null, read = null } = {}) => {
  const offset = (page - 1) * limit;
  const conditions = ['n.recipient_user_id = $1', 'n.deleted_at IS NULL'];
  const params = [userId];
  let idx = 2;

  if (type) {
    conditions.push(`n.notification_type = $${idx}`);
    params.push(type);
    idx++;
  }
  if (read !== null) {
    conditions.push(`n.is_read = $${idx}`);
    params.push(read);
    idx++;
  }

  const where = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM notifications n WHERE ${where}`,
    params
  );

  const { rows } = await db.query(
    `SELECT
       n.*,
       actor.email AS sender_email
     FROM notifications n
     LEFT JOIN users actor ON n.sender_user_id = actor.id
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    notifications: rows,
    total: parseInt(countResult.rows[0].total, 10),
    page,
    limit,
    totalPages: Math.ceil(parseInt(countResult.rows[0].total, 10) / limit),
  };
};

// ─────────────────────────────────────────────────────────────
//  UNREAD COUNT
// ─────────────────────────────────────────────────────────────
exports.getUnreadCount = async (userId) => {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE recipient_user_id = $1 AND is_read = FALSE AND deleted_at IS NULL`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
};

// ─────────────────────────────────────────────────────────────
//  MARK AS READ — single notification (ownership check)
// ─────────────────────────────────────────────────────────────
exports.markAsRead = async (id, userId) => {
  const { rows } = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE notification_id = $1 AND recipient_user_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, userId]
  );
  return rows[0];
};

// ─────────────────────────────────────────────────────────────
//  MARK ALL AS READ
// ─────────────────────────────────────────────────────────────
exports.markAllAsRead = async (userId) => {
  const { rowCount } = await db.query(
    `UPDATE notifications
     SET is_read = TRUE, read_at = NOW()
     WHERE recipient_user_id = $1 AND is_read = FALSE AND deleted_at IS NULL`,
    [userId]
  );
  return rowCount;
};

// ─────────────────────────────────────────────────────────────
//  SOFT DELETE — single notification
// ─────────────────────────────────────────────────────────────
exports.softDelete = async (id, userId) => {
  const { rows } = await db.query(
    `UPDATE notifications
     SET deleted_at = NOW()
     WHERE notification_id = $1 AND recipient_user_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, userId]
  );
  return rows[0];
};

exports.deleteById = async (id, userId) => {
  return exports.softDelete(id, userId);
};
