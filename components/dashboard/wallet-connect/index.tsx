"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { WalletIcon, BoltIcon, SendIcon, ReceiveIcon } from "@/components/icons";
import { FormInput, FormButton } from "@/components/ui/form";
import { useWebLN } from "@/lib/hooks/useWebLN";
import { useToast } from "@/components/ui/toast";
import styles from "./wallet-connect.module.scss";

interface WalletPublic {
  id: string;
  user_id: string;
  label?: string;
  active: boolean;
  connected: boolean;
  created_at: string;
}

type WalletView = "main" | "send" | "receive" | "settings";

export function WalletConnect() {
  const t = useTranslations();
  const { showToast } = useToast();
  const { hasExtension, extensionName } = useWebLN();
  const [wallet, setWallet] = useState<WalletPublic | null>(null);
  const [nwcUrl, setNwcUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [view, setView] = useState<WalletView>("main");

  // Send state
  const [sendInvoice, setSendInvoice] = useState("");
  const [sending, setSending] = useState(false);

  // Receive state
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveDesc, setReceiveDesc] = useState("");
  const [receiving, setReceiving] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<string | null>(null);
  const [invoiceCopied, setInvoiceCopied] = useState(false);

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

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
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
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (wallet) fetchBalance();
    else setBalance(null);
  }, [wallet, fetchBalance]);

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

      const nostr = (window as unknown as { nostr?: { getRelays?: () => Promise<Record<string, unknown>>; nip04?: unknown } }).nostr;
      if (nostr) {
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
          setView("main");
        }
      }
    } catch {
      // Silently handle
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!sendInvoice.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/wallets/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: sendInvoice.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(t("wallet.sendSuccess"), "success");
        setSendInvoice("");
        setView("main");
        fetchBalance();
      } else {
        const errorKey = data.error === "insufficient_funds"
          ? "wallet.insufficientFunds"
          : "wallet.sendError";
        showToast(t(errorKey), "error");
      }
    } catch {
      showToast(t("wallet.sendError"), "error");
    } finally {
      setSending(false);
    }
  }, [sendInvoice, showToast, t, fetchBalance]);

  const handleReceive = useCallback(async () => {
    const amount = parseInt(receiveAmount, 10);
    if (!amount || amount <= 0) return;
    setReceiving(true);
    try {
      const res = await fetch("/api/wallets/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_sats: amount,
          description: receiveDesc || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.payment_request) {
        setGeneratedInvoice(data.data.payment_request);
      } else {
        showToast(t("wallet.receiveError"), "error");
      }
    } catch {
      showToast(t("wallet.receiveError"), "error");
    } finally {
      setReceiving(false);
    }
  }, [receiveAmount, receiveDesc, showToast, t]);

  const handleCopyInvoice = useCallback(async () => {
    if (!generatedInvoice) return;
    try {
      await navigator.clipboard.writeText(`lightning:${generatedInvoice.toUpperCase()}`);
      setInvoiceCopied(true);
      setTimeout(() => setInvoiceCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [generatedInvoice]);

  const resetReceive = useCallback(() => {
    setGeneratedInvoice(null);
    setReceiveAmount("");
    setReceiveDesc("");
    setInvoiceCopied(false);
    setView("main");
  }, []);

  if (loading) {
    return <p className={styles.loadingText}>{t("common.loading")}</p>;
  }

  // ── Not connected: show connect form ──
  if (!wallet) {
    return (
      <div className={styles.card}>
        <div className={styles.statusRow}>
          <div className={styles.statusIndicator} data-connected="false" />
          <span className={styles.statusText}>{t("wallet.notConnected")}</span>
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
            {t("wallet.connect")}
          </FormButton>
        </div>
      </div>
    );
  }

  // ── Connected: wallet hub ──

  // Send view
  if (view === "send") {
    return (
      <div className={styles.card}>
        <div className={styles.viewHeader}>
          <button className={styles.backButton} onClick={() => { setView("main"); setSendInvoice(""); }}>
            &larr;
          </button>
          <h3 className={styles.viewTitle}>{t("wallet.send")}</h3>
        </div>
        <div className={styles.form}>
          <FormInput
            id="send-invoice"
            label={t("wallet.invoiceToPay")}
            placeholder="lnbc... / lightning:..."
            value={sendInvoice}
            onChange={setSendInvoice}
          />
          <FormButton
            onClick={handleSend}
            loading={sending}
            loadingText={t("wallet.sending")}
            disabled={!sendInvoice.trim()}
          >
            <SendIcon size={16} />
            {t("wallet.payInvoice")}
          </FormButton>
        </div>
      </div>
    );
  }

  // Receive view
  if (view === "receive") {
    return (
      <div className={styles.card}>
        <div className={styles.viewHeader}>
          <button className={styles.backButton} onClick={resetReceive}>
            &larr;
          </button>
          <h3 className={styles.viewTitle}>{t("wallet.receive")}</h3>
        </div>

        {generatedInvoice ? (
          <div className={styles.invoiceResult}>
            <div className={styles.qrContainer}>
              <QRCode
                value={`lightning:${generatedInvoice.toUpperCase()}`}
                size={200}
                bgColor="transparent"
                fgColor="var(--qr-color, #F0E6D8)"
                level="M"
              />
            </div>
            <button className={styles.copyButton} onClick={handleCopyInvoice}>
              {invoiceCopied ? t("invoiceModal.copied") : t("invoiceModal.copyInvoice")}
            </button>
            <button className={styles.secondaryButton} onClick={resetReceive}>
              {t("wallet.newInvoice")}
            </button>
          </div>
        ) : (
          <div className={styles.form}>
            <FormInput
              id="receive-amount"
              label={t("wallet.amountSats")}
              placeholder="100"
              type="number"
              value={receiveAmount}
              onChange={setReceiveAmount}
            />
            <FormInput
              id="receive-desc"
              label={t("wallet.description")}
              placeholder={t("wallet.descriptionPlaceholder")}
              value={receiveDesc}
              onChange={setReceiveDesc}
            />
            <FormButton
              onClick={handleReceive}
              loading={receiving}
              loadingText={t("common.loading")}
              disabled={!receiveAmount || parseInt(receiveAmount, 10) <= 0}
            >
              <ReceiveIcon size={16} />
              {t("wallet.generateInvoice")}
            </FormButton>
          </div>
        )}
      </div>
    );
  }

  // Settings view
  if (view === "settings") {
    return (
      <div className={styles.card}>
        <div className={styles.viewHeader}>
          <button className={styles.backButton} onClick={() => setView("main")}>
            &larr;
          </button>
          <h3 className={styles.viewTitle}>{t("wallet.settings")}</h3>
        </div>

        <div className={styles.settingsSection}>
          <div className={styles.settingsRow}>
            <span className={styles.settingsLabel}>{t("wallet.connection")}</span>
            <span className={styles.badge}>NWC</span>
          </div>
          {wallet.label && (
            <div className={styles.settingsRow}>
              <span className={styles.settingsLabel}>{t("wallet.label")}</span>
              <span className={styles.settingsValue}>{wallet.label}</span>
            </div>
          )}
        </div>

        <button className={styles.disconnectButton} onClick={handleDisconnect}>
          {t("wallet.disconnect")}
        </button>
      </div>
    );
  }

  // Main view — balance + actions
  return (
    <div className={styles.card}>
      <div className={styles.statusRow}>
        <div className={styles.statusIndicator} data-connected="true" />
        <span className={styles.statusText}>
          {wallet.label || t("wallet.walletConnected")}
        </span>
        <button className={styles.settingsButton} onClick={() => setView("settings")}>
          {t("wallet.settings")}
        </button>
      </div>

      <div className={styles.balanceSection}>
        <div className={styles.balanceIcon}><BoltIcon size={24} /></div>
        <div className={styles.balanceInfo}>
          {balanceLoading ? (
            <span className={styles.balanceValue}>...</span>
          ) : balance !== null ? (
            <span className={styles.balanceValue}>{balance.toLocaleString()}</span>
          ) : (
            <span className={styles.balanceValue}>--</span>
          )}
          <span className={styles.balanceLabel}>{t("sats.sats")}</span>
        </div>
        <button className={styles.refreshButton} onClick={fetchBalance} disabled={balanceLoading}>
          ↻
        </button>
      </div>

      <div className={styles.actions}>
        <button className={styles.actionButton} data-variant="send" onClick={() => setView("send")}>
          <SendIcon size={20} />
          <span>{t("wallet.send")}</span>
        </button>
        <button className={styles.actionButton} data-variant="receive" onClick={() => setView("receive")}>
          <ReceiveIcon size={20} />
          <span>{t("wallet.receive")}</span>
        </button>
      </div>
    </div>
  );
}

export default WalletConnect;
