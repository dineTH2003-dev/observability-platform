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
  onClearAll?: () => void;
}

export function NotificationDropdown({ notifications, onViewAll, onMarkAsRead, onClearAll }: NotificationDropdownProps) {
  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;
  const recentNotifications = unreadNotifications.slice(0, 5);

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
        <div className="px-4 py-3 border-b border-nebula-navy-lighter flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-nebula-cyan bg-nebula-cyan/10 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && onClearAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-xs font-medium text-slate-400 hover:text-nebula-pink transition-colors px-2 py-1 rounded hover:bg-nebula-navy-dark"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="size-10 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-slate-400 text-sm font-medium">No new notifications</p>
              <p className="text-slate-500 text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className="px-4 py-3 border-b border-nebula-navy-lighter hover:bg-nebula-navy-dark cursor-pointer transition-colors bg-nebula-navy-dark/50"
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white">
                        {notification.title}
                      </p>
                      <span className="w-2 h-2 bg-nebula-pink rounded-full flex-shrink-0 mt-1.5"></span>
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
        <div className="px-4 py-2.5 border-t border-nebula-navy-lighter flex items-center justify-between">
          {unreadCount > 0 && onClearAll ? (
            <button
              onClick={onClearAll}
              className="text-xs text-slate-400 hover:text-nebula-pink transition-colors font-medium"
            >
              Clear All
            </button>
          ) : <span />}
          <Button
            variant="ghost"
            size="sm"
            className="text-nebula-cyan hover:text-nebula-cyan hover:bg-nebula-cyan/10 text-xs flex items-center gap-1.5 h-8"
            onClick={onViewAll}
          >
            View all notifications
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}