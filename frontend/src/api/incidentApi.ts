import axios from 'axios';

// Reuse the same base URL pattern as authApi.ts
// Vite proxy forwards /api → http://localhost:9000/api automatically
const API = axios.create({
  baseURL: 'http://localhost:9000/api',
});

// Attach the JWT token from localStorage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Incidents ───────────────────────────────────────────────

// GET /api/incidents  (admin sees all, engineer sees only theirs)
export const fetchIncidents = () =>
  API.get('/incidents').then((r) => r.data);

// GET /api/incidents/:id  (full detail with anomalies + timeline)
export const fetchIncidentById = (id: string) =>
  API.get(`/incidents/${id}`).then((r) => r.data);

// POST /api/incidents  (create incident + anomaly together)
export const createIncident = (data: {
  title: string;
  severity: string;
  anomaly_type: string;
  metric_value?: number;
  threshold?: number;
  server_id?: number;
  service_id?: number;
  description?: string;
}) => API.post('/incidents', data).then((r) => r.data);

// PATCH /api/incidents/:id/assign  (admin only)
export const assignEngineer = (incidentId: string, engineerId: string) =>
  API.patch(`/incidents/${incidentId}/assign`, { engineerId }).then((r) => r.data);

// PATCH /api/incidents/:id/acknowledge
export const acknowledgeIncident = (incidentId: string) =>
  API.patch(`/incidents/${incidentId}/acknowledge`, {}).then((r) => r.data);

// PATCH /api/incidents/:id/resolve
export const resolveIncident = (incidentId: string) =>
  API.patch(`/incidents/${incidentId}/resolve`, {}).then((r) => r.data);

// ─── Engineers ───────────────────────────────────────────────

// GET /api/incidents/engineers  (list of users for assign dropdown)
export const fetchEngineers = () =>
  API.get('/incidents/engineers').then((r) => r.data);
