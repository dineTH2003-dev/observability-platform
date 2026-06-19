import { ReactNode } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { AccessDenied } from '../../pages/accessDenied/AccessDenied';

interface ProtectedRouteProps {
  allowedRoles: Array<'admin' | 'engineer'>;
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
