import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import Tag from "@/components/ui/tag";
import styles from "./use-cases.module.scss";

interface UseCase {
  icon: string;
  tag: string;
  tagVariant: "gold" | "green" | "coral";
  title: string;
  description: string;
  items: string[];
}

const USE_CASES: UseCase[] = [
  {
    icon: "🧒",
    tag: "Financial Education",
    tagVariant: "gold",
    title: "Allowance 2.0 — Kids Stack Sats",
    description:
      "Parents fund a Lightning wallet. Kids earn sats by completing chores and responsibilities. It's the modern allowance — digital, instant, and teaches financial literacy from day one.",
    items: [
      "Make the bed, do laundry, homework, wash the car",
      "Kids learn to save, spend, and stack sats",
      "Parents see everything — full transparency",
      "Builds responsibility through real economic incentives",
    ],
  },
  {
    icon: "💪",
    tag: "Community Health",
    tagVariant: "green",
    title: "Exercise & Earn — Healthier Communities",
    description:
      "Community pools where members earn sats for working out. Inspired by real conversations at La Crypta about zapping people who exercise. Social accountability meets Lightning rewards.",
    items: [
      "Community funds a reward pool",
      "Members earn sats for verified workouts",
      "Integration with open-source fitness trackers (Nostr-based, self-hosted)",
      "Nostr zaps for celebrating milestones together",
    ],
  },
  {
    icon: "🤝",
    tag: "Assisted Living",
    tagVariant: "coral",
    title: "Dignity Through Achievement",
    description:
      "For people with mental health conditions who struggle with motivation for daily tasks. Family members fund the wallet as support — but instead of just receiving money, the person earns it by completing daily life tasks.",
    items: [
      "Clean the apartment, make the bed, take out trash",
      "Help family members with simple tasks",
      "Tasks that are genuinely difficult due to lack of motivation",
      "Transforms financial support from charity into achievement",
      "Preserves dignity — earning, not just asking",
      "Small wins create momentum and help with recovery",
    ],
  },
];

export const UseCases: React.FC = () => {
  return (
    <Section id="use-cases" alternate aria-labelledby="cases-title">
      <SectionTitle
        id="cases-title"
        title="Real Use Cases"
        subtitle="Not just another habit tracker — a tool that changes lives"
      />
      <div className={styles.useCases}>
        {USE_CASES.map((useCase) => (
          <article key={useCase.title} className={styles.useCase}>
            <div className={styles.icon} aria-hidden="true">
              {useCase.icon}
            </div>
            <div>
              <Tag variant={useCase.tagVariant}>{useCase.tag}</Tag>
              <h3>{useCase.title}</h3>
              <p>{useCase.description}</p>
              <ul>
                {useCase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
};

export default UseCases;
