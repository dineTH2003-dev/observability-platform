const express  = require('express');
const router   = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const {
  getIncidents,
  getEngineers,
  getIncidentById,
  createIncident,
  assignEngineer,
  acknowledgeIncident,
  resolveIncident,
  getRecommendation,
} = require('../controllers/incident.controller');

// NOTE: /engineers MUST be before /:id so Express doesn't treat "engineers" as an ID param
router.get('/',                       authenticate, getIncidents);
router.post('/',                      authenticate, createIncident);
router.get('/engineers',              authenticate, getEngineers);
router.get('/:id',                    authenticate, getIncidentById);
router.patch('/:id/assign',           authenticate, authorize(['admin']), assignEngineer);
router.patch('/:id/acknowledge',      authenticate, acknowledgeIncident);
router.patch('/:id/resolve',          authenticate, resolveIncident);
// On-demand AI recommendation (admin and engineer — both need this for their work)
router.post('/:id/recommendation',    authenticate, getRecommendation);

module.exports = router;

