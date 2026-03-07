import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./built-with.module.scss";

const PARTNERS = [
  { icon: "🏛️", name: "La Crypta", href: "https://lacrypta.ar" },
  { icon: "🤖", name: "OpenClaw", href: "https://openclaw.com" },
  { icon: "₿", name: "Bitcoin", href: "https://bitcoin.org" },
];

export const BuiltWith: React.FC = () => {
  return (
    <Section alternate aria-labelledby="powered-title" style={{ padding: "60px 0" }}>
      <SectionTitle id="powered-title" title="Built With" />
      <div className={styles.poweredBy}>
        {PARTNERS.map((partner) => (
          <a
            key={partner.name}
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.icon} aria-hidden="true">{partner.icon}</span>
            {partner.name}
          </a>
        ))}
      </div>
    </Section>
  );
};

export default BuiltWith;
