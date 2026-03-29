"use client";

import { useTranslations } from "next-intl";
import styles from "./admin-users-table.module.scss";

interface EditingUser {
  id: string;
  display_name: string;
  email: string;
  username: string;
  locale: string;
}

interface EditUserModalProps {
  editing: EditingUser;
  saving: boolean;
  onUpdate: (fields: Partial<EditingUser>) => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditUserModal({ editing, saving, onUpdate, onSave, onClose }: EditUserModalProps) {
  const t = useTranslations("admin");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>{t("editUser")}</h3>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("fieldDisplayName")}</label>
          <input
            className={styles.modalInput}
            value={editing.display_name}
            onChange={(e) => onUpdate({ display_name: e.target.value })}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("fieldUsername")}</label>
          <input
            className={styles.modalInput}
            value={editing.username}
            onChange={(e) => onUpdate({ username: e.target.value })}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("fieldEmail")}</label>
          <input
            className={styles.modalInput}
            type="email"
            value={editing.email}
            onChange={(e) => onUpdate({ email: e.target.value })}
          />
        </div>

        <div className={styles.modalField}>
          <label className={styles.modalLabel}>{t("fieldLocale")}</label>
          <select
            className={styles.modalInput}
            value={editing.locale}
            onChange={(e) => onUpdate({ locale: e.target.value })}
          >
            <option value="es">{t("localeEs")}</option>
            <option value="en">{t("localeEn")}</option>
          </select>
        </div>

        <div className={styles.modalActions}>
          <button
            className={`${styles.modalBtn} ${styles.modalBtnCancel}`}
            onClick={onClose}
          >
            {t("cancel")}
          </button>
          <button
            className={`${styles.modalBtn} ${styles.modalBtnSave}`}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
