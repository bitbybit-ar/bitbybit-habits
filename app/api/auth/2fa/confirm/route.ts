import { NextResponse } from "next/server";
import { getDb, users } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";
import type { ApiResponse } from "@/lib/types";

// Generate random alphanumeric recovery code
function generateRecoveryCode(length: number = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
      .select({ totp_secret: users.totp_secret })
      .from(users)
      .where(eq(users.id, session.user_id))
      .limit(1);

    if (result.length === 0 || !result[0].totp_secret) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "2FA no configurado" },
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

    // Generate 8 recovery codes
    const recoveryCodes = Array.from({ length: 8 }, () => generateRecoveryCode(10));

    // Hash recovery codes before storing
    const hashedCodes = await Promise.all(
      recoveryCodes.map((code) => hashPassword(code))
    );

    // Enable 2FA and store hashed recovery codes
    await db
      .update(users)
      .set({
        totp_enabled: true,
        recovery_codes: JSON.stringify(hashedCodes),
      })
      .where(eq(users.id, session.user_id));

    // Return plain recovery codes (shown once)
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        recoveryCodes,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al confirmar 2FA";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
