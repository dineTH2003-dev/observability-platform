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
import { Metrics } from './pages/monitoring/Metrics';

function AppContent() {
  const { currentPage, selectedServiceId, handleNavigate } = useNavigation();



  return (
    <MainLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}

    >
      {currentPage === 'dashboard' && (
        <Dashboard onNavigate={handleNavigate} />
      )}

      {currentPage === 'hosts' && <Hosts />}

      {currentPage === 'applications' && <Applications />}

      {currentPage === 'services' && (
        <Services onNavigate={handleNavigate} />
      )}

      {currentPage === 'service-metrics' && (
        <ServiceMetrics
          serviceId={selectedServiceId}
          onNavigate={handleNavigate}
        />
      )}

      {currentPage === 'logs' && <Logs />}
      {currentPage === 'anomalies' && <Anomalies />}
      {currentPage === 'reports' && <Reports />}
       {currentPage === 'alert-settings' && <AlertSettings />}
      {currentPage === 'metrics' && <Metrics />}
    </MainLayout>
  );
}

export default function App() {
  return <AppContent />;
}
