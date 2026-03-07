import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { ApiResponse } from "@/lib/types";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  return NextResponse.json<ApiResponse>({
    success: true,
    data: session,
  });
}
