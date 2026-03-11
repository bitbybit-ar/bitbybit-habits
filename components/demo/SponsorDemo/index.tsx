"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import DemoStepper from "@/components/demo/DemoStepper";
import styles from "../MockForm/mock-form.module.scss";

const SponsorDemo: React.FC = () => {
  const t = useTranslations("demo.sponsor");
  const tc = useTranslations("common");

  const [familyCreated, setFamilyCreated] = useState(false);
  const [habitCreated, setHabitCreated] = useState(false);
  const [approved, setApproved] = useState(false);

  const steps = [
    // Step 1: Create family
    <div key="s1">
      <h3 className={styles.stepTitle}>{t("step1Title")}</h3>
      <p className={styles.stepDesc}>{t("step1Desc")}</p>
      <Card>
        <div style={{ padding: "24px" }}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t("familyName")}</label>
              <input className={styles.input} defaultValue="Familia Nakamoto" readOnly />
            </div>
            {!familyCreated ? (
              <Button onClick={() => setFamilyCreated(true)}>{tc("create")}</Button>
            ) : (
              <div className={styles.completedBadge}>✓ {t("familyCreated")}</div>
            )}
          </div>
        </div>
      </Card>
    </div>,

    // Step 2: Invite kid
    <div key="s2">
      <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
      <p className={styles.stepDesc}>{t("step2Desc")}</p>
      <div className={styles.inviteCode}>
        <code>BIT-7K3M</code>
      </div>
      <p className={styles.stepDesc} style={{ marginTop: "16px", fontSize: "0.85rem" }}>
        {t("step2Hint")}
      </p>
    </div>,

    // Step 3: Create habit
    <div key="s3">
      <h3 className={styles.stepTitle}>{t("step3Title")}</h3>
      <p className={styles.stepDesc}>{t("step3Desc")}</p>
      <Card>
        <div style={{ padding: "24px" }}>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>{t("habitName")}</label>
              <input className={styles.input} defaultValue={t("habitExample")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("habitDesc")}</label>
              <input className={styles.input} defaultValue={t("habitExampleDesc")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("reward")}</label>
              <input className={styles.input} type="number" defaultValue="500" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("schedule")}</label>
              <select className={styles.select} defaultValue="daily">
                <option value="daily">{t("daily")}</option>
                <option value="weekly">{t("weekly")}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("verification")}</label>
              <select className={styles.select} defaultValue="sponsor">
                <option value="sponsor">{t("sponsorApproval")}</option>
                <option value="self">{t("selfVerify")}</option>
              </select>
            </div>
            {!habitCreated ? (
              <Button onClick={() => setHabitCreated(true)}>{tc("create")}</Button>
            ) : (
              <div className={styles.completedBadge}>✓ {t("habitCreatedMsg")}</div>
            )}
          </div>
        </div>
      </Card>
    </div>,

    // Step 4: Approve completion
    <div key="s4">
      <h3 className={styles.stepTitle}>{t("step4Title")}</h3>
      <p className={styles.stepDesc}>{t("step4Desc")}</p>
      <div className={styles.notification}>
        <span className={styles.notifIcon}>🔔</span>
        <div className={styles.notifText}>
          <strong>{t("completionNotif")}</strong>
          <span>{t("completionNotifDesc")}</span>
        </div>
      </div>
      <div style={{ marginTop: "16px" }}>
        {!approved ? (
          <Button onClick={() => setApproved(true)}>{t("approve")}</Button>
        ) : (
          <div className={styles.completedBadge}>✓ {t("approvedMsg")}</div>
        )}
      </div>
    </div>,

    // Step 5: Sats sent
    <div key="s5">
      <h3 className={styles.stepTitle}>{t("step5Title")}</h3>
      <p className={styles.stepDesc}>{t("step5Desc")}</p>
      <div className={styles.satsConfirm}>
        <div className={styles.lightning}>⚡</div>
        <div className={styles.satsAmount}>500 sats</div>
        <p>{t("satsSentMsg")}</p>
      </div>
      <div style={{ textAlign: "center", marginTop: "24px" }}>
        <Link href="/register">
          <Button size="lg">{t("registerCTA")}</Button>
        </Link>
      </div>
    </div>,
  ];

  const finishNode = (
    <Link href="/demo/kid">
      <Button variant="outline">
        {tc("viewKidDemo")} →
      </Button>
    </Link>
  );

  return <DemoStepper steps={steps} finishNode={finishNode} />;
};

export default SponsorDemo;
