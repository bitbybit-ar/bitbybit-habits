"use client";

import { useTranslations } from "next-intl";
import { ShieldIcon, BoltIcon, UsersIcon } from "@/components/icons";
import styles from "./admin-users-table.module.scss";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  nostr_pubkey: string | null;
  locale: string;
  totp_enabled: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  has_wallet: boolean;
  families: {
    user_id: string;
    family_id: string;
    role: "sponsor" | "kid";
    family_name: string;
  }[];
}

interface AdminUserRowProps {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onUnlock: (userId: string) => void;
  onDelete: (userId: string, displayName: string) => void;
}

function isLocked(user: AdminUser): boolean {
  return !!user.locked_until && new Date(user.locked_until) > new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminUserRow({ user, onEdit, onUnlock, onDelete }: AdminUserRowProps) {
  const t = useTranslations("admin");

  return (
    <tr>
      <td>
        <div className={styles.userCell}>
          <div className={styles.userAvatar}>
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.display_name}</span>
            <span className={styles.userEmail}>@{user.username} &middot; {user.email}</span>
          </div>
        </div>
      </td>
      <td>
        <div className={styles.familyBadges}>
          {user.families.length === 0 && (
            <span className={styles.noFamily}>{t("noFamily")}</span>
          )}
          {user.families.map((f) => (
            <span key={f.family_id} className={`${styles.badge} ${styles.badgeFamily}`}>
              {f.family_name}
            </span>
          ))}
          {user.families.some((f) => f.role === "sponsor") && (
            <span className={`${styles.badge} ${styles.badgeSponsor}`}>
              <UsersIcon size={10} />
              {t("badgeSponsor")}
            </span>
          )}
        </div>
      </td>
      <td>
        <div className={styles.familyBadges}>
          {isLocked(user) && (
            <span className={`${styles.badge} ${styles.badgeLocked}`}>
              {t("locked")}
            </span>
          )}
          {user.has_wallet && (
            <span className={`${styles.badge} ${styles.badgeWallet}`}>
              <BoltIcon size={10} />
              {t("wallet")}
            </span>
          )}
          {user.totp_enabled && (
            <span className={`${styles.badge} ${styles.badge2fa}`}>
              <ShieldIcon size={10} />
              {t("badge2fa")}
            </span>
          )}
          {user.nostr_pubkey && (
            <span className={`${styles.badge} ${styles.badge2fa}`}>
              {t("badgeNostr")}
            </span>
          )}
        </div>
      </td>
      <td>{formatDate(user.created_at)}</td>
      <td>
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onEdit(user)}>
            {t("edit")}
          </button>
          {isLocked(user) && (
            <button
              className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
              onClick={() => onUnlock(user.id)}
            >
              {t("unlock")}
            </button>
          )}
          <button
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={() => onDelete(user.id, user.display_name)}
          >
            {t("delete")}
          </button>
        </div>
      </td>
    </tr>
  );
}
