import { apiHandler, requireFields, BadRequestError } from "@/lib/api";
import { users } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";

// Generate random alphanumeric recovery code
function generateRecoveryCode(length: number = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar chars
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { code } = body as { code: string };

  requireFields({ code }, ["code"]);

  // Get user's TOTP secret
  const result = await db
    .select({ totp_secret: users.totp_secret })
    .from(users)
    .where(eq(users.id, session.user_id))
    .limit(1);

  if (result.length === 0 || !result[0].totp_secret) {
    throw new BadRequestError("2FA no configurado");
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
    throw new BadRequestError("Codigo invalido");
  }

  // Generate 8 recovery codes
  const recoveryCodes = Array.from({ length: 8 }, () => generateRecoveryCode(10));

  // Hash recovery codes before storing
  const hashedCodes = await Promise.all(
    recoveryCodes.map((c) => hashPassword(c))
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
  return { recoveryCodes };
});
