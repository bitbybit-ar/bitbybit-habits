"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UsersIcon } from "@/components/icons";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FamilyCard } from "@/components/dashboard/family-card";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
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
  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setShowCreateModal(false);
        setFamilyName("");
        onFamilyCreated();
      } else {
        setError(data.error || t("auth.connectionError"));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setCreating(false);
    }
  };

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
        <Modal onClose={() => setShowCreateModal(false)} size="sm" title={t("family.createFamily")}>
          <FormInput
            id="create-family-name"
            label={t("family.familyName")}
            value={familyName}
            onChange={setFamilyName}
            placeholder={t("family.familyName")}
          />
          {error && <p className="form-error">{error}</p>}
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={creating || !familyName.trim()}
            style={{ marginTop: 16, width: "100%" }}
          >
            {creating ? t("common.loading") : t("family.createFamily")}
          </Button>
        </Modal>
      )}
    </DashboardSection>
  );
}
