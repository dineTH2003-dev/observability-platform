/**
 * Authentication Service
 * Handles login, logout, and authentication state
 */

import { api } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-token-123',
          user: {
            id: '1',
            email: credentials.email,
            name: 'Admin User',
            role: 'admin',
          },
        });
      }, 500);
    });
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-token-123',
          user: {
            id: '1',
            email: data.email,
            name: data.name || 'New User',
            role: 'user',
          },
        });
      }, 500);
    });
  },

  async logout(): Promise<void> {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 200);
    });
  },

  async resetPassword(email: string): Promise<void> {
    // Mock implementation - replace with actual API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  },
};
