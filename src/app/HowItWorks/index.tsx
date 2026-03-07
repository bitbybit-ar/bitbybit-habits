import React from "react";
import Section from "@/components/ui/section";
import SectionTitle from "@/components/ui/section-title";
import Card from "@/components/ui/card";
import styles from "./how-it-works.module.scss";

const STEPS = [
  { number: 1, title: "Fund a Wallet", description: "A sponsor — parent, community, or yourself — loads sats into a Lightning wallet" },
  { number: 2, title: "Set Up Tasks", description: "Create habits and daily tasks with sat rewards attached to each one" },
  { number: 3, title: "Get Reminded", description: "AI bot sends Duolingo-style reminders. Motivational, persistent, fun." },
  { number: 4, title: "Complete → Earn ⚡", description: "Finish the task, get verified, receive sats instantly via Lightning" },
];

export const HowItWorks: React.FC = () => {
  return (
    <Section id="how-it-works" aria-labelledby="how-title">
      <SectionTitle
        id="how-title"
        title="How It Works"
        subtitle="Four simple steps from task to sats"
      />
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <Card key={step.number} variant="hover" className={styles.step}>
            <div className={styles.stepNumber} aria-hidden="true">
              {step.number}
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
};

export default HowItWorks;
