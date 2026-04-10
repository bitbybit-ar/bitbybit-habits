"use client";

import { useSessionContext } from "@/lib/session-context";
import type { AuthSession } from "@/lib/types";

interface UseSessionResult {
  data: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<AuthSession | null>>;
}

/**
 * Hook that returns the shared session from SessionProvider.
 * Preserves the same interface as the old useApi-based hook
 * so existing consumers (kid/sponsor dashboards) work unchanged.
 */
export function useSession(): UseSessionResult {
  const { session, isLoading, refreshSession } = useSessionContext();

  return {
    data: session,
    isLoading,
    error: null,
    refetch: refreshSession,
    // setData is a no-op — session state is owned by the provider.
    // Callers that need to update session should call refetch() instead.
    setData: () => {},
  };
}
