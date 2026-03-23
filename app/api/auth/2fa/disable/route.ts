import { apiHandler, requireFields, BadRequestError } from "@/lib/api";
import { users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { TOTP } from "otpauth";

export const POST = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { code } = body as { code: string };

  requireFields({ code }, ["code"]);

  // Get user's TOTP secret
  const result = await db
    .select({ totp_secret: users.totp_secret, totp_enabled: users.totp_enabled })
    .from(users)
    .where(eq(users.id, session.user_id))
    .limit(1);

  if (result.length === 0 || !result[0].totp_secret || !result[0].totp_enabled) {
    throw new BadRequestError("2FA no esta habilitado");
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

  // Disable 2FA and clear secrets
  await db
    .update(users)
    .set({
      totp_enabled: false,
      totp_secret: null,
      recovery_codes: null,
    })
    .where(eq(users.id, session.user_id));

  return { message: "2FA deshabilitado exitosamente" };
});
