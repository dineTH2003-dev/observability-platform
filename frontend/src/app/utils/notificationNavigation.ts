import type { Notification } from '../components/ui/NotificationDropdown';

export interface NavigationTarget {
  page: string;
  id?: string;
}

export interface NotificationEntityIds {
  anomalyId?: string;
  incidentId?: string;
  ticketId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'anomaly' | 'incident' | 'ticket';
}

function asId(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null') return undefined;
  return text;
}

/**
 * Read anomaly/incident/ticket IDs from any notification shape used in the app:
 * live socket rows (snake_case), UI objects (camelCase), and related-entity aliases.
 */
export function extractNotificationEntityIds(notification: unknown): NotificationEntityIds {
  const n = (notification ?? {}) as Record<string, unknown>;

  let anomalyId = asId(n.anomalyId ?? n.anomaly_id);
  let incidentId = asId(n.incidentId ?? n.incident_id);
  let ticketId = asId(n.ticketId ?? n.ticket_id);

  const relatedType = String(n.relatedEntityType ?? n.related_entity_type ?? n.entityType ?? n.entity_type ?? '').toLowerCase();
  const relatedId = asId(n.relatedEntityId ?? n.related_entity_id ?? n.entityId ?? n.entity_id);

  if (relatedId) {
    if (!anomalyId && (relatedType === 'anomaly' || relatedType === 'anomalies')) {
      anomalyId = relatedId;
    }
    if (!incidentId && (relatedType === 'incident' || relatedType === 'incidents')) {
      incidentId = relatedId;
    }
    if (!ticketId && (relatedType === 'ticket' || relatedType === 'tickets')) {
      ticketId = relatedId;
    }
  }

  const relatedEntityType = anomalyId ? 'anomaly' : incidentId ? 'incident' : ticketId ? 'ticket' : undefined;
  const relatedEntityId = anomalyId ?? incidentId ?? ticketId;

  return { anomalyId, incidentId, ticketId, relatedEntityId, relatedEntityType };
}

export function mapApiNotificationToUi(
  n: any,
  formatTimestamp: (iso: string) => string,
): Notification {
  const ids = extractNotificationEntityIds(n);
  const fromLabel = n.sender_user_id || n.senderUserId
    ? n.sender_email || n.senderEmail || 'User'
    : 'System';

  return {
    id: asId(n.notification_id ?? n.notificationId ?? n.id) || '',
    type: (n.notification_type ?? n.type ?? '') as Notification['type'],
    title: n.title,
    message: n.message,
    timestamp: n.created_at || n.createdAt ? formatTimestamp(n.created_at || n.createdAt) : 'some time ago',
    read: Boolean(n.is_read ?? n.isRead ?? n.read),
    severity: n.severity || (n.notification_type === 'alert_rule' || n.type === 'alert_rule' ? 'high' : 'medium'),
    from: fromLabel,
    to: 'You',
    anomalyId: ids.anomalyId,
    incidentId: ids.incidentId,
    ticketId: ids.ticketId,
    relatedEntityId: ids.relatedEntityId,
    relatedEntityType: ids.relatedEntityType,
  };
}

/**
 * Given a notification, determine the destination page and entity ID.
 * Used by the real-time toast, the bell dropdown, and the Notifications page.
 */
export function getNotificationNavigationTarget(notification: Notification): NavigationTarget {
  const { anomalyId, incidentId, ticketId } = extractNotificationEntityIds(notification);
  const type = notification.type;

  let target: NavigationTarget;
  switch (type) {
    case 'anomaly_detected':
      target = anomalyId ? { page: 'anomalies', id: anomalyId } : { page: 'anomalies' };
      break;

    case 'ticket_created':
      target = ticketId ? { page: 'tickets', id: ticketId } : { page: 'tickets' };
      break;

    case 'anomaly_assigned':
    case 'incident_assigned':
    case 'anomaly_acknowledged':
    case 'incident_acknowledged':
    case 'anomaly_resolved':
    case 'incident_resolved':
      if (incidentId) {
        target = { page: 'incidents', id: incidentId };
      } else if (anomalyId) {
        target = { page: 'anomalies', id: anomalyId };
      } else {
        target = { page: 'incidents' };
      }
      break;

    case 'alert_rule':
    case 'custom_alert':
      target = anomalyId ? { page: 'anomalies', id: anomalyId } : { page: 'alert-settings' };
      break;

    default:
      if (anomalyId) {
        target = { page: 'anomalies', id: anomalyId };
      } else if (incidentId) {
        target = { page: 'incidents', id: incidentId };
      } else if (ticketId) {
        target = { page: 'tickets', id: ticketId };
      } else {
        target = { page: 'notifications' };
      }
  }

  console.debug('[NotificationNav]', {
    notificationId: notification.id,
    type,
    anomalyId,
    incidentId,
    relatedEntityId: notification.relatedEntityId,
    relatedEntityType: notification.relatedEntityType,
    target,
  });

  return target;
}
