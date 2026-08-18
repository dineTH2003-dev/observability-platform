import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertCircle, 
  UserPlus, 
  CheckCircle, 
  CheckCheck, 
  Bell, 
  X, 
  ArrowRight 
} from 'lucide-react';
import type { Notification } from './NotificationDropdown';

export interface ToastItem extends Notification {
  toastId: string;
  duration?: number;
  isMissedAlert?: boolean;
}

interface AlertToastStackProps {
  toasts: ToastItem[];
  onDismiss: (toastId: string) => void;
  onToastClick: (notification: Notification) => void;
}

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (toastId: string) => void;
  onToastClick: (notification: Notification) => void;
}

function SingleToast({ toast, onDismiss, onToastClick }: SingleToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const duration = toast.duration || 5000;
  const remainingTimeRef = useRef(duration);
  const lastTickRef = useRef(Date.now());
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      if (!isHovered) {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        remainingTimeRef.current -= delta;
        lastTickRef.current = now;

        const percentage = Math.max(0, (remainingTimeRef.current / duration) * 100);
        setProgress(percentage);

        if (remainingTimeRef.current <= 0) {
          clearInterval(interval);
          onDismiss(toast.toastId);
        }
      } else {
        lastTickRef.current = Date.now();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, duration, onDismiss, toast.toastId]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'anomaly_detected':
        return <AlertCircle className="size-4 text-red-400 shrink-0" />;
      case 'anomaly_assigned':
      case 'incident_assigned':
        return <UserPlus className="size-4 text-blue-400 shrink-0" />;
      case 'anomaly_acknowledged':
      case 'incident_acknowledged':
        return <CheckCircle className="size-4 text-yellow-400 shrink-0" />;
      case 'anomaly_resolved':
      case 'incident_resolved':
        return <CheckCheck className="size-4 text-green-400 shrink-0" />;
      case 'alert_rule':
      case 'custom_alert':
        return <Bell className="size-4 text-purple-400 shrink-0" />;
      default:
        return <Bell className="size-4 text-slate-400 shrink-0" />;
    }
  };

  const getSeverityBorderColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#3b82f6';
      default:
        return '#06b6d4';
    }
  };

  const getSeverityBadgeClass = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const getTypeLabel = (type: Notification['type']) => {
    switch (type) {
      case 'anomaly_detected':
        return 'Anomaly Detected';
      case 'anomaly_assigned':
      case 'incident_assigned':
        return 'Incident Assigned';
      case 'anomaly_acknowledged':
      case 'incident_acknowledged':
        return 'Incident Acknowledged';
      case 'anomaly_resolved':
      case 'incident_resolved':
        return 'Incident Resolved';
      case 'alert_rule':
      case 'custom_alert':
        return 'Alert Triggered';
      default:
        return 'Alert';
    }
  };

  // Strip email addresses and "by email@domain.com" from temporary alert toasts
  const cleanToastMessage = (text?: string): string => {
    if (!text) return '';
    let cleaned = text.replace(/\s+by\s+[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\.?/gi, '.');
    cleaned = cleaned.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/\.{2,}/g, '.').trim();
    return cleaned;
  };

  const displayMessage = cleanToastMessage(toast.message || toast.title);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onToastClick(toast)}
      style={{
        pointerEvents: 'auto',
        backgroundColor: 'rgba(19, 27, 46, 0.97)',
        borderLeftColor: getSeverityBorderColor(toast.severity),
        borderLeftWidth: '4px',
        borderLeftStyle: 'solid',
        boxShadow: '0 16px 32px -4px rgba(0, 0, 0, 0.7), 0 6px 12px -2px rgba(0, 0, 0, 0.5)',
        width: '380px',
        maxWidth: 'calc(100vw - 40px)',
      }}
      className="
        group
        relative
        backdrop-blur-md
        border border-nebula-navy-lighter
        rounded-lg
        py-2.5 px-3
        cursor-pointer
        hover:border-nebula-purple/70
        hover:bg-nebula-navy-light
        transition-all
        duration-150
      "
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        {/* Type Icon */}
        <div className="mt-0.5 p-1 rounded-md bg-nebula-navy-dark border border-nebula-navy-lighter shrink-0">
          {getNotificationIcon(toast.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-5">
          {/* Header row: Type label + Severity badge */}
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-semibold text-white">
              {getTypeLabel(toast.type)}
            </span>
            {toast.severity && (
              <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border font-semibold tracking-wider ${getSeverityBadgeClass(toast.severity)}`}>
                {toast.severity}
              </span>
            )}
          </div>

          {/* Clean concise message without email addresses */}
          <p className="text-xs text-slate-300 line-clamp-2 leading-snug">
            {displayMessage}
          </p>

          {/* Missed alert time label */}
          {toast.isMissedAlert && toast.timestamp && (
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              Happened {toast.timestamp}
            </p>
          )}

          {/* View Details Action Link */}
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-nebula-cyan group-hover:text-cyan-300 transition-colors">
            <span>View details</span>
            <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Dismiss Button inside top-right corner */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.toastId);
          }}
          className="
            absolute
            top-2
            right-2
            p-1
            rounded-md
            text-slate-400
            hover:text-white
            hover:bg-white/10
            transition-colors
          "
          aria-label="Dismiss alert"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Auto-dismiss progress bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-lg"
        style={{ backgroundColor: 'rgba(10, 15, 29, 0.7)' }}
      >
        <div 
          className="h-full transition-all duration-75 ease-linear"
          style={{ 
            width: `${progress}%`,
            backgroundColor: '#a855f7',
          }}
        />
      </div>
    </div>
  );
}

export function AlertToastStack({ toasts, onDismiss, onToastClick }: AlertToastStackProps) {
  if (!toasts || toasts.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: '86px',
        right: '24px',
        zIndex: 999999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        maxHeight: 'calc(100vh - 100px)',
        overflow: 'visible',
      }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <SingleToast
          key={toast.toastId}
          toast={toast}
          onDismiss={onDismiss}
          onToastClick={onToastClick}
        />
      ))}
    </div>,
    document.body
  );
}
