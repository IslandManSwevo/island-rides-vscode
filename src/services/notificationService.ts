import { Notification, NotificationType } from '../types';
import { BehaviorSubject } from 'rxjs';
import { nanoid } from 'nanoid';

class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  private defaultDuration = 5000; // 5 seconds

  // Get current notifications
  get current() {
    return this.notifications.getValue();
  }

  // Subscribe to notifications
  subscribe(callback: (notifications: Notification[]) => void) {
    return this.notifications.subscribe(callback);
  }

  // Show a notification
  show(notification: Omit<Notification, 'id'>) {
    const id = nanoid();
    const newNotification = {
      ...notification,
      id,
      closable: notification.closable ?? true,
      duration: notification.duration ?? this.defaultDuration
    };

    this.notifications.next([...this.current, newNotification]);

    // Auto-dismiss if duration is set
    if (newNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newNotification.duration);
    }

    return id;
  }

  // Helper methods for different notification types
  success(message: string, options: Partial<Notification> = {}) {
    return this.show({ type: 'success', message, ...options });
  }

  error(message: string, options: Partial<Notification> = {}) {
    return this.show({ type: 'error', message, ...options });
  }

  warning(message: string, options: Partial<Notification> = {}) {
    return this.show({ type: 'warning', message, ...options });
  }

  info(message: string, options: Partial<Notification> = {}) {
    return this.show({ type: 'info', message, ...options });
  }

  // Dismiss a specific notification
  dismiss(id: string) {
    this.notifications.next(
      this.current.filter(notification => notification.id !== id)
    );
  }

  // Clear all notifications
  clear() {
    this.notifications.next([]);
  }
}

export const notificationService = new NotificationService();
