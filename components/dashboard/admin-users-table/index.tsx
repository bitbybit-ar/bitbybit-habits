"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useApi } from "@/lib/hooks/useApi";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useToast } from "@/components/ui/toast";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { BlockLoader } from "@/components/ui/block-loader";
import { UsersIcon } from "@/components/icons";
import { AdminStatsPanel } from "./AdminStatsPanel";
import { AdminUserRow } from "./AdminUserRow";
import { EditUserModal } from "./EditUserModal";
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
  familyList: { id: string; name: string }[];
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
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [editing, setEditing] = useState<EditingUser | null>(null);
  const [saving, setSaving] = useState(false);
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const statsUrl = "/api/admin/stats";
  const usersUrl = `/api/admin/users?page=${page}&limit=50${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${familyFilter ? `&family=${encodeURIComponent(familyFilter)}` : ""}`;

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
      } else {
        showToast(t("saveError"), "error");
      }
    } catch {
      showToast(t("saveError"), "error");
    } finally {
      setSaving(false);
    }
  }, [editing, refetch, showToast, t]);

  const handleUnlock = useCallback(async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked_until: null, failed_login_attempts: 0 }),
    });
    if (res.ok) {
      refetch();
    } else {
      showToast(t("unlockError"), "error");
    }
  }, [refetch, showToast, t]);

  const handleDelete = useCallback(async (userId: string, displayName: string) => {
    const confirmed = await confirm(t("confirmDelete", { name: displayName }), "danger");
    if (!confirmed) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (res.ok) {
      refetch();
    } else {
      showToast(t("deleteError"), "error");
    }
  }, [t, refetch, showToast, confirm]);

  return (
    <div>
      {/* Stats */}
      {!statsLoading && stats && <AdminStatsPanel stats={stats} />}

      {/* Search and filters */}
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {stats?.familyList && stats.familyList.length > 0 && (
          <select
            className={styles.familySelect}
            value={familyFilter}
            onChange={(e) => {
              setFamilyFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t("allFamilies")}</option>
            {stats.familyList.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        {usersData && (
          <span className={styles.searchCount}>
            {usersData.total} {t("usersFound")}
          </span>
        )}
      </form>

      {/* Users table */}
      {usersLoading ? (
        <DashboardSection center><BlockLoader /></DashboardSection>
      ) : !usersData?.users.length ? (
        <EmptyState
          icon={<UsersIcon size={48} />}
          title={t("noUsers")}
          description=""
        />
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
                  <AdminUserRow
                    key={user.id}
                    user={user}
                    onEdit={handleEdit}
                    onUnlock={handleUnlock}
                    onDelete={handleDelete}
                  />
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
        <EditUserModal
          editing={editing}
          saving={saving}
          onUpdate={(fields) => setEditing({ ...editing, ...fields })}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          variant={confirmState.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default AdminUsersTable;
