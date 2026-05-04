import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { dataService } from "../services/dataService";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notificationCount: number;
}

const NotificationDropdown = ({ isOpen, onClose, notificationCount }: NotificationDropdownProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Load notifications from data service
      const alertsData = dataService.getAlertsData();
      const notificationsData = dataService.getNotificationsData();
      
      // Combine alerts and notifications
      const allNotifications = [
        ...alertsData.map(alert => ({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          severity: alert.severity,
          timestamp: alert.timestamp,
          read: alert.acknowledged,
          icon: getAlertIcon(alert.severity),
          category: 'alert'
        })),
        ...notificationsData.map(notif => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          severity: notif.priority,
          timestamp: notif.timestamp,
          read: notif.read,
          icon: getNotificationIcon(notif.type),
          category: 'notification'
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(allNotifications);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getAlertIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'high':
        return <AlertTriangle size={16} className="text-orange-500" />;
      case 'medium':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'low':
        return <Info size={16} className="text-blue-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'info':
        return <Info size={16} className="text-blue-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-header">
        <div className="notification-title">
          <h3>Notifications</h3>
          <span className="notification-count">{notificationCount}</span>
        </div>
        <div className="notification-actions">
          {notifications.some(n => !n.read) && (
            <button onClick={markAllAsRead} className="mark-all-read">
              Mark all as read
            </button>
          )}
          <button onClick={clearAll} className="clear-all">
            Clear all
          </button>
        </div>
      </div>
      
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <Bell size={32} className="text-gray-300" />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                {notification.icon}
              </div>
              <div className="notification-content">
                <div className="notification-header-item">
                  <h4>{notification.title}</h4>
                  <span className="notification-time">
                    {formatTimestamp(notification.timestamp)}
                  </span>
                </div>
                <p className="notification-message">{notification.message}</p>
                <div className="notification-meta">
                  <span className={`notification-severity ${notification.severity}`}>
                    {notification.severity}
                  </span>
                  <span className="notification-category">
                    {notification.category}
                  </span>
                </div>
              </div>
              <div className="notification-item-actions">
                {!notification.read && (
                  <button 
                    onClick={() => markAsRead(notification.id)}
                    className="mark-read-btn"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="notification-footer">
        <button className="view-all-btn">View all notifications</button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
