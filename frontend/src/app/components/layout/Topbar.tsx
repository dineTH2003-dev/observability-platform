import { useState, useEffect } from 'react';
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
import { useSocket } from '../../context/SocketContext';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../../api/notificationApi';

interface TopbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  currentUser: UserProfile | null;
}

export function Topbar({ currentPage, onNavigate, onLogout, onToggleSidebar, currentUser }: TopbarProps) {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDays === 1) return 'yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return 'some time ago';
    }
  }

  function mapDbToUiNotification(n: any): Notification {
    let fromLabel = 'System';
    if (n.sender_user_id) {
      fromLabel = n.sender_email || 'User';
    }
    const timestamp = formatRelativeTime(n.created_at);

    return {
      id: String(n.notification_id),
      type: n.notification_type as any,
      title: n.title,
      message: n.message,
      timestamp: timestamp,
      read: n.is_read,
      severity: n.severity || 'medium',
      from: fromLabel,
      to: 'You'
    };
  }

  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications({ limit: 50 });
      if (res && res.notifications) {
        const mapped = res.notifications.map(mapDbToUiNotification);
        setNotifications(mapped);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Register user on socket connection & load notifications
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    if (socket && isConnected && currentUser) {
      socket.emit('register_user', currentUser.id);
    }
  }, [socket, isConnected, currentUser]);

  // Listen to live notifications
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (dbNotif: any) => {
      const uiNotif = mapDbToUiNotification(dbNotif);
      setNotifications(prev => [uiNotif, ...prev]);

      // Subtly play notification sound if supported
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    };

    socket.on('new_notification', handleNewNotification);
    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, isConnected]);

  // Read notifications in the local dashboard page event
  useEffect(() => {
    // Poll or reload notifications when returning to dashboard or current page changes
    if (currentUser) {
      loadNotifications();
    }
  }, [currentPage]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
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
          onClearAll={handleClearAll}
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
