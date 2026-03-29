"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { WalletIcon, BoltIcon, SendIcon, ReceiveIcon, ScanIcon } from "@/components/icons";
import { FormInput, FormButton } from "@/components/ui/form";
import { QRScanner } from "@/components/ui/qr-scanner";
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
type ScanTarget = "nwc" | "invoice" | null;

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
  const [scanning, setScanning] = useState<ScanTarget>(null);

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

  // ── Connect ──

  const handleConnect = useCallback(async (url?: string) => {
    const finalUrl = url ?? nwcUrl;
    if (!finalUrl) return;
    setSaving(true);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nwc_url: finalUrl, label: label || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWallet(data.data);
          setNwcUrl("");
          setLabel("");
          showToast(t("wallet.walletConnected"), "success");
        }
      } else {
        showToast(t("wallet.connectError"), "error");
      }
    } catch {
      showToast(t("wallet.connectError"), "error");
    } finally {
      setSaving(false);
    }
  }, [nwcUrl, label, showToast, t]);

  const handleExtensionConnect = useCallback(async () => {
    setSaving(true);
    try {
      const webln = (window as unknown as { webln?: { enable: () => Promise<void>; getInfo?: () => Promise<{ node?: { alias?: string } }> } }).webln;
      if (!webln) return;
      await webln.enable();
      const info = webln.getInfo ? await webln.getInfo() : null;
      const extensionLabel = info?.node?.alias ?? extensionName ?? "WebLN Extension";
      setLabel(extensionLabel);
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

  // ── Send ──

  const handleSend = useCallback(async (invoice?: string) => {
    const finalInvoice = invoice ?? sendInvoice;
    if (!finalInvoice.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/wallets/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: finalInvoice.trim() }),
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

  // ── Receive ──

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

  // ── QR Scan handler ──

  const handleScanResult = useCallback((value: string) => {
    setScanning(null);

    if (scanning === "nwc") {
      // NWC QR codes might have the raw URL or be wrapped
      const url = value.startsWith("nostr+walletconnect://") ? value : value;
      if (url.startsWith("nostr+walletconnect://")) {
        setNwcUrl(url);
        handleConnect(url);
      } else {
        setNwcUrl(value);
        showToast(t("wallet.scanNwcHint"), "info");
      }
      return;
    }

    if (scanning === "invoice") {
      // Strip lightning: prefix, handle both cases
      const cleaned = value.replace(/^lightning:/i, "");
      if (cleaned.toLowerCase().startsWith("lnbc")) {
        setSendInvoice(cleaned);
        handleSend(cleaned);
      } else {
        setSendInvoice(value);
        showToast(t("wallet.scanInvoiceHint"), "info");
      }
    }
  }, [scanning, handleConnect, handleSend, showToast, t]);

  // ── Render ──

  if (loading) {
    return <p className={styles.loadingText}>{t("common.loading")}</p>;
  }

  const lightningUri = generatedInvoice
    ? `lightning:${generatedInvoice.toUpperCase()}`
    : null;

  return (
    <>
      {/* QR Scanner modal */}
      {scanning && (
        <QRScanner
          onScan={handleScanResult}
          onClose={() => setScanning(null)}
        />
      )}

      {/* ── Not connected ── */}
      {!wallet && (
        <div className={styles.card}>
          <div className={styles.connectHeader}>
            <WalletIcon size={32} />
            <h3 className={styles.connectTitle}>{t("wallet.connectWallet")}</h3>
            <p className={styles.connectDesc}>{t("wallet.connectDesc")}</p>
          </div>

          {/* Primary action: scan NWC QR */}
          <button
            className={styles.scanButton}
            onClick={() => setScanning("nwc")}
          >
            <ScanIcon size={20} />
            {t("wallet.scanNwcQR")}
          </button>

          {hasExtension && (
            <button
              className={styles.extensionButton}
              onClick={handleExtensionConnect}
              disabled={saving}
            >
              {t("wallet.connectExtension", { name: extensionName ?? "WebLN" })}
            </button>
          )}

          {/* Manual paste (collapsed by default) */}
          <details className={styles.manualSection}>
            <summary className={styles.manualToggle}>
              {t("wallet.pasteManually")}
            </summary>
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
                onClick={() => handleConnect()}
                loading={saving}
                loadingText={t("common.loading")}
                disabled={!nwcUrl}
              >
                {t("wallet.connect")}
              </FormButton>
            </div>
          </details>
        </div>
      )}

      {/* ── Connected: Main view ── */}
      {wallet && view === "main" && (
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
      )}

      {/* ── Send view ── */}
      {wallet && view === "send" && (
        <div className={styles.card}>
          <div className={styles.viewHeader}>
            <button className={styles.backButton} onClick={() => { setView("main"); setSendInvoice(""); }}>
              &larr;
            </button>
            <h3 className={styles.viewTitle}>{t("wallet.send")}</h3>
          </div>

          <button
            className={styles.scanButton}
            onClick={() => setScanning("invoice")}
          >
            <ScanIcon size={20} />
            {t("wallet.scanInvoiceQR")}
          </button>

          <div className={styles.divider}>
            <span>{t("wallet.or")}</span>
          </div>

          <div className={styles.form}>
            <FormInput
              id="send-invoice"
              label={t("wallet.invoiceToPay")}
              placeholder="lnbc..."
              value={sendInvoice}
              onChange={setSendInvoice}
            />
            <FormButton
              onClick={() => handleSend()}
              loading={sending}
              loadingText={t("wallet.sending")}
              disabled={!sendInvoice.trim()}
            >
              <SendIcon size={16} />
              {t("wallet.payInvoice")}
            </FormButton>
          </div>
        </div>
      )}

      {/* ── Receive view ── */}
      {wallet && view === "receive" && (
        <div className={styles.card}>
          <div className={styles.viewHeader}>
            <button className={styles.backButton} onClick={resetReceive}>
              &larr;
            </button>
            <h3 className={styles.viewTitle}>{t("wallet.receive")}</h3>
          </div>

          {generatedInvoice && lightningUri ? (
            <div className={styles.invoiceResult}>
              <div className={styles.qrContainer}>
                <QRCode
                  value={lightningUri}
                  size={200}
                  bgColor="transparent"
                  fgColor="var(--qr-color, #F0E6D8)"
                  level="M"
                />
              </div>

              <a href={lightningUri} className={styles.walletLink}>
                {t("invoiceModal.openInWallet")}
              </a>

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
      )}

      {/* ── Settings view ── */}
      {wallet && view === "settings" && (
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
                <span className={styles.settingsLabel}>{t("wallet.walletLabel")}</span>
                <span className={styles.settingsValue}>{wallet.label}</span>
              </div>
            )}
          </div>

          <div className={styles.settingsActions}>
            <button className={styles.changeWalletButton} onClick={() => {
              handleDisconnect();
            }}>
              {t("wallet.changeWallet")}
            </button>
            <button className={styles.disconnectButton} onClick={handleDisconnect}>
              {t("wallet.disconnect")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default WalletConnect;
