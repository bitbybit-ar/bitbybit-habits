"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserIcon, CheckIcon } from "@/components/icons";
import styles from "./family-card.module.scss";

interface FamilyMemberInfo {
  user_id: string;
  display_name: string;
  username: string;
  role: string;
  avatar_url: string | null;
}

interface FamilyCardProps {
  familyId: string;
  name: string;
  inviteCode: string;
  members: FamilyMemberInfo[];
  createdBy: string;
  currentUserId: string;
  currentUserRole?: string;
  onLeave?: (familyId: string) => void;
  onDelete?: (familyId: string) => void;
  onRoleChange?: (familyId: string, userId: string, newRole: string) => void;
  onRemoveMember?: (familyId: string, userId: string) => void;
}

export function FamilyCard({
  familyId,
  name,
  inviteCode,
  members,
  createdBy,
  currentUserId,
  currentUserRole,
  onLeave,
  onDelete,
  onRoleChange,
  onRemoveMember,
}: FamilyCardProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(null);

  const isCreator = currentUserId === createdBy;
  const isSponsor = currentUserRole === "sponsor";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  const handleLeave = () => {
    if (confirmAction === "leave") {
      onLeave?.(familyId);
      setConfirmAction(null);
    } else {
      setConfirmAction("leave");
    }
  };

  const handleDelete = () => {
    if (confirmAction === "delete") {
      onDelete?.(familyId);
      setConfirmAction(null);
    } else {
      setConfirmAction("delete");
    }
  };

  const handleRoleToggle = (userId: string, currentRole: string) => {
    const newRole = currentRole === "sponsor" ? "kid" : "sponsor";
    onRoleChange?.(familyId, userId, newRole);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteCode)}&bgcolor=1A1A2E&color=F7A825`;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.familyName}>{name}</h3>
        <div className={styles.headerActions}>
          {onLeave && (
            <button
              className={`${styles.actionButton} ${styles.leaveButton}`}
              onClick={handleLeave}
            >
              {confirmAction === "leave"
                ? t("common.confirm")
                : t("family.leaveFamily")}
            </button>
          )}
          {isCreator && onDelete && (
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={handleDelete}
            >
              {confirmAction === "delete"
                ? t("common.confirm")
                : t("family.deleteFamily")}
            </button>
          )}
          {confirmAction && (
            <button
              className={styles.actionButton}
              onClick={() => setConfirmAction(null)}
            >
              {t("common.cancel")}
            </button>
          )}
        </div>
      </div>

      {confirmAction === "leave" && (
        <p className={styles.confirmText}>{t("family.confirmLeave")}</p>
      )}
      {confirmAction === "delete" && (
        <p className={styles.confirmText}>{t("family.confirmDelete")}</p>
      )}

      {(!currentUserRole || currentUserRole === "sponsor") && (
        <div className={styles.codeSection}>
          <span className={styles.codeLabel}>{t("family.inviteCode")}</span>
          <div className={styles.codeRow}>
            <code className={styles.code}>{inviteCode}</code>
            <button className={styles.copyButton} onClick={handleCopy}>
              {copied ? <CheckIcon size={14} /> : null}
              {copied ? t("sponsorDashboard.copied") : t("family.copyCode")}
            </button>
          </div>
          <button
            className={styles.qrToggle}
            onClick={() => setShowQR((prev) => !prev)}
          >
            {showQR ? t("family.hideQR") : t("family.showQR")}
          </button>
          {showQR && (
            <div className={styles.qrContainer}>
              <img
                src={qrUrl}
                alt={`QR: ${inviteCode}`}
                width={150}
                height={150}
                className={styles.qrImage}
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.membersSection}>
        <span className={styles.membersLabel}>
          {t("family.members")} ({members.length})
        </span>
        <div className={styles.membersList}>
          {members.map((member) => (
            <div key={member.user_id} className={styles.member}>
              <div className={styles.avatar}>
                <UserIcon size={16} />
              </div>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>
                  {member.display_name || member.username}
                </span>
                <span className={styles.memberRole}>
                  {member.role === "sponsor" ? t("auth.sponsor") : t("auth.kid")}
                </span>
              </div>
              {isSponsor && onRoleChange && member.user_id !== currentUserId && (
                <button
                  className={styles.roleToggle}
                  onClick={() => handleRoleToggle(member.user_id, member.role)}
                  title={t("family.changeRole")}
                >
                  {member.role === "sponsor" ? "→ Kid" : "→ Sponsor"}
                </button>
              )}
              {isSponsor && onRemoveMember && member.user_id !== currentUserId && (
                <button
                  className={styles.removeBtn}
                  onClick={() => {
                    if (confirm(t("family.confirmRemoveMember"))) {
                      onRemoveMember(familyId, member.user_id);
                    }
                  }}
                  title={t("family.removeMember")}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FamilyCard;
