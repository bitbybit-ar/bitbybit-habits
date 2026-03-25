"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import { cn } from "@/lib/utils";
import formStyles from "@/components/auth/auth-form.module.scss";
import styles from "./settings.module.scss";

interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  locale: "es" | "en";
}

interface FormErrors {
  display_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);

  const initials = useMemo(() => {
    if (displayName.trim()) return displayName.trim().charAt(0).toUpperCase();
    if (username.trim()) return username.trim().charAt(0).toUpperCase();
    return "A";
  }, [displayName, username]);

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

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!displayName.trim()) errs.display_name = t("validation.required");
    if (!username.trim()) {
      errs.username = t("validation.required");
    } else if (username.trim().length < 3) {
      errs.username = t("auth.usernameTooShort");
    }
    if (!email.trim()) {
      errs.email = t("validation.required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = t("auth.invalidEmail");
    }
    if (avatarUrl && !/^https?:\/\/.+/.test(avatarUrl)) {
      errs.avatar_url = t("settings.invalidUrl");
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    setError("");
    setTouched(true);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          username,
          email,
          avatar_url: avatarUrl || null,
          locale,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setProfile(data.data);
        if (profile && locale !== profile.locale) {
          router.push(`/${locale}/settings`);
        }
      } else {
        setError(data.error || t("auth.connectionError"));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>{t("common.loading")}</p>
      </div>
    );
  }

  return (
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
      <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
        {/* Row 1: Display name + Username */}
        <div className={formStyles.fieldRow}>
          <div
            className={cn(
              formStyles.field,
              touched && errors.display_name && formStyles.fieldError
            )}
          >
            <label htmlFor="display_name" className={formStyles.label}>
              {t("auth.displayName")}
              <span className={formStyles.required}>*</span>
            </label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={cn(
                formStyles.inputIdentity,
                touched && errors.display_name && formStyles.inputError
              )}
            />
            {touched && errors.display_name && (
              <span className={formStyles.errorText}>
                {errors.display_name}
              </span>
            )}
          </div>

          <div
            className={cn(
              formStyles.field,
              touched && errors.username && formStyles.fieldError
            )}
          >
            <label htmlFor="username" className={formStyles.label}>
              {t("auth.username")}
              <span className={formStyles.required}>*</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(
                formStyles.inputIdentity,
                touched && errors.username && formStyles.inputError
              )}
            />
            {touched && errors.username && (
              <span className={formStyles.errorText}>{errors.username}</span>
            )}
          </div>
        </div>

        {/* Email — full width */}
        <div
          className={cn(
            formStyles.field,
            touched && errors.email && formStyles.fieldError
          )}
        >
          <label htmlFor="email" className={formStyles.label}>
            {t("auth.email")}
            <span className={formStyles.required}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(
              formStyles.inputIdentity,
              touched && errors.email && formStyles.inputError
            )}
          />
          {touched && errors.email && (
            <span className={formStyles.errorText}>{errors.email}</span>
          )}
        </div>

        {/* Avatar URL */}
        <div
          className={cn(
            formStyles.field,
            touched && errors.avatar_url && formStyles.fieldError
          )}
        >
          <label htmlFor="avatar_url" className={formStyles.label}>
            {t("settings.avatarUrl")}
          </label>
          <div className={styles.avatarField}>
            <div className={styles.avatarPreview}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
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
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className={cn(
                formStyles.inputIdentity,
                touched && errors.avatar_url && formStyles.inputError
              )}
              placeholder="https://..."
            />
          </div>
          {touched && errors.avatar_url && (
            <span className={formStyles.errorText}>{errors.avatar_url}</span>
          )}
        </div>

        {/* Language */}
        <div className={formStyles.field}>
          <label htmlFor="locale" className={formStyles.label}>
            {t("settings.language")}
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value as "es" | "en")}
              className={styles.select}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
            <span className={styles.selectChevron}>▾</span>
          </div>
        </div>

        {/* Actions */}
        {saved && (
          <p className={styles.savedText}>{t("settings.saved")}</p>
        )}

        <button
          type="submit"
          className={formStyles.submitButton}
          disabled={saving}
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </form>
    </AuthCard>
  );
}
