/**
 * Unit Tests — profile.controller.js
 */

jest.mock('../../src/services/profile.service', () => ({
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
  deleteProfile: jest.fn(),
}));

jest.mock('../../src/validators/profileValidator', () => ({
  validateAvatarFile: jest.fn(),
  validatePasswordChange: jest.fn((body) => body),
  validateProfileUpdate: jest.fn((body) => body),
}));

jest.mock('../../src/middlewares/asyncHandler', () => (fn) => fn);

const profileService = require('../../src/services/profile.service');
const profileController = require('../../src/controllers/profile.controller');

function makeReqRes(user = { userId: 1 }, body = {}, files = {}) {
  const req = { user, body, files };
  const res = {
    json: jest.fn(),
  };
  return { req, res };
}

describe('Profile Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getProfile() returns user profile data', async () => {
    const { req, res } = makeReqRes({ userId: 1 });
    profileService.getProfile.mockResolvedValue({ id: 1, name: 'Alice' });

    await profileController.getProfile(req, res);

    expect(profileService.getProfile).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 1, name: 'Alice' } });
  });

  it('updateProfile() updates user profile data', async () => {
    const { req, res } = makeReqRes({ userId: 1 }, { name: 'Alice Updated' });
    profileService.updateProfile.mockResolvedValue({ id: 1, name: 'Alice Updated' });

    await profileController.updateProfile(req, res);

    expect(profileService.updateProfile).toHaveBeenCalledWith(1, { name: 'Alice Updated' });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1, name: 'Alice Updated' },
      message: 'Profile updated successfully',
    });
  });

  it('changePassword() updates password', async () => {
    const { req, res } = makeReqRes(
      { userId: 1 },
      { currentPassword: 'old', newPassword: 'new' }
    );
    profileService.changePassword.mockResolvedValue();

    await profileController.changePassword(req, res);

    expect(profileService.changePassword).toHaveBeenCalledWith(1, 'old', 'new');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Password changed successfully',
    });
  });

  it('uploadAvatar() uploads avatar file', async () => {
    const mockFile = { name: 'avatar.png' };
    const { req, res } = makeReqRes({ userId: 1 }, {}, { avatar: mockFile });
    profileService.uploadAvatar.mockResolvedValue({ id: 1, avatar: '/url' });

    await profileController.uploadAvatar(req, res);

    expect(profileService.uploadAvatar).toHaveBeenCalledWith(1, mockFile, req);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1, avatar: '/url' },
      message: 'Avatar updated successfully',
    });
  });

  it('deleteAvatar() removes user avatar', async () => {
    const { req, res } = makeReqRes({ userId: 1 });
    profileService.deleteAvatar.mockResolvedValue({ id: 1, avatar: null });

    await profileController.deleteAvatar(req, res);

    expect(profileService.deleteAvatar).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 1, avatar: null },
      message: 'Avatar removed successfully',
    });
  });

  it('deleteProfile() deletes user profile', async () => {
    const { req, res } = makeReqRes({ userId: 1 });
    profileService.deleteProfile.mockResolvedValue();

    await profileController.deleteProfile(req, res);

    expect(profileService.deleteProfile).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Profile deleted successfully',
    });
  });
});
