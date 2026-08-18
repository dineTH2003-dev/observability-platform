/**
 * Test script: Validates the full notification → socket flow for all event types.
 *
 * Run from the backend directory:
 *   node test_notification_flow.js
 */

// Load env
require('dotenv').config();

const db = require('./src/config/db');
const http = require('http');
const { initSocket, getIO } = require('./src/socket');

async function main() {
  // 1. Find the test user
  const { rows: users } = await db.query(
    `SELECT id, email, role FROM users WHERE email = 'dinethdilshan321@gmail.com' LIMIT 1`
  );
  if (!users.length) {
    console.error('❌ Test user not found');
    process.exit(1);
  }
  const testUser = users[0];
  console.log(`✅ Found test user: ${testUser.email} (id=${testUser.id}, role=${testUser.role})`);

  // 2. Start a minimal HTTP server with Socket.io on a temp port
  const server = http.createServer();
  initSocket(server);

  await new Promise((resolve) => server.listen(9999, resolve));
  console.log('✅ Test Socket.io server listening on port 9999');

  // 3. Connect a client socket (simulating the frontend browser)
  const { io: ioClient } = require('socket.io-client');
  const clientSocket = ioClient('http://localhost:9999', {
    transports: ['websocket'],
    autoConnect: true,
  });

  await new Promise((resolve, reject) => {
    clientSocket.on('connect', () => {
      console.log(`✅ Client socket connected: ${clientSocket.id}`);
      clientSocket.emit('register_user', testUser.id);
      console.log(`✅ Client registered for user_${testUser.id}`);
      resolve();
    });
    setTimeout(() => reject(new Error('Client socket connection timeout')), 5000);
  });

  // Small delay to let room join propagate
  await new Promise(r => setTimeout(r, 500));

  // 4. Set up listener for all incoming notifications
  const receivedNotifications = [];
  clientSocket.on('new_notification', (notif) => {
    console.log(`🔔 [RECEIVED] new_notification → type=${notif.notification_type}, title="${notif.title}"`);
    receivedNotifications.push(notif);
  });

  // 5. Load the notification service (must be AFTER initSocket())
  const notificationService = require('./src/services/notification.service');

  // ──────────────────────────────────────────────
  // TEST 1: notifyAnomalyDetected
  // ──────────────────────────────────────────────
  console.log('\n── TEST 1: notifyAnomalyDetected ──');
  const mockIncidentId1 = '00000000-0000-0000-0000-000000099999';
  const mockAnomalyId1 = '00000000-0000-0000-0000-000000099999';
  const mockIncidentId2 = '00000000-0000-0000-0000-000000099998';
  const mockIncidentId3 = '00000000-0000-0000-0000-000000099997';

  const mockIncident1 = { incident_id: mockIncidentId1, incident_number: 99999, title: 'TEST: CPU Spike' };
  const mockAnomaly1 = { anomaly_id: mockAnomalyId1, title: 'CPU Anomaly Test', server_id: null, service_id: null, application_id: null };
  try {
    await notificationService.notifyAnomalyDetected(mockIncident1, mockAnomaly1);
    console.log('✅ notifyAnomalyDetected() completed');
  } catch (err) {
    console.error('❌ notifyAnomalyDetected() failed:', err.message);
  }
  await new Promise(r => setTimeout(r, 1500));

  // ──────────────────────────────────────────────
  // TEST 2: notifyAnomalyAcknowledged
  // ──────────────────────────────────────────────
  console.log('\n── TEST 2: notifyAnomalyAcknowledged ──');
  const mockIncident2 = { incident_id: mockIncidentId2, incident_number: 99998, title: 'TEST: Memory Leak', assigned_to: testUser.id };
  try {
    await notificationService.notifyAnomalyAcknowledged(mockIncident2, testUser.id);
    console.log('✅ notifyAnomalyAcknowledged() completed');
  } catch (err) {
    console.error('❌ notifyAnomalyAcknowledged() failed:', err.message);
  }
  await new Promise(r => setTimeout(r, 1500));

  // ──────────────────────────────────────────────
  // TEST 3: notifyAnomalyResolved
  // ──────────────────────────────────────────────
  console.log('\n── TEST 3: notifyAnomalyResolved ──');
  const mockIncident3 = { incident_id: mockIncidentId3, incident_number: 99997, title: 'TEST: Disk Alert', assigned_to: testUser.id };
  try {
    await notificationService.notifyAnomalyResolved(mockIncident3, testUser.id);
    console.log('✅ notifyAnomalyResolved() completed');
  } catch (err) {
    console.error('❌ notifyAnomalyResolved() failed:', err.message);
  }
  await new Promise(r => setTimeout(r, 1500));

  // ──────────────────────────────────────────────
  // RESULTS
  // ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════');
  console.log(`Total socket events received by client: ${receivedNotifications.length}`);
  for (const n of receivedNotifications) {
    console.log(`  → [${n.notification_type}] "${n.title}" (notification_id=${n.notification_id})`);
  }

  const hasDetected = receivedNotifications.some(n => n.notification_type === 'anomaly_detected');
  const hasAcknowledged = receivedNotifications.some(n => n.notification_type === 'anomaly_acknowledged');
  const hasResolved = receivedNotifications.some(n => n.notification_type === 'anomaly_resolved');

  console.log('\n── VERDICT ──');
  console.log(`anomaly_detected    via socket: ${hasDetected     ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`anomaly_acknowledged via socket: ${hasAcknowledged ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`anomaly_resolved    via socket: ${hasResolved     ? '✅ PASS' : '❌ FAIL'}`);

  if (hasDetected && hasAcknowledged && hasResolved) {
    console.log('\n🎉 ALL TESTS PASSED — socket emissions work for all notification types');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED — check the output above');
  }

  // Clean up test notifications
  console.log('\n── CLEANUP ──');
  try {
    await db.query(`DELETE FROM notifications WHERE incident_id IN ($1, $2, $3) OR anomaly_id = $4`, [
      mockIncidentId1, mockIncidentId2, mockIncidentId3, mockAnomalyId1
    ]);
    console.log('✅ Test notifications cleaned up');
  } catch (err) {
    console.log('⚠️ Cleanup warning:', err.message);
  }

  // Tear down
  clientSocket.disconnect();
  server.close();
  await db.end();
  console.log('✅ Test complete. Exiting.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
