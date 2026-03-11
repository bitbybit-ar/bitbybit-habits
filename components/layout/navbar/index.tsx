"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { LogInIcon, UserPlusIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import styles from "./navbar.module.scss";
import { cn } from "@/lib/utils";

export const Navbar: React.FC = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  // Only show section links on the landing page (/ or /es or /en)
  const isLanding = /^\/(es|en)?\/?$/.test(pathname);

  const LANDING_LINKS = [
    { href: "#how-it-works", label: t("landing.nav.howItWorks") },
    { href: "#use-cases", label: t("landing.nav.useCases") },
    { href: "#tech-stack", label: t("landing.nav.techStack") },
  ];

  useEffect(() => {
    if (!isLanding) {
      setVisible(true);
      return;
    }

    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [isLanding]);

  return (
    <nav
      className={cn(styles.navbar, visible && styles.visible)}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.container}>
        <Link href="/" className={styles.brand} aria-label="BitByBit home">
          BitByBit
        </Link>
        {isLanding && (
          <ul className={styles.links}>
            {LANDING_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.authButtons}>
          <ThemeToggle />
          <LanguageSwitcher />
          <Link href="/login" className={styles.loginButton}>
            <LogInIcon size={16} />
            <span>{t("auth.login")}</span>
          </Link>
          <Link href="/register" className={styles.signupButton}>
            <UserPlusIcon size={16} />
            <span>{t("auth.register")}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
