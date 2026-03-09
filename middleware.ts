import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth/server";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

// Protected route patterns (without locale prefix)
const protectedPatterns = [
  /^\/?[a-z]{2}\/(kid|sponsor|settings|onboard|dashboard)(\/|$)/,
  /^\/(kid|sponsor|settings|onboard|dashboard)(\/|$)/,
];

const neonMiddleware = auth.middleware({ loginUrl: "/login" });

export default async function middleware(request: NextRequest) {
  // Check if this is a protected route
  const isProtected = protectedPatterns.some((pattern) =>
    pattern.test(request.nextUrl.pathname)
  );

  if (isProtected) {
    // Run Neon Auth middleware for protected routes
    const authResponse = await neonMiddleware(request);
    // If redirected (not authenticated), return the redirect
    if (authResponse.status === 307 || authResponse.status === 302) {
      return authResponse;
    }
  }

  // Run intl middleware for all routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
