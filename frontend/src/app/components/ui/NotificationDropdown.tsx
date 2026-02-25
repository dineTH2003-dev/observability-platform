import { Bell, CheckCircle, AlertCircle, UserPlus, CheckCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface Notification {
  id: string;
  type: 'anomaly_detected' | 'anomaly_assigned' | 'anomaly_acknowledged' | 'anomaly_resolved' | 'alert_rule';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  from?: string;
  to?: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onViewAll: () => void;
  onMarkAsRead: (id: string) => void;
}

export function NotificationDropdown({ notifications, onViewAll, onMarkAsRead }: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'anomaly_detected':
        return <AlertCircle className="size-4 text-red-400" />;
      case 'anomaly_assigned':
        return <UserPlus className="size-4 text-blue-400" />;
      case 'anomaly_acknowledged':
        return <CheckCircle className="size-4 text-yellow-400" />;
      case 'anomaly_resolved':
        return <CheckCheck className="size-4 text-green-400" />;
      case 'alert_rule':
        return <Bell className="size-4 text-purple-400" />;
      default:
        return <Bell className="size-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
  <div className="relative inline-block h-10 w-10"> {/* taller square container */}
    <Button
      variant="ghost"
      size="icon"
      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-slate-400 hover:text-white hover:bg-nebula-navy-lighter"
    >
      <Bell className="w-6 h-6 text-white" />
    </Button>

    {unreadCount > 0 && (
      <span
        className="
          absolute
          top-0
          right-0
          px-2
          py-0.5
          bg-red-500
          text-white
          text-xs
          font-semibold
          rounded-full
          flex justify-center items-center
          z-20
        "
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
  </div>
</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-nebula-navy-light border-nebula-navy-lighter w-80 p-0"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-nebula-navy-lighter">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-nebula-cyan bg-nebula-cyan/10 px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="size-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No notifications</p>
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-nebula-navy-lighter hover:bg-nebula-navy-dark cursor-pointer transition-colors ${
                  !notification.read ? 'bg-nebula-navy-dark/50' : ''
                }`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-nebula-pink rounded-full flex-shrink-0 mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">{notification.timestamp}</span>
                      {notification.severity && (
                        <span className={`text-xs ${getSeverityColor(notification.severity)} font-medium`}>
                          • {notification.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {recentNotifications.length > 0 && (
          <div className="px-4 py-3 border-t border-nebula-navy-lighter">
            <Button
              variant="ghost"
              className="w-full text-nebula-cyan hover:text-nebula-cyan hover:bg-nebula-cyan/10 justify-between"
              onClick={onViewAll}
            >
              View all notifications
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}