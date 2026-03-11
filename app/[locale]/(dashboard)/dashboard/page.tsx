"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard — central routing hub
 * Checks session role and redirects to the right page.
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const { success, data } = await res.json();
        if (!success) {
          router.replace("/login");
          return;
        }

        if (data.role === "kid") {
          router.replace("/kid");
        } else if (data.role === "sponsor") {
          router.replace("/sponsor");
        } else {
          router.replace("/onboard");
        }
      } catch {
        router.replace("/login");
      }
    }

    redirect();
  }, [router]);

  return null;
}
