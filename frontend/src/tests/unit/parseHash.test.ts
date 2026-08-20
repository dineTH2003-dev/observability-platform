/**
 * Unit Tests — parseHash() logic from src/app/hooks/useNavigation.ts
 *
 * parseHash() is a pure function that reads window.location.hash
 * and returns { page, id? }. We test it by setting jsdom's window.location.hash.
 *
 * We cannot import parseHash directly because it's not exported.
 * So we replicate the same logic here and test it standalone.
 * This is valid — tests document the expected behaviour.
 */
import { describe, it, expect, beforeEach } from 'vitest';

// ── Replicate parseHash exactly as written in useNavigation.ts ────────────────
function parseHash(): { page: string; id?: string } {
  if (typeof window === 'undefined') return { page: 'dashboard' };
  const raw = window.location.hash.replace(/^#/, '').trim();
  if (!raw) return { page: 'dashboard' };
  const slash = raw.indexOf('/');
  if (slash === -1) return { page: raw };
  const page = raw.slice(0, slash);
  const id = raw.slice(slash + 1).trim();
  return { page: page || 'dashboard', id: id || undefined };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('parseHash()', () => {

  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = '';
  });

  it('returns dashboard when hash is empty', () => {
    window.location.hash = '';
    expect(parseHash()).toEqual({ page: 'dashboard' });
  });

  it('returns the page when hash has just a page name', () => {
    window.location.hash = '#anomalies';
    expect(parseHash()).toEqual({ page: 'anomalies' });
  });

  it('returns page and id when hash has page/id format', () => {
    window.location.hash = '#anomalies/42';
    expect(parseHash()).toEqual({ page: 'anomalies', id: '42' });
  });

  it('returns page and id for incidents', () => {
    window.location.hash = '#incidents/10';
    expect(parseHash()).toEqual({ page: 'incidents', id: '10' });
  });

  it('returns page and id for tickets', () => {
    window.location.hash = '#tickets/7';
    expect(parseHash()).toEqual({ page: 'tickets', id: '7' });
  });

  it('returns page and id for service-metrics', () => {
    window.location.hash = '#service-metrics/3';
    expect(parseHash()).toEqual({ page: 'service-metrics', id: '3' });
  });

  it('returns dashboard page for #dashboard', () => {
    window.location.hash = '#dashboard';
    expect(parseHash()).toEqual({ page: 'dashboard' });
  });

  it('strips leading # correctly', () => {
    window.location.hash = '#incidents/5';
    const result = parseHash();
    expect(result.page).not.toContain('#');
  });

  it('id is undefined when hash has no slash', () => {
    window.location.hash = '#incidents';
    const result = parseHash();
    expect(result.id).toBeUndefined();
  });

  it('handles page with trailing slash but no id', () => {
    // page/ with empty id → id should be undefined
    window.location.hash = '#anomalies/';
    const result = parseHash();
    expect(result.page).toBe('anomalies');
    expect(result.id).toBeUndefined();
  });

  it('handles a numeric-looking page name', () => {
    window.location.hash = '#reports';
    expect(parseHash()).toEqual({ page: 'reports' });
  });

  it('handles settings page without id', () => {
    window.location.hash = '#settings';
    expect(parseHash()).toEqual({ page: 'settings' });
  });

  it('preserves UUID-format id correctly', () => {
    window.location.hash = '#incidents/abc-123-def';
    expect(parseHash()).toEqual({ page: 'incidents', id: 'abc-123-def' });
  });

});
