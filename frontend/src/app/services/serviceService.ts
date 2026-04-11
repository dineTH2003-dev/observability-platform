import { api } from './api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Service {
  service_id: number;
  server_id: number;
  application_id: number | null;
  name: string;
  service_identifier: string | null;
  process_id: number | null;
  technology: string | null;
  status: string;          // RUNNING | STOPPED | UNKNOWN
  discovered_at: string;
  updated_at: string;
  application_name: string | null;
  server_name: string | null;
  log_path: string | null;
  logs_analyses_active: boolean | null;
}

export const serviceService = {

  async getAll(): Promise<Service[]> {
    const res = await api.get<ApiResponse<Service[]>>('/services');
    return res.data;
  },

  async updateApplication(serviceId: number, applicationId: number): Promise<Service> {
    const res = await api.put<ApiResponse<Service>>(
      `/services/${serviceId}/application`,
      { application_id: applicationId },
    );
    return res.data;
  },

  async delete(serviceId: number): Promise<void> {
    await api.delete<ApiResponse<void>>(`/services/${serviceId}`);
  },

  async saveLogConfig(
    serviceId: number,
    data: { log_path: string; is_enabled: boolean },
  ): Promise<void> {
    await api.post<ApiResponse<void>>(`/services/${serviceId}/log-config`, data);
  },
};
