"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./footer.module.scss";

export const Footer: React.FC = () => {
  const t = useTranslations("landing.footer");

  return (
    <footer className={styles.footer}>
      <p>
        {t("builtFor")} <strong>{t("hackathonName")}</strong>
      </p>
      <div className={styles.mottoRow}>
        <p className={styles.motto}>{t("motto")}</p>
        <a
          href="https://lacrypta.ar"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.cryptaLink}
        >
          <Image
            src="https://github.com/lacrypta.png?size=64"
            alt="La Crypta"
            width={64}
            height={64}
            className={styles.cryptaLogo}
          />
        </a>
      </div>
    </footer>
  );
};

export default Footer;
