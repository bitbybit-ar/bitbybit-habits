"use client";

import { useCallback } from "react";
import { useApi } from "./useApi";
import type { PaymentWithDetails } from "@/lib/types";

interface UsePaymentsOptions {
  role?: "sponsor" | "kid";
  skip?: boolean;
}

type RetryResult =
  | { success: true; payment: { id: string; completion_id: string; amount_sats: number; to_user_id: string } }
  | { success: false; error?: string };

export function usePayments(options?: UsePaymentsOptions) {
  const url = options?.role ? `/api/payments?role=${options.role}` : "/api/payments";
  const result = useApi<PaymentWithDetails[]>(url, [], { skip: options?.skip });

  const retryPayment = useCallback(async (paymentId: string): Promise<RetryResult> => {
    try {
      const res = await fetch("/api/payments/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: paymentId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        result.setData((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" as const } : p))
        );
        return { success: true, payment: data.data };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false };
    }
  }, [result]);

  return { ...result, retryPayment };
}
