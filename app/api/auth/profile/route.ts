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

  if (username !== undefined && username.trim().length < 3) {
    throw new BadRequestError("El nombre de usuario debe tener al menos 3 caracteres");
  }

  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new BadRequestError("Email inválido");
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
