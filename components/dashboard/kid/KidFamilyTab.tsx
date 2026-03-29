"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { UsersIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FamilyCard } from "@/components/dashboard/family-card";
import { FormInput, FormButton } from "@/components/ui/form";
import { resolveApiError } from "@/lib/error-messages";
import type { FamilyWithMembers } from "@/lib/hooks/useFamilies";
import styles from "../../../app/[locale]/(dashboard)/kid/kid.module.scss";

interface KidFamilyTabProps {
  families: FamilyWithMembers[];
  sessionUserId: string;
  onJoinSuccess: () => void;
  onLeave: (familyId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function KidFamilyTab({ families, sessionUserId, onJoinSuccess, onLeave, showToast }: KidFamilyTabProps) {
  const t = useTranslations();
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoinFamily = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setJoinLoading(true);
    try {
      const res = await fetch("/api/families/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinCode }),
      });
      const data = await res.json();
      if (data.success) {
        setJoinCode("");
        showToast(t("family.joinSuccess"), "success");
        onJoinSuccess();
      } else {
        setJoinError(resolveApiError(data.error, t));
      }
    } catch {
      setJoinError(t("auth.connectionError"));
    } finally {
      setJoinLoading(false);
    }
  }, [joinCode, showToast, t, onJoinSuccess]);

  return (
    <DashboardSection title={t("family.myFamily")}>
      {families.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={48} />}
          title={t("emptyState.noFamily")}
          description={t("emptyState.noFamilyKidDesc")}
        />
      ) : (
        families.map((family) => (
          <FamilyCard
            key={family.id}
            familyId={family.id}
            name={family.name}
            inviteCode={family.invite_code}
            members={family.members}
            createdBy={family.created_by}
            currentUserId={sessionUserId}
            currentUserRole={family.members.find((m) => m.user_id === sessionUserId)?.role}
            onLeave={onLeave}
          />
        ))
      )}
      <div className={styles.joinSection}>
        <h3 className={styles.joinTitle}>{t("family.joinFamily")}</h3>
        <form onSubmit={handleJoinFamily} className={styles.joinForm}>
          <FormInput
            id="join-code"
            placeholder={t("family.enterInviteCode")}
            maxLength={6}
            value={joinCode}
            onChange={(v) => setJoinCode(v.toUpperCase())}
            error={joinError || undefined}
          />
          <FormButton type="submit" loading={joinLoading} loadingText={t("common.loading")} disabled={!joinCode.trim()}>
            {t("family.join")}
          </FormButton>
        </form>
      </div>
    </DashboardSection>
  );
}
