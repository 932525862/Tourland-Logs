import { useState, useEffect, useCallback } from "react";
import { API } from "@/lib/api/client";
import { notify } from "@/lib/notify";

// Global state for notifications to sync across all hook instances (Sidebar, MobileNav, Page)
let globalNotifications: any[] = [];
let globalUnreadCount = 0;
let globalIsLoading = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function useNotifications() {
  const [state, setState] = useState({
    notifications: globalNotifications,
    unreadCount: globalUnreadCount,
    isLoading: globalIsLoading,
  });

  useEffect(() => {
    const handleChange = () => {
      setState({
        notifications: globalNotifications,
        unreadCount: globalUnreadCount,
        isLoading: globalIsLoading,
      });
    };
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    globalIsLoading = true;
    notifyListeners();
    try {
      const data = await API.notifications();
      globalNotifications = data;
      globalUnreadCount = data.filter((n) => !n.isRead).length;
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      globalIsLoading = false;
      notifyListeners();
    }
  }, []);

  useEffect(() => {
    // Only fetch if empty or on mount once - actually fetchNotifications is called by components
    // and we also have a sync mechanism
    if (globalNotifications.length === 0 && !globalIsLoading) {
      fetchNotifications();
    }

    // Subscribe to real-time notifications
    const cleanup = API.initSocket((event, data) => {
      if (event === "notification") {
        globalNotifications = [data, ...globalNotifications];
        globalUnreadCount += 1;
        notify.info(data.message);
        notifyListeners();
      }
    });

    return () => cleanup();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await API.markNotificationRead(id);
      globalNotifications = globalNotifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      globalUnreadCount = Math.max(0, globalUnreadCount - 1);
      notifyListeners();
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllRead = async () => {
    try {
      await API.markAllNotificationsRead();
      globalNotifications = globalNotifications.map((n) => ({ ...n, isRead: true }));
      globalUnreadCount = 0;
      notifyListeners();
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    isLoading: state.isLoading,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
