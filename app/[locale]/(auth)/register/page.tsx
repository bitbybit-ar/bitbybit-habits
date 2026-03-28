"use client";

import { useMemo } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthCard from "@/components/auth/AuthCard";
import { FormInput, FormButton } from "@/components/ui/form";
import { useFormValidation } from "@/lib/hooks/useFormValidation";
import { resolveApiError } from "@/lib/error-messages";
import styles from "@/components/ui/form/form.module.scss";

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  return strength;
}

const STRENGTH_COLORS = [
  "transparent",
  "var(--color-error)",
  "var(--color-warning)",
  "var(--color-accent-alt)",
  "var(--color-success)",
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useFormValidation({
    initialValues: {
      display_name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
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
      password: (v) => {
        const val = v as string;
        if (!val) return t("validation.required");
        if (val.length < 6) return t("auth.passwordTooShort");
        return undefined;
      },
      confirmPassword: (v, values) => {
        const val = v as string;
        if (!val) return t("validation.required");
        if (val !== (values as Record<string, string>).password) return t("auth.passwordMismatch");
        return undefined;
      },
    },
  });

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.values.password),
    [form.values.password]
  );

  const STRENGTH_LABELS = [
    "",
    t("auth.strengthWeak"),
    t("auth.strengthFair"),
    t("auth.strengthGood"),
    t("auth.strengthStrong"),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errs = form.validateAll();
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.values.email,
          username: form.values.username,
          password: form.values.password,
          display_name: form.values.display_name,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(resolveApiError(data.error, t));
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.values.email, password: form.values.password }),
      });
      const loginData = await loginRes.json();
      router.push(loginData.success ? "/onboard" : "/login");
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const dn = form.fieldProps("display_name");
  const un = form.fieldProps("username");
  const em = form.fieldProps("email");
  const pw = form.fieldProps("password");
  const cpw = form.fieldProps("confirmPassword");

  return (
    <AuthCard
      subtitle={t("auth.register")}
      switchText={t("auth.hasAccount")}
      switchLabel={t("auth.login")}
      switchHref="/login"
      showNostr
      nostrLabel={t("auth.registerWithNostr")}
      error={error}
      variant="register"
    >
      <form onSubmit={handleSubmit} className={styles.formLayout} noValidate>
        <div className={styles.fieldRow}>
          <FormInput
            id="display_name"
            label={t("auth.displayName")}
            required
            variant="identity"
            placeholder={t("auth.displayName")}
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
            placeholder={t("auth.usernamePlaceholder")}
            autoComplete="username"
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
          placeholder={t("auth.emailPlaceholder")}
          autoComplete="email"
          value={em.value as string}
          onChange={em.onChange}
          onBlur={em.onBlur}
          error={em.error}
        />

        <div className={styles.fieldRow}>
          <FormInput
            id="password"
            type="password"
            label={t("auth.password")}
            required
            variant="security"
            placeholder="••••••••"
            autoComplete="new-password"
            value={pw.value as string}
            onChange={pw.onChange}
            onBlur={pw.onBlur}
            error={pw.error}
          />
          <FormInput
            id="confirmPassword"
            type="password"
            label={t("auth.confirmPassword")}
            required
            variant="security"
            placeholder="••••••••"
            autoComplete="new-password"
            value={cpw.value as string}
            onChange={cpw.onChange}
            onBlur={cpw.onBlur}
            error={cpw.error}
          />
        </div>

        {form.values.password.length > 0 && (
          <div className={styles.strengthContainer}>
            <div className={styles.strengthBar}>
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={styles.strengthSegment}
                  style={{
                    background: passwordStrength >= level
                      ? STRENGTH_COLORS[passwordStrength]
                      : undefined,
                  }}
                />
              ))}
            </div>
            <span
              className={styles.strengthLabel}
              style={{ color: STRENGTH_COLORS[passwordStrength] }}
            >
              {STRENGTH_LABELS[passwordStrength]}
            </span>
          </div>
        )}

        <FormButton type="submit" loading={loading} loadingText={t("common.loading")}>
          {t("auth.register")}
        </FormButton>
      </form>
    </AuthCard>
  );
}
