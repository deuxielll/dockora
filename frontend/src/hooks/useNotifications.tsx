import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { getNotifications as apiGetNotifications, markNotificationsRead as apiMarkNotificationsRead, clearAllNotifications as apiClearAllNotifications } from '../services/api';
import { useAuth } from './useAuth';

const NotificationsContext = createContext(null);

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isLoggedIn } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiGetNotifications();
      setNotifications(res.data || []);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (ids) => {
    try {
      await apiMarkNotificationsRead({ ids });
      // Optimistically update UI
      setNotifications(prev => 
        prev.map(n => (ids === 'all' || ids.includes(n.id)) ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error("Failed to mark notifications as read", error);
    }
  };

  const clearAll = async () => {
    try {
      await apiClearAllNotifications();
      // Optimistically update UI
      setNotifications([]);
    } catch (error) {
      console.error("Failed to clear notifications", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const value = { notifications, isLoading, unreadCount, markAsRead, refresh: fetchNotifications, clearAll };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export const useNotifications = () => {
  return useContext(NotificationsContext);
};