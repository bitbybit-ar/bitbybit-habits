"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import styles from "./settings.module.scss";

interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  locale: "es" | "en";
}

export default function SettingsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [locale, setLocale] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setProfile(data.data);
            setDisplayName(data.data.display_name);
            setUsername(data.data.username);
            setEmail(data.data.email);
            setAvatarUrl(data.data.avatar_url ?? "");
            setLocale(data.data.locale);
          }
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          username: username,
          email: email,
          avatar_url: avatarUrl || null,
          locale,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setProfile(data.data);
        // If locale changed, redirect to new locale
        if (profile && locale !== profile.locale) {
          document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
          router.push(`/${locale}/settings`);
        }
      } else {
        setError(data.error || t("common.error"));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setSaving(false);
    }
  }, [displayName, username, email, avatarUrl, locale, profile, router, t]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t("settings.title")}</h1>
        <button className={styles.backButton} onClick={() => router.back()}>
          {t("common.back")}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label}>{t("auth.email")}</label>
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("auth.username")}</label>
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("auth.displayName")}</label>
          <input
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("settings.avatarUrl")}</label>
          <input
            className={styles.input}
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("settings.language")}</label>
          <select
            className={styles.select}
            value={locale}
            onChange={(e) => setLocale(e.target.value as "es" | "en")}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className={styles.actions}>
          {error && <span className={styles.errorText}>{error}</span>}
          {saved && <span className={styles.savedText}>{t("settings.saved")}</span>}
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
