import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

// bitbybit.com.ar is a different site (the studio); this app lives on its own subdomain.
export const SITE_URL = "https://habits.bitbybit.com.ar";
export const SITE_NAME = "BitByBit";

type Locale = (typeof routing.locales)[number];

const OG_LOCALES: Record<Locale, string> = { es: "es_AR", en: "en_US" };

export const PUBLIC_PATHS = ["", "/demo", "/demo/sponsor", "/demo/kid"] as const;
export type PublicPath = (typeof PUBLIC_PATHS)[number];

export const NOINDEX: Metadata = { robots: { index: false, follow: true } };

export function localeUrl(locale: string, path: PublicPath): string {
  return `${SITE_URL}/${locale}${path}`;
}

export function languageAlternates(path: PublicPath): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l, path)])),
    "x-default": localeUrl(routing.defaultLocale, path),
  };
}

interface PageMetadataOptions {
  locale: string;
  path: PublicPath;
  title: string;
  description: string;
}

export function pageMetadata({ locale, path, title, description }: PageMetadataOptions): Metadata {
  const url = localeUrl(locale, path);
  // Nested segments that set openGraph drop the [locale] file-based images, so name them.
  const ogImage = `${SITE_URL}/${locale}/opengraph-image`;
  const twitterImage = `${SITE_URL}/${locale}/twitter-image`;
  const ogLocale = OG_LOCALES[locale as Locale] ?? OG_LOCALES[routing.defaultLocale];

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: Object.values(OG_LOCALES).filter((l) => l !== ogLocale),
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [ogImage],
    },
    twitter: { card: "summary_large_image", title, description, images: [twitterImage] },
  };
}
