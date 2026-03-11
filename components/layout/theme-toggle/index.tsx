"use client";

import { useTheme } from "@/lib/theme-context";
import { SunIcon, MoonIcon } from "@/components/icons";
import styles from "./theme-toggle.module.scss";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
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
