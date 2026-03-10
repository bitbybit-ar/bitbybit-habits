import { apiHandler, NotFoundError, BadRequestError } from "@/lib/api";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (_req, { session, db }) => {
  const users = await db`
    SELECT id, email, username, display_name, avatar_url, locale
    FROM users WHERE id = ${session.user_id}
  ` as Partial<User>[];

  if (users.length === 0) {
    throw new NotFoundError("Usuario");
  }

  return users[0];
});

export const PATCH = apiHandler(async (request, { session, db }) => {
  const body = await request.json();
  const { display_name, username, email, avatar_url, locale } = body as {
    display_name?: string;
    username?: string;
    email?: string;
    avatar_url?: string;
    locale?: "es" | "en";
  };

  if (locale && !["es", "en"].includes(locale)) {
    throw new BadRequestError("Locale inválido");
  }

  // Check username uniqueness if changing
  if (username?.trim()) {
    const existing = await db`
      SELECT id FROM users WHERE LOWER(TRIM(username)) = ${username.trim().toLowerCase()} AND id != ${session.user_id}
    `;
    if (existing.length > 0) {
      throw new BadRequestError("Ese nombre de usuario ya está en uso");
    }
  }

  // Check email uniqueness if changing
  if (email?.trim()) {
    const existing = await db`
      SELECT id FROM users WHERE LOWER(TRIM(email)) = ${email.trim().toLowerCase()} AND id != ${session.user_id}
    `;
    if (existing.length > 0) {
      throw new BadRequestError("Ese email ya está en uso");
    }
  }

  const updated = await db`
    UPDATE users SET
      display_name = COALESCE(${display_name?.trim() ?? null}, display_name),
      username = COALESCE(${username?.trim() ?? null}, username),
      email = COALESCE(${email?.trim() ?? null}, email),
      avatar_url = COALESCE(${avatar_url?.trim() ?? null}, avatar_url),
      locale = COALESCE(${locale ?? null}, locale)
    WHERE id = ${session.user_id}
    RETURNING id, email, username, display_name, avatar_url, locale
  `;

  return updated[0];
});
