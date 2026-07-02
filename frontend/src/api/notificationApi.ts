import api from './api';

export interface NotificationResponse {
  notifications: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchNotifications = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean | string;
}): Promise<NotificationResponse> => {
  const { data } = await api.get('/notifications', { params });
  return data;
};

export const fetchUnreadCount = async (): Promise<{ count: number }> => {
  const { data } = await api.get('/notifications/unread-count');
  return data;
};

export const markAsRead = async (id: string | number): Promise<any> => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async (): Promise<{ updated: number }> => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};

export const deleteNotification = async (id: string | number): Promise<any> => {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
};
