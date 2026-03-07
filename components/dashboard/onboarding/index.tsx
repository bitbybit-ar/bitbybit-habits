"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { BoltIcon, CheckIcon, UserPlusIcon, PlusIcon, ChevronRightIcon } from "@/components/icons";
import styles from "./onboarding.module.scss";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  detail: string;
}

interface OnboardingProps {
  displayName: string;
  onDismiss: () => void;
}

export function Onboarding({ displayName, onDismiss }: OnboardingProps) {
  const t = useTranslations("onboarding");
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      icon: <BoltIcon size={32} color="#F7A825" />,
      title: t("step1Title"),
      description: t("step1Desc"),
      detail: t("step1Detail"),
    },
    {
      icon: <UserPlusIcon size={32} color="#4CAF7D" />,
      title: t("step2Title"),
      description: t("step2Desc"),
      detail: t("step2Detail"),
    },
    {
      icon: <PlusIcon size={32} color="#F7A825" />,
      title: t("step3Title"),
      description: t("step3Desc"),
      detail: t("step3Detail"),
    },
    {
      icon: <CheckIcon size={32} color="#4CAF7D" />,
      title: t("step4Title"),
      description: t("step4Desc"),
      detail: t("step4Detail"),
    },
  ];

  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <div className={styles.onboarding}>
      <div className={styles.header}>
        <h2 className={styles.welcome}>
          {t("welcome", { name: displayName })}
        </h2>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </div>

      <div className={styles.progress}>
        {steps.map((_, i) => (
          <button
            key={i}
            className={cn(
              styles.dot,
              i === currentStep && styles.dotActive,
              i < currentStep && styles.dotDone,
            )}
            onClick={() => setCurrentStep(i)}
            aria-label={`${t("step")} ${i + 1}`}
          />
        ))}
      </div>

      <div className={styles.stepCard}>
        <div className={styles.stepNumber}>{currentStep + 1}/{steps.length}</div>
        <div className={styles.stepIcon}>{step.icon}</div>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDescription}>{step.description}</p>
        <div className={styles.stepDetail}>
          <p>{step.detail}</p>
        </div>
      </div>

      <div className={styles.actions}>
        {currentStep > 0 && (
          <button
            className={styles.backButton}
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            {t("back")}
          </button>
        )}
        {isLastStep ? (
          <button className={styles.startButton} onClick={onDismiss}>
            {t("start")}
            <BoltIcon size={16} />
          </button>
        ) : (
          <button
            className={styles.nextButton}
            onClick={() => setCurrentStep((s) => s + 1)}
          >
            {t("next")}
            <ChevronRightIcon size={16} />
          </button>
        )}
      </div>

      <button className={styles.skipButton} onClick={onDismiss}>
        {t("skip")}
      </button>
    </div>
  );
}

export default Onboarding;
