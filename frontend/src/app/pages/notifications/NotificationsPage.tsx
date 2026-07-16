import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, AlertCircle, UserPlus, CheckCheck, Filter, Search, Trash2, Check, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import type { Notification } from '../../components/ui/NotificationDropdown';
import {
  fetchNotifications,
  markAsRead as markNotificationAsRead,
  markAllAsRead as markAllNotificationsAsRead,
  deleteNotification as deleteNotificationApi,
} from '../../../api/notificationApi';

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
}

export function NotificationsPage({ onNavigate }: NotificationsPageProps = {}) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin} minutes ago`;
      if (diffHr < 24) return `${diffHr} hours ago`;
      if (diffDays === 1) return 'yesterday';
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const mapDbToUiNotification = (n: any): Notification => {
    const fromLabel = n.sender_user_id ? n.sender_email || 'User' : 'System';
    const severity = n.severity || (n.notification_type === 'alert_rule' ? 'high' : 'medium');
    return {
      id: String(n.notification_id),
      type: n.notification_type as Notification['type'],
      title: n.title,
      message: n.message,
      timestamp: n.created_at ? formatRelativeTime(n.created_at) : 'some time ago',
      read: Boolean(n.is_read),
      severity,
      from: fromLabel,
      to: 'You',
    };
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchNotifications({ limit: 50 });
      if (res?.notifications) {
        setNotifications(res.notifications.map(mapDbToUiNotification));
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'anomaly_detected':
        return <AlertCircle className="size-5 text-red-400" />;
      case 'anomaly_assigned':
        return <UserPlus className="size-5 text-blue-400" />;
      case 'anomaly_acknowledged':
        return <CheckCircle className="size-5 text-yellow-400" />;
      case 'anomaly_resolved':
        return <CheckCheck className="size-5 text-green-400" />;
      case 'alert_rule':
        return <Bell className="size-5 text-purple-400" />;
      default:
        return <Bell className="size-5 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'anomaly_detected':
        return 'Anomaly Detected';
      case 'anomaly_assigned':
        return 'Anomaly Assigned';
      case 'anomaly_acknowledged':
        return 'Acknowledged';
      case 'anomaly_resolved':
        return 'Resolved';
      case 'alert_rule':
        return 'Alert Rule';
      default:
        return type;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }

    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }

    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationApi(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }

    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications
    .filter(n => {
      if (filter === 'unread') return !n.read;
      if (filter === 'read') return n.read;
      return true;
    })
    .filter(n => {
      if (typeFilter === 'all') return true;
      return n.type === typeFilter;
    })
    .filter(n => {
      if (!searchQuery) return true;
      return n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             n.message.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-nebula-navy-light border border-nebula-navy-lighter transition-colors"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-white">Notifications</h1>
            <p className="text-slate-400 text-sm mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          className="bg-nebula-purple hover:bg-nebula-purple-dark text-white"
        >
          <Check className="size-4 mr-2" />
          Mark All as Read
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{notifications.length}</p>
              </div>
              <Bell className="size-8 text-slate-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Unread</p>
                <p className="text-2xl font-bold text-nebula-cyan">{unreadCount}</p>
              </div>
              <Bell className="size-8 text-nebula-cyan/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Anomalies</p>
                <p className="text-2xl font-bold text-red-400">
                  {notifications.filter(n => n.type === 'anomaly_detected').length}
                </p>
              </div>
              <AlertCircle className="size-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Assigned</p>
                <p className="text-2xl font-bold text-blue-400">
                  {notifications.filter(n => n.type === 'anomaly_assigned').length}
                </p>
              </div>
              <UserPlus className="size-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Resolved</p>
                <p className="text-2xl font-bold text-green-400">
                  {notifications.filter(n => n.type === 'anomaly_resolved').length}
                </p>
              </div>
              <CheckCheck className="size-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
          <div className="relative w-[300px]">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-nebula-navy-dark border-nebula-navy-lighter text-white"
  />
</div>

            {/* Status Filter */}
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[200px] px-3 bg-nebula-navy-dark border-nebula-navy-lighter text-white">
              <Filter className="size-4 mr-2 shrink-0" />
              <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48 bg-nebula-navy-dark border-nebula-navy-lighter text-white">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-nebula-navy-light border-nebula-navy-lighter text-white">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="anomaly_detected">Anomaly Detected</SelectItem>
                <SelectItem value="anomaly_assigned">Assigned</SelectItem>
                <SelectItem value="anomaly_acknowledged">Acknowledged</SelectItem>
                <SelectItem value="anomaly_resolved">Resolved</SelectItem>
                <SelectItem value="alert_rule">Alert Rules</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="bg-nebula-navy-light border-nebula-navy-lighter">
            <CardContent className="p-12">
              <div className="text-center">
                <Bell className="size-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No notifications found</h3>
                <p className="text-slate-400 text-sm">
                  {searchQuery || filter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'You\'re all caught up!'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`bg-nebula-navy-light border-nebula-navy-lighter hover:border-nebula-cyan/30 transition-colors ${
                !notification.read ? 'border-l-4 border-l-nebula-pink' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-nebula-pink rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-nebula-cyan hover:text-nebula-cyan hover:bg-nebula-cyan/10 h-8"
                          >
                            Mark as read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-500">{notification.timestamp}</span>
                      
                      {notification.severity && (
                        <span className={`text-xs px-2 py-1 rounded border ${getSeverityBadge(notification.severity)}`}>
                          {notification.severity.toUpperCase()}
                        </span>
                      )}

                      <span className="text-xs px-2 py-1 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {getTypeLabel(notification.type)}
                      </span>

                      {notification.from && (
                        <span className="text-xs text-slate-500">
                          From: <span className="text-slate-400">{notification.from}</span>
                        </span>
                      )}

                      {notification.to && (
                        <span className="text-xs text-slate-500">
                          To: <span className="text-slate-400">{notification.to}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
