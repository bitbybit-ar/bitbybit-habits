"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthCard from "@/components/auth/AuthCard";
import { cn } from "@/lib/utils";
import formStyles from "@/components/auth/auth-form.module.scss";

interface FormErrors {
  login?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = (): FormErrors => {
    const errs: FormErrors = {};
    if (!login.trim()) errs.login = t("validation.required");
    if (!password) errs.password = t("validation.required");
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        return;
      }

      const role = data.data?.role;
      if (role === "kid") router.push("/kid");
      else if (role === "sponsor") router.push("/sponsor");
      else router.push("/onboard");
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      subtitle={t("auth.login")}
      switchText={t("auth.noAccount")}
      switchLabel={t("auth.register")}
      switchHref="/register"
      showNostr
      error={error}
      variant="login"
    >
      <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
        <div
          className={cn(
            formStyles.field,
            touched && errors.login && formStyles.fieldError
          )}
        >
          <label htmlFor="login" className={formStyles.label}>
            {t("auth.email")} / {t("auth.username")}
            <span className={formStyles.required}>*</span>
          </label>
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            className={cn(
              formStyles.inputIdentity,
              touched && errors.login && formStyles.inputError
            )}
            placeholder={t("auth.email")}
          />
          {touched && errors.login && (
            <span className={formStyles.errorText}>{errors.login}</span>
          )}
        </div>

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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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

        <button
          type="submit"
          className={formStyles.submitButton}
          disabled={loading}
        >
          {loading ? t("common.loading") : t("auth.login")}
        </button>
      </form>
    </AuthCard>
  );
}
