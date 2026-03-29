import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { familyMembers } from "@/lib/db";
import { getSession, createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

/**
 * GET /api/auth/session
 *
 * Verify current session and return user data.
 * Returns { success: false } with 200 when not authenticated (no 401).
 * Refreshes the JWT if the role was stale (e.g. after onboarding).
 */
export const GET = apiHandler(async (_request, { db }) => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>({ success: false, data: null });
  }

  // If role is null (stale JWT from before onboarding), refresh from DB
  if (!session.role) {
    const memberResult = await db
      .select({ role: familyMembers.role })
      .from(familyMembers)
      .where(eq(familyMembers.user_id, session.user_id))
      .limit(1);

    if (memberResult.length > 0) {
      const updatedRole = memberResult[0].role as "sponsor" | "kid";
      const updatedSession = { ...session, role: updatedRole };

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
  }

  return NextResponse.json<ApiResponse>({ success: true, data: session });
}, { auth: false });
