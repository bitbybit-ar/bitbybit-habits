import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // If user has a locale preference cookie, use it
  const localePref = request.cookies.get("NEXT_LOCALE")?.value;
  if (localePref && routing.locales.includes(localePref as "es" | "en")) {
    // next-intl middleware respects the NEXT_LOCALE cookie by default
  } else {
    // Auto-detect from Accept-Language header
    const acceptLang = request.headers.get("accept-language") || "";
    const preferred = acceptLang
      .split(",")
      .map((part) => {
        const [lang, q] = part.trim().split(";q=");
        return { lang: lang.trim().split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
      })
      .sort((a, b) => b.q - a.q)
      .find((entry) => routing.locales.includes(entry.lang as "es" | "en"));

    if (preferred) {
      const response = intlMiddleware(request);
      response.cookies.set("NEXT_LOCALE", preferred.lang, {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      return response;
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
