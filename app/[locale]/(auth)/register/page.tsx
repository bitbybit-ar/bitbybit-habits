"use client";

import { useTranslations } from "next-intl";
import { AuthView } from "@neondatabase/auth/react";
import { Link } from "@/i18n/routing";
import styles from "../login/login.module.scss";

export default function RegisterPage() {
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("common.appName")}</h1>
        <p className={styles.subtitle}>{t("auth.register")}</p>

        <AuthView path="sign-up" callbackURL="/onboard" />

        <p className={styles.switchAuth}>
          {t("auth.hasAccount")}{" "}
          <Link href="/login">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
