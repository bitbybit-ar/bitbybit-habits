"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
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
    <Modal onClose={onCancel} size="sm">
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
    </Modal>
  );
}
