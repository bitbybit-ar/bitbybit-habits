import { NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/auth";
import { getDb, familyMembers } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  // If role is null (stale JWT from before onboarding), refresh from DB
  if (!session.role) {
    try {
      const db = getDb();
      const memberResult = await db
        .select({ role: familyMembers.role })
        .from(familyMembers)
        .where(eq(familyMembers.user_id, session.user_id))
        .limit(1);

      if (memberResult.length > 0) {
        const updatedRole = memberResult[0].role as "sponsor" | "kid";
        const updatedSession = { ...session, role: updatedRole };

        // Re-issue the session cookie with the correct role
        const token = await createSession(updatedSession);
        const response = NextResponse.json<ApiResponse>({
          success: true,
          data: updatedSession,
        });
        response.cookies.set("session", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });
        return response;
      }
    } catch {
      // Fall through to return original session
    }
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: session,
  });
}
