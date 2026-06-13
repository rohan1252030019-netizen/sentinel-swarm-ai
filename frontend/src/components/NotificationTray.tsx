import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import type { NotificationToast } from '../types';

interface NotificationTrayProps {
  notifications: NotificationToast[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  threat: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
} as const;

export function NotificationTray({ notifications, onDismiss }: NotificationTrayProps) {
  const visible = notifications.slice(0, 4);

  useEffect(() => {
    const timers = visible.map((toast) => window.setTimeout(() => onDismiss(toast.id), 5000));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [visible.map((toast) => toast.id).join('|')]);

  return (
    <div className="notification-tray" aria-live="polite">
      {visible.map((toast) => {
        const Icon = ICONS[toast.kind];

        return (
          <article key={toast.id} className={`toast toast--${toast.kind}`}>
            <div className="toast__icon">
              <Icon size={16} />
            </div>
            <div>
              <div className="toast__title">{toast.title}</div>
              <div className="toast__body">{toast.body}</div>
            </div>
            <button className="toast__dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </article>
        );
      })}
    </div>
  );
}