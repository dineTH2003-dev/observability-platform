const bcrypt = require("bcrypt");

const db = require("../config/db");
const ApiError = require("../utils/apiError");

let schemaReadyPromise;

async function ensureProfileSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = db.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS department VARCHAR(100),
      ADD COLUMN IF NOT EXISTS location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bio VARCHAR(300),
      ADD COLUMN IF NOT EXISTS avatar_url TEXT,
      ADD COLUMN IF NOT EXISTS profile_image BYTEA,
      ADD COLUMN IF NOT EXISTS profile_image_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
  }

  await schemaReadyPromise;
}

function mapProfile(row) {
  if (!row) return null;

  let avatarStr = "";
  if (row.profile_image) {
    const buffer = Buffer.isBuffer(row.profile_image)
      ? row.profile_image
      : Buffer.from(row.profile_image);
    avatarStr = `data:${row.profile_image_type || "image/png"};base64,${buffer.toString("base64")}`;
  }

  return {
    id: row.id,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    email: row.email,
    phone: row.phone || "",
    role: row.role || "",
    department: row.department || "",
    location: row.location || "",
    bio: row.bio || "",
    avatar: avatarStr,
    createdAt: row.created_at,
  };
}

async function getProfileRow(userId) {
  await ensureProfileSchema();

  const result = await db.query(
    `SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        department,
        location,
        bio,
        avatar_url,
        profile_image,
        profile_image_type,
        created_at
      FROM users
      WHERE id = $1 AND is_active = true`,
    [userId],
  );

  return result.rows[0] || null;
}

async function getProfile(userId) {
  const row = await getProfileRow(userId);
  if (!row) {
    throw new ApiError(404, "Profile not found");
  }

  return mapProfile(row);
}

async function updateProfile(userId, data) {
  await ensureProfileSchema();

  const existing = await getProfileRow(userId);
  if (!existing) {
    throw new ApiError(404, "Profile not found");
  }

  const emailCheck = await db.query(
    "SELECT id FROM users WHERE email = $1 AND id <> $2",
    [data.email, userId],
  );

  if (emailCheck.rows[0]) {
    throw new ApiError(409, "Email address is already in use");
  }

  const result = await db.query(
    `UPDATE users
     SET
       first_name = $1,
       last_name = $2,
       email = $3,
       phone = $4,
       role = $5,
       department = $6,
       location = $7,
       bio = $8,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING
       id,
       first_name,
       last_name,
       email,
       phone,
       role,
       department,
       location,
       bio,
       avatar_url,
       profile_image,
       profile_image_type,
       created_at`,
    [
      data.firstName,
      data.lastName,
      data.email,
      data.phone || null,
      existing.role,
      data.department || null,
      data.location || null,
      data.bio || null,
      userId,
    ],
  );

  return mapProfile(result.rows[0]);
}

async function changePassword(userId, currentPassword, newPassword) {
  await ensureProfileSchema();

  const result = await db.query(
    "SELECT password_hash FROM users WHERE id = $1 AND is_active = true",
    [userId],
  );

  const user = result.rows[0];
  if (!user) {
    throw new ApiError(404, "Profile not found");
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE users
     SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [passwordHash, userId],
  );
}

async function uploadAvatar(userId, file, req) {
  await ensureProfileSchema();

  const profile = await getProfileRow(userId);
  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  const imageBuffer = file.data;
  const mimeType = file.mimetype;

  const result = await db.query(
    `UPDATE users
     SET profile_image = $1, profile_image_type = $2, avatar_url = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING
       id,
       first_name,
       last_name,
       email,
       phone,
       role,
       department,
       location,
       bio,
       avatar_url,
       profile_image,
       profile_image_type,
       created_at`,
    [imageBuffer, mimeType, userId],
  );

  return mapProfile(result.rows[0]);
}

async function deleteAvatar(userId) {
  await ensureProfileSchema();

  const profile = await getProfileRow(userId);
  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  const result = await db.query(
    `UPDATE users
     SET profile_image = NULL, profile_image_type = NULL, avatar_url = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING
       id,
       first_name,
       last_name,
       email,
       phone,
       role,
       department,
       location,
       bio,
       avatar_url,
       profile_image,
       profile_image_type,
       created_at`,
    [userId],
  );

  return mapProfile(result.rows[0]);
}

async function deleteProfile(userId) {
  await ensureProfileSchema();

  const profile = await getProfileRow(userId);
  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  await db.query("DELETE FROM users WHERE id = $1", [userId]);
}

module.exports = {
  deleteAvatar,
  deleteProfile,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
};
