import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import styles from "./roadmap.module.scss";
import { cn } from "@/lib/utils";

const MILESTONES = [
  { month: "MAR", title: "⚡ Foundations", description: "Core Lightning payment flow. Wallet integration. Send and receive sats for task completion.", difficulty: "⭐ Beginner", current: true },
  { month: "ABR", title: "🔐 Identity", description: "Nostr login. User profiles. NIP-05 verification. Family accounts.", difficulty: "⭐ Beginner" },
  { month: "MAY", title: "💜 Zaps", description: "Community rewards. Social zapping for fitness milestones. Streak celebrations.", difficulty: "⭐⭐ Intermediate" },
  { month: "JUN", title: "🛒 Commerce", description: "Marketplace for task templates. Premium features. Sponsor dashboards.", difficulty: "⭐⭐ Intermediate" },
  { month: "JUL", title: "📸 Media", description: "Photo verification of task completion. AI validates images. Decentralized storage.", difficulty: "⭐⭐⭐ Advanced" },
  { month: "AGO", title: "🤖 AI Agents", description: "OpenClaw bot for Duolingo-style reminders. AI insights. Automated task verification.", difficulty: "⭐⭐⭐ Advanced" },
  { month: "SEP", title: "🏗️ Infrastructure", description: "Custom Lightning node. Optimized routing. Cashu mint for instant micro-rewards.", difficulty: "⭐⭐⭐⭐ Expert" },
  { month: "OCT", title: "🌐 Integration", description: "Full platform launch. All features combined. Kids, fitness, assisted living — one app.", difficulty: "⭐⭐⭐⭐ Expert" },
];

export const Roadmap: React.FC = () => {
  return (
    <Section id="roadmap" aria-labelledby="roadmap-title">
      <SectionTitle
        id="roadmap-title"
        title="Hackathon Roadmap"
        subtitle="8 months, 8 hackathons — each edition builds on the last"
      />
      <div className={styles.roadmap} role="list">
        {MILESTONES.map((milestone) => (
          <div
            key={milestone.month}
            className={cn(styles.item, milestone.current && styles.current)}
            role="listitem"
          >
            <div className={styles.month}>{milestone.month}</div>
            <div className={styles.line}>
              <div className={styles.dot} />
              <div className={styles.connector} />
            </div>
            <div className={styles.content}>
              <h4>{milestone.title}</h4>
              <p>{milestone.description}</p>
              <span className={styles.difficulty}>{milestone.difficulty}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

export default Roadmap;
