import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiAnomaly {
  anomaly_id: string;
  server_id?: number | null;
  service_id?: number | null;
  application_id?: number | null;
  anomaly_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description?: string | null;
  metric_value?: number | string | null;
  threshold?: number | string | null;
  status: 'detected' | 'assigned' | 'acknowledged' | 'resolved';
  incident_id?: string | null;
  detected_at: string;
  resolved_at?: string | null;
  server_name?: string | null;
  service_name?: string | null;
  application_name?: string | null;
  assigned_to?: string | null;
  assigned_email?: string | null;
  incident_number?: number | null;
  model_id?: string | null;
  entity_type?: 'server' | 'service' | 'application' | null;
  detector_name?: string | null;
  score?: number | string | null;
  confidence?: number | string | null;
  window_start?: string | null;
  window_end?: string | null;
  expected_value?: number | string | null;
  lower_bound?: number | string | null;
  upper_bound?: number | string | null;
  feature_values?: Record<string, number | string | null> | null;
  reason_codes?: string[] | null;
  fingerprint?: string | null;
  suppression_reason?: string | null;
  feedback?: Array<{
    feedback_id: string;
    label: 'true_positive' | 'false_positive' | 'expected_change' | 'duplicate' | 'unknown';
    comment?: string | null;
    created_by?: string | null;
    created_by_email?: string | null;
    created_at: string;
  }>;
}

export const fetchAnomalies = async () => {
  const response = await API.get('/anomalies');
  const res = response.data;
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const fetchAnomalyById = async (anomalyId: string) => {
  const response = await API.get(`/anomalies/${anomalyId}`);
  const res = response.data;
  return res?.data ?? res;
};

export const addAnomalyFeedback = async (
  anomalyId: string,
  label: 'true_positive' | 'false_positive' | 'expected_change' | 'duplicate' | 'unknown',
  comment?: string,
) => {
  const response = await API.post(`/anomalies/${anomalyId}/feedback`, { label, comment });
  return response.data;
};
