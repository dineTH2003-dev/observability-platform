/**
 * Log Service
 * Handles log-related API calls
 */

import { api } from './api';

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
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 500);
    });
  },

  async getLogById(id: string): Promise<Log> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          timestamp: new Date().toISOString(),
          level: 'info',
          service: 'mock-service',
          host: 'mock-host',
          message: 'Mock log message',
        });
      }, 500);
    });
  },
};
