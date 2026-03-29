import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SwRegister } from "@/components/sw-register";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/lib/theme-context";
import { StructuredData } from "@/components/seo/structured-data";
import "@/styles/globals.scss";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-display",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("common");
  const seo = await getTranslations("seo");

  const title = `${t("appName")} — ${seo("tagline")}`;
  const description = seo("description");
  const baseUrl = "https://bitbybit.com.ar";
  const localeUrl = `${baseUrl}/${locale}`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "es_AR",
      alternateLocale: locale === "en" ? ["es_AR"] : ["en_US"],
      url: localeUrl,
      siteName: "BitByBit",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: localeUrl,
      languages: {
        es: "/es",
        en: "/en",
      },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "es" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = document.cookie.match(/(?:^|; )theme=([^;]*)/);
            var theme = t ? t[1] : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
            document.documentElement.setAttribute('data-theme', theme);
          })();
        `}} />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="theme-color" content="#F7A825" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BitByBit" />
        <StructuredData locale={locale} />
      </head>
      <body className={`${nunito.variable} ${nunitoSans.variable}`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <ToastProvider>
              <a href="#main-content" className="skip-link">
                {messages && typeof messages === "object" && "accessibility" in messages
                  ? (messages.accessibility as Record<string, string>).skipToContent
                  : "Skip to content"}
              </a>
              <SwRegister />
              <main id="main-content">{children}</main>
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
