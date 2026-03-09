import { auth } from '@/lib/auth/server';
import { getDb } from '@/lib/db';
import type { AuthSession } from './types';

export async function getSession(): Promise<AuthSession | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;

  const db = getDb();

  // Try to find existing app user by Neon Auth user ID
  const users = await db`
    SELECT id, email, username, display_name, locale
    FROM users WHERE id = ${session.user.id}
  `;

  if (users.length > 0) {
    const u = users[0];
    return {
      user_id: u.id as string,
      email: u.email as string,
      username: u.username as string,
      display_name: u.display_name as string,
      locale: (u.locale as 'es' | 'en') || 'es',
    };
  }

  // Auto-create app user on first Neon Auth login
  const username = session.user.name || session.user.email.split('@')[0];
  const newUsers = await db`
    INSERT INTO users (id, email, username, display_name, locale)
    VALUES (
      ${session.user.id},
      ${session.user.email},
      ${username},
      ${session.user.name || ''},
      'es'
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id, email, username, display_name, locale
  `;

  if (newUsers.length > 0) {
    const u = newUsers[0];
    return {
      user_id: u.id as string,
      email: u.email as string,
      username: u.username as string,
      display_name: u.display_name as string,
      locale: (u.locale as 'es' | 'en') || 'es',
    };
  }

  // Fallback: return from Neon Auth session directly
  return {
    user_id: session.user.id,
    email: session.user.email,
    username: session.user.name || session.user.email.split('@')[0],
    display_name: session.user.name || '',
    locale: 'es' as const,
  };
}
