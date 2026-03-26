"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSpinner } from "@/components/ui/spinner";

/**
 * /dashboard — central routing hub
 * Checks session role and redirects to the right page.
 * When role is null (fresh registration), falls back to checking
 * family membership via API to avoid a redirect loop with /onboard.
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
          return;
        }
        if (data.role === "sponsor") {
          router.replace("/sponsor");
          return;
        }

        // Role is null — session JWT may be stale after onboarding.
        // Check actual family membership to determine the real role.
        const famRes = await fetch("/api/families");
        if (famRes.ok) {
          const famData = await famRes.json();
          if (famData.success && famData.data && famData.data.length > 0) {
            // User has a family — find their role from membership
            const members: { user_id: string; role: string }[] =
              famData.data.flatMap(
                (f: { members: { user_id: string; role: string }[] }) => f.members,
              );
            const myMembership = members.find(
              (m) => m.user_id === data.user_id,
            );

            if (myMembership?.role === "kid") {
              router.replace("/kid");
              return;
            }
            // Default to sponsor if they have any family membership
            router.replace("/sponsor");
            return;
          }
        }

        // Truly no families — go to onboard
        router.replace("/onboard");
      } catch {
        router.replace("/login");
      }
    }

    redirect();
  }, [router]);

  return <PageSpinner />;
}
