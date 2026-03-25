"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const isLanding = /^\/(es|en)?\/?$/.test(pathname);
  const isLoginPage = /^\/(es|en)\/login\/?$/.test(pathname);
  const isRegisterPage = /^\/(es|en)\/register\/?$/.test(pathname);

  const LANDING_LINKS = [
    { href: "#how-it-works", label: t("landing.nav.howItWorks") },
    { href: "#use-cases", label: t("landing.nav.useCases") },
    { href: "#tech-stack", label: t("landing.nav.techStack") },
  ];

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setVisible(true);
  }, [isLanding]);

  // Scroll progress for landing page
  useEffect(() => {
    if (!isLanding) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLanding]);

  // Close mobile menu on route change
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

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
          {!isLoginPage && (
            <Link href="/login" className={styles.loginButton}>
              <LogInIcon size={16} />
              <span>{t("auth.login")}</span>
            </Link>
          )}
          {!isRegisterPage && (
            <Link href="/register" className={styles.signupButton}>
              <UserPlusIcon size={16} />
              <span>{t("auth.register")}</span>
            </Link>
          )}
          {isLanding && (
            <button
              className={cn(styles.hamburger, menuOpen && styles.hamburgerOpen)}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className={styles.hamburgerLine} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isLanding && (
        <div className={styles.mobileMenu} data-open={menuOpen}>
          {LANDING_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Scroll progress */}
      {isLanding && (
        <div
          className={styles.scrollProgress}
          style={{ width: `${scrollProgress}%` }}
          aria-hidden="true"
        />
      )}
    </nav>
  );
};

export default Navbar;
