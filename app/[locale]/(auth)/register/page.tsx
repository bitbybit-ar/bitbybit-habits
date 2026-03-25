"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthCard from "@/components/auth/AuthCard";
import { cn } from "@/lib/utils";
import formStyles from "@/components/auth/auth-form.module.scss";

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

interface FormErrors {
  display_name?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    display_name: "",
  });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );

  const STRENGTH_LABELS = [
    "",
    t("auth.strengthWeak"),
    t("auth.strengthFair"),
    t("auth.strengthGood"),
    t("auth.strengthStrong"),
  ];

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.display_name.trim())
      errs.display_name = t("validation.required");
    if (!form.email.trim()) {
      errs.email = t("validation.required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = t("auth.invalidEmail");
    }
    if (!form.username.trim()) {
      errs.username = t("validation.required");
    } else if (form.username.trim().length < 3) {
      errs.username = t("auth.usernameTooShort");
    }
    if (!form.password) {
      errs.password = t("validation.required");
    } else if (form.password.length < 6) {
      errs.password = t("auth.passwordTooShort");
    }
    if (!form.confirmPassword) {
      errs.confirmPassword = t("validation.required");
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = t("auth.passwordMismatch");
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTouched(true);

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
          display_name: form.display_name,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.email, password: form.password }),
      });

      const loginData = await loginRes.json();

      if (loginData.success) {
        router.push("/onboard");
      } else {
        router.push("/login");
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
        {/* Row 1: Name + Username */}
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
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              className={cn(
                formStyles.inputIdentity,
                touched && errors.display_name && formStyles.inputError
              )}
              placeholder={t("auth.displayName")}
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
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              autoComplete="username"
              className={cn(
                formStyles.inputIdentity,
                touched && errors.username && formStyles.inputError
              )}
              placeholder="@usuario"
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
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
            className={cn(
              formStyles.inputIdentity,
              touched && errors.email && formStyles.inputError
            )}
            placeholder="email@ejemplo.com"
          />
          {touched && errors.email && (
            <span className={formStyles.errorText}>{errors.email}</span>
          )}
        </div>

        {/* Row 2: Password + Confirm */}
        <div className={formStyles.fieldRow}>
          <div
            className={cn(
              formStyles.field,
              touched && errors.password && formStyles.fieldError
            )}
          >
            <label htmlFor="password" className={formStyles.label}>
              {t("auth.password")}
              <span className={formStyles.required}>*</span>
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
              className={cn(
                formStyles.inputSecurity,
                touched && errors.password && formStyles.inputError
              )}
              placeholder="••••••••"
            />
            {touched && errors.password && (
              <span className={formStyles.errorText}>{errors.password}</span>
            )}
          </div>

          <div
            className={cn(
              formStyles.field,
              touched && errors.confirmPassword && formStyles.fieldError
            )}
          >
            <label htmlFor="confirmPassword" className={formStyles.label}>
              {t("auth.confirmPassword")}
              <span className={formStyles.required}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              autoComplete="new-password"
              className={cn(
                formStyles.inputSecurity,
                touched && errors.confirmPassword && formStyles.inputError
              )}
              placeholder="••••••••"
            />
            {touched && errors.confirmPassword && (
              <span className={formStyles.errorText}>
                {errors.confirmPassword}
              </span>
            )}
          </div>
        </div>

        {/* Password strength indicator */}
        {form.password.length > 0 && (
          <div className={formStyles.strengthContainer}>
            <div className={formStyles.strengthBar}>
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={formStyles.strengthSegment}
                  style={{
                    background:
                      passwordStrength >= level
                        ? STRENGTH_COLORS[passwordStrength]
                        : undefined,
                  }}
                />
              ))}
            </div>
            <span
              className={formStyles.strengthLabel}
              style={{ color: STRENGTH_COLORS[passwordStrength] }}
            >
              {STRENGTH_LABELS[passwordStrength]}
            </span>
          </div>
        )}

        <button
          type="submit"
          className={formStyles.submitButton}
          disabled={loading}
        >
          {loading ? t("common.loading") : t("auth.register")}
        </button>
      </form>
    </AuthCard>
  );
}
