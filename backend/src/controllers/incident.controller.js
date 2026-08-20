const incidentService = require('../services/incident.service');
const geminiService = require('../services/gemini.service');

// GET /api/incidents
async function getIncidents(req, res) {
  try {
    const incidents = await incidentService.getIncidents(req.user);
    res.json(incidents);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// GET /api/incidents/engineers
async function getEngineers(req, res) {
  try {
    const engineers = await incidentService.getEngineers();
    res.json(engineers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/incidents/:id
async function getIncidentById(req, res) {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    res.json(incident);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// GET /api/incidents/:id/recommendation
async function getIncidentRecommendation(req, res) {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    const recommendation = await geminiService.generateIncidentRecommendation(incident);
    res.json({
      success: true,
      incident_id: incident.incident_id,
      ...recommendation,
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// POST /api/incidents
async function createIncident(req, res) {
  try {
    const result = await incidentService.createIncidentFromAnomaly(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// PATCH /api/incidents/:id/assign
async function assignEngineer(req, res) {
  try {
    const updated = await incidentService.assignEngineer(
      req.params.id,
      req.body.engineerId,
      req.user.userId
    );
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// PATCH /api/incidents/:id/acknowledge
async function acknowledgeIncident(req, res) {
  try {
    const updated = await incidentService.acknowledgeIncident(req.params.id, req.user.userId);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

// PATCH /api/incidents/:id/resolve
async function resolveIncident(req, res) {
  try {
    const updated = await incidentService.resolveIncident(req.params.id, req.user.userId);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
}

module.exports = {
  getIncidents,
  getEngineers,
  getIncidentById,
  getIncidentRecommendation,
  createIncident,
  assignEngineer,
  acknowledgeIncident,
  resolveIncident,
};

