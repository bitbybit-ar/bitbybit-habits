import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb, familyMembers } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * /dashboard — central routing hub (server component)
 * Checks session role and redirects to the right page instantly,
 * avoiding client-side fetch + redirect flash.
 */
export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "kid") {
    redirect("/kid");
  }

  if (session.role === "sponsor") {
    redirect("/sponsor");
  }

  // Role is null — session JWT may be stale after onboarding.
  // Check actual family membership to determine the real role.
  const db = getDb();
  const membership = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, session.user_id))
    .limit(1);

  if (membership[0]) {
    const role = membership[0].role as "sponsor" | "kid";
    redirect(role === "kid" ? "/kid" : "/sponsor");
  }

  // Truly no families — go to onboard
  redirect("/onboard");
}
