import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiHandler, BadRequestError, ConflictError } from "@/lib/api";
import { users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { validateAuthEvent } from "@/lib/nostr";
import { eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";
import type { NostrEvent } from "@/lib/nostr";
import { familyMembers } from "@/lib/db";

/**
 * POST /api/auth/nostr/link
 *
 * Link a Nostr identity to the currently authenticated account.
 * Requires a signed NIP-42 challenge event.
 */
export const POST = apiHandler(async (request, { session, db }) => {
  const cookieStore = await cookies();
  const challenge = cookieStore.get("nostr_challenge")?.value;
  if (!challenge) {
    throw new BadRequestError("no_challenge");
  }

  const { signedEvent } = (await request.json()) as { signedEvent: NostrEvent };
  if (!signedEvent) {
    throw new BadRequestError("missing_fields");
  }

  const valid = validateAuthEvent(signedEvent, challenge);
  if (!valid) {
    throw new BadRequestError("invalid_nostr_signature");
  }

  const pubkey = signedEvent.pubkey;

  // Check if this pubkey is already linked to another account
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.nostr_pubkey, pubkey))
    .limit(1);

  if (existingUser.length > 0 && existingUser[0].id !== session.user_id) {
    throw new ConflictError("nostr_pubkey_already_linked");
  }

  // Check if current user already has a nostr_pubkey
  const currentUser = await db
    .select({ nostr_pubkey: users.nostr_pubkey })
    .from(users)
    .where(eq(users.id, session.user_id))
    .limit(1);

  if (currentUser[0]?.nostr_pubkey) {
    throw new ConflictError("account_already_has_nostr");
  }

  // Link the pubkey
  const updated = await db
    .update(users)
    .set({ nostr_pubkey: pubkey })
    .where(eq(users.id, session.user_id))
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      locale: users.locale,
      nostr_pubkey: users.nostr_pubkey,
    });

  // Refresh session with nostr_pubkey
  const memberResult = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, session.user_id))
    .orderBy(familyMembers.joined_at)
    .limit(1);

  const role = (memberResult[0]?.role as "sponsor" | "kid") ?? null;
  const user = updated[0];

  const token = await createSession({
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name,
    locale: user.locale as "es" | "en",
    role,
    nostr_pubkey: user.nostr_pubkey,
  });

  const response = NextResponse.json<ApiResponse>({
    success: true,
    data: updated[0],
  });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // Clear the challenge cookie
  response.cookies.set("nostr_challenge", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
});

/**
 * DELETE /api/auth/nostr/link
 *
 * Unlink Nostr identity from the current account.
 * Only allowed if the user has a password (can't remove only auth method).
 */
export const DELETE = apiHandler(async (_request, { session, db }) => {
  // Verify user has a password (alternative auth method)
  const currentUser = await db
    .select({ password_hash: users.password_hash, nostr_pubkey: users.nostr_pubkey })
    .from(users)
    .where(eq(users.id, session.user_id))
    .limit(1);

  if (!currentUser[0]?.password_hash) {
    throw new BadRequestError("cannot_unlink_only_auth_method");
  }

  if (!currentUser[0]?.nostr_pubkey) {
    throw new BadRequestError("no_nostr_linked");
  }

  // Unlink
  await db
    .update(users)
    .set({ nostr_pubkey: null })
    .where(eq(users.id, session.user_id));

  // Refresh session without nostr_pubkey
  const memberResult = await db
    .select({ role: familyMembers.role })
    .from(familyMembers)
    .where(eq(familyMembers.user_id, session.user_id))
    .orderBy(familyMembers.joined_at)
    .limit(1);

  const role = (memberResult[0]?.role as "sponsor" | "kid") ?? null;

  const token = await createSession({
    user_id: session.user_id,
    email: session.email,
    username: session.username,
    display_name: session.display_name,
    locale: session.locale,
    role,
    nostr_pubkey: null,
  });

  const response = NextResponse.json<ApiResponse>({ success: true });

  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
});
