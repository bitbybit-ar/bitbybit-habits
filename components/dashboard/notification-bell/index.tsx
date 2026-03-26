"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Notification } from "@/lib/types";
import { BellIcon } from "@/components/icons";
import styles from "./notification-bell.module.scss";

export function NotificationBell() {
  const t = useTranslations();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
    <div className={styles.wrapper} ref={wrapperRef}>
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
            <p className={styles.empty}>{t("emptyState.noNotifications")}</p>
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
