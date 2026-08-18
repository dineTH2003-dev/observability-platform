import { useState, useEffect, useCallback, useRef } from 'react';
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
import { AlertToastStack } from '../ui/AlertToastStack';
import type { ToastItem } from '../ui/AlertToastStack';
import type { UserProfile } from '../../types/user';
import { useSocket } from '../../context/SocketContext';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../../api/notificationApi';
import { getNotificationNavigationTarget, mapApiNotificationToUi } from '../../utils/notificationNavigation';

interface TopbarProps {
  currentPage: string;
  onNavigate: (page: string, id?: string | number) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  currentUser: UserProfile | null;
}

export function Topbar({ currentPage, onNavigate, onLogout, onToggleSidebar, currentUser }: TopbarProps) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const knownNotificationIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

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
    return mapApiNotificationToUi(n, formatRelativeTime);
  }

  const SEVERITY_WEIGHT: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const triggerToastAlert = useCallback((notification: Notification, isMissedAlert: boolean = false) => {
    knownNotificationIdsRef.current.add(notification.id);
    if (notification.anomalyId) {
      knownNotificationIdsRef.current.add(`anomaly-${notification.anomalyId}`);
    }
    const toastId = `${notification.id}-${Date.now()}`;
    setToasts(prev => [
      {
        ...notification,
        toastId,
        duration: 5000,
        isMissedAlert,
      },
      ...prev.filter(t => t.id !== notification.id).slice(0, 2), // Stack up to 3 toasts
    ]);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchNotifications({ limit: 50 });
      if (res && res.notifications) {
        const mapped = res.notifications.map(mapDbToUiNotification);
        setNotifications(mapped);

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          
          // 1. Mark ALL initial notifications as tracked to prevent duplicates
          for (const item of mapped) {
            knownNotificationIdsRef.current.add(item.id);
            if (item.anomalyId) {
              knownNotificationIdsRef.current.add(`anomaly-${item.anomalyId}`);
            }
          }

          // 2. Select up to 3 important/recent missed alerts from unread notifications
          const unreadList = mapped.filter(n => !n.read);
          const eligibleMissed = unreadList
            .filter(n => ['critical', 'high', 'medium'].includes(n.severity || 'medium'))
            .sort((a, b) => {
              const weightA = SEVERITY_WEIGHT[a.severity || 'medium'] || 0;
              const weightB = SEVERITY_WEIGHT[b.severity || 'medium'] || 0;
              return weightB - weightA; // higher severity first, maintaining recency for ties
            })
            .slice(0, 3);

          // 3. Display missed-alert toasts (remains unread in DB & bell)
          for (const item of eligibleMissed) {
            triggerToastAlert(item, true);
          }
        } else {
          // In subsequent background polls, trigger real-time toast only for newly discovered unread notifications
          for (const item of mapped) {
            if (!knownNotificationIdsRef.current.has(item.id) && !item.read) {
              triggerToastAlert(item, false);
            }
            knownNotificationIdsRef.current.add(item.id);
            if (item.anomalyId) {
              knownNotificationIdsRef.current.add(`anomaly-${item.anomalyId}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [triggerToastAlert]);

  // Load notifications immediately when currentUser is available
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser, loadNotifications]);

  // Resilient background polling every 5 seconds for incoming alerts
  useEffect(() => {
    if (!currentUser) return;
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [currentUser, loadNotifications]);

  // Register user socket room
  useEffect(() => {
    if (socket && currentUser) {
      const userId = currentUser.id || (currentUser as any).userId;
      if (userId) {
        socket.emit('register_user', userId);

        const handleConnect = () => {
          console.log('[Socket] Connected/Reconnected, registering user:', userId);
          socket.emit('register_user', userId);
        };

        socket.on('connect', handleConnect);
        return () => {
          socket.off('connect', handleConnect);
        };
      }
    }
  }, [socket, currentUser]);

  const handleDismissToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  // Listen to live notifications and anomaly alerts
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (dbNotif: any) => {
      console.log('[Live] new_notification received:', dbNotif);
      const uiNotif = mapDbToUiNotification(dbNotif);
      
      // 1. Update bell notification list & unread count
      setNotifications(prev => {
        if (prev.some(n => n.id === uiNotif.id)) return prev;
        return [uiNotif, ...prev];
      });

      // 2. Automatically trigger real-time toast alert if new
      if (!knownNotificationIdsRef.current.has(uiNotif.id)) {
        triggerToastAlert(uiNotif);
      }

      // 3. Subtly play notification sound if supported
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    };

    const handleAnomalyCreated = (anomaly: any) => {
      if (!anomaly) return;
      console.log('[Live] anomaly_created received on Topbar:', anomaly.anomaly_id);
      
      const anomalyKey = `anomaly-${anomaly.anomaly_id}`;
      const notifId = `live-${anomaly.anomaly_id}`;
      
      if (knownNotificationIdsRef.current.has(anomalyKey) || knownNotificationIdsRef.current.has(notifId)) {
        return;
      }

      const entity = anomaly.service_name || anomaly.application_name || anomaly.server_name || 'System';
      const severity = anomaly.severity || 'high';
      
      const liveNotif: Notification = {
        id: notifId,
        type: 'anomaly_detected',
        title: anomaly.title || `Anomaly Detected on ${entity}`,
        message: anomaly.description || `High anomaly score (${anomaly.score || 'N/A'}) detected on ${entity}.`,
        timestamp: 'just now',
        read: false,
        severity: severity,
        from: 'AI Detector',
        to: 'You',
        anomalyId: String(anomaly.anomaly_id),
        incidentId: anomaly.incident_id ? String(anomaly.incident_id) : undefined,
        relatedEntityId: String(anomaly.anomaly_id),
        relatedEntityType: 'anomaly',
      };

      setNotifications(prev => {
        if (prev.some(n => n.anomalyId === String(anomaly.anomaly_id) || n.id === notifId)) {
          return prev;
        }
        return [liveNotif, ...prev];
      });

      triggerToastAlert(liveNotif);

      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('anomaly_created', handleAnomalyCreated);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('anomaly_created', handleAnomalyCreated);
    };
  }, [socket, triggerToastAlert]);

  // Read notifications in the local dashboard page event
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentPage]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    if (!id || id.startsWith('live-')) return;
    try {
      await markAsRead(id);
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

  const handleNotificationNavigation = (notification: Notification) => {
    console.debug('[NotificationNav] click', {
      source: 'topbar',
      notificationId: notification.id,
      type: notification.type,
      anomalyId: notification.anomalyId,
      incidentId: notification.incidentId,
      relatedEntityId: notification.relatedEntityId,
    });

    // 1. Mark as read immediately if unread
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // 2. Dismiss any active toast for this notification
    setToasts(prev => prev.filter(t => t.id !== notification.id));

    // 3. Navigate to relevant page using centralized routing logic
    const target = getNotificationNavigationTarget(notification);
    onNavigate(target.page, target.id);
  };

  const initials = `${currentUser?.firstName?.[0] ?? ''}${currentUser?.lastName?.[0] ?? ''}`.trim().toUpperCase();
  const displayName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() || currentUser?.email || 'Profile';

  return (
    <>
      {/* Real-time Alert Toast Stack */}
      <AlertToastStack
        toasts={toasts}
        onDismiss={handleDismissToast}
        onToastClick={handleNotificationNavigation}
      />

      <header className="h-20 bg-nebula-navy-dark border-b border-nebula-navy-lighter px-6 flex items-center justify-between relative z-30">
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
            onNotificationClick={handleNotificationNavigation}
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
    </>
  );
}
