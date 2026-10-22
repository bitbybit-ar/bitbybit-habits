import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import UseCases from "@/components/landing/UseCases";
import TechStack from "@/components/landing/TechStack";
import Roadmap from "@/components/landing/Roadmap";
import Team from "@/components/landing/Team";
import CallToAction from "@/components/landing/CallToAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return pageMetadata({
    locale,
    path: "",
    title: `${SITE_NAME} — ${t("tagline")}`,
    description: t("description"),
  });
}

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <UseCases />
      <TechStack />
      <Roadmap />
      <Team />
      <CallToAction />
    </>
  );
}
