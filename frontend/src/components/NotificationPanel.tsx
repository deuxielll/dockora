import React from 'react';
import { Bell, AlertTriangle, Info, X, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationPanel = ({ onClose }) => {
  const { notifications, markAsRead, clearAll } = useNotifications();
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const handleMarkAllRead = () => {
    markAsRead('all');
  };

  const handleClearAll = () => {
    clearAll();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'error':
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <Info className="text-blue-500" size={20} />;
    }
  };

  const timeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-dark-bg shadow-neo rounded-2xl z-50">
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center">
        <h3 className="font-bold text-lg text-gray-200">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button onClick={handleClearAll} className="p-2 rounded-full hover:shadow-neo-inset transition-all text-red-500" title="Clear All">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-full hover:shadow-neo-inset transition-all"><X size={20} /></button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto no-scrollbar">
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className={`p-4 flex items-start gap-4 border-b border-gray-700/30 ${!n.is_read ? 'bg-blue-500/10' : ''}`}>
              <div className="flex-shrink-0 mt-1">{getIcon(n.type)}</div>
              <div>
                <p className="text-sm text-gray-200">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{timeSince(n.created_at)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-400">
            <Bell size={48} className="mx-auto mb-4" />
            <p>You're all caught up!</p>
          </div>
        )}
      </div>
      {unreadNotifications.length > 0 && (
        <div className="p-2 border-t border-gray-700/50">
          <button onClick={handleMarkAllRead} className="w-full text-center text-sm font-semibold text-accent p-2 rounded-lg hover:bg-blue-500/10 transition-colors">
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;