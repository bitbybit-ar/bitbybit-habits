"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UsersIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FamilyCard } from "@/components/dashboard/family-card";
import { JoinFamilyModal } from "@/components/dashboard/join-family-modal";
import type { FamilyWithMembers } from "@/lib/hooks/useFamilies";

interface KidFamilyTabProps {
  families: FamilyWithMembers[];
  sessionUserId: string;
  onJoinSuccess: () => void;
  onLeave: (familyId: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function KidFamilyTab({ families, sessionUserId, onJoinSuccess, onLeave, showToast }: KidFamilyTabProps) {
  const t = useTranslations();
  const [showJoinModal, setShowJoinModal] = useState(false);

  const hasFamily = families.length > 0;

  return (
    <DashboardSection title={t("family.myFamily")}>
      {hasFamily ? (
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
      ) : (
        <EmptyState
          icon={<UsersIcon size={48} />}
          title={t("emptyState.noFamily")}
          description={t("emptyState.noFamilyKidDesc")}
          actionLabel={t("family.joinFamily")}
          onAction={() => setShowJoinModal(true)}
        />
      )}

      {showJoinModal && (
        <JoinFamilyModal
          onClose={() => setShowJoinModal(false)}
          onJoined={() => {
            setShowJoinModal(false);
            showToast(t("family.joinSuccess"), "success");
            onJoinSuccess();
          }}
        />
      )}
    </DashboardSection>
  );
}
