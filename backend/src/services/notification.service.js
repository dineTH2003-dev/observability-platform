const NotificationModel = require('../models/notification.model');
const db               = require('../config/db');
const logger           = require('../config/logger');
const emailUtil        = require('../utils/email.util');

// Lazy reference — avoids circular require at load time
let _io = null;
function getIO() {
  if (!_io) {
    try { _io = require('../socket').getIO(); } catch { /* not initialized yet */ }
  }
  return _io;
}

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────

/** Fetch all active admin user IDs */
async function getAdminIds() {
  const { rows } = await db.query(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = true`
  );
  return rows.map((r) => r.id);
}

/** Emit a notification to the recipient's Socket.io room */
function emitToUser(userId, notification) {
  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('new_notification', notification);
  }
}

/** Create notifications for a list of recipient IDs and emit via Socket.io */
async function broadcastNotifications(recipientIds, template) {
  const rows = recipientIds.map((rid) => ({
    ...template,
    recipient_user_id: rid,
  }));

  const created = await NotificationModel.createMany(rows);

  for (const notif of created) {
    emitToUser(notif.recipient_user_id, notif);
  }
  return created;
}

// ─────────────────────────────────────────────────────────────
//  EVENT TRIGGERS
// ─────────────────────────────────────────────────────────────

/**
 * Anomaly detected → notify all admins
 */
exports.notifyAnomalyDetected = async (incident, anomaly) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    const title = incident ? incident.title : anomaly.title;
    const severity = anomaly.severity || (incident ? incident.severity : 'medium');
    const incidentId = incident ? incident.incident_id : null;
    const anomalyId = anomaly ? anomaly.anomaly_id : null;

    let entityName = 'System';
    if (anomaly) {
      if (anomaly.server_id) {
        const { rows } = await db.query(`SELECT hostname FROM servers WHERE server_id = $1`, [anomaly.server_id]);
        if (rows[0]?.hostname) entityName = rows[0].hostname;
      } else if (anomaly.service_id) {
        const { rows } = await db.query(`SELECT name FROM services WHERE service_id = $1`, [anomaly.service_id]);
        if (rows[0]?.name) entityName = rows[0].name;
      } else if (anomaly.application_id) {
        const { rows } = await db.query(`SELECT name FROM applications WHERE application_id = $1`, [anomaly.application_id]);
        if (rows[0]?.name) entityName = rows[0].name;
      }
    }

    const message = `New anomaly detected on ${entityName}. Immediate attention may be required.`;

    await broadcastNotifications(adminIds, {
      notification_type: 'anomaly_detected',
      title:             `Anomaly Detected: ${title}`,
      message:           message,
      sender_user_id:    null,
      incident_id:       incidentId,
      anomaly_id:        anomalyId,
    });

    // Fetch admin emails and send alert email
    const { rows: admins } = await db.query(`SELECT email FROM users WHERE id = ANY($1::uuid[])`, [adminIds]);
    const emails = admins.map(a => a.email).filter(Boolean);
    if (emails.length > 0) {
      const emailHtml = `
        <h2>Anomaly Detected: ${title}</h2>
        <p>${message}</p>
        <p><strong>Severity:</strong> ${severity}</p>
        <p>Log in to CloudSight to view details.</p>
      `;
      await emailUtil.sendNotificationEmail(emails, `[CloudSight Alert] ${title}`, emailHtml);
    }
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyDetected failed', error: err.message });
  }
};

/**
 * Engineer/Developer assigned → notify the assigned developer
 */
exports.notifyEngineerAssigned = async (incident, engineerId, actorId) => {
  try {
    // Look up actor email/name for context
    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0] ? `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim() || rows[0].email : 'An admin';

    const notif = await NotificationModel.create({
      notification_type: 'anomaly_assigned',
      title:             `Assigned to You: ${incident.title}`,
      message:           `You have been assigned Incident INC-${incident.incident_number}.`,
      recipient_user_id: engineerId,
      sender_user_id:    actorId,
      incident_id:       incident.incident_id,
    });

    emitToUser(engineerId, notif);

    // Fetch engineer email and send notification
    const { rows: engineers } = await db.query(`SELECT email, first_name FROM users WHERE id = $1`, [engineerId]);
    const engineer = engineers[0];
    if (engineer && engineer.email) {
      const emailHtml = `
        <h2>Incident Assigned to You</h2>
        <p>Hi ${engineer.first_name || 'Engineer'},</p>
        <p>You have been assigned to <strong>Incident INC-${incident.incident_number}: ${incident.title}</strong> by ${actorEmail}.</p>
        <p>Please log in to CloudSight to review and acknowledge this incident.</p>
      `;
      await emailUtil.sendNotificationEmail(engineer.email, `[CloudSight] Incident Assigned: INC-${incident.incident_number}`, emailHtml);
    }
  } catch (err) {
    logger.error({ msg: 'notifyEngineerAssigned failed', error: err.message });
  }
};

/**
 * Incident acknowledged → notify all admins
 */
exports.notifyAnomalyAcknowledged = async (incident, actorId) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actor = rows[0];
    let actorName = actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() : '';
    if (!actorName && actor) actorName = actor.email;
    if (!actorName) actorName = 'An engineer';

    const message = `Incident INC-${incident.incident_number} has been acknowledged by ${actorName}.`;

    await broadcastNotifications(adminIds, {
      notification_type: 'anomaly_acknowledged',
      title:             `Acknowledged: ${incident.title}`,
      message:           message,
      sender_user_id:    actorId,
      incident_id:       incident.incident_id,
    });
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyAcknowledged failed', error: err.message });
  }
};

/**
 * Incident resolved → notify all admins
 */
exports.notifyAnomalyResolved = async (incident, actorId) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    const message = `Incident INC-${incident.incident_number} has been resolved.`;

    await broadcastNotifications(adminIds, {
      notification_type: 'anomaly_resolved',
      title:             `Resolved: ${incident.title}`,
      message:           message,
      sender_user_id:    actorId,
      incident_id:       incident.incident_id,
    });
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyResolved failed', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  CRUD
// ─────────────────────────────────────────────────────────────

exports.getUserNotifications = async (userId, query) => {
  return NotificationModel.findByUser(userId, {
    page:  parseInt(query.page, 10) || 1,
    limit: Math.min(parseInt(query.limit, 10) || 20, 100),
    type:  query.type || null,
    read:  query.read === 'true' ? true : query.read === 'false' ? false : null,
  });
};

exports.getUnreadCount = async (userId) => {
  return NotificationModel.getUnreadCount(userId);
};

exports.markAsRead = async (notificationId, userId) => {
  return NotificationModel.markAsRead(notificationId, userId);
};

exports.markAllAsRead = async (userId) => {
  return NotificationModel.markAllAsRead(userId);
};

exports.deleteNotification = async (notificationId, userId) => {
  return NotificationModel.softDelete(notificationId, userId);
};

/**
 * Custom Alert Rule triggered
 */
exports.notifyCustomAlertRule = async (rule, entityDetails) => {
  try {
    if (!rule.recipients || rule.recipients.length === 0) return;

    // Resolve recipients to user IDs (emails or roles)
    // Recipients is an array of strings e.g. ["admin", "john@example.com"]
    const { rows } = await db.query(
      `SELECT id FROM users 
       WHERE email = ANY($1::text[]) 
          OR role::text = ANY($1::text[])`,
      [rule.recipients]
    );

    const recipientIds = rows.map(r => r.id);
    if (recipientIds.length === 0) return;

    const message = `Custom Alert "${rule.name}" triggered for ${entityDetails.entity_type} ${entityDetails.entity_id || ''}. Condition: ${rule.condition}`;

    await broadcastNotifications(recipientIds, {
      notification_type: 'custom_alert',
      title:             `Alert Triggered: ${rule.name}`,
      message:           message,
      sender_user_id:    null,
      incident_id:       null,
      anomaly_id:        null,
    });
  } catch (err) {
    logger.error({ msg: 'notifyCustomAlertRule failed', error: err.message });
  }
};
