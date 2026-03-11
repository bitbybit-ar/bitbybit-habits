"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import DemoStepper from "@/components/demo/DemoStepper";
import styles from "../MockForm/mock-form.module.scss";

const KidDemo: React.FC = () => {
  const t = useTranslations("demo.kid");
  const tc = useTranslations("common");

  const [joined, setJoined] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [satsCount, setSatsCount] = useState(0);

  const habits = [
    { id: "h1", name: t("habit1"), desc: t("habit1Desc"), sats: 500 },
    { id: "h2", name: t("habit2"), desc: t("habit2Desc"), sats: 300 },
    { id: "h3", name: t("habit3"), desc: t("habit3Desc"), sats: 200 },
  ];

  const steps = [
    // Step 1: Join family
    <div key="k1">
      <h3 className={styles.stepTitle}>{t("step1Title")}</h3>
      <p className={styles.stepDesc}>{t("step1Desc")}</p>
      <Card>
        <div style={{ padding: "24px" }}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t("inviteCode")}</label>
              <input className={styles.input} defaultValue="BIT-7K3M" />
            </div>
            {!joined ? (
              <Button onClick={() => setJoined(true)}>{t("join")}</Button>
            ) : (
              <div className={styles.completedBadge}>✓ {t("joinedMsg")}</div>
            )}
          </div>
        </div>
      </Card>
    </div>,

    // Step 2: View habits
    <div key="k2">
      <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
      <p className={styles.stepDesc}>{t("step2Desc")}</p>
      <div className={styles.habitList}>
        {habits.map((h) => (
          <div key={h.id} className={styles.habitCard}>
            <div className={styles.habitInfo}>
              <h4>{h.name}</h4>
              <p>{h.desc}</p>
            </div>
            <span className={styles.habitReward}>⚡ {h.sats} sats</span>
          </div>
        ))}
      </div>
    </div>,

    // Step 3: Complete a habit
    <div key="k3">
      <h3 className={styles.stepTitle}>{t("step3Title")}</h3>
      <p className={styles.stepDesc}>{t("step3Desc")}</p>
      <div className={styles.habitList}>
        {habits.map((h) => (
          <div key={h.id} className={styles.habitCard}>
            <div className={styles.habitInfo}>
              <h4>{h.name}</h4>
              <p>⚡ {h.sats} sats</p>
            </div>
            {completed[h.id] ? (
              <div className={styles.completedBadge}>✓</div>
            ) : (
              <Button
                size="sm"
                onClick={() => setCompleted((c) => ({ ...c, [h.id]: true }))}
              >
                {t("complete")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>,

    // Step 4: Pending approval
    <div key="k4">
      <h3 className={styles.stepTitle}>{t("step4Title")}</h3>
      <p className={styles.stepDesc}>{t("step4Desc")}</p>
      <div className={styles.habitList}>
        {habits.filter((h) => completed[h.id]).length > 0 ? (
          habits
            .filter((h) => completed[h.id])
            .map((h) => (
              <div key={h.id} className={styles.habitCard}>
                <div className={styles.habitInfo}>
                  <h4>{h.name}</h4>
                  <p>⚡ {h.sats} sats</p>
                </div>
                <div className={styles.pendingBadge}>{t("pending")}</div>
              </div>
            ))
        ) : (
          <p className={styles.stepDesc}>{t("noneCompleted")}</p>
        )}
      </div>
    </div>,

    // Step 5: Receive sats!
    <div key="k5">
      <h3 className={styles.stepTitle}>{t("step5Title")}</h3>
      <p className={styles.stepDesc}>{t("step5Desc")}</p>
      <div className={styles.celebration}>
        <div className={styles.confetti}>🎉⚡🎉</div>
        <div className={styles.counter}>
          +{Object.keys(completed).reduce((sum, id) => {
            const h = habits.find((x) => x.id === id);
            return sum + (h?.sats || 0);
          }, 0)}{" "}
          sats
        </div>
        <p>{t("celebrationMsg")}</p>
      </div>
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Link href="/register">
          <Button size="lg">{t("registerCTA")}</Button>
        </Link>
      </div>
    </div>,
  ];

  const finishNode = (
    <Link href="/demo/sponsor">
      <Button variant="outline">
        {tc("viewSponsorDemo")} →
      </Button>
    </Link>
  );

  return <DemoStepper steps={steps} finishNode={finishNode} />;
};

export default KidDemo;
