"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /dashboard — central routing hub
 * Checks session + family membership and redirects to the right page.
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        // Check session
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) {
          router.replace("/login");
          return;
        }

        // Check families
        const familiesRes = await fetch("/api/families");
        if (!familiesRes.ok) {
          router.replace("/onboard");
          return;
        }

        const familiesData = await familiesRes.json();
        if (!familiesData.success || !familiesData.data || familiesData.data.length === 0) {
          router.replace("/onboard");
          return;
        }

        // Determine role from first family membership
        const role = familiesData.data[0]?.role;
        if (role === "kid") {
          router.replace("/kid");
        } else {
          // sponsor (or unknown) → sponsor dashboard
          router.replace("/sponsor");
        }
      } catch {
        router.replace("/login");
      }
    }

    redirect();
  }, [router]);

  return null;
}
