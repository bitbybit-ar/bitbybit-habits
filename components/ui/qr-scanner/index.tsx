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
  const containerRef = useRef<HTMLDivElement>(null);
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

    if (!containerRef.current) return;

    // Check if getUserMedia is available (requires HTTPS or localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t("cameraError"));
      return;
    }

    try {
      const scanner = new Html5Qrcode(containerRef.current.id);
      scannerRef.current = scanner;

      // Try environment camera first (mobile), fall back to any camera (desktop)
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            stop();
          },
          () => {}
        );
      } catch {
        // facingMode: environment may fail on desktop — retry with any camera
        await scanner.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText);
            stop();
          },
          () => {}
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("Permission") ||
        message.includes("NotAllowed") ||
        message.includes("denied")
      ) {
        setError(t("cameraPermissionDenied"));
      } else if (message.includes("NotFound") || message.includes("Requested device not found")) {
        setError(t("cameraError"));
      } else {
        setError(t("cameraError"));
      }
    }
  }, [onScan, stop, t]);

  useEffect(() => {
    start();
    return () => { stop(); };
  }, [retryKey, start, stop]);

  const handleRetry = useCallback(async () => {
    await stop();
    setRetryKey((k) => k + 1);
  }, [stop]);

  return (
    <Modal onClose={onClose} size="sm" title={t("scanQR")}>
      <div className={styles.scannerContainer}>
        <div id="qr-scanner-region" ref={containerRef} />
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
