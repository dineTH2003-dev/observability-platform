import { api } from './api';
import type { Application } from '../types/application';

export const applicationService = {
  getAll: () =>
    api.get<{ success: boolean; data: Application[] }>('/applications'),
  getById: (id: number) =>
    api.get<Application>(`/applications/${id}`),

  create: (data: Partial<Application>) =>
    api.post<Application>('/applications', data),

  update: (id: number, data: Partial<Application>) =>
    api.put<Application>(`/applications/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/applications/${id}`),
};