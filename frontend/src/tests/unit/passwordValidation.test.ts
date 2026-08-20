/**
 * Unit Tests — src/app/utils/passwordValidation.ts
 *
 * Tests the getPasswordValidation() function and PASSWORD_RULES array.
 * These are pure functions — no React, no DOM, no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import {
  getPasswordValidation,
  PASSWORD_RULES,
  PASSWORD_VALIDATION_MESSAGE,
} from '../../app/utils/passwordValidation';


// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD_RULES — individual rule tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('PASSWORD_RULES — individual rule tests', () => {

  const getRule = (key: string) => PASSWORD_RULES.find((r) => r.key === key)!;

  // ── minLength ────────────────────────────────────────────────────────────────

  describe('minLength rule', () => {
    const rule = getRule('minLength');

    it('passes when password is exactly 8 characters', () => {
      expect(rule.test('Abcdef1!')).toBe(true);
    });

    it('passes when password is longer than 8 characters', () => {
      expect(rule.test('Abcdefgh1!')).toBe(true);
    });

    it('fails when password is 7 characters', () => {
      expect(rule.test('Abcde1!')).toBe(false);
    });

    it('fails for empty string', () => {
      expect(rule.test('')).toBe(false);
    });
  });

  // ── maxLength ────────────────────────────────────────────────────────────────

  describe('maxLength rule', () => {
    const rule = getRule('maxLength');

    it('passes when password is exactly 64 characters', () => {
      expect(rule.test('A'.repeat(63) + '1')).toBe(true); // 64 chars
    });

    it('fails when password is 65 characters', () => {
      expect(rule.test('A'.repeat(64) + '1')).toBe(false); // 65 chars
    });

    it('passes for a normal-length password', () => {
      expect(rule.test('MyPassword1!')).toBe(true);
    });
  });

  // ── uppercase ────────────────────────────────────────────────────────────────

  describe('uppercase rule', () => {
    const rule = getRule('uppercase');

    it('passes when there is at least one uppercase letter', () => {
      expect(rule.test('Password1!')).toBe(true);
    });

    it('fails when all letters are lowercase', () => {
      expect(rule.test('password1!')).toBe(false);
    });

    it('passes with just one uppercase letter', () => {
      expect(rule.test('P1234567!')).toBe(true);
    });
  });

  // ── lowercase ────────────────────────────────────────────────────────────────

  describe('lowercase rule', () => {
    const rule = getRule('lowercase');

    it('passes when there is at least one lowercase letter', () => {
      expect(rule.test('Password1!')).toBe(true);
    });

    it('fails when all letters are uppercase', () => {
      expect(rule.test('PASSWORD1!')).toBe(false);
    });
  });

  // ── number ───────────────────────────────────────────────────────────────────

  describe('number rule', () => {
    const rule = getRule('number');

    it('passes when there is at least one digit', () => {
      expect(rule.test('Password1!')).toBe(true);
    });

    it('fails when there are no digits', () => {
      expect(rule.test('Password!!')).toBe(false);
    });
  });

  // ── special character ────────────────────────────────────────────────────────

  describe('special character rule', () => {
    const rule = getRule('special');

    it('passes for ! character', () => {
      expect(rule.test('Password1!')).toBe(true);
    });

    it('passes for @ character', () => {
      expect(rule.test('Password1@')).toBe(true);
    });

    it('passes for # character', () => {
      expect(rule.test('Password1#')).toBe(true);
    });

    it('fails when there are no special characters', () => {
      expect(rule.test('Password12')).toBe(false);
    });
  });

  // ── noSpaces ─────────────────────────────────────────────────────────────────

  describe('noSpaces rule', () => {
    const rule = getRule('noSpaces');

    it('passes when there are no spaces', () => {
      expect(rule.test('Password1!')).toBe(true);
    });

    it('fails when password contains a space', () => {
      expect(rule.test('Pass word1!')).toBe(false);
    });

    it('fails when password is only spaces', () => {
      expect(rule.test('   ')).toBe(false);
    });
  });

});


// ═══════════════════════════════════════════════════════════════════════════════
// getPasswordValidation() — integration tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('getPasswordValidation()', () => {

  it('returns isValid:true for a fully compliant password', () => {
    const result = getPasswordValidation('SecurePass1!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns isValid:false for an empty string', () => {
    const result = getPasswordValidation('');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns isValid:false when password is too short', () => {
    const result = getPasswordValidation('Ab1!');   // 4 chars
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least 8 characters');
  });

  it('returns isValid:false when missing uppercase letter', () => {
    const result = getPasswordValidation('securepass1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one uppercase letter');
  });

  it('returns isValid:false when missing lowercase letter', () => {
    const result = getPasswordValidation('SECUREPASS1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one lowercase letter');
  });

  it('returns isValid:false when missing a number', () => {
    const result = getPasswordValidation('SecurePass!!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one number');
  });

  it('returns isValid:false when missing special character', () => {
    const result = getPasswordValidation('SecurePass12');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one special character');
  });

  it('returns isValid:false when password contains spaces', () => {
    const result = getPasswordValidation('Secure Pass1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('No spaces');
  });

  it('returns all 7 results regardless of validity', () => {
    const result = getPasswordValidation('anything');
    expect(result.results).toHaveLength(7);
  });

  it('each result has key, label, and isValid fields', () => {
    const result = getPasswordValidation('SecurePass1!');
    result.results.forEach((r) => {
      expect(r).toHaveProperty('key');
      expect(r).toHaveProperty('label');
      expect(r).toHaveProperty('isValid');
    });
  });

  it('errors array contains only failing rule labels', () => {
    const result = getPasswordValidation('securepass1!');  // missing uppercase
    // Should include uppercase error but not others
    expect(result.errors).toContain('At least one uppercase letter');
    expect(result.errors).not.toContain('At least one lowercase letter');
    expect(result.errors).not.toContain('At least one number');
  });

  it('returns multiple errors for a completely invalid password', () => {
    const result = getPasswordValidation('abc');  // short, no upper, no number, no special
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.isValid).toBe(false);
  });

  it('passes for a long valid password with special chars', () => {
    const result = getPasswordValidation('MyStr0ng!PasswordThatIsLong');
    expect(result.isValid).toBe(true);
  });

});


// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD_VALIDATION_MESSAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe('PASSWORD_VALIDATION_MESSAGE', () => {

  it('is a non-empty string', () => {
    expect(typeof PASSWORD_VALIDATION_MESSAGE).toBe('string');
    expect(PASSWORD_VALIDATION_MESSAGE.length).toBeGreaterThan(0);
  });

  it('mentions key requirements in the message', () => {
    expect(PASSWORD_VALIDATION_MESSAGE).toMatch(/8/);          // min length
    expect(PASSWORD_VALIDATION_MESSAGE).toMatch(/64/);         // max length
    expect(PASSWORD_VALIDATION_MESSAGE).toMatch(/uppercase/i);
    expect(PASSWORD_VALIDATION_MESSAGE).toMatch(/lowercase/i);
  });

});
