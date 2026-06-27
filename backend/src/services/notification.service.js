const NotificationModel = require('../models/notification.model');
const db               = require('../config/db');
const logger           = require('../config/logger');

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
    recipient_id: rid,
  }));

  const created = await NotificationModel.createMany(rows);

  for (const notif of created) {
    emitToUser(notif.recipient_id, notif);
  }
  return created;
}

// ─────────────────────────────────────────────────────────────
//  EVENT TRIGGERS — called from incident.service.js
// ─────────────────────────────────────────────────────────────

/**
 * Anomaly detected → notify all admins
 */
exports.notifyAnomalyDetected = async (incident, anomaly) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    await broadcastNotifications(adminIds, {
      type:        'anomaly_detected',
      title:       `Anomaly Detected: ${incident.title}`,
      message:     `A ${anomaly.severity || 'medium'} severity ${anomaly.anomaly_type} anomaly was detected. ${anomaly.description || ''}`.trim(),
      severity:    anomaly.severity || incident.severity || 'medium',
      actor_id:    null,
      incident_id: incident.incident_id,
      metadata:    {
        anomaly_id:   anomaly.anomaly_id,
        anomaly_type: anomaly.anomaly_type,
        metric_value: anomaly.metric_value,
        threshold:    anomaly.threshold,
      },
    });
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyDetected failed', error: err.message });
  }
};

/**
 * Engineer assigned → notify the assigned engineer
 */
exports.notifyEngineerAssigned = async (incident, engineerId, actorId) => {
  try {
    // Look up actor email for the message
    const { rows } = await db.query(`SELECT email FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0]?.email || 'An admin';

    const notif = await NotificationModel.create({
      type:        'anomaly_assigned',
      title:       `Assigned to You: ${incident.title}`,
      message:     `${actorEmail} assigned you to investigate this incident.`,
      severity:    incident.severity || 'medium',
      recipient_id: engineerId,
      actor_id:    actorId,
      incident_id: incident.incident_id,
      metadata:    { assigned_by: actorEmail },
    });

    emitToUser(engineerId, notif);
  } catch (err) {
    logger.error({ msg: 'notifyEngineerAssigned failed', error: err.message });
  }
};

/**
 * Anomaly acknowledged → notify all admins
 */
exports.notifyAnomalyAcknowledged = async (incident, actorId) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    const { rows } = await db.query(`SELECT email FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0]?.email || 'An engineer';

    await broadcastNotifications(adminIds, {
      type:        'anomaly_acknowledged',
      title:       `Acknowledged: ${incident.title}`,
      message:     `${actorEmail} acknowledged and is investigating this incident.`,
      severity:    incident.severity || 'medium',
      actor_id:    actorId,
      incident_id: incident.incident_id,
      metadata:    { acknowledged_by: actorEmail },
    });
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyAcknowledged failed', error: err.message });
  }
};

/**
 * Anomaly resolved → notify all admins + the assigned engineer
 */
exports.notifyAnomalyResolved = async (incident, actorId) => {
  try {
    const adminIds = await getAdminIds();

    // Build unique recipient list: admins + assigned engineer (if any)
    const recipientSet = new Set(adminIds);
    if (incident.assigned_to) {
      recipientSet.add(incident.assigned_to);
    }

    if (!recipientSet.size) return;

    const { rows } = await db.query(`SELECT email FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0]?.email || 'An engineer';

    await broadcastNotifications([...recipientSet], {
      type:        'anomaly_resolved',
      title:       `Resolved: ${incident.title}`,
      message:     `${actorEmail} resolved this incident.`,
      severity:    incident.severity || 'medium',
      actor_id:    actorId,
      incident_id: incident.incident_id,
      metadata:    { resolved_by: actorEmail },
    });
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyResolved failed', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
//  CRUD — called from notification.controller.js
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
