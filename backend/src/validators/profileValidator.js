const ApiError = require("../utils/apiError");
const {
  PASSWORD_VALIDATION_MESSAGE,
  validatePassword,
} = require("../utils/passwordValidation");

const NAME_REGEX = /^[a-zA-Z\s'-]+$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALLOWED_ROLES = ["Admin", "Engineer"];
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

function validatePhoneHelper(phone) {
  const trimmed = String(phone || "").trim();
  if (!trimmed) return null;

  if (!/^\+?[0-9()\-\s]+$/.test(trimmed)) {
    return "Phone number can only contain numbers, spaces, hyphens, parentheses, and leading '+'";
  }

  const digitsOnly = trimmed.replace(/[^0-9]/g, "");

  if (trimmed.startsWith("0")) {
    if (digitsOnly.length !== 10) {
      return "Local phone numbers starting with 0 must be 10 digits (e.g., 0764678547)";
    }
  } else if (trimmed.startsWith("+")) {
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return "International phone numbers must be between 7 and 15 digits";
    }
  } else {
    if (digitsOnly.length < 7 || digitsOnly.length > 14) {
      return "Phone number must be between 7 and 14 digits";
    }
  }

  return null;
}

function validateProfileUpdate(payload = {}) {
  const data = normalizeProfilePayload(payload);

  if (!data.firstName || data.firstName.length < 2 || data.firstName.length > 50) {
    throw new ApiError(400, "First name must be between 2 and 50 characters");
  }

  if (!NAME_REGEX.test(data.firstName)) {
    throw new ApiError(400, "First name can only contain letters, spaces, hyphens, and apostrophes");
  }

  if (!data.lastName || data.lastName.length < 2 || data.lastName.length > 50) {
    throw new ApiError(400, "Last name must be between 2 and 50 characters");
  }

  if (!NAME_REGEX.test(data.lastName)) {
    throw new ApiError(400, "Last name can only contain letters, spaces, hyphens, and apostrophes");
  }

  if (!data.email || data.email.length > 100 || !EMAIL_REGEX.test(data.email)) {
    throw new ApiError(400, "Please provide a valid email address");
  }

  if (data.phone) {
    const phoneError = validatePhoneHelper(data.phone);
    if (phoneError) {
      throw new ApiError(400, phoneError);
    }
  }

  if (data.role) {
    const isRoleValid = ALLOWED_ROLES.some(
      (role) => role.toLowerCase() === data.role.toLowerCase()
    );
    if (!isRoleValid) {
      throw new ApiError(400, "Please select a valid role (Admin or Engineer)");
    }
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

  const passwordResult = validatePassword(newPassword);
  if (!passwordResult.isValid) {
    throw new ApiError(400, PASSWORD_VALIDATION_MESSAGE);
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
