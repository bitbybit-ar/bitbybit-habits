import { NextResponse } from "next/server";
import { getDb, users } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";
import QRCode from "qrcode";
import type { ApiResponse } from "@/lib/types";

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const db = getDb();

    // Generate TOTP secret
    const totp = new TOTP({
      issuer: "BitByBit",
      label: session.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const otpauthUri = totp.toString();

    // Generate QR code as data URI
    const qrCode = await QRCode.toDataURL(otpauthUri);

    // Store secret but keep 2FA disabled until confirmed
    await db
      .update(users)
      .set({
        totp_secret: secret,
        totp_enabled: false,
      })
      .where(eq(users.id, session.user_id));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        otpauthUri,
        qrCode,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al configurar 2FA";
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
