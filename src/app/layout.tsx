import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.scss";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://annaloppo.github.io/bitbybit";

export const metadata: Metadata = {
  title: "BitByBit ⚡ — Earn sats. Build habits. Change lives.",
  description:
    "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats. Built for La Crypta Hackathons 2026.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    title: "BitByBit ⚡ — Earn sats. Build habits. Change lives.",
    description:
      "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats.",
    url: SITE_URL,
    siteName: "BitByBit",
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "BitByBit — Earn sats. Build habits.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BitByBit ⚡ — Earn sats. Build habits. Change lives.",
    description:
      "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats.",
    images: [`${SITE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "BitByBit",
              description:
                "A habit tracker powered by Bitcoin Lightning Network that rewards task completion with real sats.",
              url: SITE_URL,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              creator: {
                "@type": "Organization",
                name: "La Crypta",
                url: "https://lacrypta.ar",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
