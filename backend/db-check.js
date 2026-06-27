const db = require('./src/config/db');

async function run() {
  try {
    const result = await db.query('SELECT id, email, role, is_active FROM users');
    console.log('Users in DB:', result.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit();
  }
}

run();
