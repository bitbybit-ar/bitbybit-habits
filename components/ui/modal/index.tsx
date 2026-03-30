"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";
import styles from "./modal.module.scss";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  className?: string;
}

export function Modal({ children, onClose, title, size = "md", className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn(styles.modal, styles[size], className)}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h3 className={styles.title}>{title}</h3>}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;
