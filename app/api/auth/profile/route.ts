import { apiHandler, NotFoundError, BadRequestError } from "@/lib/api";
import { users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/profile
 *
 * Return the authenticated user's profile.
 */
export const GET = apiHandler(async (_req, { session, db }) => {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      locale: users.locale,
      nostr_pubkey: users.nostr_pubkey,
      auth_provider: users.auth_provider,
      nostr_metadata: users.nostr_metadata,
      has_password: users.password_hash,
    })
    .from(users)
    .where(eq(users.id, session.user_id));

  if (result.length === 0) {
    throw new NotFoundError("User");
  }

  const profile = result[0];
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    locale: profile.locale,
    nostr_pubkey: profile.nostr_pubkey,
    auth_provider: profile.auth_provider,
    nostr_metadata: profile.nostr_metadata,
    has_password: !!profile.has_password,
  };
});

/**
 * PATCH /api/auth/profile
 *
 * Update the authenticated user's profile (display_name, username, email, avatar_url, locale).
 */
export const PATCH = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { display_name, username, email, avatar_url, locale, nostr_metadata } = body as {
    display_name?: string;
    username?: string;
    email?: string;
    avatar_url?: string;
    locale?: "es" | "en";
    nostr_metadata?: Record<string, unknown>;
  };

  if (locale && !["es", "en"].includes(locale)) {
    throw new BadRequestError("invalid_locale");
  }

  if (username !== undefined && username.trim().length < 3) {
    throw new BadRequestError("username_too_short");
  }

  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new BadRequestError("invalid_email");
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (username !== undefined) updates.username = username.trim();
  if (email !== undefined) updates.email = email.trim();
  if (avatar_url !== undefined) updates.avatar_url = avatar_url.trim();
  if (locale !== undefined) updates.locale = locale;
  if (nostr_metadata !== undefined) {
    updates.nostr_metadata = nostr_metadata;
    updates.nostr_metadata_updated_at = new Date();
  }

  const updated = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user_id))
    .returning({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      locale: users.locale,
      nostr_pubkey: users.nostr_pubkey,
      auth_provider: users.auth_provider,
      nostr_metadata: users.nostr_metadata,
    });

  return updated[0];
});
