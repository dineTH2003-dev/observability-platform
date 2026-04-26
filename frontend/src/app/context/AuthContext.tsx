import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  signup: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state by checking if a token exists in either storage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!(localStorage.getItem('token') || sessionStorage.getItem('token'))
  );

  const login = () => {
    setIsAuthenticated(true);
  };

  const signup = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, signup, logout }}>
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
