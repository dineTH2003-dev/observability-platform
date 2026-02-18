import { 
  LayoutDashboard, 
  Server, 
  Box, 
  Layers, 
  FileText,
} from 'lucide-react';
import logoImage from '../../../assets/logo.png';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  sidebarCollapsed: boolean;
}

export function Sidebar({ currentPage, onNavigate, sidebarCollapsed }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { id: 'hosts', label: 'Hosts', icon: Server, section: 'infrastructure' },
    { id: 'applications', label: 'Applications', icon: Box, section: 'infrastructure' },
    { id: 'services', label: 'Services', icon: Layers, section: 'infrastructure' },
    { id: 'logs', label: 'Logs', icon: FileText, section: 'monitoring' },
  ];

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'main': return null;
      case 'infrastructure': return 'INFRASTRUCTURE';
      case 'monitoring': return 'MONITORING';
      default: return null;
    }
  };

  const groupedNavItems = navItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

  return (
    <aside 
      className={`${
        sidebarCollapsed ? 'w-20' : 'w-64'
      } bg-nebula-navy-dark border-r border-nebula-navy-lighter transition-all duration-300 flex flex-col`}
    >
      {/* Logo */}
      <div className="h-20 flex items-center justify-center border-b border-nebula-navy-lighter px-4">
        {sidebarCollapsed ? (
          <img 
            src={logoImage} 
            alt="CloudSight Logo" 
            className="w-10 h-10 object-contain"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img 
              src={logoImage} 
              alt="CloudSight Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-nebula-cyan via-nebula-purple to-nebula-pink bg-clip-text text-transparent">
              CloudSight
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {Object.entries(groupedNavItems).map(([section, items]) => (
          <div key={section}>
            {getSectionTitle(section) && !sidebarCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 tracking-wider">
                  {getSectionTitle(section)}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-nebula-purple text-white shadow-lg shadow-nebula-purple/20'
                        : 'text-slate-400 hover:text-white hover:bg-nebula-navy-lighter'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="size-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}