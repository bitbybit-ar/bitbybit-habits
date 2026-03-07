import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import Card from "@/components/ui/card";
import styles from "./why-lightning.module.scss";

const REASONS = [
  { icon: "⚡", stat: "< 1 second", title: "Instant Settlement", description: "Rewards arrive the moment a task is verified. No waiting, no processing." },
  { icon: "🪙", stat: "< 1 sat fee", title: "Near-Free Transactions", description: "Send 10 sats or 10,000 — fees are fractions of a cent. Perfect for micro-rewards." },
  { icon: "🌍", stat: "Global", title: "No Bank Needed", description: "Anyone with a phone can receive rewards. No bank account, no KYC, no borders." },
  { icon: "🔓", stat: "Permissionless", title: "Open Protocol", description: "No company controls it. No one can freeze funds or shut you down. Money that's truly yours." },
  { icon: "🤖", stat: "Programmable", title: "Smart Rewards", description: "Automate payments with code. Bots can send sats. Streaks can trigger bonuses. APIs for everything." },
];

export const WhyLightning: React.FC = () => {
  return (
    <Section id="why-lightning" aria-labelledby="why-title">
      <SectionTitle
        id="why-title"
        title="Why Bitcoin Lightning?"
        subtitle="The perfect technology for micro-rewards"
      />
      <div className={styles.grid}>
        {REASONS.map((reason) => (
          <Card key={reason.title} variant="hover" className={styles.card}>
            <div className={styles.icon} aria-hidden="true">{reason.icon}</div>
            <div className={styles.stat}>{reason.stat}</div>
            <h4>{reason.title}</h4>
            <p>{reason.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default WhyLightning;
