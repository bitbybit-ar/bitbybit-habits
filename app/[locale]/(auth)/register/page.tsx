"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import styles from "../login/login.module.scss";

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
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (form.password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

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

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="display_name">{t("auth.displayName")}</label>
            <input
              id="display_name"
              type="text"
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="username">{t("auth.username")}</label>
            <input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">{t("auth.confirmPassword")}</label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
              autoComplete="new-password"
            />
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
