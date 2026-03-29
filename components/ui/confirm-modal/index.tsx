"use client";

import { useTranslations } from "next-intl";
import styles from "./confirm-modal.module.scss";

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

export function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  variant = "default",
}: ConfirmModalProps) {
  const t = useTranslations("common");

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            className={`${styles.confirmBtn} ${variant === "danger" ? styles.confirmBtnDanger : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
