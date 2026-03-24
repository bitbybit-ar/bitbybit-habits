"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import styles from "./invoice-modal.module.scss";

interface InvoiceModalProps {
  paymentRequest: string;
  paymentId: string;
  amountSats: number;
  habitName: string;
  onPaid: () => void;
  onClose: () => void;
}

export function InvoiceModal({
  paymentRequest,
  paymentId,
  amountSats,
  habitName,
  onPaid,
  onClose,
}: InvoiceModalProps) {
  const t = useTranslations("invoiceModal");
  const [copied, setCopied] = useState(false);
  const [settled, setSettled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`);
      const json = await res.json();
      if (json.success && json.data?.settled) {
        setSettled(true);
      }
    } catch {
      // Silently continue polling
    }
  }, [paymentId]);

  useEffect(() => {
    intervalRef.current = setInterval(pollStatus, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollStatus]);

  useEffect(() => {
    if (settled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const timer = setTimeout(() => {
        onPaid();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [settled, onPaid]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentRequest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {settled ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>⚡</div>
            <p className={styles.successText}>{t("paid")}</p>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <h3 className={styles.habitName}>{habitName}</h3>
              <p className={styles.amount}>
                {amountSats} <span className={styles.satsLabel}>sats</span>
              </p>
            </div>

            <div className={styles.qrContainer}>
              <QRCode
                value={paymentRequest}
                size={256}
                bgColor="transparent"
                fgColor="var(--qr-color, #F0E6D8)"
                level="M"
              />
            </div>

            <button className={styles.copyButton} onClick={handleCopy}>
              {copied ? t("copied") : t("copyInvoice")}
            </button>

            <button className={styles.closeButton} onClick={onClose}>
              {t("close")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default InvoiceModal;
