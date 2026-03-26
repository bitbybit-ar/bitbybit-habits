"use client";

import { useApi } from "./useApi";
import type { Completion } from "@/lib/types";

export function useCompletions() {
  return useApi<Completion[]>("/api/completions", []);
}
