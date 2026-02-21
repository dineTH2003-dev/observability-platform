import { useState } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Hosts } from './pages/infrastructure/Hosts';
import { Applications } from './pages/infrastructure/Applications';
import { Services } from './pages/infrastructure/Services';
import { ServiceMetrics } from './pages/infrastructure/ServiceMetrics';
import { Logs } from './pages/monitoring/Logs';
import { Anomalies } from './pages/anomalies/Anomalies';
import { Reports } from './pages/reports/Reports';
import { AlertSettings } from './pages/settings/alertSettings';
import {Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AuthLayout } from './layouts/AuthLayout';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './context/AuthContext';
import { Metrics } from './pages/monitoring/Metrics';

function AppContent() {
  const { isAuthenticated, login, signup, logout } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const { currentPage, selectedAnomalyId, selectedServiceId, handleNavigate } = useNavigation();

  // Authentication Views
  if (!isAuthenticated) {
    return (
      <AuthLayout>
        {authView === 'login' && (
          <Login 
            onLogin={login} 
            onSwitchToSignup={() => setAuthView('signup')} 
            onSwitchToForgotPassword={() => setAuthView('forgot-password')} 
          />
        )}
        {authView === 'forgot-password' && (
          <ForgotPassword onBackToLogin={() => setAuthView('login')} />
        )}
        {authView === 'signup' && (
          <Signup onSignup={signup} onSwitchToLogin={() => setAuthView('login')} />
        )}
      </AuthLayout>
    );
  }  


  return (
    <MainLayout currentPage={currentPage} onNavigate={handleNavigate} onLogout={logout}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === 'hosts' && <Hosts />}
      {currentPage === 'applications' && <Applications />}
      {currentPage === 'services' && <Services onNavigate={handleNavigate} />}
      {currentPage === 'service-metrics' && (<ServiceMetrics serviceId={selectedServiceId} onNavigate={handleNavigate} />)}
      
      {currentPage === 'logs' && <Logs />}
     
      
      {currentPage === 'anomalies' && <Anomalies selectedAnomalyId={selectedAnomalyId} />}
      
      {currentPage === 'alert-settings' && <AlertSettings />}
      {currentPage === 'reports' && <Reports />}
      {currentPage === 'alert-settings' && <AlertSettings />}
      {currentPage === 'metrics' && <Metrics />}
    </MainLayout>
  );
}
    

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
