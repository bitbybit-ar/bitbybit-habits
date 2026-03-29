"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useApi } from "@/lib/hooks/useApi";
import { ShieldIcon, BoltIcon, UsersIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
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

interface AdminStats {
  db: "local" | "production";
  users: number;
  families: number;
  habits: number;
  completions: { total: number; approved: number; pending: number; rejected: number };
  payments: { total: number; paid: number; total_sats: number };
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface EditingUser {
  id: string;
  display_name: string;
  email: string;
  username: string;
  locale: string;
}

export function AdminUsersTable() {
  const t = useTranslations("admin");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [saving, setSaving] = useState(false);

  const statsUrl = "/api/admin/stats";
  const usersUrl = `/api/admin/users?page=${page}&limit=50${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`;

  const { data: stats, isLoading: statsLoading } = useApi<AdminStats | null>(statsUrl, null);
  const { data: usersData, isLoading: usersLoading, refetch } = useApi<UsersResponse | null>(usersUrl, null);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  }, [search]);

  const handleEdit = useCallback((user: AdminUser) => {
    setEditing({
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      username: user.username,
      locale: user.locale,
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editing.display_name,
          email: editing.email,
          username: editing.username,
          locale: editing.locale,
        }),
      });
      if (res.ok) {
        setEditing(null);
        refetch();
      }
    } finally {
      setSaving(false);
    }
  }, [editing, refetch]);

  const handleUnlock = useCallback(async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked_until: null, failed_login_attempts: 0 }),
    });
    if (res.ok) refetch();
  }, [refetch]);

  const handleDelete = useCallback(async (userId: string, displayName: string) => {
    if (!confirm(t("confirmDelete", { name: displayName }))) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) refetch();
  }, [t, refetch]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isLocked = (user: AdminUser) => {
    return user.locked_until && new Date(user.locked_until) > new Date();
  };

  return (
    <div>
      {/* DB indicator */}
      {!statsLoading && stats && (
        <div className={`${styles.dbIndicator} ${stats.db === "local" ? styles.dbLocal : styles.dbProd}`}>
          {stats.db === "local" ? "LOCAL DB" : "PROD DB"}
        </div>
      )}

      {/* Platform Stats */}
      {!statsLoading && stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.users}</div>
            <div className={styles.statLabel}>{t("statUsers")}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.families}</div>
            <div className={styles.statLabel}>{t("statFamilies")}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.habits}</div>
            <div className={styles.statLabel}>{t("statHabits")}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.completions.approved}</div>
            <div className={styles.statLabel}>{t("statApproved")}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.payments.paid}</div>
            <div className={styles.statLabel}>{t("statPayments")}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.payments.total_sats.toLocaleString()}</div>
            <div className={styles.statLabel}>{t("statSats")}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {usersData && (
          <span className={styles.searchCount}>
            {usersData.total} {t("usersFound")}
          </span>
        )}
      </form>

      {/* Users table */}
      {usersLoading ? (
        <Spinner size="sm" />
      ) : !usersData?.users.length ? (
        <div className={styles.emptyState}>{t("noUsers")}</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("colUser")}</th>
                  <th>{t("colFamilies")}</th>
                  <th>{t("colStatus")}</th>
                  <th>{t("colCreated")}</th>
                  <th>{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {usersData.users.map((user) => (
                  <tr key={user.id}>
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
                          <span style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>--</span>
                        )}
                        {user.families.map((f) => (
                          <span
                            key={f.family_id}
                            className={`${styles.badge} ${f.role === "sponsor" ? styles.badgeSponsor : styles.badgeKid}`}
                          >
                            {f.role === "sponsor" ? <UsersIcon size={10} /> : null}
                            {f.family_name}
                          </span>
                        ))}
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
                            2FA
                          </span>
                        )}
                        {user.nostr_pubkey && (
                          <span className={`${styles.badge} ${styles.badge2fa}`}>
                            Nostr
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEdit(user)}
                        >
                          {t("edit")}
                        </button>
                        {isLocked(user) && (
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}
                            onClick={() => handleUnlock(user.id)}
                          >
                            {t("unlock")}
                          </button>
                        )}
                        <button
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => handleDelete(user.id, user.display_name)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData.pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("prev")}
              </button>
              <span className={styles.pageInfo}>
                {page} / {usersData.pages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= usersData.pages}
                onClick={() => setPage(page + 1)}
              >
                {t("next")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <div className={styles.modalOverlay} onClick={() => setEditing(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>{t("editUser")}</h3>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("fieldDisplayName")}</label>
              <input
                className={styles.modalInput}
                value={editing.display_name}
                onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("fieldUsername")}</label>
              <input
                className={styles.modalInput}
                value={editing.username}
                onChange={(e) => setEditing({ ...editing, username: e.target.value })}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("fieldEmail")}</label>
              <input
                className={styles.modalInput}
                type="email"
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
              />
            </div>

            <div className={styles.modalField}>
              <label className={styles.modalLabel}>{t("fieldLocale")}</label>
              <select
                className={styles.modalInput}
                value={editing.locale}
                onChange={(e) => setEditing({ ...editing, locale: e.target.value })}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnCancel}`}
                onClick={() => setEditing(null)}
              >
                {t("cancel")}
              </button>
              <button
                className={`${styles.modalBtn} ${styles.modalBtnSave}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsersTable;
