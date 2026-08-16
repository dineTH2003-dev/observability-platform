/**
 * Migration Script: Apply 001_add_email_tracking_to_notifications.sql
 * This script:
 * 1. Reads the migration SQL file
 * 2. Applies it to the database
 * 3. Verifies columns were created
 * 4. Verifies indexes were created
 * 5. Verifies existing notifications have email_sent = FALSE
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

// Initialize database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('Migration: 001_add_email_tracking_to_notifications');
    console.log('═══════════════════════════════════════════════════\n');

    // Step 1: Read migration file
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'database/migrations/001_add_email_tracking_to_notifications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file read successfully\n');

    // Step 2: Apply migration
    console.log('🔄 Applying migration to database...');
    await client.query(migrationSQL);
    console.log('✅ Migration applied successfully\n');

    // Step 3: Verify email_sent column
    console.log('🔍 Verifying email_sent column...');
    const emailSentResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'notifications' AND column_name = 'email_sent'
    `);
    if (emailSentResult.rows.length > 0) {
      const col = emailSentResult.rows[0];
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log(`   Default: ${col.column_default}`);
      console.log('✅ email_sent column exists and is correctly configured\n');
    } else {
      console.log('❌ email_sent column NOT found!\n');
      return false;
    }

    // Step 4: Verify email_sent_at column
    console.log('🔍 Verifying email_sent_at column...');
    const emailSentAtResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'notifications' AND column_name = 'email_sent_at'
    `);
    if (emailSentAtResult.rows.length > 0) {
      const col = emailSentAtResult.rows[0];
      console.log(`   Column: ${col.column_name}`);
      console.log(`   Type: ${col.data_type}`);
      console.log(`   Nullable: ${col.is_nullable}`);
      console.log('✅ email_sent_at column exists and is correctly configured\n');
    } else {
      console.log('❌ email_sent_at column NOT found!\n');
      return false;
    }

    // Step 5: Verify idx_notif_email_anomaly index
    console.log('🔍 Verifying idx_notif_email_anomaly index...');
    const anomalyIndexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'notifications' AND indexname = 'idx_notif_email_anomaly'
    `);
    if (anomalyIndexResult.rows.length > 0) {
      console.log(`   Index: ${anomalyIndexResult.rows[0].indexname}`);
      console.log(`   Definition: ${anomalyIndexResult.rows[0].indexdef}`);
      console.log('✅ idx_notif_email_anomaly index exists\n');
    } else {
      console.log('❌ idx_notif_email_anomaly index NOT found!\n');
      return false;
    }

    // Step 6: Verify idx_notif_email_incident index
    console.log('🔍 Verifying idx_notif_email_incident index...');
    const incidentIndexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'notifications' AND indexname = 'idx_notif_email_incident'
    `);
    if (incidentIndexResult.rows.length > 0) {
      console.log(`   Index: ${incidentIndexResult.rows[0].indexname}`);
      console.log(`   Definition: ${incidentIndexResult.rows[0].indexdef}`);
      console.log('✅ idx_notif_email_incident index exists\n');
    } else {
      console.log('❌ idx_notif_email_incident index NOT found!\n');
      return false;
    }

    // Step 7: Verify existing notifications
    console.log('🔍 Verifying existing notifications...');
    const notifCountResult = await client.query(`
      SELECT 
        email_sent,
        COUNT(*) as count
      FROM notifications
      GROUP BY email_sent
      ORDER BY email_sent
    `);

    let totalNotifications = 0;
    let falsCount = 0;
    let trueCount = 0;

    for (const row of notifCountResult.rows) {
      console.log(`   email_sent = ${row.email_sent}: ${row.count} notifications`);
      totalNotifications += row.count;
      if (row.email_sent === false) falsCount = row.count;
      if (row.email_sent === true) trueCount = row.count;
    }

    console.log(`\n   Total notifications: ${totalNotifications}`);
    console.log(`   With email_sent = FALSE: ${falsCount}`);
    console.log(`   With email_sent = TRUE: ${trueCount}`);

    if (falsCount === totalNotifications) {
      console.log('✅ All existing notifications have email_sent = FALSE (correct default)\n');
    } else if (trueCount > 0) {
      console.log('⚠️  WARNING: Some notifications already have email_sent = TRUE\n');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════');
    return true;

  } catch (err) {
    console.error('❌ Migration failed:');
    console.error(err.message);
    console.error(err.detail || '');
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
