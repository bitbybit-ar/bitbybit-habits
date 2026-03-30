"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { Modal } from "@/components/ui/modal";
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
  const [pollError, setPollError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failCountRef = useRef(0);

  // lightning: URI for QR codes, wallet links, and copy
  const lightningUri = `lightning:${paymentRequest.toUpperCase()}`;

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/status`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && json.data?.settled) {
        setSettled(true);
      }
      failCountRef.current = 0;
      setPollError(false);
    } catch {
      failCountRef.current += 1;
      // Show error after 3 consecutive failures (12 seconds)
      if (failCountRef.current >= 3) {
        setPollError(true);
      }
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
      await navigator.clipboard.writeText(lightningUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text for manual copy
    }
  };

  return (
    <Modal onClose={onClose} size="sm">
      {settled ? (
        <div className={styles.success}>
          <div className={styles.successIcon}>&#x26A1;</div>
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
              value={lightningUri}
              size={256}
              bgColor="transparent"
              fgColor="var(--qr-color, #F0E6D8)"
              level="M"
            />
          </div>

          {pollError && (
            <p className={styles.pollError}>{t("pollError")}</p>
          )}

          <a href={lightningUri} className={styles.walletLink}>
            {t("openInWallet")}
          </a>

          <button className={styles.copyButton} onClick={handleCopy}>
            {copied ? t("copied") : t("copyInvoice")}
          </button>
        </>
      )}
    </Modal>
  );
}

export default InvoiceModal;
