import { createNeonAuth } from '@neondatabase/auth/next/server';

function initAuth() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
    // Return a stub during build time when env vars aren't available
    return null;
  }
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
  });
}

let _auth: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth() {
  if (!_auth) {
    _auth = initAuth();
  }
  return _auth;
}

// For backward compat — lazy init
export const auth = new Proxy({} as ReturnType<typeof createNeonAuth>, {
  get(_, prop) {
    const instance = getAuth();
    if (!instance) {
      throw new Error('Neon Auth not configured — check NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET');
    }
    return (instance as Record<string | symbol, unknown>)[prop];
  },
});
