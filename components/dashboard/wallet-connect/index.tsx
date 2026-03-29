"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import _QRCode from "react-qr-code";
// CJS/ESM interop: Turbopack may resolve default import as namespace object
const QRCode = ((_QRCode as unknown as Record<string, typeof _QRCode>).default ?? _QRCode) as typeof _QRCode;
import { WalletIcon, BoltIcon, SendIcon, ReceiveIcon, ScanIcon } from "@/components/icons";
import { BlockLoader } from "@/components/ui/block-loader";
import { FormInput, FormButton } from "@/components/ui/form";
import { QRScanner } from "@/components/ui/qr-scanner";
import { useWebLN } from "@/lib/hooks/useWebLN";
import { useToast } from "@/components/ui/toast";
import styles from "./wallet-connect.module.scss";

// DEBUG: find undefined import
console.log("[WalletConnect imports]", {
  QRCode: typeof QRCode,
  WalletIcon: typeof WalletIcon,
  BoltIcon: typeof BoltIcon,
  SendIcon: typeof SendIcon,
  ReceiveIcon: typeof ReceiveIcon,
  ScanIcon: typeof ScanIcon,
  FormInput: typeof FormInput,
  FormButton: typeof FormButton,
  QRScanner: typeof QRScanner,
});

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
  // DEBUG: find the undefined import
  const _imports = { QRCode, WalletIcon, BoltIcon, SendIcon, ReceiveIcon, ScanIcon, FormInput, FormButton, QRScanner };
  const _undef = Object.entries(_imports).filter(([,v]) => !v).map(([k]) => k);
  if (_undef.length) console.error("UNDEFINED IMPORTS:", _undef);
  else console.log("All imports OK:", Object.fromEntries(Object.entries(_imports).map(([k,v]) => [k, typeof v])));

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
      console.error("[wallets/send] Response:", res.status, data);
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

  // DEBUG: render import status directly in UI
  const _allImports = { QRCode, WalletIcon, BoltIcon, SendIcon, ReceiveIcon, ScanIcon, FormInput, FormButton, QRScanner } as Record<string, unknown>;
  const _broken = Object.entries(_allImports).filter(([,v]) => !v).map(([k]) => k);
  if (_broken.length > 0) {
    return <div style={{color:"red",fontSize:24,padding:40}}>BROKEN IMPORTS: {_broken.join(", ")}</div>;
  }

  if (loading) {
    return <div className={styles.loaderWrapper}><BlockLoader /></div>;
  }

  // DEBUG: minimal render — no imported components, just HTML
  return (
    <div style={{padding: 20, border: "2px solid lime"}}>
      <p>WalletConnect loaded OK. All imports defined.</p>
      <p>Wallet: {wallet ? "connected" : "not connected"}</p>
      <p>View: {view}</p>
    </div>
  );
}

export default WalletConnect;
