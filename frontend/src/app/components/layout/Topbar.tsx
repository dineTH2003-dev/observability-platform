import { useState } from 'react';
import { 
  Menu,
  LayoutGrid,
  Search,
  BellRing,
  Moon,
  User,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { NotificationDropdown, Notification } from '../ui/NotificationDropdown';

interface TopbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({ currentPage, onNavigate, onToggleSidebar }: TopbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'anomaly_detected',
      title: 'Critical Anomaly Detected',
      message: 'High CPU usage detected on prod-db-01. Current usage: 95%. Immediate attention required.',
      timestamp: '2 minutes ago',
      read: false,
      severity: 'critical',
      from: 'System',
      to: 'Admin'
    },
    {
      id: '2',
      type: 'anomaly_assigned',
      title: 'Anomaly Assigned to You',
      message: 'Admin Sarah Chen has assigned you to investigate memory leak issue in API Gateway service.',
      timestamp: '15 minutes ago',
      read: false,
      severity: 'high',
      from: 'Sarah Chen (Admin)',
      to: 'You'
    },
    {
      id: '3',
      type: 'anomaly_acknowledged',
      title: 'Developer Acknowledged Anomaly',
      message: 'Mike Johnson acknowledged the database connection pool exhaustion anomaly and is investigating.',
      timestamp: '1 hour ago',
      read: false,
      severity: 'medium',
      from: 'Mike Johnson (Developer)',
      to: 'Admin'
    },
    {
      id: '4',
      type: 'anomaly_resolved',
      title: 'Anomaly Resolved',
      message: 'Alex Kumar successfully resolved the cache invalidation issue. Root cause: Redis configuration mismatch.',
      timestamp: '2 hours ago',
      read: true,
      severity: 'medium',
      from: 'Alex Kumar (Developer)',
      to: 'Admin'
    },
    {
      id: '5',
      type: 'alert_rule',
      title: 'Alert Rule Triggered: High Error Rate',
      message: 'Error rate exceeded threshold (>5%) for Payment Gateway. Current rate: 8.3%. Alert rule: "Payment Service Health"',
      timestamp: '3 hours ago',
      read: true,
      severity: 'high',
      from: 'Alert System',
      to: 'Admin'
    },
  ]);

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleViewAll = () => {
    onNavigate('notifications');
  };

  return (
    <header className="h-20 bg-nebula-navy-dark border-b border-nebula-navy-lighter px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
        >
          <Menu className="size-5" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <LayoutGrid className="size-4 text-slate-500" />
          <span className="text-slate-500">Pages</span>
          <span className="text-slate-500">/</span>
          <span className="text-white capitalize">{currentPage}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-nebula-navy-light border-nebula-navy-lighter text-white placeholder:text-slate-500 h-10"
          />
        </div>

        {/* Notifications */}
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onViewAll={handleViewAll}
        />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
        >
          <Moon className="size-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nebula-cyan to-nebula-purple flex items-center justify-center">
                <User className="size-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </div>
    </header>
  );
}