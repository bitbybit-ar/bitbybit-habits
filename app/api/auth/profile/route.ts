import { apiHandler, NotFoundError, BadRequestError } from "@/lib/api";
import { users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const GET = apiHandler(async (_req, { session, db }) => {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      display_name: users.display_name,
      avatar_url: users.avatar_url,
      locale: users.locale,
    })
    .from(users)
    .where(eq(users.id, session.user_id));

  if (result.length === 0) {
    throw new NotFoundError("Usuario");
  }

  return result[0];
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

  const updates: Partial<typeof users.$inferInsert> = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (username !== undefined) updates.username = username.trim();
  if (email !== undefined) updates.email = email.trim();
  if (avatar_url !== undefined) updates.avatar_url = avatar_url.trim();
  if (locale !== undefined) updates.locale = locale;

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
    });

  return updated[0];
});
