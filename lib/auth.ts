import { hash, compare } from "bcryptjs";
import { cookies } from "next/headers";
import type { AuthSession } from "./types";

const SALT_ROUNDS = 10;

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
  // Simple base64-encoded JSON token (upgrade to signed JWT if needed)
  const payload = JSON.stringify({
    ...session,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
  });

  return Buffer.from(payload).toString("base64");
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());

    if (payload.exp < Date.now()) return null;

    return {
      user_id: payload.user_id,
      email: payload.email,
      username: payload.username,
      display_name: payload.display_name,
      locale: payload.locale,
      role: payload.role ?? null,
    };
  } catch {
    return null;
  }
}
