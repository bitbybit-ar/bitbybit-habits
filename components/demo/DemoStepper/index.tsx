"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import styles from "./demo-stepper.module.scss";

interface DemoStepperProps {
  steps: React.ReactNode[];
  onFinish?: () => void;
  finishLabel?: string;
  finishNode?: React.ReactNode;
  /** If provided, Next button is disabled when canAdvance[current] is false */
  canAdvance?: boolean[];
  /** URL to navigate back to when on step 0 (e.g. /demo) */
  backUrl?: string;
}

export const DemoStepper: React.FC<DemoStepperProps> = ({ steps, onFinish, finishLabel, finishNode, canAdvance, backUrl }) => {
  const t = useTranslations("common");
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    if (current < steps.length - 1) setCurrent((c) => c + 1);
  }, [current, steps.length]);

  const prev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.stepper}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className={`${styles.connector} ${i <= current ? styles.active : ""}`} />
            )}
            <div
              className={`${styles.step} ${i === current ? styles.active : ""} ${i < current ? styles.completed : ""}`}
            >
              {i < current ? <CheckIcon size={16} color="currentColor" /> : i + 1}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div key={current} className={styles.stepContent}>
        {steps[current]}
      </div>

      <div className={styles.nav}>
        <Button variant="outline" onClick={current === 0 && backUrl ? () => router.push(backUrl) : prev} disabled={current === 0 && !backUrl}>
          <ArrowLeftIcon size={14} /> {t("back")}
        </Button>
        {current === steps.length - 1 ? (
          finishNode ?? <Button onClick={onFinish}>{finishLabel || t("confirm")}</Button>
        ) : (
          <Button onClick={next} disabled={canAdvance ? !canAdvance[current] : false}>{t("next")} <ArrowRightIcon size={14} /></Button>
        )}
      </div>
    </div>
  );
};

export default DemoStepper;
