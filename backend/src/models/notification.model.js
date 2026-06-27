const db = require('../config/db');
const logger = require('../config/logger');

// ─────────────────────────────────────────────────────────────
//  AUTO-CREATE — called once on server startup
// ─────────────────────────────────────────────────────────────
exports.ensureTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id            SERIAL PRIMARY KEY,
      type          VARCHAR(30)  NOT NULL,
      title         VARCHAR(255) NOT NULL,
      message       TEXT         NOT NULL,
      severity      VARCHAR(20)  DEFAULT 'medium',
      recipient_id  UUID,
      actor_id      UUID,
      incident_id   UUID,
      read          BOOLEAN      DEFAULT FALSE,
      metadata      JSONB        DEFAULT '{}',
      created_at    TIMESTAMPTZ  DEFAULT NOW(),
      deleted_at    TIMESTAMPTZ  DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notif_recipient
      ON notifications(recipient_id) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_notif_unread
      ON notifications(recipient_id, read) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_notif_created
      ON notifications(created_at DESC) WHERE deleted_at IS NULL;
  `);
  logger.info({ msg: 'Notifications table ready' });
};

// ─────────────────────────────────────────────────────────────
//  CREATE — insert a single notification row
// ─────────────────────────────────────────────────────────────
exports.create = async (data) => {
  const {
    type,
    title,
    message,
    severity = 'medium',
    recipient_id,
    actor_id = null,
    incident_id = null,
    metadata = {},
  } = data;

  const { rows } = await db.query(
    `INSERT INTO notifications
       (type, title, message, severity, recipient_id, actor_id, incident_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [type, title, message, severity, recipient_id, actor_id, incident_id, JSON.stringify(metadata)]
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
      n.type,
      n.title,
      n.message,
      n.severity || 'medium',
      n.recipient_id,
      n.actor_id || null,
      n.incident_id || null,
      JSON.stringify(n.metadata || {}),
    );
    idx += 8;
  }

  const { rows } = await db.query(
    `INSERT INTO notifications
       (type, title, message, severity, recipient_id, actor_id, incident_id, metadata)
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
  const conditions = ['n.recipient_id = $1', 'n.deleted_at IS NULL'];
  const params = [userId];
  let idx = 2;

  if (type) {
    conditions.push(`n.type = $${idx}`);
    params.push(type);
    idx++;
  }
  if (read !== null) {
    conditions.push(`n.read = $${idx}`);
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
       actor.email AS actor_email
     FROM notifications n
     LEFT JOIN users actor ON n.actor_id = actor.id
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
     WHERE recipient_id = $1 AND read = FALSE AND deleted_at IS NULL`,
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
     SET read = TRUE
     WHERE id = $1 AND recipient_id = $2 AND deleted_at IS NULL
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
     SET read = TRUE
     WHERE recipient_id = $1 AND read = FALSE AND deleted_at IS NULL`,
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
     WHERE id = $1 AND recipient_id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [id, userId]
  );
  return rows[0];
};

exports.deleteById = async (id, userId) => {
  return exports.softDelete(id, userId);
};
