import { ReactNode } from 'react';
import { useAuthContext, type UserRole } from '../../context/AuthContext';
import { AccessDenied } from '../../pages/accessDenied/AccessDenied';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthContext();

  if (!isAuthenticated || !user) {
    return <AccessDenied />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
