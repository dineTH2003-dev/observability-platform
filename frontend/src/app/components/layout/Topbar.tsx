import { useState } from 'react';
import { 
  Menu,
  LayoutGrid,
  Search,
  Moon,
  User,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import type { Notification } from '../ui/NotificationDropdown';
import type { UserProfile } from '../../types/user';

interface TopbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  currentUser: UserProfile | null;
}

export function Topbar({ currentPage, onNavigate, onLogout, onToggleSidebar, currentUser }: TopbarProps) {
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

  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.trim().toUpperCase();
  const displayName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || currentUser?.email || 'Profile';

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
            >
              <div className="w-8 h-8 overflow-hidden rounded-full bg-gradient-to-br from-nebula-cyan to-nebula-purple flex items-center justify-center">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={displayName} className="h-full w-full object-cover" />
                ) : initials ? (
                  <span className="text-xs font-semibold text-white">{initials}</span>
                ) : (
                  <User className="size-4 text-white" />
                )}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{currentUser?.role || 'User'}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="bg-nebula-navy-dark border-nebula-navy-lighter w-40">

            {/* Profile */}
            <DropdownMenuItem
              onClick={() => onNavigate('profile')}
              className="text-white hover:bg-nebula-navy-lighter cursor-pointer"
            >
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-nebula-navy-lighter" />

            {/* Logout */}
            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-400 hover:bg-nebula-navy-lighter cursor-pointer"
            >
              Logout
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
