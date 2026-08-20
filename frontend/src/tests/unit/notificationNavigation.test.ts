/**
 * Unit Tests — src/app/utils/notificationNavigation.ts
 *
 * Tests three pure functions:
 *   1. extractNotificationEntityIds()  — reads IDs from any notification shape
 *   2. getNotificationNavigationTarget() — maps notification type → destination page
 *   3. mapApiNotificationToUi()          — converts API row → UI Notification object
 *
 * No React, no DOM, no mocking needed.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  extractNotificationEntityIds,
  getNotificationNavigationTarget,
  mapApiNotificationToUi,
} from '../../app/utils/notificationNavigation';
import type { NavigationTarget } from '../../app/utils/notificationNavigation';

// ── Helper: build a minimal UI Notification for getNotificationNavigationTarget ──

function makeNotification(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id:    'notif-1',
    type,
    title: 'Test',
    message: 'Test message',
    timestamp: '2 min ago',
    read: false,
    severity: 'medium',
    from: 'System',
    to: 'You',
    ...overrides,
  } as any;
}


// ═══════════════════════════════════════════════════════════════════════════════
// extractNotificationEntityIds()
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractNotificationEntityIds()', () => {

  it('returns all undefined for empty object', () => {
    const result = extractNotificationEntityIds({});
    expect(result.anomalyId).toBeUndefined();
    expect(result.incidentId).toBeUndefined();
    expect(result.ticketId).toBeUndefined();
  });

  it('extracts anomaly_id from snake_case (socket/API format)', () => {
    const result = extractNotificationEntityIds({ anomaly_id: '42' });
    expect(result.anomalyId).toBe('42');
  });

  it('extracts anomalyId from camelCase (UI format)', () => {
    const result = extractNotificationEntityIds({ anomalyId: '77' });
    expect(result.anomalyId).toBe('77');
  });

  it('extracts incident_id from snake_case', () => {
    const result = extractNotificationEntityIds({ incident_id: '10' });
    expect(result.incidentId).toBe('10');
  });

  it('extracts incidentId from camelCase', () => {
    const result = extractNotificationEntityIds({ incidentId: '10' });
    expect(result.incidentId).toBe('10');
  });

  it('extracts ticket_id from snake_case', () => {
    const result = extractNotificationEntityIds({ ticket_id: '5' });
    expect(result.ticketId).toBe('5');
  });

  it('extracts anomalyId from related_entity_id + related_entity_type = anomaly', () => {
    const result = extractNotificationEntityIds({
      related_entity_id:   '99',
      related_entity_type: 'anomaly',
    });
    expect(result.anomalyId).toBe('99');
    expect(result.relatedEntityType).toBe('anomaly');
  });

  it('extracts incidentId from relatedEntityId + relatedEntityType = incident', () => {
    const result = extractNotificationEntityIds({
      relatedEntityId:   '33',
      relatedEntityType: 'incident',
    });
    expect(result.incidentId).toBe('33');
  });

  it('extracts ticketId from related_entity_id + related_entity_type = ticket', () => {
    const result = extractNotificationEntityIds({
      related_entity_id:   '7',
      related_entity_type: 'ticket',
    });
    expect(result.ticketId).toBe('7');
  });

  it('ignores empty string IDs', () => {
    const result = extractNotificationEntityIds({ anomaly_id: '' });
    expect(result.anomalyId).toBeUndefined();
  });

  it('ignores null IDs', () => {
    const result = extractNotificationEntityIds({ anomaly_id: null });
    expect(result.anomalyId).toBeUndefined();
  });

  it('ignores literal "undefined" string', () => {
    const result = extractNotificationEntityIds({ anomaly_id: 'undefined' });
    expect(result.anomalyId).toBeUndefined();
  });

  it('handles null input gracefully', () => {
    const result = extractNotificationEntityIds(null);
    expect(result.anomalyId).toBeUndefined();
    expect(result.incidentId).toBeUndefined();
  });

  it('sets relatedEntityId to the first resolved ID', () => {
    const result = extractNotificationEntityIds({ anomaly_id: '5' });
    expect(result.relatedEntityId).toBe('5');
    expect(result.relatedEntityType).toBe('anomaly');
  });

  it('prioritises direct anomalyId over relatedEntityId when both present', () => {
    const result = extractNotificationEntityIds({
      anomaly_id:          '10',
      related_entity_id:   '99',
      related_entity_type: 'anomaly',
    });
    expect(result.anomalyId).toBe('10');
  });

});


// ═══════════════════════════════════════════════════════════════════════════════
// getNotificationNavigationTarget()
// ═══════════════════════════════════════════════════════════════════════════════

describe('getNotificationNavigationTarget()', () => {

  // Silence the console.debug call inside the function during tests
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('anomaly_detected with anomalyId → anomalies page with id', () => {
    const notif = makeNotification('anomaly_detected', { anomalyId: '42' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies', id: '42' });
  });

  it('anomaly_detected without anomalyId → anomalies page without id', () => {
    const notif = makeNotification('anomaly_detected');
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies' });
  });

  it('ticket_created with ticketId → tickets page with id', () => {
    const notif = makeNotification('ticket_created', { ticketId: '7' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'tickets', id: '7' });
  });

  it('ticket_created without ticketId → tickets page without id', () => {
    const notif = makeNotification('ticket_created');
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'tickets' });
  });

  it('incident_assigned with incidentId → incidents page with id', () => {
    const notif = makeNotification('incident_assigned', { incidentId: '3' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'incidents', id: '3' });
  });

  it('anomaly_resolved with incidentId → incidents page (incident takes priority)', () => {
    const notif = makeNotification('anomaly_resolved', { incidentId: '10', anomalyId: '5' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'incidents', id: '10' });
  });

  it('anomaly_resolved with anomalyId only → anomalies page', () => {
    const notif = makeNotification('anomaly_resolved', { anomalyId: '5' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies', id: '5' });
  });

  it('anomaly_resolved with no ids → incidents page (fallback)', () => {
    const notif = makeNotification('anomaly_resolved');
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'incidents' });
  });

  it('incident_acknowledged with incidentId → incidents page', () => {
    const notif = makeNotification('incident_acknowledged', { incidentId: '20' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'incidents', id: '20' });
  });

  it('alert_rule with anomalyId → anomalies page', () => {
    const notif = makeNotification('alert_rule', { anomalyId: '55' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies', id: '55' });
  });

  it('alert_rule without anomalyId → alert-settings page', () => {
    const notif = makeNotification('alert_rule');
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'alert-settings' });
  });

  it('custom_alert with anomalyId → anomalies page', () => {
    const notif = makeNotification('custom_alert', { anomalyId: '9' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies', id: '9' });
  });

  it('unknown type with anomalyId → anomalies page (default branch)', () => {
    const notif = makeNotification('some_unknown_type', { anomalyId: '1' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'anomalies', id: '1' });
  });

  it('unknown type with incidentId → incidents page (default branch)', () => {
    const notif = makeNotification('some_unknown_type', { incidentId: '2' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'incidents', id: '2' });
  });

  it('unknown type with ticketId → tickets page (default branch)', () => {
    const notif = makeNotification('some_unknown_type', { ticketId: '8' });
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'tickets', id: '8' });
  });

  it('unknown type with no ids → notifications page (fallback)', () => {
    const notif = makeNotification('some_unknown_type');
    const target = getNotificationNavigationTarget(notif);
    expect(target).toEqual({ page: 'notifications' });
  });

  it('all resolve/acknowledge/assign variants route correctly', () => {
    const types = [
      'anomaly_assigned',
      'anomaly_acknowledged',
      'anomaly_resolved',
      'incident_resolved',
      'incident_acknowledged',
    ];
    for (const type of types) {
      const notif = makeNotification(type, { incidentId: '99' });
      const target: NavigationTarget = getNotificationNavigationTarget(notif);
      expect(target.page).toBe('incidents');
      expect(target.id).toBe('99');
    }
  });

});


// ═══════════════════════════════════════════════════════════════════════════════
// mapApiNotificationToUi()
// ═══════════════════════════════════════════════════════════════════════════════

describe('mapApiNotificationToUi()', () => {

  const fakeFormatTimestamp = (iso: string) => `formatted: ${iso}`;

  it('maps snake_case API fields to UI Notification fields', () => {
    const raw = {
      notification_id:   'n-1',
      notification_type: 'anomaly_detected',
      title:             'CPU Spike',
      message:           'CPU above threshold',
      created_at:        '2024-08-01T10:00:00Z',
      is_read:           false,
      severity:          'high',
      anomaly_id:        '42',
    };

    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);

    expect(result.id).toBe('n-1');
    expect(result.type).toBe('anomaly_detected');
    expect(result.title).toBe('CPU Spike');
    expect(result.message).toBe('CPU above threshold');
    expect(result.timestamp).toBe('formatted: 2024-08-01T10:00:00Z');
    expect(result.read).toBe(false);
    expect(result.severity).toBe('high');
    expect(result.anomalyId).toBe('42');
    expect(result.from).toBe('System');   // no sender_user_id
    expect(result.to).toBe('You');
  });

  it('sets from to sender email when sender_user_id is present', () => {
    const raw = {
      notification_id: 'n-2',
      sender_user_id:  5,
      sender_email:    'alice@example.com',
      title:           'Assigned',
      message:         'You were assigned',
    };

    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.from).toBe('alice@example.com');
  });

  it('falls back to "User" when sender has no email', () => {
    const raw = {
      notification_id: 'n-3',
      sender_user_id:  5,
      title: 'Test',
      message: 'Test',
    };

    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.from).toBe('User');
  });

  it('uses fallback timestamp when created_at is missing', () => {
    const raw = { notification_id: 'n-4', title: 'T', message: 'M' };
    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.timestamp).toBe('some time ago');
  });

  it('defaults severity to "high" for alert_rule notification type', () => {
    const raw = {
      notification_id:   'n-5',
      notification_type: 'alert_rule',
      title:             'Alert',
      message:           'Rule triggered',
    };
    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.severity).toBe('high');
  });

  it('maps is_read:true to read:true', () => {
    const raw = { notification_id: 'n-6', is_read: true, title: 'T', message: 'M' };
    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.read).toBe(true);
  });

  it('maps incidentId and ticketId correctly', () => {
    const raw = {
      notification_id: 'n-7',
      incident_id:     '20',
      ticket_id:       '8',
      title: 'T', message: 'M',
    };
    const result = mapApiNotificationToUi(raw, fakeFormatTimestamp);
    expect(result.incidentId).toBe('20');
    expect(result.ticketId).toBe('8');
  });

});
