"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/lib/types";
import { BellIcon } from "@/components/icons";
import styles from "./notification-bell.module.scss";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.success) setNotifications(json.data ?? []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // Silently fail
    }
  };

  return (
    <div className={styles.wrapper}>
      <button
        className={styles.bell}
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {notifications.length === 0 ? (
            <p className={styles.empty}>No notifications</p>
          ) : (
            <ul className={styles.list}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`${styles.item} ${n.read ? styles.read : styles.unread}`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <strong>{n.title}</strong>
                  <p>{n.body}</p>
                  <time>{new Date(n.created_at).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
