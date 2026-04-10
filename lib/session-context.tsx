"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { AuthSession } from "./types";

interface SessionContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSession = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        const json = await res.json();
        setSession(json.success ? json.data : null);
      } else {
        setSession(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) setSession(null);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSession]);

  const clearSession = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, isLoading, refreshSession: fetchSession, clearSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return ctx;
}
