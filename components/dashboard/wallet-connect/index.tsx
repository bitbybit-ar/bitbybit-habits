"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { WalletIcon } from "@/components/icons";
import styles from "./wallet-connect.module.scss";

interface WalletPublic {
  id: string;
  user_id: string;
  label?: string;
  active: boolean;
  connected: boolean;
  created_at: string;
}

export function WalletConnect() {
  const t = useTranslations();
  const [wallet, setWallet] = useState<WalletPublic | null>(null);
  const [nwcUrl, setNwcUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWallet(data.data);
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleConnect = useCallback(async () => {
    if (!nwcUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nwc_url: nwcUrl, label: label || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWallet(data.data);
          setNwcUrl("");
          setLabel("");
        }
      }
    } catch {
      // Silently handle
    } finally {
      setSaving(false);
    }
  }, [nwcUrl, label]);

  const handleDisconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWallet(null);
      }
    } catch {
      // Silently handle
    }
  }, []);

  if (loading) {
    return <p className={styles.loadingText}>{t("common.loading")}</p>;
  }

  if (wallet) {
    return (
      <div className={styles.card}>
        <div className={styles.statusRow}>
          <div className={styles.statusIndicator} data-connected="true" />
          <span className={styles.statusText}>{t("wallet.walletConnected")}</span>
        </div>
        {wallet.label && <p className={styles.label}>{wallet.label}</p>}
        <button className={styles.disconnectButton} onClick={handleDisconnect}>
          {t("wallet.disconnect")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.statusRow}>
        <div className={styles.statusIndicator} data-connected="false" />
        <span className={styles.statusText}>{t("wallet.connectWallet")}</span>
      </div>
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t("wallet.nwcUrl")}</label>
          <input
            type="text"
            className={styles.input}
            placeholder="nostr+walletconnect://..."
            value={nwcUrl}
            onChange={(e) => setNwcUrl(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t("wallet.label")}</label>
          <input
            type="text"
            className={styles.input}
            placeholder={t("wallet.labelPlaceholder")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <button
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={!nwcUrl || saving}
        >
          <WalletIcon size={16} />
          {saving ? t("common.loading") : t("wallet.connectWallet")}
        </button>
      </div>
    </div>
  );
}

export default WalletConnect;
