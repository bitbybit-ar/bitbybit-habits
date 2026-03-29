"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import AuthCard from "@/components/auth/AuthCard";
import { FormInput, FormButton } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { useFormValidation } from "@/lib/hooks/useFormValidation";
import { useNostr } from "@/lib/hooks/useNostr";
import { resolveApiError } from "@/lib/error-messages";
import styles from "@/components/ui/form/form.module.scss";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const { showToast } = useToast();
  const { hasExtension: nostrAvailable, login: nostrLogin, isLoading: nostrLoading } = useNostr();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useFormValidation({
    initialValues: { login: "", password: "" },
    validators: {
      login: (v) => !(v as string).trim() ? t("validation.required") : undefined,
      password: (v) => !(v as string) ? t("validation.required") : undefined,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errs = form.validateAll();
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.values),
      });
      const data = await res.json();

      if (!data.success) {
        setError(resolveApiError(data.error, t));
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

  const handleNostrLogin = async () => {
    setError("");
    const result = await nostrLogin();
    if (!result.success) {
      setError(resolveApiError(result.error || "nostr_login_failed", t));
      return;
    }
    const role = result.data?.role;
    if (role === "kid") router.push("/kid");
    else if (role === "sponsor") router.push("/sponsor");
    else router.push("/onboard");
  };

  const loginField = form.fieldProps("login");
  const passwordField = form.fieldProps("password");

  return (
    <AuthCard
      subtitle={t("auth.login")}
      switchText={t("auth.noAccount")}
      switchLabel={t("auth.register")}
      switchHref="/register"
      showNostr
      onNostrLogin={handleNostrLogin}
      nostrAvailable={nostrAvailable}
      nostrLoading={nostrLoading}
      error={error}
      variant="login"
    >
      <form onSubmit={handleSubmit} className={styles.formLayout} noValidate>
        <FormInput
          id="login"
          label={`${t("auth.email")} / ${t("auth.username")}`}
          required
          variant="identity"
          placeholder={t("auth.loginPlaceholder")}
          autoComplete="username"
          value={loginField.value as string}
          onChange={loginField.onChange}
          onBlur={loginField.onBlur}
          error={loginField.error}
        />

        <div>
          <FormInput
            id="password"
            type="password"
            label={t("auth.password")}
            required
            variant="security"
            placeholder="••••••••"
            autoComplete="current-password"
            value={passwordField.value as string}
            onChange={passwordField.onChange}
            onBlur={passwordField.onBlur}
            error={passwordField.error}
          />
          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => showToast(t("auth.forgotPasswordMsg"), "info")}
          >
            {t("auth.forgotPassword")}
          </button>
        </div>

        <FormButton type="submit" loading={loading} loadingText={t("common.loading")}>
          {t("auth.login")}
        </FormButton>
      </form>
    </AuthCard>
  );
}
