"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import DemoStepper from "@/components/demo/DemoStepper";
import FamilyCard from "@/components/dashboard/family-card";
import CreateHabitForm from "@/components/dashboard/create-habit-form";
import type { CreateHabitData } from "@/components/dashboard/create-habit-form";
import PendingList from "@/components/dashboard/pending-list";
import type { PendingCompletion } from "@/components/dashboard/pending-list";
import StatsBar from "@/components/dashboard/stats-bar";
import HabitCard from "@/components/dashboard/habit-card";
import { CheckIcon, BoltIcon, ArrowRightIcon, BellIcon } from "@/components/icons";
import type { Habit, Completion } from "@/lib/types";
import styles from "./sponsor-demo.module.scss";

const MOCK_USER_ID = "demo-sponsor-1";
const MOCK_KID_ID = "demo-kid-1";
const MOCK_FAMILY_ID = "demo-family-1";

const SponsorDemo: React.FC = () => {
  const t = useTranslations("demo.sponsor");
  const tc = useTranslations("common");

  const [familyCreated, setFamilyCreated] = useState(false);
  const [kidJoined, setKidJoined] = useState(false);
  const [createdHabit, setCreatedHabit] = useState<Habit | null>(null);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [approved, setApproved] = useState(false);
  const [totalSatsPaid, setTotalSatsPaid] = useState(0);

  const mockMembers = [
    {
      user_id: MOCK_USER_ID,
      display_name: "Mamá",
      username: "mama_nakamoto",
      role: "sponsor",
      avatar_url: null,
    },
    ...(kidJoined
      ? [
          {
            user_id: MOCK_KID_ID,
            display_name: "Satoshi Jr.",
            username: "satoshi_jr",
            role: "kid",
            avatar_url: null,
          },
        ]
      : []),
  ];

  const handleCreateHabit = useCallback(
    async (data: CreateHabitData) => {
      const habit: Habit = {
        id: "demo-habit-1",
        family_id: MOCK_FAMILY_ID,
        created_by: MOCK_USER_ID,
        assigned_to: MOCK_KID_ID,
        name: data.name,
        description: data.description,
        color: data.color,
        sat_reward: data.sat_reward,
        schedule_type: data.schedule_type,
        schedule_days: data.schedule_days,
        schedule_times_per_week: data.schedule_times_per_week,
        verification_type: data.verification_type,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCreatedHabit(habit);

      // Auto-generate a pending completion for step 4
      setPendingCompletions([
        {
          id: "demo-completion-1",
          habit_id: habit.id,
          habit_name: habit.name,
          habit_color: habit.color,
          kid_name: "Satoshi Jr.",
          sat_reward: habit.sat_reward,
          date: new Date().toISOString().split("T")[0],
          completed_at: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const handleApprove = useCallback(
    async (completionId: string) => {
      const completion = pendingCompletions.find((c) => c.id === completionId);
      if (completion) {
        setTotalSatsPaid((prev) => prev + completion.sat_reward);
      }
      setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
      setApproved(true);
    },
    [pendingCompletions],
  );

  const handleReject = useCallback(async (completionId: string) => {
    setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
  }, []);

  const steps = [
    // Step 1: Create Family
    <div key="s1" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step1Title")}</h3>
      <p className={styles.stepDesc}>{t("step1Desc")}</p>
      {!familyCreated ? (
        <div className={styles.glassForm}>
          <div className={styles.field}>
            <label className={styles.label}>{t("familyName")}</label>
            <input className={styles.input} defaultValue="Familia Nakamoto" readOnly />
          </div>
          <Button onClick={() => setFamilyCreated(true)}>{tc("create")}</Button>
        </div>
      ) : (
        <FamilyCard
          familyId={MOCK_FAMILY_ID}
          name="Familia Nakamoto"
          inviteCode="BIT-7K3M"
          members={mockMembers}
          createdBy={MOCK_USER_ID}
          currentUserId={MOCK_USER_ID}
          currentUserRole="sponsor"
        />
      )}
    </div>,

    // Step 2: Invite Kid
    <div key="s2" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
      <p className={styles.stepDesc}>{t("step2Desc")}</p>
      {!kidJoined ? (
        <>
          <FamilyCard
            familyId={MOCK_FAMILY_ID}
            name="Familia Nakamoto"
            inviteCode="BIT-7K3M"
            members={mockMembers}
            createdBy={MOCK_USER_ID}
            currentUserId={MOCK_USER_ID}
            currentUserRole="sponsor"
          />
          <div className={styles.simulateAction}>
            <Button variant="outline" onClick={() => setKidJoined(true)}>
              {t("step2Hint")}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={styles.successBadge}>
            <CheckIcon size={16} /> Satoshi Jr. {t("step2Hint")}
          </div>
          <FamilyCard
            familyId={MOCK_FAMILY_ID}
            name="Familia Nakamoto"
            inviteCode="BIT-7K3M"
            members={mockMembers}
            createdBy={MOCK_USER_ID}
            currentUserId={MOCK_USER_ID}
            currentUserRole="sponsor"
          />
        </>
      )}
    </div>,

    // Step 3: Create Habit
    <div key="s3" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step3Title")}</h3>
      <p className={styles.stepDesc}>{t("step3Desc")}</p>
      {!createdHabit ? (
        <CreateHabitForm
          families={[{ id: MOCK_FAMILY_ID, name: "Familia Nakamoto" }]}
          kids={[{ user_id: MOCK_KID_ID, display_name: "Satoshi Jr." }]}
          onSubmit={handleCreateHabit}
        />
      ) : (
        <>
          <div className={styles.successBadge}>
            <CheckIcon size={16} /> {t("habitCreatedMsg")}
          </div>
          <HabitCard
            habit={createdHabit}
            completions={[]}
            onComplete={() => {}}
            hideAction
          />
        </>
      )}
    </div>,

    // Step 4: Approve Completion
    <div key="s4" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step4Title")}</h3>
      <p className={styles.stepDesc}>{t("step4Desc")}</p>
      <div className={styles.notification}>
        <div className={styles.notifIcon}>
          <BellIcon size={20} />
        </div>
        <div className={styles.notifText}>
          <strong>{t("completionNotif")}</strong>
          <span>{t("completionNotifDesc")}</span>
        </div>
      </div>
      {!approved ? (
        <PendingList
          completions={pendingCompletions.length > 0 ? pendingCompletions : [{
            id: "demo-completion-1",
            habit_id: "demo-habit-1",
            habit_name: createdHabit?.name ?? "Leer 30 minutos",
            habit_color: createdHabit?.color ?? "#F7A825",
            kid_name: "Satoshi Jr.",
            sat_reward: createdHabit?.sat_reward ?? 500,
            date: new Date().toISOString().split("T")[0],
            completed_at: new Date().toISOString(),
          }]}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      ) : (
        <div className={styles.successBadge}>
          <CheckIcon size={16} /> {t("approvedMsg")}
        </div>
      )}
    </div>,

    // Step 5: Sats Sent
    <div key="s5" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step5Title")}</h3>
      <p className={styles.stepDesc}>{t("step5Desc")}</p>
      <StatsBar
        totalSats={totalSatsPaid || (createdHabit?.sat_reward ?? 500)}
        bestStreak={1}
        pendingCount={0}
      />
      <div className={styles.celebration}>
        <BoltIcon size={48} color="#F7A825" />
        <div className={styles.satsAmount}>
          {totalSatsPaid || (createdHabit?.sat_reward ?? 500)} sats
        </div>
        <p>{t("satsSentMsg")}</p>
      </div>
      <div className={styles.ctaCenter}>
        <Link href="/register">
          <Button size="lg">{t("registerCTA")}</Button>
        </Link>
      </div>
    </div>,
  ];

  const finishNode = (
    <Link href="/demo/kid">
      <Button variant="outline">
        {tc("viewKidDemo")} <ArrowRightIcon size={14} />
      </Button>
    </Link>
  );

  return <DemoStepper steps={steps} finishNode={finishNode} />;
};

export default SponsorDemo;
