import { api } from './api';
import type { Host } from '../types/host';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const hostService = {
  // =========================
  // Get All Hosts
  // =========================
  async getAll(): Promise<Host[]> {
    const response = await api.get<ApiResponse<Host[]>>('/hosts');
    return response.data;
  },

  // =========================
  // Get Host By ID
  // =========================
  async getById(id: number): Promise<Host> {
    const response = await api.get<ApiResponse<Host>>(`/hosts/${id}`);
    return response.data;
  },

  // =========================
  // Register Host
  // =========================
  async register(data: {
    hostname: string;
    ip_address: string;
    username: string;
    os: string;
    ssh_port?: number;
    environment: string;
  }): Promise<Host> {
    const response = await api.post<ApiResponse<Host>>('/hosts', data);
    return response.data;
  },

  // =========================
  // Update Host
  // =========================
  async update(id: number, data: Partial<Host>): Promise<Host> {
    const response = await api.put<ApiResponse<Host>>(`/hosts/${id}`, data);
    return response.data;
  },

  // =========================
  // Delete Host
  // =========================
  async delete(id: number): Promise<void> {
    await api.delete(`/hosts/${id}`);
  },

  // =========================
  // Download Installer Script
  // =========================
  async downloadInstaller(id: number): Promise<Blob> {
    return await api.get<Blob>(
      `/hosts/${id}/download-installer`,
      { responseType: "blob" }
    );
  }
};