import { useState, ReactNode } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

interface MainLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function MainLayout({ children, currentPage, onNavigate, onLogout }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-nebula-navy-bg flex">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Topbar 
          currentPage={currentPage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="h-12 bg-nebula-navy-dark border-t border-nebula-navy-lighter px-6 flex items-center justify-center">
          <p className="text-xs text-slate-500">©2026 CloudSight. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
}
