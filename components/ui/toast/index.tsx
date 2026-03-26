"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckIcon, BoltIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./toast.module.scss";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case "success":
      return <CheckIcon size={16} />;
    case "error":
      return <span style={{ fontSize: 14, fontWeight: 700 }}>✕</span>;
    case "info":
      return <BoltIcon size={16} />;
  }
}

function getToastTypeClass(type: ToastType): string {
  switch (type) {
    case "success":
      return styles.toastSuccess;
    case "error":
      return styles.toastError;
    case "info":
      return styles.toastInfo;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.toastContainer} aria-live="polite" role="status">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              styles.toast,
              getToastTypeClass(toast.type),
              toast.exiting && styles.toastExiting
            )}
          >
            <div className={styles.toastIcon}>
              <ToastIcon type={toast.type} />
            </div>
            <span className={styles.toastMessage}>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
