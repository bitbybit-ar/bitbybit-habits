"use client";

import { useApi } from "./useApi";
import type { AuthSession } from "@/lib/types";

export function useSession() {
  return useApi<AuthSession | null>("/api/auth/session", null);
}
