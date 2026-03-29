"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { WalletIcon, BoltIcon } from "@/components/icons";
import { BlockLoader } from "@/components/ui/block-loader";
import { FormInput, FormButton } from "@/components/ui/form";
import { useWebLN } from "@/lib/hooks/useWebLN";
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
  const { hasExtension, extensionName } = useWebLN();
  const [wallet, setWallet] = useState<WalletPublic | null>(null);
  const [nwcUrl, setNwcUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

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

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      return;
    }

    async function fetchBalance() {
      try {
        const res = await fetch("/api/wallets/balance");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.balance_sats != null) {
            setBalance(data.data.balance_sats);
          }
        }
      } catch {
        // Balance fetch is best-effort
      }
    }

    fetchBalance();
  }, [wallet]);

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

  const handleExtensionConnect = useCallback(async () => {
    setSaving(true);
    try {
      const webln = (window as unknown as { webln?: { enable: () => Promise<void>; getInfo?: () => Promise<{ node?: { alias?: string } }> } }).webln;
      if (!webln) return;
      await webln.enable();

      // Try to get the NWC URL from the extension's provider
      // Alby exposes nostr.getRelays() and NWC URL via the provider
      const nostr = (window as unknown as { nostr?: { getRelays?: () => Promise<Record<string, unknown>>; nip04?: unknown } }).nostr;
      if (nostr) {
        // For Alby, the NWC URL is typically configured by the user
        // We prompt to enter it manually but with extension info
        const info = webln.getInfo ? await webln.getInfo() : null;
        const extensionLabel = info?.node?.alias ?? extensionName ?? "WebLN Extension";
        setLabel(extensionLabel);
      }
    } catch {
      // Extension connection failed
    } finally {
      setSaving(false);
    }
  }, [extensionName]);

  const handleDisconnect = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWallet(null);
          setBalance(null);
        }
      }
    } catch {
      // Silently handle
    }
  }, []);

  if (loading) {
    return <div className={styles.loaderWrapper}><BlockLoader /></div>;
  }

  if (wallet) {
    return (
      <div className={styles.card}>
        <div className={styles.statusRow}>
          <div className={styles.statusIndicator} data-connected="true" />
          <span className={styles.statusText}>{t("wallet.walletConnected")}</span>
          <span className={styles.badge}>NWC</span>
        </div>
        {wallet.label && <p className={styles.label}>{wallet.label}</p>}
        {balance !== null && (
          <div className={styles.balanceRow}>
            <BoltIcon size={14} />
            <span className={styles.balanceValue}>{balance.toLocaleString()}</span>
            <span className={styles.balanceLabel}>{t("sats.sats")}</span>
          </div>
        )}
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

      {hasExtension && (
        <button
          className={styles.extensionButton}
          onClick={handleExtensionConnect}
          disabled={saving}
        >
          {t("wallet.connectExtension", { name: extensionName ?? "WebLN" })}
        </button>
      )}

      <div className={styles.form}>
        <FormInput
          id="nwc-url"
          label={t("wallet.nwcUrl")}
          placeholder="nostr+walletconnect://..."
          value={nwcUrl}
          onChange={setNwcUrl}
        />
        <FormInput
          id="nwc-label"
          label={t("wallet.label")}
          placeholder={t("wallet.labelPlaceholder")}
          value={label}
          onChange={setLabel}
        />
        <FormButton
          onClick={handleConnect}
          loading={saving}
          loadingText={t("common.loading")}
          disabled={!nwcUrl}
        >
          <WalletIcon size={16} />
          {t("wallet.connectWallet")}
        </FormButton>
      </div>
    </div>
  );
}

export default WalletConnect;
