"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Button from "@/components/ui/button";
import DemoStepper from "@/components/demo/DemoStepper";
import FamilyCard from "@/components/dashboard/family-card";
import PendingList from "@/components/dashboard/pending-list";
import type { PendingCompletion } from "@/components/dashboard/pending-list";
import HabitCard from "@/components/dashboard/habit-card";
import { CheckIcon, BoltIcon, ArrowRightIcon, BellIcon, ArrowLeftIcon } from "@/components/icons";
import type { Habit } from "@/lib/types";
import styles from "./sponsor-demo.module.scss";

const MOCK_USER_ID = "demo-sponsor-1";
const MOCK_KID_ID = "demo-kid-1";
const MOCK_FAMILY_ID = "demo-family-1";

interface Step2Props {
  familyCreated: boolean;
  kidJoined: boolean;
  mockMembers: { user_id: string; display_name: string; username: string; role: string; avatar_url: string | null }[];
  onViewed: () => void;
}

const Step2Content: React.FC<Step2Props> = ({ familyCreated, kidJoined, mockMembers, onViewed }) => {
  const t = useTranslations("demo.sponsor");

  useEffect(() => {
    onViewed();
  }, [onViewed]);

  if (!familyCreated) {
    return (
      <div className={styles.stepInner}>
        <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
        <p className={styles.stepDesc}>{t("step2Desc")}</p>
        <div className={styles.fallbackMsg}>
          <ArrowLeftIcon size={16} /> {t("step2Title")}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step2Title")}</h3>
      <p className={styles.stepDesc}>{t("step2Desc")}</p>
      <FamilyCard
        familyId={MOCK_FAMILY_ID}
        name="Familia Nakamoto"
        inviteCode="BIT-7K3M"
        members={mockMembers}
        createdBy={MOCK_USER_ID}
        currentUserId={MOCK_USER_ID}
        currentUserRole="sponsor"
      />
      <p className={styles.step2Info}>{t("step2Info")}</p>
      {kidJoined ? (
        <div className={`${styles.successBadge} ${styles.slideIn}`}>
          <CheckIcon size={16} /> Satoshi Jr. {t("step2Hint")}
        </div>
      ) : (
        <div className={styles.loadingDots}>
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
};

const SponsorDemo: React.FC = () => {
  const t = useTranslations("demo.sponsor");
  const tc = useTranslations("common");

  const [familyCreated, setFamilyCreated] = useState(false);
  const [kidJoined, setKidJoined] = useState(false);
  const [createdHabit, setCreatedHabit] = useState<Habit | null>(null);
  const [pendingCompletions, setPendingCompletions] = useState<PendingCompletion[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [reviewResult, setReviewResult] = useState<"approved" | "rejected" | null>(null);
  const [totalSatsPaid, setTotalSatsPaid] = useState(0);
  const [step2Viewed, setStep2Viewed] = useState(false);
  const step2TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-simulate kid joining when step 2 is viewed
  useEffect(() => {
    if (step2Viewed && familyCreated && !kidJoined) {
      step2TimerRef.current = setTimeout(() => {
        setKidJoined(true);
      }, 1500);
      return () => {
        if (step2TimerRef.current) clearTimeout(step2TimerRef.current);
      };
    }
  }, [step2Viewed, familyCreated, kidJoined]);

  const handleCreateDemoHabit = useCallback(() => {
    const habit: Habit = {
      id: "demo-habit-1",
      family_id: MOCK_FAMILY_ID,
      created_by: MOCK_USER_ID,
      assigned_to: MOCK_KID_ID,
      name: t("habitExample"),
      description: t("habitExampleDesc"),
      color: "#F7A825",
      sat_reward: 500,
      schedule_type: "daily",
      schedule_days: undefined,
      schedule_times_per_week: undefined,
      verification_type: "sponsor_approval",
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCreatedHabit(habit);

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
  }, [t]);

  const handleApprove = useCallback(
    async (completionId: string) => {
      const completion = pendingCompletions.find((c) => c.id === completionId);
      if (completion) {
        setTotalSatsPaid((prev) => prev + completion.sat_reward);
      }
      setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
      setReviewed(true);
      setReviewResult("approved");
    },
    [pendingCompletions],
  );

  const handleReject = useCallback(async (completionId: string) => {
    setPendingCompletions((prev) => prev.filter((c) => c.id !== completionId));
    setReviewed(true);
    setReviewResult("rejected");
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
          <Button className={styles.glowHint} onClick={() => setFamilyCreated(true)}>{tc("create")}</Button>
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

    // Step 2: Invite Kid (informational — auto-simulates kid joining)
    <Step2Content
      key="s2"
      familyCreated={familyCreated}
      kidJoined={kidJoined}
      mockMembers={mockMembers}
      onViewed={() => setStep2Viewed(true)}
    />,

    // Step 3: Create Habit (compact pre-filled)
    <div key="s3" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step3Title")}</h3>
      <p className={styles.stepDesc}>{t("step3Desc")}</p>
      {!createdHabit ? (
        <div className={styles.glassForm}>
          <div className={styles.field}>
            <label className={styles.label}>{t("habitName")}</label>
            <input className={styles.input} defaultValue={t("habitExample")} readOnly />
          </div>
          <div className={styles.compactRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t("reward")}</label>
              <input className={styles.input} defaultValue="500 sats" readOnly />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("schedule")}</label>
              <input className={styles.input} defaultValue={t("daily")} readOnly />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("habitDesc")}</label>
            <input className={styles.input} defaultValue={t("habitExampleDesc")} readOnly />
          </div>
          <Button className={styles.glowHint} onClick={handleCreateDemoHabit}>
            {tc("create")} {t("habitName")}
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.successBadge}>
            <CheckIcon size={16} /> {t("habitCreatedMsg")}
          </div>
          <p className={styles.previewLabel}>{t("step3PreviewLabel")}</p>
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
      {!createdHabit ? (
        <div className={styles.fallbackMsg}>
          <ArrowLeftIcon size={16} /> {tc("back")}
        </div>
      ) : (
      <>
      <div className={styles.notification}>
        <div className={styles.notifIcon}>
          <BellIcon size={20} />
        </div>
        <div className={styles.notifText}>
          <strong>{t("completionNotif")}</strong>
          <span>{t("completionNotifDesc")}</span>
        </div>
      </div>
      {!reviewed ? (
        <PendingList
          completions={pendingCompletions.length > 0 ? pendingCompletions : [{
            id: "demo-completion-1",
            habit_id: "demo-habit-1",
            habit_name: createdHabit?.name ?? t("habitExample"),
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
        <div className={reviewResult === "approved" ? styles.successBadge : styles.rejectedBadge}>
          <CheckIcon size={16} /> {reviewResult === "approved" ? t("approvedMsg") : t("rejectedMsg")}
        </div>
      )}
      </>
      )}
    </div>,

    // Step 5: Sats Sent
    <div key="s5" className={styles.stepInner}>
      <h3 className={styles.stepTitle}>{t("step5Title")}</h3>
      <p className={styles.stepDesc}>{t("step5Desc")}</p>
      <div className={styles.celebration}>
        <BoltIcon size={48} color="#F7A825" />
        <div className={styles.satsAmount}>
          {totalSatsPaid || (createdHabit?.sat_reward ?? 500)} sats
        </div>
        <p>{t("satsSentMsg")}</p>
      </div>
      <div className={styles.ctaCenter}>
        <Link href="/register">
          <Button size="lg" className={styles.glowHint}>{t("registerCTA")}</Button>
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

  const canAdvance = [
    familyCreated,        // step 1: must create family
    kidJoined,            // step 2: auto-simulated kid joining
    !!createdHabit,       // step 3: must create habit
    reviewed,             // step 4: must approve or reject completion
    true,                 // step 5: always can finish
  ];

  return <DemoStepper steps={steps} finishNode={finishNode} canAdvance={canAdvance} backUrl="/demo" />;
};

export default SponsorDemo;
