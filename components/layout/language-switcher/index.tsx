"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import styles from "./language-switcher.module.scss";

const LOCALES = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitch = (newLocale: string) => {
    if (newLocale === locale) return;
    // Store preference in cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.replace(pathname, { locale: newLocale as "es" | "en" });
  };

  return (
    <div className={styles.switcher}>
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          className={`${styles.btn} ${locale === code ? styles.active : ""}`}
          onClick={() => handleSwitch(code)}
          aria-label={`Switch to ${label}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
