import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'engineer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (authData: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(user: Partial<AuthUser> | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id ?? '',
    email: user.email ?? '',
    role: user.role === 'admin' ? 'admin' : 'engineer',
  };
}

function parseStoredUser(): AuthUser | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;

  try {
    return normalizeUser(JSON.parse(stored) as Partial<AuthUser>);
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function isUsableAccessToken(token: string | null): token is string {
  if (!token) return false;

  try {
    const [, payload] = token.split('.');
    if (!payload) return false;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '='
    );
    const decoded = JSON.parse(atob(paddedPayload)) as { exp?: number };

    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function getInitialAuthState() {
  const accessToken = localStorage.getItem('accessToken');
  const user = parseStoredUser();

  if (!user || !isUsableAccessToken(accessToken)) {
    clearStoredAuth();
    return { user: null, isAuthenticated: false };
  }

  return { user, isAuthenticated: true };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState(getInitialAuthState);
  const { user, isAuthenticated } = authState;

  const login = (authData: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => {
    const normalizedUser = normalizeUser(authData.user);
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    setAuthState({
      user: normalizedUser,
      isAuthenticated: !!normalizedUser && isUsableAccessToken(authData.accessToken),
    });
  };

  const logout = () => {
    clearStoredAuth();
    setAuthState({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
