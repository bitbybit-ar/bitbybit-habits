"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import styles from "./login.module.scss";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      if (role === "kid") {
        router.push("/kid");
      } else if (role === "sponsor") {
        router.push("/sponsor");
      } else {
        router.push("/onboard");
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
        <p className={styles.subtitle}>{t("auth.login")}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="login">
              {t("auth.email")} / {t("auth.username")}
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("auth.login")}
          </button>
        </form>

        <button className={styles.nostrButton} disabled>
          {t("auth.loginWithNostr")}
          <span className={styles.comingSoon}>{t("common.comingSoon")}</span>
        </button>

        <p className={styles.switchAuth}>
          {t("auth.noAccount")}{" "}
          <Link href="/register">{t("auth.register")}</Link>
        </p>
      </div>
    </div>
  );
}
