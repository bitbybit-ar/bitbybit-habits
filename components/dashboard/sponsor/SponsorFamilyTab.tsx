"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UsersIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FamilyCard } from "@/components/dashboard/family-card";
import { CreateFamilyModal } from "@/components/dashboard/create-family-modal";
import type { FamilyWithMembers } from "@/lib/hooks/useFamilies";

interface SponsorFamilyTabProps {
  families: FamilyWithMembers[];
  sessionUserId: string;
  onLeave: (familyId: string) => void;
  onDelete: (familyId: string) => void;
  onFamilyCreated: () => void;
  onRemoveMember: (familyId: string, userId: string) => void;
}

export function SponsorFamilyTab({ families, sessionUserId, onLeave, onDelete, onFamilyCreated, onRemoveMember }: SponsorFamilyTabProps) {
  const t = useTranslations();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <DashboardSection title={t("family.myFamily")}>
      {families.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={48} />}
          title={t("emptyState.noFamily")}
          description={t("emptyState.noFamilySponsorDesc")}
          actionLabel={t("family.createFamily")}
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        families.map((family) => {
          const myMembership = family.members.find((m) => m.user_id === sessionUserId);
          return (
            <FamilyCard
              key={family.id}
              familyId={family.id}
              name={family.name}
              inviteCode={family.invite_code}
              members={family.members}
              createdBy={family.created_by}
              currentUserId={sessionUserId}
              currentUserRole={myMembership?.role}
              onLeave={onLeave}
              onDelete={onDelete}
              onRemoveMember={onRemoveMember}
            />
          );
        })
      )}

      {showCreateModal && (
        <CreateFamilyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            onFamilyCreated();
          }}
        />
      )}
    </DashboardSection>
  );
}
