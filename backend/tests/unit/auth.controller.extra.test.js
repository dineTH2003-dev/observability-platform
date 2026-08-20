/**
 * Unit Tests — auth.controller.js (extending existing coverage)
 *
 * Covers the two previously uncovered functions:
 *   - resetPassword()  (lines 44–75)
 *   - resendVerification() (lines 88–97)
 *
 * Same mocks as the existing auth.controller.test.js are used.
 * This file runs independently and adds to overall coverage.
 */

jest.mock('../../src/services/auth.service', () => ({
  signupUser:           jest.fn(),
  loginUser:            jest.fn(),
  generateResetToken:   jest.fn(),
  verifyEmail:          jest.fn(),
  resendVerification:   jest.fn(),
}));

jest.mock('../../src/utils/email.util', () => ({
  sendResetEmail: jest.fn(),
}));

// resetPassword() uses db directly and bcrypt — mock both
jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

const db             = require('../../src/config/db');
const authService    = require('../../src/services/auth.service');
const authController = require('../../src/controllers/auth.controller');

function makeReqRes(body = {}, query = {}) {
  const req = { body, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — resetPassword()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with success message when token is valid and not expired', async () => {
    const { req, res } = makeReqRes({
      token:       'valid_token_123',
      newPassword: 'NewPass@1',
    });

    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future

    // First query: SELECT token → returns a valid unexpired row
    db.query
      .mockResolvedValueOnce({ rows: [{ token: 'valid_token_123', user_id: 5, expires_at: futureDate }] })
      // Second query: UPDATE password
      .mockResolvedValueOnce({ rows: [] })
      // Third query: DELETE token
      .mockResolvedValueOnce({ rows: [] });

    await authController.resetPassword(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful' });
  });

  it('returns 400 when token is not found in DB', async () => {
    const { req, res } = makeReqRes({
      token:       'nonexistent_token',
      newPassword: 'NewPass@1',
    });

    db.query.mockResolvedValueOnce({ rows: [] }); // no rows → reset is undefined

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
  });

  it('returns 400 when token is expired', async () => {
    const { req, res } = makeReqRes({
      token:       'expired_token',
      newPassword: 'NewPass@1',
    });

    const pastDate = new Date(Date.now() - 60 * 1000); // 1 min in the past

    db.query.mockResolvedValueOnce({
      rows: [{ token: 'expired_token', user_id: 5, expires_at: pastDate }],
    });

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
  });

  it('returns 400 when db.query throws an error', async () => {
    const { req, res } = makeReqRes({
      token:       'any_token',
      newPassword: 'NewPass@1',
    });

    db.query.mockRejectedValueOnce(new Error('DB connection error'));

    await authController.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'DB connection error' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — resendVerification()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns success message when email exists and needs verification', async () => {
    const { req, res } = makeReqRes({ email: 'unverified@test.com' });

    authService.resendVerification.mockResolvedValue({
      message: 'Verification email sent',
    });

    await authController.resendVerification(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Verification email sent' });
  });

  it('returns a generic safe message even when the service throws (silent error branch)', async () => {
    const { req, res } = makeReqRes({ email: 'nobody@test.com' });

    authService.resendVerification.mockRejectedValue(new Error('User not found'));

    await authController.resendVerification(req, res);

    // Controller deliberately swallows errors and returns a safe generic message
    expect(res.json).toHaveBeenCalledWith({
      message: 'If the account exists and requires verification, a verification email has been sent.',
    });
    // Should NOT set a 4xx status — the controller stays silent on errors
    expect(res.status).not.toHaveBeenCalled();
  });

});
