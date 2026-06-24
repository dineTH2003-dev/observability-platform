import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:9000/api',
});

// Attach the JWT token from storage to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Alert Rules ───────────────────────────────────────────────

export const fetchAlertRules = () =>
  API.get('/alerts').then((r) => r.data);

export const createAlertRule = (data: any) =>
  API.post('/alerts', data).then((r) => r.data);

export const updateAlertRule = (ruleId: string, data: any) =>
  API.patch(`/alerts/${ruleId}`, data).then((r) => r.data);

export const deleteAlertRule = (ruleId: string) =>
  API.delete(`/alerts/${ruleId}`).then((r) => r.data);

// ─── Alert Settings ───────────────────────────────────────────────

export const fetchAlertSettings = () =>
  API.get('/alert-settings').then((r) => r.data);

export const saveAlertSettings = (data: any) =>
  API.post('/alert-settings', data).then((r) => r.data);
