"use client";

import { useTranslations } from "next-intl";
import { AuthView } from "@neondatabase/auth/react";
import { Link } from "@/i18n/routing";
import styles from "./login.module.scss";

export function LoginContent() {
  const t = useTranslations();

  return (
    <>
      <AuthView path="sign-in" callbackURL="/dashboard" />

      <button className={styles.nostrButton} disabled>
        {t("auth.loginWithNostr")}
        <span className={styles.comingSoon}>{t("common.comingSoon")}</span>
      </button>

      <p className={styles.switchAuth}>
        {t("auth.noAccount")}{" "}
        <Link href="/register">{t("auth.register")}</Link>
      </p>
    </>
  );
}
