import { ReactNode } from 'react';
import { AuthProvider } from './context/AuthContext';

import { SocketProvider } from './context/SocketContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </AuthProvider>
  );
}
