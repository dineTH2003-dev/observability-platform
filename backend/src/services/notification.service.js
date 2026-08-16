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

/**
 * Fetch email channel configuration
 */
async function getEmailChannelConfig() {
  try {
    const { rows } = await db.query(
      `SELECT email_channel_enabled FROM alert_settings WHERE id = 1`
    );
    return rows[0] || { email_channel_enabled: false };
  } catch (err) {
    logger.error({ msg: 'Failed to fetch email channel config', error: err.message });
    return { email_channel_enabled: false };
  }
}

/**
 * Check if email was already sent for this anomaly-recipient-type combination
 * Uses persistent database state to prevent duplicate emails on restart
 * 
 * Identifies unique anomaly email event by:
 * - anomaly_id
 * - recipient_user_id
 * - notification_type
 */
async function hasAnomalyEmailBeenSent(anomalyId, recipientUserId, notificationType) {
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM notifications
       WHERE anomaly_id = $1 
         AND recipient_user_id = $2 
         AND notification_type = $3 
         AND email_sent = TRUE
         AND deleted_at IS NULL
       LIMIT 1`,
      [anomalyId, recipientUserId, notificationType]
    );
    return rows.length > 0;
  } catch (err) {
    logger.error({ 
      msg: 'Error checking anomaly email status', 
      error: err.message,
      anomalyId,
      recipientUserId 
    });
    return false; // On error, allow send attempt (safer than silently skipping)
  }
}

/**
 * Check if email was already sent for this incident-recipient-type combination
 * Uses persistent database state to prevent duplicate emails on restart
 * 
 * Identifies unique incident email event by:
 * - incident_id
 * - recipient_user_id
 * - notification_type
 */
async function hasIncidentEmailBeenSent(incidentId, recipientUserId, notificationType) {
  try {
    const { rows } = await db.query(
      `SELECT 1 FROM notifications
       WHERE incident_id = $1 
         AND recipient_user_id = $2 
         AND notification_type = $3 
         AND email_sent = TRUE
         AND deleted_at IS NULL
       LIMIT 1`,
      [incidentId, recipientUserId, notificationType]
    );
    return rows.length > 0;
  } catch (err) {
    logger.error({ 
      msg: 'Error checking incident email status', 
      error: err.message,
      incidentId,
      recipientUserId 
    });
    return false; // On error, allow send attempt (safer than silently skipping)
  }
}

/**
 * Mark email as sent for a notification
 * Updates email_sent=TRUE and email_sent_at=NOW()
 * Only called after sendNotificationEmail() succeeds
 */
async function markEmailAsSent(notificationId) {
  try {
    await db.query(
      `UPDATE notifications
       SET email_sent = TRUE, email_sent_at = NOW()
       WHERE notification_id = $1`,
      [notificationId]
    );
  } catch (err) {
    logger.error({ 
      msg: 'Error marking email as sent', 
      error: err.message, 
      notificationId 
    });
  }
}

/**
 * Mark email as failed
 * Leaves email_sent=FALSE so retry is possible on next event
 */
async function markEmailAsFailed(notificationId) {
  try {
    await db.query(
      `UPDATE notifications
       SET email_sent = FALSE, email_sent_at = NULL
       WHERE notification_id = $1`,
      [notificationId]
    );
  } catch (err) {
    logger.error({ 
      msg: 'Error marking email as failed', 
      error: err.message, 
      notificationId 
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  EVENT TRIGGERS
// ─────────────────────────────────────────────────────────────

/**
 * Anomaly detected → notify all admins + send email
 * 
 * Email behavior:
 * - Check email_channel_enabled
 * - For each admin, check if email already sent (anomaly_id + recipient_user_id + notification_type)
 * - Send email only if not previously sent
 * - Mark email_sent=TRUE only after successful send
 * - On SMTP failure: log error, keep notification, mark email_sent=FALSE (allow retry)
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

    // Step 1: Create notifications (always, independent of email success)
    const createdNotifications = await broadcastNotifications(adminIds, {
      notification_type: 'anomaly_detected',
      title:             `Anomaly Detected: ${title}`,
      message:           message,
      sender_user_id:    null,
      incident_id:       incidentId,
      anomaly_id:        anomalyId,
    });

    // Step 2: Send emails if channel enabled (independent of dashboard notifications)
    const emailConfig = await getEmailChannelConfig();
    if (!emailConfig.email_channel_enabled) {
      logger.debug({ msg: 'Email channel disabled, skipping anomaly email' });
      return;
    }

    // Step 3: For each notification, check deduplication and send email
    for (const notif of createdNotifications) {
      const alreadySent = await hasAnomalyEmailBeenSent(
        anomalyId,
        notif.recipient_user_id,
        'anomaly_detected'
      );

      if (alreadySent) {
        logger.debug({
          msg: 'Anomaly email already sent, skipping',
          anomalyId,
          recipientId: notif.recipient_user_id,
        });
        continue;
      }

      try {
        // Fetch recipient email
        const { rows: recipients } = await db.query(
          `SELECT email FROM users WHERE id = $1`,
          [notif.recipient_user_id]
        );

        const recipientEmail = recipients[0]?.email;
        if (!recipientEmail) {
          logger.warn({ msg: 'No email for anomaly recipient', userId: notif.recipient_user_id });
          continue;
        }

        // Send email
        const emailHtml = `
          <h2>Anomaly Detected: ${title}</h2>
          <p>${message}</p>
          <p><strong>Severity:</strong> ${severity}</p>
          <p>Log in to CloudSight to view details.</p>
        `;
        
        await emailUtil.sendNotificationEmail(
          recipientEmail,
          `[CloudSight Alert] ${title}`,
          emailHtml
        );

        // Email succeeded: mark as sent
        await markEmailAsSent(notif.notification_id);
        logger.info({
          msg: 'Anomaly email sent successfully',
          anomalyId,
          recipientId: notif.recipient_user_id,
        });
      } catch (emailErr) {
        // Email failed: log and mark as failed (do NOT mark as sent)
        logger.error({
          msg: 'Failed to send anomaly email',
          anomalyId,
          recipientId: notif.recipient_user_id,
          error: emailErr.message,
        });
        await markEmailAsFailed(notif.notification_id);
      }
    }
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyDetected failed', error: err.message });
    // Notifications already created in try block
    // Email sending failures are caught individually
  }
};

/**
 * Engineer/Developer assigned → notify the assigned engineer + send email
 * 
 * Email behavior:
 * - Check email_channel_enabled
 * - Check if email already sent (incident_id + engineer_user_id + notification_type)
 * - Send email only if not previously sent
 * - Mark email_sent=TRUE only after successful send
 * - On SMTP failure: log error, keep notification, mark email_sent=FALSE (allow retry)
 */
exports.notifyEngineerAssigned = async (incident, engineerId, actorId) => {
  try {
    // Look up actor email/name for context
    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0] ? `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim() || rows[0].email : 'An admin';

    // Step 1: Create notification (always)
    const notif = await NotificationModel.create({
      notification_type: 'anomaly_assigned',
      title:             `Assigned to You: ${incident.title}`,
      message:           `You have been assigned Incident INC-${incident.incident_number}.`,
      recipient_user_id: engineerId,
      sender_user_id:    actorId,
      incident_id:       incident.incident_id,
    });

    emitToUser(engineerId, notif);

    // Step 2: Send email if channel enabled (independent of dashboard notification)
    const emailConfig = await getEmailChannelConfig();
    if (!emailConfig.email_channel_enabled) {
      logger.debug({ msg: 'Email channel disabled, skipping assignment email' });
      return;
    }

    // Step 3: Check deduplication
    const alreadySent = await hasIncidentEmailBeenSent(
      incident.incident_id,
      engineerId,
      'anomaly_assigned'
    );

    if (alreadySent) {
      logger.debug({
        msg: 'Assignment email already sent, skipping',
        incidentId: incident.incident_id,
        engineerId,
      });
      return;
    }

    try {
      // Fetch engineer email
      const { rows: engineers } = await db.query(`SELECT email, first_name FROM users WHERE id = $1`, [engineerId]);
      const engineer = engineers[0];
      
      if (!engineer || !engineer.email) {
        logger.warn({ msg: 'No email for assigned engineer', userId: engineerId });
        return;
      }

      // Send email
      const emailHtml = `
        <h2>Incident Assigned to You</h2>
        <p>Hi ${engineer.first_name || 'Engineer'},</p>
        <p>You have been assigned to <strong>Incident INC-${incident.incident_number}: ${incident.title}</strong> by ${actorEmail}.</p>
        <p>Please log in to CloudSight to review and acknowledge this incident.</p>
      `;
      
      await emailUtil.sendNotificationEmail(
        engineer.email,
        `[CloudSight] Incident Assigned: INC-${incident.incident_number}`,
        emailHtml
      );

      // Email succeeded: mark as sent
      await markEmailAsSent(notif.notification_id);
      logger.info({
        msg: 'Assignment email sent successfully',
        incidentId: incident.incident_id,
        engineerId,
      });
    } catch (emailErr) {
      // Email failed: log and mark as failed (do NOT mark as sent)
      logger.error({
        msg: 'Failed to send assignment email',
        incidentId: incident.incident_id,
        engineerId,
        error: emailErr.message,
      });
      await markEmailAsFailed(notif.notification_id);
    }
  } catch (err) {
    logger.error({ msg: 'notifyEngineerAssigned failed', error: err.message });
    // Notification already created in try block
    // Email sending failures are caught individually
  }
};

/**
 * Incident acknowledged → notify all admins
 * NO EMAIL SENT (per requirements)
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
    // No email sent for acknowledgement
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyAcknowledged failed', error: err.message });
  }
};

/**
 * Incident resolved → notify all admins
 * NO EMAIL SENT (per requirements)
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
    // No email sent for resolution
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
 * NO EMAIL SENT (per requirements)
 */
exports.notifyCustomAlertRule = async (rule, entityDetails) => {
  try {
    if (!rule.recipients || rule.recipients.length === 0) return;

    // Resolve recipients to user IDs (emails or roles)
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
    // No email sent for custom alerts
  } catch (err) {
    logger.error({ msg: 'notifyCustomAlertRule failed', error: err.message });
  }
};
