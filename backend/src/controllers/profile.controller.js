const asyncHandler = require("../middlewares/asyncHandler");
const profileService = require("../services/profile.service");
const {
  validateAvatarFile,
  validatePasswordChange,
  validateProfileUpdate,
} = require("../validators/profileValidator");

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getProfile(req.user.userId);

  res.json({
    success: true,
    data: profile,
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const payload = validateProfileUpdate(req.body);
  const profile = await profileService.updateProfile(req.user.userId, payload);

  res.json({
    success: true,
    data: profile,
    message: "Profile updated successfully",
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = validatePasswordChange(req.body);

  await profileService.changePassword(
    req.user.userId,
    currentPassword,
    newPassword,
  );

  res.json({
    success: true,
    message: "Password changed successfully",
  });
});

exports.uploadAvatar = asyncHandler(async (req, res) => {
  const file = req.files?.avatar;
  validateAvatarFile(file);

  const profile = await profileService.uploadAvatar(req.user.userId, file, req);

  res.json({
    success: true,
    data: profile,
    message: "Avatar updated successfully",
  });
});

exports.deleteAvatar = asyncHandler(async (req, res) => {
  const profile = await profileService.deleteAvatar(req.user.userId);

  res.json({
    success: true,
    data: profile,
    message: "Avatar removed successfully",
  });
});

exports.deleteProfile = asyncHandler(async (req, res) => {
  await profileService.deleteProfile(req.user.userId);

  res.json({
    success: true,
    message: "Profile deleted successfully",
  });
});
