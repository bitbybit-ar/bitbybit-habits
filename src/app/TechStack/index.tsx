import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./tech-stack.module.scss";

const TECH = [
  { emoji: "⚡", title: "Lightning Network", description: "Instant, near-free micro-payments. LNURL for easy withdrawals. NWC for wallet integration. Bolt12 for recurring rewards." },
  { emoji: "🔐", title: "Nostr", description: "Decentralized identity & login. Zaps for social rewards. NIP-05 verification. No accounts, no emails." },
  { emoji: "🤖", title: "OpenClaw", description: "AI-powered bot for Duolingo-style reminders, notifications about rewards, and smart task scheduling." },
  { emoji: "🍬", title: "Cashu", description: "Ecash mints for instant, private micro-rewards. Perfect for kids' wallets — no on-chain fees." },
  { emoji: "🗣️", title: "Whisper", description: "Speech-to-text for accessibility. Complete tasks by voice. No screen needed." },
  { emoji: "🧠", title: "Local AI (Ollama)", description: "Privacy-first insights and habit analysis. All processing on-device. Your data never leaves." },
];

export const TechStack: React.FC = () => {
  return (
    <Section id="tech-stack" alternate aria-labelledby="tech-title">
      <SectionTitle
        id="tech-title"
        title="Tech Stack"
        subtitle="Built on Bitcoin-native, privacy-first technologies"
      />
      <div className={styles.grid}>
        {TECH.map((tech) => (
          <article key={tech.title} className={styles.card}>
            <span className={styles.emoji} aria-hidden="true">{tech.emoji}</span>
            <div>
              <h4>{tech.title}</h4>
              <p>{tech.description}</p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};

export default TechStack;
