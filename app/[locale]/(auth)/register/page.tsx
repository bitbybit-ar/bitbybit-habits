"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import styles from "../login/login.module.scss";

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

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!form.display_name.trim()) errs.display_name = t("validation.required");
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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("common.appName")}</h1>
        <p className={styles.subtitle}>{t("auth.register")}</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={cn(styles.field, touched && errors.display_name && styles.fieldError)}>
            <label htmlFor="display_name">
              {t("auth.displayName")}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="display_name"
              type="text"
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              className={cn(touched && errors.display_name && styles.inputError)}
            />
            {touched && errors.display_name && (
              <span className={styles.errorText}>{errors.display_name}</span>
            )}
          </div>

          <div className={cn(styles.field, touched && errors.email && styles.fieldError)}>
            <label htmlFor="email">
              {t("auth.email")}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              className={cn(touched && errors.email && styles.inputError)}
            />
            {touched && errors.email && (
              <span className={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div className={cn(styles.field, touched && errors.username && styles.fieldError)}>
            <label htmlFor="username">
              {t("auth.username")}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              autoComplete="username"
              className={cn(touched && errors.username && styles.inputError)}
            />
            {touched && errors.username && (
              <span className={styles.errorText}>{errors.username}</span>
            )}
          </div>

          <div className={cn(styles.field, touched && errors.password && styles.fieldError)}>
            <label htmlFor="password">
              {t("auth.password")}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
              className={cn(touched && errors.password && styles.inputError)}
            />
            {touched && errors.password && (
              <span className={styles.errorText}>{errors.password}</span>
            )}
          </div>

          <div className={cn(styles.field, touched && errors.confirmPassword && styles.fieldError)}>
            <label htmlFor="confirmPassword">
              {t("auth.confirmPassword")}
              <span className={styles.required}>*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              autoComplete="new-password"
              className={cn(touched && errors.confirmPassword && styles.inputError)}
            />
            {touched && errors.confirmPassword && (
              <span className={styles.errorText}>{errors.confirmPassword}</span>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("auth.register")}
          </button>
        </form>

        <p className={styles.switchAuth}>
          {t("auth.hasAccount")}{" "}
          <Link href="/login">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
