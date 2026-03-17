"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import DemoStepper from "@/components/demo/DemoStepper";
import FamilyCard from "@/components/dashboard/family-card";
import HabitCard from "@/components/dashboard/habit-card";
import StatsBar from "@/components/dashboard/stats-bar";
import { CheckIcon, BoltIcon, StarIcon, ArrowRightIcon, ArrowLeftIcon } from "@/components/icons";
import type { Habit, Completion } from "@/lib/types";
import styles from "./kid-demo.module.scss";

const MOCK_USER_ID = "demo-kid-1";
const MOCK_SPONSOR_ID = "demo-sponsor-1";
const MOCK_FAMILY_ID = "demo-family-1";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const KidDemo: React.FC = () => {
  const t = useTranslations("demo.kid");
  const tc = useTranslations("common");

  const [joined, setJoined] = useState(false);
  const [completions, setCompletions] = useState<Completion[]>([]);

  const habits: Habit[] = useMemo(
    () => [
      {
        id: "h1",
        family_id: MOCK_FAMILY_ID,
        created_by: MOCK_SPONSOR_ID,
        assigned_to: MOCK_USER_ID,
        name: t("habit1"),
        description: t("habit1Desc"),
        color: "#F7A825",
        sat_reward: 500,
        schedule_type: "daily" as const,
        verification_type: "sponsor_approval" as const,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "h2",
        family_id: MOCK_FAMILY_ID,
        created_by: MOCK_SPONSOR_ID,
        assigned_to: MOCK_USER_ID,
        name: t("habit2"),
        description: t("habit2Desc"),
        color: "#4CAF7D",
        sat_reward: 300,
        schedule_type: "daily" as const,
        verification_type: "sponsor_approval" as const,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "h3",
        family_id: MOCK_FAMILY_ID,
        created_by: MOCK_SPONSOR_ID,
        assigned_to: MOCK_USER_ID,
        name: t("habit3"),
        description: t("habit3Desc"),
        color: "#4DB6AC",
        sat_reward: 200,
        schedule_type: "daily" as const,
        verification_type: "sponsor_approval" as const,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [t],
  );

  const handleComplete = useCallback((habitId: string) => {
    setCompletions((prev) => [
      ...prev,
      {
        id: `completion-${habitId}-${Date.now()}`,
        habit_id: habitId,
        user_id: MOCK_USER_ID,
        date: todayStr(),
        status: "pending" as const,
        completed_at: new Date().toISOString(),
      },
    ]);
  }, []);

  const completedHabitIds = useMemo(
    () => new Set(completions.map((c) => c.habit_id)),
    [completions],
  );

  const totalSatsEarned = useMemo(
    () =>
      habits
        .filter((h) => completedHabitIds.has(h.id))
        .reduce((sum, h) => sum + h.sat_reward, 0),
    [habits, completedHabitIds],
  );

  const familyMembers = [
    {
      user_id: MOCK_SPONSOR_ID,
      display_name: "Mamá",
      username: "mama_nakamoto",
      role: "sponsor",
      avatar_url: null,
    },
    {
      user_id: MOCK_USER_ID,
      display_name: "Satoshi Jr.",
      username: "satoshi_jr",
      role: "kid",
      avatar_url: null,
    },
  ];

  const steps = [
    // Step 1: Join Family
    <div key="k1" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step1Title")}</h3>
      <p className={styles.stepDesc}>{t("step1Desc")}</p>
      {!joined ? (
        <div className={styles.glassForm}>
          <div className={styles.field}>
            <label className={styles.label}>{t("inviteCode")}</label>
            <input className={styles.input} defaultValue="BIT-7K3M" readOnly />
          </div>
          <Button className={styles.glowHint} onClick={() => setJoined(true)}>{t("join")}</Button>
        </div>
      ) : (
        <>
          <div className={styles.successBadge}>
            <CheckIcon size={16} /> {t("joinedMsg")}
          </div>
          <FamilyCard
            familyId={MOCK_FAMILY_ID}
            name="Familia Nakamoto"
            inviteCode="BIT-7K3M"
            members={familyMembers}
            createdBy={MOCK_SPONSOR_ID}
            currentUserId={MOCK_USER_ID}
            currentUserRole="kid"
          />
        </>
      )}
    </div>,

    // Step 2: View Habits (preview)
    <div key="k2" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
      <p className={styles.stepDesc}>{t("step2Desc")}</p>
      {!joined ? (
        <div className={styles.fallbackMsg}>
          <ArrowLeftIcon size={16} /> {t("step1Title")}
        </div>
      ) : (
      <div className={styles.habitList}>
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            completions={[]}
            onComplete={() => {}}
            hideAction
          />
        ))}
      </div>
      )}
    </div>,

    // Step 3: Complete Habits
    <div key="k3" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step3Title")}</h3>
      <p className={styles.stepDesc}>{t("step3Desc")}</p>
      <div className={styles.habitList}>
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            completions={completions}
            onComplete={handleComplete}
            currentUserId={MOCK_USER_ID}
          />
        ))}
      </div>
    </div>,

    // Step 4: Pending Approval
    <div key="k4" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step4Title")}</h3>
      <p className={styles.stepDesc}>{t("step4Desc")}</p>
      {completedHabitIds.size > 0 ? (
        <div className={styles.habitList}>
          {habits
            .filter((h) => completedHabitIds.has(h.id))
            .map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completions={completions}
                onComplete={() => {}}
                hideAction={false}
                currentUserId={MOCK_USER_ID}
              />
            ))}
        </div>
      ) : (
        <div className={styles.fallbackMsg}>
          <ArrowLeftIcon size={16} /> Volvé al paso anterior y completá al menos un hábito.
        </div>
      )}
    </div>,

    // Step 5: Sats Earned
    <div key="k5" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step5Title")}</h3>
      <p className={styles.stepDesc}>{t("step5Desc")}</p>
      <StatsBar
        totalSats={totalSatsEarned || 1000}
        bestStreak={3}
        pendingCount={0}
      />
      <div className={styles.celebration}>
        <div className={styles.celebrationIcons}>
          <StarIcon size={32} color="#F7A825" />
          <BoltIcon size={48} color="#F7A825" />
          <StarIcon size={32} color="#F7A825" />
        </div>
        <div className={styles.satsAmount}>
          +{totalSatsEarned || 1000} sats
        </div>
        <p>{t("celebrationMsg")}</p>
      </div>
      <div className={styles.ctaCenter}>
        <Link href="/register">
          <Button size="lg" className={styles.glowHint}>{t("registerCTA")}</Button>
        </Link>
      </div>
    </div>,
  ];

  const finishNode = (
    <Link href="/demo/sponsor">
      <Button variant="outline">
        {tc("viewSponsorDemo")} <ArrowRightIcon size={14} />
      </Button>
    </Link>
  );

  const canAdvance = [
    joined,                        // step 1: must join family
    true,                          // step 2: view habits (always ok)
    completedHabitIds.size > 0,    // step 3: must complete at least 1 habit
    true,                          // step 4: pending (view only)
    true,                          // step 5: celebration
  ];

  return <DemoStepper steps={steps} finishNode={finishNode} canAdvance={canAdvance} backUrl="/demo" />;
};

export default KidDemo;
