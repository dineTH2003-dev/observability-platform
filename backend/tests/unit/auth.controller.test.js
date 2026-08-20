/**
 * Unit Tests — auth.controller.js
 *
 * The controller delegates all logic to auth.service.js.
 * We mock the service so no real DB or email is touched.
 */

// ── Mock auth.service before importing the controller ─────────────────────────
jest.mock('../../src/services/auth.service', () => ({
  signupUser:            jest.fn(),
  loginUser:             jest.fn(),
  generateResetToken:    jest.fn(),
  verifyEmail:           jest.fn(),
  resendVerification:    jest.fn(),
}));

jest.mock('../../src/utils/email.util', () => ({
  sendResetEmail: jest.fn(),
}));

const authService     = require('../../src/services/auth.service');
const authController  = require('../../src/controllers/auth.controller');

// ── Helper: build fake req / res ───────────────────────────────────────────────
function makeReqRes(body = {}, query = {}) {
  const req = { body, query };
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn(),
  };
  return { req, res };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — signup()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with user data on successful signup', async () => {
    const { req, res } = makeReqRes({
      email: 'new@test.com',
      password: 'Secret@123',
    });

    authService.signupUser.mockResolvedValue({
      message: 'Registration successful. Please check your email to verify your account.',
      user: { id: 1, email: 'new@test.com', role: 'engineer' },
    });

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Registration') })
    );
  });

  it('returns 400 when email is already registered', async () => {
    const { req, res } = makeReqRes({
      email: 'taken@test.com',
      password: 'Secret@123',
    });

    authService.signupUser.mockRejectedValue(new Error('Email already registered'));

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Email already registered' })
    );
  });

  it('returns 400 when password is missing', async () => {
    const { req, res } = makeReqRes({ email: 'new@test.com' }); // no password

    authService.signupUser.mockRejectedValue(new Error('Password is required'));

    await authController.signup(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — login()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with access/refresh tokens on valid credentials', async () => {
    const { req, res } = makeReqRes({
      email: 'admin@test.com',
      password: 'correct_password',
    });

    authService.loginUser.mockResolvedValue({
      accessToken:  'access_token_abc',
      refreshToken: 'refresh_token_xyz',
      user: { id: 1, email: 'admin@test.com', role: 'admin' },
    });

    await authController.login(req, res);

    // Controller calls res.json() directly (no .status(200) call) on success
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken:  'access_token_abc',
        refreshToken: 'refresh_token_xyz',
      })
    );
  });

  it('returns 401 when credentials are invalid', async () => {
    const { req, res } = makeReqRes({
      email: 'admin@test.com',
      password: 'wrong_password',
    });

    authService.loginUser.mockRejectedValue(new Error('Invalid credentials'));

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid credentials' })
    );
  });

  it('returns 403 when email is not yet verified', async () => {
    const { req, res } = makeReqRes({
      email: 'unverified@test.com',
      password: 'correct_password',
    });

    authService.loginUser.mockRejectedValue(
      new Error('Please verify your email address before signing in.')
    );

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — forgotPassword()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with success message when email exists', async () => {
    const { req, res } = makeReqRes({ email: 'admin@test.com' });
    const emailUtil = require('../../src/utils/email.util');

    authService.generateResetToken.mockResolvedValue('reset_token_123');
    emailUtil.sendResetEmail.mockResolvedValue(undefined);

    await authController.forgotPassword(req, res);

    expect(authService.generateResetToken).toHaveBeenCalledWith('admin@test.com');
    expect(res.json).toHaveBeenCalledWith({ message: 'Reset link sent to email' });
  });

  it('returns 400 when email is not found', async () => {
    const { req, res } = makeReqRes({ email: 'nobody@test.com' });

    authService.generateResetToken.mockRejectedValue(new Error('User not found'));

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Controller — verifyEmail()', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with success message on valid token', async () => {
    const { req, res } = makeReqRes({}, { token: 'valid_token_abc' });

    authService.verifyEmail.mockResolvedValue({ message: 'Email verified successfully' });

    await authController.verifyEmail(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Email verified successfully' });
  });

  it('returns 400 when token is expired or invalid', async () => {
    const { req, res } = makeReqRes({}, { token: 'expired_token' });

    authService.verifyEmail.mockRejectedValue(
      new Error('This verification link is invalid or has expired.')
    );

    await authController.verifyEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

});
