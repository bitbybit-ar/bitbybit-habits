import { NextResponse } from "next/server";
import { getDb, users } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Codigo requerido" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get user's TOTP secret
    const result = await db
      .select({ totp_secret: users.totp_secret, totp_enabled: users.totp_enabled })
      .from(users)
      .where(eq(users.id, session.user_id))
      .limit(1);

    if (result.length === 0 || !result[0].totp_secret || !result[0].totp_enabled) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "2FA no esta habilitado" },
        { status: 400 }
      );
    }

    const secret = result[0].totp_secret;

    // Verify TOTP code
    const totp = new TOTP({
      issuer: "BitByBit",
      label: session.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    const delta = totp.validate({ token: code, window: 1 });

    if (delta === null) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Codigo invalido" },
        { status: 401 }
      );
    }

    // Disable 2FA and clear secrets
    await db
      .update(users)
      .set({
        totp_enabled: false,
        totp_secret: null,
        recovery_codes: null,
      })
      .where(eq(users.id, session.user_id));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        message: "2FA deshabilitado exitosamente",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al deshabilitar 2FA";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
