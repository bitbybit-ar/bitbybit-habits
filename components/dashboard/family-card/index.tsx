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
  name: string;
  inviteCode: string;
  members: FamilyMemberInfo[];
}

export function FamilyCard({ name, inviteCode, members }: FamilyCardProps) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.familyName}>{name}</h3>
      </div>

      <div className={styles.codeSection}>
        <span className={styles.codeLabel}>{t("family.inviteCode")}</span>
        <div className={styles.codeRow}>
          <code className={styles.code}>{inviteCode}</code>
          <button className={styles.copyButton} onClick={handleCopy}>
            {copied ? <CheckIcon size={14} /> : null}
            {copied ? t("sponsorDashboard.copied") : t("family.copyCode")}
          </button>
        </div>
      </div>

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
                <span className={styles.memberName}>{member.display_name || member.username}</span>
                <span className={styles.memberRole}>
                  {member.role === "sponsor" ? t("auth.sponsor") : t("auth.kid")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FamilyCard;
