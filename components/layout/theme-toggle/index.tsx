"use client";

import { useTheme } from "@/lib/theme-context";
import { useTranslations } from "next-intl";
import { SunIcon, MoonIcon } from "@/components/icons";
import styles from "./theme-toggle.module.scss";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const t = useTranslations("accessibility");

  return (
    <button
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode")}
      title={theme === "dark" ? t("lightMode") : t("darkMode")}
    >
      <span className={`${styles.icon} ${theme === "dark" ? styles.visible : ""}`}>
        <SunIcon size={16} />
      </span>
      <span className={`${styles.icon} ${theme === "light" ? styles.visible : ""}`}>
        <MoonIcon size={16} />
      </span>
    </button>
  );
}
