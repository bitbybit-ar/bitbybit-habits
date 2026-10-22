export const dynamic = "force-static";

import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { languageAlternates, localeUrl, PUBLIC_PATHS } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: localeUrl(locale, path),
      lastModified,
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
