const IncidentModel  = require('../models/incident.model');
const AnomalyModel   = require('../models/anomaly.model');
const TimelineModel  = require('../models/incident_timeline.model');
const db             = require('../config/db');
const ApiError       = require('../utils/apiError');
const { broadcastIncidentEvent, broadcastAnomalyEvent } = require('../socket');

// ─────────────────────────────────────────────────────────────
//  CREATE — called when an anomaly is detected (auto or manual)
// ─────────────────────────────────────────────────────────────
exports.createIncidentFromAnomaly = async (anomalyData) => {
  // 1. Create the incident row first
  const incident = await IncidentModel.create({
    title:       anomalyData.title,
    description: anomalyData.description || null,
    severity:    anomalyData.severity    || 'medium',
  });

  // 2. Create the anomaly row
  const anomaly = await AnomalyModel.create(anomalyData);

  // 3. Link the anomaly → incident
  await AnomalyModel.linkToIncident(anomaly.anomaly_id, incident.incident_id);

  // 4. Log the first timeline event (system action — no actor)
  await TimelineModel.addEvent(
    incident.incident_id,
    null,
    'created',
    `Incident auto-created from ${anomalyData.anomaly_type} anomaly (value: ${anomalyData.metric_value ?? 'N/A'})`
  );

  // Trigger notification
  const notificationService = require('./notification.service');
  notificationService.notifyAnomalyDetected(incident, anomaly).catch(err => {
    console.error('notifyAnomalyDetected failed:', err.message);
  });

  // Real-time broadcast
  try {
    broadcastIncidentEvent('incident_created', incident);
    broadcastAnomalyEvent('anomaly_created', anomaly);
  } catch (err) {
    console.error('Socket broadcast failed (incident_created):', err.message);
  }

  return { incident, anomaly };
};

// ─────────────────────────────────────────────────────────────
//  READ — list incidents
//  Admins see ALL, engineers see only their own
// ─────────────────────────────────────────────────────────────
exports.getIncidents = async (user) => {
  if (user.role === 'admin') {
    return await IncidentModel.findAll();
  }
  return await IncidentModel.findByAssignee(user.userId);
};

// ─────────────────────────────────────────────────────────────
//  READ — single incident with full timeline
// ─────────────────────────────────────────────────────────────
exports.getIncidentById = async (id) => {
  const incident = await IncidentModel.findById(id);
  if (!incident) throw new ApiError(404, 'Incident not found');

  // Attach the full timeline to the incident object
  incident.timeline = await TimelineModel.getByIncident(id);

  return incident;
};

// ─────────────────────────────────────────────────────────────
//  ASSIGN — admin picks an engineer for an incident
// ─────────────────────────────────────────────────────────────
exports.assignEngineer = async (incidentId, engineerId, actorId) => {
  // Validate the engineer exists in the users table
  const { rows } = await db.query(
    `SELECT id, email FROM users WHERE id = $1 AND is_active = true`,
    [engineerId]
  );
  if (!rows[0]) throw new ApiError(404, 'Engineer not found or inactive');

  const updated = await IncidentModel.assignEngineer(incidentId, engineerId);
  if (!updated) throw new ApiError(404, 'Incident not found');

  // Log the assignment in the timeline
  await TimelineModel.addEvent(
    incidentId,
    actorId,
    'assigned',
    `Assigned to ${rows[0].email}`
  );

  // Also update the linked anomaly status to 'assigned'
  await db.query(
    `UPDATE anomalies SET status = 'assigned' WHERE incident_id = $1`,
    [incidentId]
  );

  // Trigger notification
  const notificationService = require('./notification.service');
  notificationService.notifyEngineerAssigned(updated, engineerId, actorId).catch(err => {
    console.error('notifyEngineerAssigned failed:', err.message);
  });

  // Real-time broadcast
  try {
    broadcastIncidentEvent('incident_updated', {
      ...updated,
      action: 'assigned',
    });
  } catch (err) {
    console.error('Socket broadcast failed (incident_updated assign):', err.message);
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────
//  ACKNOWLEDGE — engineer confirms they are working on it
// ─────────────────────────────────────────────────────────────
exports.acknowledgeIncident = async (incidentId, actorId) => {
  const incident = await IncidentModel.findById(incidentId);
  if (!incident)            throw new ApiError(404, 'Incident not found');
  if (incident.status !== 'open') throw new ApiError(400, `Cannot acknowledge — incident is already '${incident.status}'`);
  if (!incident.assigned_to)      throw new ApiError(400, 'Incident must be assigned to an engineer before acknowledging');

  const updated = await IncidentModel.updateStatus(incidentId, 'acknowledged', {
    acknowledged_at: new Date(),
  });

  // Update linked anomalies too
  await db.query(
    `UPDATE anomalies SET status = 'acknowledged' WHERE incident_id = $1`,
    [incidentId]
  );

  await TimelineModel.addEvent(incidentId, actorId, 'acknowledged', 'Incident acknowledged — engineer is investigating');

  // Trigger notification
  const notificationService = require('./notification.service');
  notificationService.notifyAnomalyAcknowledged(updated, actorId).catch(err => {
    console.error('notifyAnomalyAcknowledged failed:', err.message);
  });

  // Real-time broadcast
  try {
    broadcastIncidentEvent('incident_updated', {
      ...updated,
      action: 'acknowledged',
    });
  } catch (err) {
    console.error('Socket broadcast failed (incident_updated ack):', err.message);
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────
//  RESOLVE — engineer marks the incident as fixed
// ─────────────────────────────────────────────────────────────
exports.resolveIncident = async (incidentId, actorId) => {
  const incident = await IncidentModel.findById(incidentId);
  if (!incident)                   throw new ApiError(404, 'Incident not found');
  if (incident.status === 'resolved') throw new ApiError(400, 'Incident is already resolved');

  const updated = await IncidentModel.updateStatus(incidentId, 'resolved', {
    resolved_at: new Date(),
  });

  // Mark all linked anomalies as resolved too
  await db.query(
    `UPDATE anomalies SET status = 'resolved', resolved_at = NOW() WHERE incident_id = $1`,
    [incidentId]
  );

  await TimelineModel.addEvent(incidentId, actorId, 'resolved', 'Incident resolved');

  // Trigger notification
  const notificationService = require('./notification.service');
  notificationService.notifyAnomalyResolved(updated, actorId).catch(err => {
    console.error('notifyAnomalyResolved failed:', err.message);
  });

  // Real-time broadcast
  try {
    broadcastIncidentEvent('incident_updated', {
      ...updated,
      action: 'resolved',
    });
  } catch (err) {
    console.error('Socket broadcast failed (incident_updated resolve):', err.message);
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────
//  ENGINEERS — list of users available to assign
// ─────────────────────────────────────────────────────────────
exports.getEngineers = async () => {
  const { rows } = await db.query(
    `SELECT id, email, role
     FROM users
     WHERE is_active = true
     ORDER BY email ASC`
  );
  return rows;
};
