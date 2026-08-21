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
 * Anomaly detected → notify all admins + send email to admins
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

    const recipientIds = await getAdminIds();
    if (!recipientIds.length) {
      logger.warn({ msg: 'No active admins found to receive anomaly notification' });
      return;
    }

    const message = `New anomaly detected on ${entityName}. Immediate attention may be required.`;

    // Step 1: Create notifications for admins only (independent of email success)
    const createdNotifications = await broadcastNotifications(recipientIds, {
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

    // Step 3: For each notification, check deduplication and send email (to admins only)
    const emailAdminIds = await getAdminIds();
    for (const notif of createdNotifications) {
      if (!emailAdminIds.includes(notif.recipient_user_id)) continue;
      const alreadySent = await hasAnomalyEmailBeenSent(
        anomalyId,
        notif.recipient_user_id,
        'anomaly_detected'
      );

      if (alreadySent) {
        logger.debug({
          msg: 'Anomaly email already sent to admin, skipping',
          anomalyId,
          recipientUserId: notif.recipient_user_id,
        });
        continue;
      }

      try {
        const { rows: recipients } = await db.query(
          `SELECT email, first_name FROM users WHERE id = $1`,
          [notif.recipient_user_id]
        );
        const recipient = recipients[0];
        if (!recipient || !recipient.email) continue;

        const emailHtml = `
          <h2>New Anomaly Detected</h2>
          <p>Hi ${recipient.first_name || 'Admin'},</p>
          <p>An anomaly has been detected: <strong>${title}</strong></p>
          <p>${message}</p>
          ${incidentId ? `<p>Incident Created: INC-${incident.incident_number}</p>` : ''}
          <p>Please log in to CloudSight to review this anomaly.</p>
        `;

        await emailUtil.sendNotificationEmail(
          recipient.email,
          `[CloudSight Alert] Anomaly Detected: ${title}`,
          emailHtml
        );

        await markEmailAsSent(notif.notification_id);
      } catch (emailErr) {
        logger.error({
          msg: 'Failed to send anomaly email to admin',
          anomalyId,
          recipientUserId: notif.recipient_user_id,
          error: emailErr.message,
        });
        await markEmailAsFailed(notif.notification_id);
      }
    }
  } catch (err) {
    logger.error({ msg: 'notifyAnomalyDetected failed', error: err.message });
  }
};

/**
 * Engineer/Developer assigned → notify the assigned engineer only + send email to assigned engineer
 */
exports.notifyEngineerAssigned = async (incident, engineerId, actorId) => {
  try {
    if (!engineerId) {
      logger.warn({ msg: 'No engineerId provided for notifyEngineerAssigned', incidentId: incident.incident_id });
      return;
    }

    // Look up actor email/name for context
    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actorEmail = rows[0] ? `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim() || rows[0].email : 'An admin';

    const recipientIds = [engineerId];

    // Step 1: Create in-app notification for the assigned engineer only
    const created = await broadcastNotifications(recipientIds, {
      notification_type: 'anomaly_assigned',
      title:             `Incident Assigned: ${incident.title}`,
      message:           `Incident INC-${incident.incident_number} has been assigned to you by ${actorEmail}.`,
      sender_user_id:    actorId,
      incident_id:       incident.incident_id,
    });

    const notif = created[0];

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
      if (notif) await markEmailAsSent(notif.notification_id);
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
      if (notif) await markEmailAsFailed(notif.notification_id);
    }
  } catch (err) {
    logger.error({ msg: 'notifyEngineerAssigned failed', error: err.message });
  }
};

/**
 * Incident acknowledged → notify all admins only
 * NO EMAIL SENT (per requirements)
 */
exports.notifyAnomalyAcknowledged = async (incident, actorId) => {
  try {
    const recipientIds = await getAdminIds();
    if (!recipientIds.length) return;

    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actor = rows[0];
    let actorName = actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() : '';
    if (!actorName && actor) actorName = actor.email;
    if (!actorName) actorName = 'An engineer';

    const message = `Incident INC-${incident.incident_number} has been acknowledged by ${actorName}.`;

    await broadcastNotifications(recipientIds, {
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
 * Incident resolved → notify all admins only
 * NO EMAIL SENT (per requirements)
 */
exports.notifyAnomalyResolved = async (incident, actorId) => {
  try {
    const recipientIds = await getAdminIds();
    if (!recipientIds.length) return;

    const { rows } = await db.query(`SELECT email, first_name, last_name FROM users WHERE id = $1`, [actorId]);
    const actor = rows[0];
    let actorName = actor ? `${actor.first_name || ''} ${actor.last_name || ''}`.trim() : '';
    if (!actorName && actor) actorName = actor.email;
    if (!actorName) actorName = 'An engineer';

    const message = `Incident INC-${incident.incident_number} has been resolved by ${actorName}.`;

    await broadcastNotifications(recipientIds, {
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
 * In-app: Registered users matching rule.recipients (by email or role)
 * Email: All valid configured email recipients (both registered and external) when email channel is enabled
 */
exports.notifyCustomAlertRule = async (rule, entityDetails) => {
  try {
    if (!rule.recipients) return;

    // Safely normalize rule.recipients whether array or JSON string
    let rawRecipients = rule.recipients;
    if (typeof rawRecipients === 'string') {
      try {
        rawRecipients = JSON.parse(rawRecipients);
      } catch {
        rawRecipients = [rawRecipients];
      }
    }
    if (!Array.isArray(rawRecipients) || rawRecipients.length === 0) return;

    const tokens = rawRecipients
      .map(r => (typeof r === 'string' ? r.trim() : ''))
      .filter(Boolean);
    if (tokens.length === 0) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailTokens = tokens.filter(t => emailRegex.test(t));
    const roleTokens = tokens.filter(t => !emailRegex.test(t));

    // 1. Resolve registered users for in-app notifications
    const { rows: matchedUsers } = await db.query(
      `SELECT id, email, first_name, role FROM users 
       WHERE is_active = true 
         AND (
           email = ANY($1::text[]) 
           OR role::text = ANY($2::text[])
         )`,
      [emailTokens.length ? emailTokens : ['__none__'], roleTokens.length ? roleTokens : ['__none__']]
    );

    const recipientIds = Array.from(new Set(matchedUsers.map(u => u.id)));

    const message = `Custom Alert "${rule.name}" triggered for ${entityDetails.entity_type} ${entityDetails.entity_id || ''}. Condition: ${rule.condition}`;

    // Step 1: Create in-app notifications for registered users
    let createdNotifications = [];
    if (recipientIds.length > 0) {
      createdNotifications = await broadcastNotifications(recipientIds, {
        notification_type: 'custom_alert',
        title:             `Alert Triggered: ${rule.name}`,
        message:           message,
        sender_user_id:    null,
        incident_id:       null,
        anomaly_id:        null,
      });
    }

    // Step 2: Send emails if email channel is enabled
    const emailConfig = await getEmailChannelConfig();
    if (!emailConfig.email_channel_enabled) {
      return;
    }

    // Collect all destination email addresses (both direct email tokens and emails of users matching role tokens)
    const emailDestinationSet = new Set(emailTokens.map(e => e.toLowerCase()));
    for (const u of matchedUsers) {
      if (u.email && emailRegex.test(u.email)) {
        emailDestinationSet.add(u.email.toLowerCase());
      }
    }

    const emailDestinations = Array.from(emailDestinationSet);
    if (emailDestinations.length === 0) return;

    const emailHtml = `
      <h2>Custom Alert Triggered</h2>
      <p>Alert rule <strong>${rule.name}</strong> has been triggered.</p>
      <p><strong>Entity:</strong> ${entityDetails.entity_type} ${entityDetails.entity_id || ''}</p>
      <p><strong>Condition:</strong> ${rule.condition}</p>
      <p><strong>Severity:</strong> ${(rule.severity || 'medium').toUpperCase()}</p>
      <p>${message}</p>
      <p>Please log in to CloudSight to review this alert.</p>
    `;

    for (const email of emailDestinations) {
      try {
        await emailUtil.sendNotificationEmail(
          email,
          `[CloudSight Alert] ${rule.name}`,
          emailHtml
        );
        logger.info({ msg: 'Custom alert email sent', ruleId: rule.id, email });
      } catch (emailErr) {
        logger.error({
          msg: 'Failed to send custom alert email',
          ruleId: rule.id,
          email,
          error: emailErr.message,
        });
      }
    }

    // Mark email_sent = TRUE for matched in-app notification rows
    for (const notif of createdNotifications) {
      await markEmailAsSent(notif.notification_id);
    }
  } catch (err) {
    logger.error({ msg: 'notifyCustomAlertRule failed', error: err.message });
  }
};

exports.notifyTicketCreated = async (ticket) => {
  try {
    const adminIds = await getAdminIds();
    if (!adminIds.length) return;

    // Severity mapping based on priority
    // Ticket priority: 'low', 'medium', 'high'
    const severity = ticket.priority === 'high' ? 'high' : 
                     ticket.priority === 'medium' ? 'medium' : 'low';

    const title = 'New Ticket Created';
    const message = `Ticket ${ticket.ticket_id} created: ${ticket.title}`;

    await broadcastNotifications(adminIds, {
      ticket_id: ticket.ticket_id,
      title,
      message,
      notification_type: 'ticket_created',
      is_read: false,
      severity
    });
  } catch (err) {
    logger.error({ msg: 'notifyTicketCreated failed', error: err.message });
  }
};
