import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AuthSession } from "./types";

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Get the secret key for JWT signing
function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  const encoded = new TextEncoder().encode(secret);
  // Ensure proper Uint8Array instance (fixes cross-realm issues in test environments)
  return new Uint8Array(encoded);
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(session: AuthSession): Promise<string> {
  const secret = getSecretKey();
  const exp = Math.floor((Date.now() + SESSION_DURATION) / 1000);

  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function createTempToken(userId: string, purpose: string): Promise<string> {
  const secret = getSecretKey();
  const exp = Math.floor((Date.now() + 5 * 60 * 1000) / 1000); // 5 minutes

  const token = await new SignJWT({ user_id: userId, purpose })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);

    // Runtime validation — reject malformed JWTs
    const { user_id, email, username, display_name, locale, role } = payload;

    if (
      typeof user_id !== "string" || !user_id ||
      typeof email !== "string" || !email ||
      typeof username !== "string" || !username ||
      typeof display_name !== "string"
    ) {
      return null;
    }

    const validLocale = locale === "es" || locale === "en" ? locale : "es";
    const validRole = role === "sponsor" || role === "kid" ? role : null;
    const validNostrPubkey = typeof payload.nostr_pubkey === "string" ? payload.nostr_pubkey : null;
    const validAvatarUrl = typeof payload.avatar_url === "string" ? payload.avatar_url : null;

    return {
      user_id,
      email,
      username,
      display_name,
      avatar_url: validAvatarUrl,
      locale: validLocale,
      role: validRole,
      nostr_pubkey: validNostrPubkey,
    };
  } catch {
    return null;
  }
}
