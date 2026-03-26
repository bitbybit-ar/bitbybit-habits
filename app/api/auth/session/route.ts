import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api";
import { familyMembers } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

export const GET = apiHandler(async (_request, { session, db }) => {
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

  return session;
});
