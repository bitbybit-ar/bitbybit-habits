"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import ScrollReveal from "@/components/ui/scroll-reveal";
import styles from "./built-with.module.scss";

const PARTNERS = [
  { name: "La Crypta", href: "https://lacrypta.ar", logo: "https://github.com/lacrypta.png?size=64" },
  { name: "OpenClaw", href: "https://openclaw.com", logo: "https://github.com/openclaw.png?size=64" },
  { name: "Bitcoin", href: "https://bitcoin.org", logo: "https://github.com/bitcoin.png?size=64" },
];

export const BuiltWith: React.FC = () => {
  const t = useTranslations("landing.builtWith");

  return (
    <Section alternate aria-labelledby="powered-title" style={{ padding: "60px 0" }}>
      <ScrollReveal>
        <SectionTitle id="powered-title" title={t("title")} />
      </ScrollReveal>
      <ScrollReveal>
      <div className={styles.poweredBy}>
        {PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src={partner.logo} alt={partner.name} width={64} height={64} className={styles.logo} />
            {partner.name}
          </a>
        ))}
      </div>
      </ScrollReveal>
    </Section>
  );
};

export default BuiltWith;
