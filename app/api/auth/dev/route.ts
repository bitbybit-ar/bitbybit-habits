import { NextRequest, NextResponse } from "next/server";
import { getDb, users } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

function isDevAuth(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_AUTH === "true";
}

/** POST /api/auth/dev — Dev-only login (creates user if needed) */
export async function POST(request: NextRequest) {
  if (!isDevAuth()) {
    return NextResponse.json(
      { success: false, error: "Dev auth not available" },
      { status: 403 }
    );
  }

  const { email, username } = (await request.json()) as {
    email?: string;
    username?: string;
  };

  if (!email) {
    return NextResponse.json(
      { success: false, error: "Email is required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const name = username || email.split("@")[0];

  const existing = await db
    .select({ id: users.id, email: users.email, username: users.username, display_name: users.display_name })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let user;
  if (existing.length > 0) {
    user = existing[0];
  } else {
    const created = await db
      .insert(users)
      .values({ email, username: name, display_name: name, locale: "es" })
      .returning({ id: users.id, email: users.email, username: users.username, display_name: users.display_name });
    user = created[0];
  }

  const token = await createSession({
    user_id: user.id,
    email: user.email,
    username: user.username,
    display_name: user.display_name || user.username,
    locale: "es",
    role: null,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ success: true, data: user });
}

/** DELETE /api/auth/dev — Dev-only logout */
export async function DELETE() {
  if (!isDevAuth()) {
    return NextResponse.json(
      { success: false, error: "Dev auth not available" },
      { status: 403 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.delete("session");

  return NextResponse.json({ success: true });
}
