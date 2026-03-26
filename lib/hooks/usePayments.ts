"use client";

import { useCallback } from "react";
import { useApi } from "./useApi";
import type { PaymentWithDetails } from "@/lib/types";

interface UsePaymentsOptions {
  role?: "sponsor" | "kid";
  skip?: boolean;
}

export function usePayments(options?: UsePaymentsOptions) {
  const url = options?.role ? `/api/payments?role=${options.role}` : "/api/payments";
  const result = useApi<PaymentWithDetails[]>(url, [], { skip: options?.skip });

  const retryPayment = useCallback(async (paymentId: string) => {
    const res = await fetch("/api/payments/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: paymentId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        result.setData((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" } : p))
        );
        return true;
      }
    }
    return false;
  }, [result]);

  return { ...result, retryPayment };
}
