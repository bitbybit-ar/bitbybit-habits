"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import { FormInput, FormSelect, FormButton } from "@/components/ui/form";
import { useFormValidation } from "@/lib/hooks/useFormValidation";
import formStyles from "@/components/ui/form/form.module.scss";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<"es" | "en">("es");

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

  const dn = form.fieldProps("display_name");
  const un = form.fieldProps("username");
  const em = form.fieldProps("email");
  const av = form.fieldProps("avatar_url");

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

        {saved && (
          <p className={styles.savedText}>{t("settings.saved")}</p>
        )}

        <FormButton type="submit" loading={saving} loadingText={t("common.loading")}>
          {t("common.save")}
        </FormButton>
      </form>
    </AuthCard>
  );
}
