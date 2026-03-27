import { NextResponse } from "next/server";
import type { ApiResponse } from "@/lib/types";

/**
 * POST /api/auth/logout
 *
 * Clear the session cookie to log the user out.
 */
export async function POST() {
  const response = NextResponse.json<ApiResponse>({ success: true });

  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
