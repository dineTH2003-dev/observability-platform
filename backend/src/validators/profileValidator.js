const ApiError = require("../utils/apiError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const TEXT_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "role",
  "department",
  "location",
  "bio",
];

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, "").trim();
}

function normalizeProfilePayload(payload = {}) {
  const normalized = {};

  for (const field of TEXT_FIELDS) {
    if (payload[field] === undefined) continue;
    normalized[field] = stripHtml(String(payload[field]));
  }

  if (payload.email !== undefined) {
    normalized.email = String(payload.email).trim().toLowerCase();
  }

  return normalized;
}

function validateProfileUpdate(payload = {}) {
  const data = normalizeProfilePayload(payload);

  if (!data.firstName || data.firstName.length < 2 || data.firstName.length > 50) {
    throw new ApiError(400, "First name must be between 2 and 50 characters");
  }

  if (!data.lastName) {
    throw new ApiError(400, "Last name is required");
  }

  if (!data.email || !EMAIL_REGEX.test(data.email)) {
    throw new ApiError(400, "Please provide a valid email address");
  }

  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    throw new ApiError(400, "Please provide a valid phone number");
  }

  if (data.bio && data.bio.length > 300) {
    throw new ApiError(400, "Bio must be 300 characters or less");
  }

  return data;
}

function validatePasswordChange(payload = {}) {
  const currentPassword = String(payload.currentPassword || "");
  const newPassword = String(payload.newPassword || "");
  const confirmPassword = String(payload.confirmPassword || "");

  if (!currentPassword) {
    throw new ApiError(400, "Current password is required");
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    throw new ApiError(
      400,
      "New password must be at least 8 characters and include uppercase, lowercase, number, and special character",
    );
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Confirm password must match the new password");
  }

  return {
    currentPassword,
    newPassword,
    confirmPassword,
  };
}

function validateAvatarFile(file) {
  if (!file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const allowedMimeTypes = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]);

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new ApiError(400, "Avatar must be a PNG, JPG, JPEG, or WEBP file");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new ApiError(400, "Avatar must be smaller than 2MB");
  }
}

module.exports = {
  validateAvatarFile,
  validatePasswordChange,
  validateProfileUpdate,
};
