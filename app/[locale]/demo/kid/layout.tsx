import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "demo" });

  return pageMetadata({
    locale,
    path: "/demo/kid",
    title: `${t("kidDemoTitle")} | ${SITE_NAME}`,
    description: t("kidDemoSubtitle"),
  });
}

export default function KidDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
