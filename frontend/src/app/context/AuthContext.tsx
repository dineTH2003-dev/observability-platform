import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserProfile } from '../types/user';
import { getProfile } from '../../api/profileApi';

export type UserRole = 'admin' | 'engineer';

export type AuthUser = UserProfile;

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (authData: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  }) => void;
  signup: () => void;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  refreshProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseStoredUser(): UserProfile | null {
  const stored = localStorage.getItem('user');
  if (!stored) return null;

  try {
    return JSON.parse(stored) as UserProfile;
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
const initialState = getInitialAuthState();

const [user, setUser] = useState<UserProfile | null>(initialState.user);
const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
  initialState.isAuthenticated
);
const [isLoading, setIsLoading] = useState<boolean>(true);

const clearAuth = () => {
  clearStoredAuth();
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  setUser(null);
  setIsAuthenticated(false);
};

const refreshProfile = async () => {
  const profile = await getProfile();
  setUser(profile);
  localStorage.setItem("user", JSON.stringify(profile));
  setIsAuthenticated(true);
};

  const login = (authData: {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
  }) => {
const login = (authData: {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}) => {
  localStorage.setItem("accessToken", authData.accessToken);
  localStorage.setItem("refreshToken", authData.refreshToken);
  localStorage.setItem("user", JSON.stringify(authData.user));

  setUser(authData.user);
  setIsAuthenticated(isUsableAccessToken(authData.accessToken));
};
  };

  const signup = () => {};

  const logout = () => {
const logout = () => {
  clearAuth();
  window.location.href = "/login";
};
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role as UserRole);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token =
        localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await refreshProfile();
      } catch (error) {
        console.error("Auth bootstrapping failed:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        signup,
        logout,
        hasRole,
        refreshProfile,
        setUser,
      }}
    >
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
