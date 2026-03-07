"use client";

import React from "react";
import { useTranslations } from "next-intl";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
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
      <SectionTitle id="powered-title" title={t("title")} />
      <div className={styles.poweredBy}>
        {PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={partner.logo} alt={partner.name} className={styles.logo} />
            {partner.name}
          </a>
        ))}
      </div>
    </Section>
  );
};

export default BuiltWith;
