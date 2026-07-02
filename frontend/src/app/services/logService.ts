import { api } from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Log {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  service: string;
  host: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const logService = {
  async fetchLogs(filters?: {
    level?: string;
    service?: string;
    host?: string;
    search?: string;
  }): Promise<Log[]> {
    let url = '/logs';
    if (filters) {
      const params = new URLSearchParams();
      if (filters.level && filters.level !== 'all') params.append('level', filters.level);
      if (filters.service && filters.service !== 'all') params.append('service', filters.service);
      if (filters.host && filters.host !== 'all') params.append('host', filters.host);
      if (filters.search) params.append('search', filters.search);
      const query = params.toString();
      if (query) {
        url += `?${query}`;
      }
    }
    const res = await api.get<ApiResponse<Log[]>>(url);
    return res.data;
  },

  async getLogById(id: string): Promise<Log> {
    const res = await api.get<ApiResponse<Log>>(`/logs/${id}`);
    return res.data;
  },
};
