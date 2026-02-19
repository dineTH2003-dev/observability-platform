/**
 * User type definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'devops' | 'sre' | 'viewer';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserProfile extends User {
  phone?: string;
  department?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  dashboard: {
    refreshInterval: number;
    defaultView: string;
  };
}
