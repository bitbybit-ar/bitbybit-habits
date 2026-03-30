"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import AuthCard from "@/components/auth/AuthCard";
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
import { BackLink } from "@/components/ui/back-link";
import { FormInput, FormSelect, FormButton } from "@/components/ui/form";
import { useFormValidation } from "@/lib/hooks/useFormValidation";
import { useNostr } from "@/lib/hooks/useNostr";
import { NostrichIcon, ShieldIcon } from "@/components/icons";
import { resolveApiError } from "@/lib/error-messages";
import type { NostrMetadata } from "@/lib/nostr/types";
import formStyles from "@/components/ui/form/form.module.scss";
import styles from "./settings.module.scss";

interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  locale: "es" | "en";
  nostr_pubkey: string | null;
  auth_provider: "email" | "nostr";
  nostr_metadata: NostrMetadata | null;
  has_password: boolean;
  totp_enabled: boolean;
}

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const {
    hasExtension: nostrAvailable,
    linkAccount,
    unlinkAccount,
    fetchAndSyncMetadata,
    publishProfileToNostr,
    isLoading: nostrLoading,
  } = useNostr();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [nostrError, setNostrError] = useState("");
  const [nostrSyncing, setNostrSyncing] = useState(false);
  const [locale, setLocale] = useState<"es" | "en">("es");

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFASetupData, setTwoFASetupData] = useState<{ otpauthUri: string; qrCode: string } | null>(null);
  const [twoFARecoveryCodes, setTwoFARecoveryCodes] = useState<string[] | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFADisabling, setTwoFADisabling] = useState(false);
  const [twoFACopied, setTwoFACopied] = useState(false);

  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const isNostrOrigin = profile?.auth_provider === "nostr";

  const form = useFormValidation({
    initialValues: {
      display_name: "",
      username: "",
      email: "",
      avatar_url: "",
    },
    validators: {
      display_name: (v) => !(v as string).trim() ? t("validation.required") : undefined,
      username: (v) => {
        const val = v as string;
        if (!val.trim()) return t("validation.required");
        if (val.trim().length < 3) return t("auth.usernameTooShort");
        return undefined;
      },
      email: (v) => {
        const val = v as string;
        if (!val.trim()) return t("validation.required");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return t("auth.invalidEmail");
        return undefined;
      },
      avatar_url: (v) => {
        const val = v as string;
        if (val && !/^https?:\/\/.+/.test(val)) return t("settings.invalidUrl");
        return undefined;
      },
    },
  });

  const initials = useMemo(() => {
    const dn = form.values.display_name;
    const un = form.values.username;
    if (dn.trim()) return dn.trim().charAt(0).toUpperCase();
    if (un.trim()) return un.trim().charAt(0).toUpperCase();
    return "A";
  }, [form.values.display_name, form.values.username]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    return (
      form.values.display_name !== profile.display_name ||
      form.values.username !== profile.username ||
      form.values.email !== profile.email ||
      (form.values.avatar_url || "") !== (profile.avatar_url ?? "") ||
      locale !== profile.locale
    );
  }, [form.values, locale, profile]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setProfile(data.data);
            form.setValues({
              display_name: data.data.display_name,
              username: data.data.username,
              email: data.data.email,
              avatar_url: data.data.avatar_url ?? "",
            });
            setLocale(data.data.locale);
            setTwoFAEnabled(data.data.totp_enabled ?? false);
          }
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []); // Only fetch on mount

  // ── 2FA handlers ──
  const handleTwoFASetup = async () => {
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data) {
        setTwoFASetupData(data.data);
        setTwoFACode("");
      } else {
        setTwoFAError(resolveApiError(data.error || "internalError", t));
      }
    } catch {
      setTwoFAError(t("auth.connectionError"));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleTwoFAConfirm = async () => {
    if (twoFACode.length < 6) return;
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      if (data.success && data.data?.recoveryCodes) {
        setTwoFARecoveryCodes(data.data.recoveryCodes);
        setTwoFASetupData(null);
        setTwoFACode("");
      } else {
        setTwoFAError(t("settings.twoFA.invalidCode"));
      }
    } catch {
      setTwoFAError(t("auth.connectionError"));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleTwoFADone = () => {
    setTwoFARecoveryCodes(null);
    setTwoFAEnabled(true);
    setTwoFACopied(false);
  };

  const handleTwoFADisable = async () => {
    if (twoFACode.length < 6) return;
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFACode }),
      });
      const data = await res.json();
      if (data.success) {
        setTwoFAEnabled(false);
        setTwoFADisabling(false);
        setTwoFACode("");
      } else {
        setTwoFAError(t("settings.twoFA.invalidCode"));
      }
    } catch {
      setTwoFAError(t("auth.connectionError"));
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    if (!twoFARecoveryCodes) return;
    await navigator.clipboard.writeText(twoFARecoveryCodes.join("\n"));
    setTwoFACopied(true);
  };

  const handleCancelTwoFA = () => {
    setTwoFASetupData(null);
    setTwoFADisabling(false);
    setTwoFACode("");
    setTwoFAError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");

    const errs = form.validateAll();
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form.values,
          avatar_url: form.values.avatar_url || null,
          locale,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setProfile(data.data);

        // For Nostr-origin users: auto-publish merged metadata to relays
        if (isNostrOrigin && nostrAvailable) {
          publishProfileToNostr(
            {
              display_name: form.values.display_name,
              username: form.values.username,
              avatar_url: form.values.avatar_url || null,
            },
            profile?.nostr_metadata,
          ).catch(() => {
            // Non-blocking: local save succeeded even if relay publish fails
          });
        }

        if (profile && locale !== profile.locale) {
          router.push(`/${locale}/settings`);
        }
      } else {
        setError(resolveApiError(data.error || "internalError", t));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setSaving(false);
    }
  };

  const handleLinkNostr = async () => {
    setNostrError("");
    const result = await linkAccount();
    if (!result.success) {
      setNostrError(resolveApiError(result.error || "nostr_link_failed", t));
      return;
    }
    // Refresh profile to show the linked pubkey
    const res = await fetch("/api/auth/profile");
    const data = await res.json();
    if (data.success && data.data) {
      setProfile(data.data);
      // Email user just linked Nostr: prompt to import metadata
      if (data.data.auth_provider === "email" && data.data.nostr_pubkey) {
        const wantImport = await confirm(t("settings.nostrImportPrompt"), "danger");
        if (wantImport) {
          setNostrSyncing(true);
          try {
            const metadata = await fetchAndSyncMetadata(data.data.nostr_pubkey);
            if (metadata) {
              // Refresh form with imported data
              const refreshRes = await fetch("/api/auth/profile");
              const refreshData = await refreshRes.json();
              if (refreshData.success && refreshData.data) {
                setProfile(refreshData.data);
                form.setValues({
                  display_name: refreshData.data.display_name,
                  username: refreshData.data.username,
                  email: refreshData.data.email,
                  avatar_url: refreshData.data.avatar_url ?? "",
                });
              }
            }
          } catch {
            // Non-blocking
          } finally {
            setNostrSyncing(false);
          }
        }
      }
    }
  };

  const handleUnlinkNostr = async () => {
    setNostrError("");
    const confirmed = await confirm(t("settings.unlinkNostrConfirm"), "danger");
    if (!confirmed) return;
    const result = await unlinkAccount();
    if (!result.success) {
      setNostrError(resolveApiError(result.error || "nostr_unlink_failed", t));
      return;
    }
    // Refresh profile
    const res = await fetch("/api/auth/profile");
    const data = await res.json();
    if (data.success && data.data) setProfile(data.data);
  };

  /** Manual sync: pull latest kind 0 from relays into local profile */
  const handleSyncFromNostr = async () => {
    if (!profile?.nostr_pubkey) return;
    setNostrSyncing(true);
    setNostrError("");
    try {
      const metadata = await fetchAndSyncMetadata(profile.nostr_pubkey);
      if (metadata) {
        // Refresh form with synced data
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        if (data.success && data.data) {
          setProfile(data.data);
          form.setValues({
            display_name: data.data.display_name,
            username: data.data.username,
            email: data.data.email,
            avatar_url: data.data.avatar_url ?? "",
          });
        }
      }
    } catch {
      setNostrError(t("settings.nostrSyncFailed"));
    } finally {
      setNostrSyncing(false);
    }
  };

  if (loading) {
    return <Container center><BlockLoader /></Container>;
  }

  const dn = form.fieldProps("display_name");
  const un = form.fieldProps("username");
  const em = form.fieldProps("email");
  const av = form.fieldProps("avatar_url");

  return (
    <Container>
      <BackLink />
      <AuthCard
          title={t("settings.title")}
          subtitle=""
      switchText=""
      switchLabel=""
      switchHref="/"
      showNostr={false}
      error={error}
      variant="register"
    >
      <form onSubmit={handleSubmit} className={formStyles.formLayout} noValidate>
        <div className={formStyles.fieldRow}>
          <FormInput
            id="display_name"
            label={t("auth.displayName")}
            required
            variant="identity"
            value={dn.value as string}
            onChange={dn.onChange}
            onBlur={dn.onBlur}
            error={dn.error}
          />
          <FormInput
            id="username"
            label={t("auth.username")}
            required
            variant="identity"
            value={un.value as string}
            onChange={un.onChange}
            onBlur={un.onBlur}
            error={un.error}
          />
        </div>

        <FormInput
          id="email"
          type="email"
          label={t("auth.email")}
          required
          variant="identity"
          value={em.value as string}
          onChange={em.onChange}
          onBlur={em.onBlur}
          error={em.error}
        />

        <div className={formStyles.field}>
          <label htmlFor="avatar_url" className={formStyles.label}>
            {t("settings.avatarUrl")}
          </label>
          <div className={styles.avatarField}>
            <div className={styles.avatarPreview}>
              {form.values.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.values.avatar_url}
                  alt="Avatar"
                  className={styles.avatarImg}
                />
              ) : (
                <span className={styles.avatarInitials}>{initials}</span>
              )}
            </div>
            <input
              id="avatar_url"
              type="url"
              value={av.value as string}
              onChange={(e) => av.onChange(e.target.value)}
              onBlur={av.onBlur}
              className={formStyles.inputIdentity}
              placeholder="https://..."
              aria-invalid={!!av.error}
              aria-describedby={av.error ? "avatar_url-error" : undefined}
            />
          </div>
          {av.error && (
            <span id="avatar_url-error" className={formStyles.errorText} role="alert">{av.error}</span>
          )}
        </div>

        <FormSelect
          id="locale"
          label={t("settings.language")}
          value={locale}
          onChange={(v) => setLocale(v as "es" | "en")}
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </FormSelect>

        {/* Nostr Identity Section */}
        <div className={styles.nostrSection}>
          <div className={styles.nostrSectionTitle}>
            <NostrichIcon size={16} />
            {t("settings.nostrIdentity")}
          </div>

          {profile?.nostr_pubkey ? (
            <>
              <div className={styles.nostrLinkedInfo}>
                <div>
                  <div className={styles.nostrPubkeyLabel}>
                    {t("settings.nostrPubkey")}
                  </div>
                  <div className={styles.nostrPubkey}>
                    {profile.nostr_pubkey.slice(0, 16)}...{profile.nostr_pubkey.slice(-8)}
                  </div>
                </div>
                {profile.has_password && (
                  <button
                    className={styles.nostrUnlinkButton}
                    onClick={handleUnlinkNostr}
                    disabled={nostrLoading}
                    type="button"
                  >
                    {t("settings.unlinkNostr")}
                  </button>
                )}
              </div>
              {/* Sync from Nostr button */}
              {nostrAvailable && (
                <button
                  className={styles.nostrSyncButton}
                  onClick={handleSyncFromNostr}
                  disabled={nostrSyncing}
                  type="button"
                >
                  <NostrichIcon size={14} />
                  {nostrSyncing ? t("settings.nostrSyncing") : t("settings.nostrSyncFromRelay")}
                </button>
              )}
              {isNostrOrigin && nostrAvailable && (
                <p className={styles.nostrAutoSyncHint}>
                  {t("settings.nostrAutoSyncHint")}
                </p>
              )}
            </>
          ) : nostrAvailable ? (
            <button
              className={styles.nostrLinkButton}
              onClick={handleLinkNostr}
              disabled={nostrLoading}
              type="button"
            >
              <NostrichIcon size={16} />
              {t("settings.linkNostr")}
            </button>
          ) : (
            <p className={styles.nostrExtensionHint}>
              {t("auth.nostrExtensionRequired")}
            </p>
          )}

          {nostrError && <p className={styles.nostrError}>{nostrError}</p>}
        </div>

        {/* 2FA Section */}
        <div className={styles.twoFASection}>
          <div className={styles.twoFASectionHeader}>
            <div className={styles.twoFASectionTitle}>
              <ShieldIcon size={16} />
              {t("settings.twoFA.title")}
            </div>
            {twoFAEnabled && !twoFADisabling && (
              <span className={styles.twoFAEnabledBadge}>{t("settings.twoFA.enabled")}</span>
            )}
          </div>
          <p className={styles.twoFADescription}>{t("settings.twoFA.description")}</p>

          {/* Setup: QR code + code input */}
          {twoFASetupData && (
            <>
              <div className={styles.qrContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={twoFASetupData.qrCode}
                  alt="2FA QR Code"
                  className={styles.qrImage}
                />
                <p className={styles.qrHint}>{t("settings.twoFA.scanQR")}</p>
              </div>
              <div className={styles.twoFACodeRow}>
                <div className={styles.twoFACodeInput}>
                  <FormInput
                    id="twofa-code"
                    label={t("settings.twoFA.enterCode")}
                    variant="security"
                    value={twoFACode}
                    onChange={(v) => setTwoFACode(v.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  className={styles.twoFACodeButton}
                  onClick={handleTwoFAConfirm}
                  disabled={twoFACode.length < 6 || twoFALoading}
                >
                  {t("settings.twoFA.confirm")}
                </button>
              </div>
              <button type="button" className={styles.twoFACancelButton} onClick={handleCancelTwoFA}>
                {t("settings.twoFA.cancel")}
              </button>
            </>
          )}

          {/* Recovery codes display */}
          {twoFARecoveryCodes && (
            <div className={styles.recoveryCodesBox}>
              <div className={styles.recoveryCodesTitle}>{t("settings.twoFA.recoveryCodes")}</div>
              <p className={styles.recoveryCodesHint}>{t("settings.twoFA.recoveryCodesHint")}</p>
              <div className={styles.recoveryCodesList}>
                {twoFARecoveryCodes.map((code) => (
                  <span key={code}>{code}</span>
                ))}
              </div>
              <button type="button" className={styles.copyButton} onClick={handleCopyRecoveryCodes}>
                {twoFACopied ? t("settings.twoFA.copied") : t("settings.twoFA.copyAll")}
              </button>
              <button type="button" className={styles.doneButton} onClick={handleTwoFADone}>
                {t("settings.twoFA.done")}
              </button>
            </div>
          )}

          {/* Disable form */}
          {twoFADisabling && (
            <div className={styles.twoFADisableForm}>
              <p className={styles.twoFADisableHint}>{t("settings.twoFA.disableConfirm")}</p>
              <FormInput
                id="twofa-disable-code"
                label={t("settings.twoFA.enterCode")}
                variant="security"
                value={twoFACode}
                onChange={(v) => setTwoFACode(v.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
              />
              <div className={styles.twoFADisableActions}>
                <button type="button" className={styles.twoFACancelButton} onClick={handleCancelTwoFA}>
                  {t("settings.twoFA.cancel")}
                </button>
                <button
                  type="button"
                  className={styles.twoFADisableButton}
                  onClick={handleTwoFADisable}
                  disabled={twoFACode.length < 6 || twoFALoading}
                >
                  {t("settings.twoFA.disable")}
                </button>
              </div>
            </div>
          )}

          {/* Enable/Disable buttons */}
          {!twoFASetupData && !twoFARecoveryCodes && !twoFADisabling && (
            twoFAEnabled ? (
              <button
                type="button"
                className={styles.twoFADisableButton}
                onClick={() => { setTwoFADisabling(true); setTwoFACode(""); setTwoFAError(""); }}
                disabled={twoFALoading}
              >
                <ShieldIcon size={16} />
                {t("settings.twoFA.disable")}
              </button>
            ) : (
              <button
                type="button"
                className={styles.twoFAEnableButton}
                onClick={handleTwoFASetup}
                disabled={twoFALoading}
              >
                <ShieldIcon size={16} />
                {t("settings.twoFA.enable")}
              </button>
            )
          )}

          {twoFAError && <p className={styles.twoFAError}>{twoFAError}</p>}
        </div>

        {saved && (
          <p className={styles.savedText}>{t("settings.saved")}</p>
        )}

        <FormButton type="submit" loading={saving} loadingText={t("common.loading")} disabled={!hasChanges}>
          {t("common.save")}
        </FormButton>
      </form>
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          variant={confirmState.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </AuthCard>
    </Container>
  );
}
