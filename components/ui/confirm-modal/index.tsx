"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
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
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {cancelLabel ?? t("cancel")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          className={variant === "danger" ? styles.dangerBtn : undefined}
          onClick={onConfirm}
        >
          {confirmLabel ?? t("confirm")}
        </Button>
      </div>
    </Modal>
  );
}
