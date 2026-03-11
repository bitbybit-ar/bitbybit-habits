"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button";
import styles from "./demo-stepper.module.scss";

interface DemoStepperProps {
  steps: React.ReactNode[];
  onFinish?: () => void;
  finishLabel?: string;
  finishNode?: React.ReactNode;
}

export const DemoStepper: React.FC<DemoStepperProps> = ({ steps, onFinish, finishLabel, finishNode }) => {
  const t = useTranslations("common");
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    if (current < steps.length - 1) setCurrent((c) => c + 1);
  }, [current, steps.length]);

  const prev = useCallback(() => {
    if (current > 0) setCurrent((c) => c - 1);
  }, [current]);

  return (
    <div>
      <div className={styles.stepper}>
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className={`${styles.connector} ${i <= current ? styles.active : ""}`} />
            )}
            <div
              className={`${styles.step} ${i === current ? styles.active : ""} ${i < current ? styles.completed : ""}`}
            >
              {i < current ? "✓" : i + 1}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div key={current} className={styles.stepContent}>
        {steps[current]}
      </div>

      <div className={styles.nav}>
        <Button variant="outline" onClick={prev} disabled={current === 0}>
          ← {t("back")}
        </Button>
        {current === steps.length - 1 ? (
          finishNode ?? <Button onClick={onFinish}>{finishLabel || t("confirm")}</Button>
        ) : (
          <Button onClick={next}>{t("next")} →</Button>
        )}
      </div>
    </div>
  );
};

export default DemoStepper;
