"use client";

import { useTranslations } from "next-intl";
import { AuthView } from "@neondatabase/auth/react";
import { Link } from "@/i18n/routing";
import styles from "./login.module.scss";

export default function LoginPage() {
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("common.appName")}</h1>
        <p className={styles.subtitle}>{t("auth.login")}</p>

        <AuthView path="sign-in" callbackURL="/dashboard" />

        <p className={styles.switchAuth}>
          {t("auth.noAccount")}{" "}
          <Link href="/register">{t("auth.register")}</Link>
        </p>
      </div>
    </div>
  );
}
