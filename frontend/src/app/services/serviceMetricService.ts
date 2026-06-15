import { api } from './api';

export interface ServiceMetric {
  recorded_at: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  thread_count: number;
}

export const serviceMetricService = {
  async getServiceMetrics(serviceId: number, timeRange = '1h', limit = 60): Promise<ServiceMetric[]> {
    const response = await api.get<{ success: boolean; data: ServiceMetric[] }>(`/metrics/service/${serviceId}?timeRange=${timeRange}&limit=${limit}`);
    return response.data;
  }
};
