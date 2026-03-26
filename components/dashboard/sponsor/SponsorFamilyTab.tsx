"use client";

import { useTranslations } from "next-intl";
import { UsersIcon } from "@/components/icons";
import { FamilyCard } from "@/components/dashboard/family-card";
import type { FamilyWithMembers } from "@/lib/hooks/useFamilies";
import styles from "../../../app/[locale]/(dashboard)/sponsor/sponsor.module.scss";

interface SponsorFamilyTabProps {
  families: FamilyWithMembers[];
  sessionUserId: string;
  onLeave: (familyId: string) => void;
  onDelete: (familyId: string) => void;
  onRoleChange: (familyId: string, userId: string, newRole: string) => void;
  onRemoveMember: (familyId: string, userId: string) => void;
}

export function SponsorFamilyTab({ families, sessionUserId, onLeave, onDelete, onRoleChange, onRemoveMember }: SponsorFamilyTabProps) {
  const t = useTranslations();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("family.myFamily")}</h2>
      {families.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}><UsersIcon size={48} /></span>
          <h3 className={styles.emptyTitle}>{t("emptyState.noFamily")}</h3>
          <p className={styles.emptySubtext}>{t("emptyState.noFamilySponsorDesc")}</p>
        </div>
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
              onRoleChange={onRoleChange}
              onRemoveMember={onRemoveMember}
            />
          );
        })
      )}
    </div>
  );
}
