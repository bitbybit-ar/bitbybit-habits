import { NextRequest, NextResponse } from "next/server";
import { isDevAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { cookies } from "next/headers";

const DEV_SESSION_COOKIE = "dev-session";

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

  // Find or create user
  const existing = await db`SELECT id, email, username, display_name FROM users WHERE email = ${email}`;

  let user;
  if (existing.length > 0) {
    user = existing[0];
  } else {
    const created = await db`
      INSERT INTO users (email, username, display_name, locale)
      VALUES (${email}, ${name}, ${name}, 'es')
      RETURNING id, email, username, display_name
    `;
    user = created[0];
  }

  const sessionData = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.display_name || user.username,
  });

  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, sessionData, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
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
  cookieStore.delete(DEV_SESSION_COOKIE);

  return NextResponse.json({ success: true });
}
