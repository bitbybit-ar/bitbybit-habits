import { apiHandler } from "@/lib/api";
import { users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";
import QRCode from "qrcode";

export const POST = apiHandler(async (_request, { session, db }) => {
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

  return { otpauthUri, qrCode };
});
