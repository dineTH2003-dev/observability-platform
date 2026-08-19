import { Bell, CheckCircle, AlertCircle, UserPlus, CheckCheck, ArrowRight, Ticket as TicketIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export interface Notification {
  id: string;
  type: 'anomaly_detected' | 'anomaly_assigned' | 'anomaly_acknowledged' | 'anomaly_resolved' | 'incident_assigned' | 'incident_acknowledged' | 'incident_resolved' | 'alert_rule' | 'custom_alert' | 'ticket_created' | string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  from?: string;
  to?: string;
  anomalyId?: string;
  incidentId?: string;
  ticketId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'anomaly' | 'incident' | 'ticket';
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onViewAll: () => void;
  onMarkAsRead: (id: string) => void;
  onNotificationClick: (notification: Notification) => void;
  onClearAll?: () => void;
}

export function NotificationDropdown({ 
  notifications, 
  onViewAll, 
  onMarkAsRead, 
  onNotificationClick,
  onClearAll 
}: NotificationDropdownProps) {
  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;
  const recentNotifications = unreadNotifications.slice(0, 5);

  const handleItemClick = (notification: Notification) => {
    onNotificationClick(notification);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ticket_created':
        return <TicketIcon className="size-4 text-nebula-cyan" />;
      case 'anomaly_detected':
        return <AlertCircle className="size-4 text-red-400" />;
      case 'anomaly_assigned':
      case 'incident_assigned':
        return <UserPlus className="size-4 text-blue-400" />;
      case 'anomaly_acknowledged':
      case 'incident_acknowledged':
        return <CheckCircle className="size-4 text-yellow-400" />;
      case 'anomaly_resolved':
      case 'incident_resolved':
        return <CheckCheck className="size-4 text-green-400" />;
      case 'alert_rule':
      case 'custom_alert':
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
        <button
          type="button"
          className="inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-nebula-navy-lighter transition-colors focus:outline-none"
        >
          <span style={{ position: 'relative', display: 'block', width: 22, height: 22 }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block' }}
              className="text-slate-300"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: 'white',
                  backgroundColor: '#ef4444',
                  borderRadius: '9999px',
                  lineHeight: 1,
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-nebula-navy-light border-nebula-navy-lighter w-80 p-0 shadow-xl"
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
              <DropdownMenuItem
                key={notification.id}
                className="px-4 py-3 border-b border-nebula-navy-lighter hover:bg-nebula-navy-dark cursor-pointer transition-colors bg-nebula-navy-dark/50 group rounded-none focus:bg-nebula-navy-dark"
                onSelect={() => handleItemClick(notification)}
              >
                <div className="flex gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white group-hover:text-nebula-cyan transition-colors">
                        {notification.title}
                      </p>
                      <span className="w-2 h-2 bg-nebula-pink rounded-full flex-shrink-0 mt-1.5"></span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-slate-500">{notification.timestamp}</span>
                      {notification.severity && (
                        <span className={`text-xs ${getSeverityColor(notification.severity)} font-medium`}>
                          • {notification.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
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