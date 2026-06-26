const db = require('./src/config/db');
const bcrypt = require('bcrypt');

async function run() {
  try {
    const hash = await bcrypt.hash('SecurePassword123!', 10);
    const result = await db.query(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email`,
      [hash, 'madhudissa07@gmail.com']
    );
    console.log('Update result:', result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

run();
