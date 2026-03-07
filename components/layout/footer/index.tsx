"use client";

import React from "react";
import { useTranslations } from "next-intl";
import styles from "./footer.module.scss";

export const Footer: React.FC = () => {
  const t = useTranslations("landing.footer");

  return (
    <footer className={styles.footer}>
      <p>
        {t("builtFor")} <strong>{t("hackathonName")}</strong>
      </p>
      <p className={styles.motto}>{t("motto")}</p>
    </footer>
  );
};

export default Footer;
