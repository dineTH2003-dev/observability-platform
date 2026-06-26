import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { useEffect, useState } from 'react';
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
import { Settings } from './pages/settings/settings';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { AuthLayout } from './layouts/AuthLayout';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Metrics } from './pages/monitoring/Metrics';
import { Tickets } from './pages/tickets/Tickets';
import { Toaster } from './components/ui/sonner';
import { ResetPassword } from './pages/auth/ResetPassword';
import { Incidents } from './pages/incidents/Incidents';
import { Profile } from './pages/profile/Profile';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

const authPathToView: Record<string, AuthView> = {
  '/login': 'login',
  '/signup': 'signup',
  '/forgot-password': 'forgot-password',
  '/reset-password': 'reset-password',
};

function replacePath(path: string) {
  if (window.location.pathname !== path) {
    window.history.replaceState(null, '', `${path}${window.location.search}`);
  }
}

function AppContent() {
  const { isAuthenticated, isLoading, login, signup, logout, user } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>('login');
  const { isAuthenticated, login, logout, hasRole } = useAuth();
  const [authView, setAuthView] = useState<AuthView>(() => {
    return authPathToView[window.location.pathname] ?? 'login';
  });
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const { currentPage, selectedAnomalyId, selectedServiceId, handleNavigate } = useNavigation();

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nebula-navy-bg flex items-center justify-center text-slate-400">
        Loading CloudSight...
      </div>
    );
  }

  if (!isAuthenticated) {
    if (token) {
      return (
        <AuthLayout>
          <ResetPassword onBackToLogin={() => setAuthView('login')} />
        </AuthLayout>
      );
    }

    return (
      <AuthLayout>
        {authView === 'login' && (
          <Login
            onLogin={login}
            onSwitchToSignup={() => showAuthView('signup', '/signup')}
            onSwitchToForgotPassword={() => showAuthView('forgot-password', '/forgot-password')}
          />
        )}
        {authView === 'forgot-password' && (
          <ForgotPassword onBackToLogin={() => showAuthView('login', '/login')} />
        )}
        {authView === 'signup' && (
          <Signup onSignup={login} onSwitchToLogin={() => showAuthView('login', '/login')} />
        )}
      </AuthLayout>
    );
  }

  const pagesRequiringAdmin = ['reports', 'alert-settings', 'settings'];
  const pageIsAdminOnly = pagesRequiringAdmin.includes(currentPage);

  if (pageIsAdminOnly && !hasRole(['admin'])) {
    return (
      <MainLayout currentPage={currentPage} onNavigate={handleNavigate} onLogout={logout}>
        <div className="rounded-3xl border border-red-500/20 bg-nebula-navy-dark p-12 text-slate-100 shadow-xl shadow-red-500/20">
          <h1 className="text-3xl font-semibold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-6">You do not have permission to access this page.</p>
          <button
            onClick={() => handleNavigate('dashboard')}
            className="inline-flex items-center justify-center rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white hover:bg-red-400"
          >
            Go to Dashboard
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout currentPage={currentPage} onNavigate={handleNavigate} onLogout={logout} currentUser={user}>
      {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === 'profile' && <Profile onLogout={logout} />}
      {currentPage === 'hosts' && <Hosts />}
      {currentPage === 'applications' && <Applications />}
      {currentPage === 'services' && <Services onNavigate={handleNavigate} />}
      {currentPage === 'service-metrics' && (<ServiceMetrics serviceId={selectedServiceId} onNavigate={handleNavigate} />)}
      {currentPage === 'logs' && <Logs />}
      {currentPage === 'anomalies' && <Anomalies selectedAnomalyId={selectedAnomalyId} />}
      {currentPage === 'reports' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <Reports />
        </ProtectedRoute>
      )}
      {currentPage === 'incidents' && <Incidents />}
      {currentPage === 'alert-settings' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <AlertSettings />
        </ProtectedRoute>
      )}
      {currentPage === 'settings' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <Settings />
        </ProtectedRoute>
      )}
      {currentPage === 'metrics' && <Metrics />}
      {currentPage === 'notifications' && <NotificationsPage onNavigate={handleNavigate} />}
      {currentPage === 'tickets' && <Tickets />}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}
