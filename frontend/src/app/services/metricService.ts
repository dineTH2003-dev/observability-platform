import { api } from './api';

export interface ServerMetric {
  recorded_at: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  thread_count: number;
}

export const metricService = {
  async getServerMetrics(serverId: number, limit = 60): Promise<ServerMetric[]> {
    const response = await api.get<{ success: boolean; data: ServerMetric[] }>(`/metrics/server/${serverId}?limit=${limit}`);
    return response.data;
  }
};
