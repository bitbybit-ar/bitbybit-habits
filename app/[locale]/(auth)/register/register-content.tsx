"use client";

import { useTranslations } from "next-intl";
import { AuthView } from "@neondatabase/auth/react";
import { Link } from "@/i18n/routing";
import styles from "../login/login.module.scss";

export function RegisterContent() {
  const t = useTranslations();

  return (
    <>
      <AuthView path="sign-up" callbackURL="/onboard" />

      <p className={styles.switchAuth}>
        {t("auth.hasAccount")}{" "}
        <Link href="/login">{t("auth.login")}</Link>
      </p>
    </>
  );
}
