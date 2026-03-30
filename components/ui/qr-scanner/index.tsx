"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Html5Qrcode } from "html5-qrcode";
import { Modal } from "@/components/ui/modal";
import styles from "./qr-scanner.module.scss";

interface QRScannerProps {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const t = useTranslations("wallet");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const stop = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // Already stopped
    }
    scannerRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const scannerId = "qr-scanner-region";

    try {
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stop();
        },
        () => {
          // Ignore scan failures (no QR in frame)
        }
      );
    } catch {
      setError(t("cameraError"));
    }
  }, [onScan, stop, t]);

  useEffect(() => {
    start();
    return () => { stop(); };
  }, [retryKey]);

  const handleRetry = useCallback(async () => {
    await stop();
    setRetryKey((k) => k + 1);
  }, [stop]);

  return (
    <Modal onClose={onClose} size="sm" title={t("scanQR")}>
      <div className={styles.scannerContainer}>
        <div id="qr-scanner-region" />
        {error && (
          <div className={styles.errorState}>
            <p className={styles.error}>{error}</p>
            <button className={styles.retryBtn} onClick={handleRetry}>
              {t("retryCamera")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default QRScanner;
