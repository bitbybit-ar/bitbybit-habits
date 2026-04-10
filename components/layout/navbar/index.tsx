"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import {
  LogInIcon,
  UserPlusIcon,
  LogOutIcon,
  SettingsIcon,
} from "@/components/icons";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useSessionContext } from "@/lib/session-context";
import styles from "./navbar.module.scss";
import { cn } from "@/lib/utils";

export const Navbar: React.FC = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { session: user, isLoading: sessionLoading, refreshSession, clearSession } = useSessionContext();
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const isLanding = /^\/(es|en)?\/?$/.test(pathname);
  const isLoginPage = /^\/(es|en)\/login\/?$/.test(pathname);
  const isRegisterPage = /^\/(es|en)\/register\/?$/.test(pathname);
  const checkedSession = !sessionLoading;
  const isLoggedIn = !!user;

  const LANDING_LINKS = [
    { href: "#how-it-works", label: t("landing.nav.howItWorks") },
    { href: "#use-cases", label: t("landing.nav.useCases") },
    { href: "#tech-stack", label: t("landing.nav.techStack") },
  ];

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const lastScrollY = useRef(0);

  // Hide on scroll down, show on scroll up (+ scroll progress on landing)
  useEffect(() => {
    const SCROLL_THRESHOLD = 10;

    const handleScroll = () => {
      const scrollTop = window.scrollY;

      if (isLanding) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
      }

      // Always visible on landing (has scroll progress bar)
      if (isLanding) {
        setVisible(true);
      } else if (scrollTop <= 0) {
        setVisible(true);
      } else {
        const delta = scrollTop - lastScrollY.current;
        if (delta > SCROLL_THRESHOLD) {
          setVisible(false);
          closeMenu();
        } else if (delta < -SCROLL_THRESHOLD) {
          setVisible(true);
        }
      }

      lastScrollY.current = scrollTop;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLanding, closeMenu]);

  // Refresh session + close mobile menu on route change
  useEffect(() => {
    closeMenu();
    void refreshSession();
  }, [pathname, closeMenu, refreshSession]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    router.push("/");
  };

  return (
    <nav
      className={cn(styles.navbar, visible && styles.visible)}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.container}>
        <Link
          href={isLoggedIn ? (user.role === "sponsor" ? "/sponsor" : "/kid") : "/"}
          className={styles.brand}
          aria-label={t("accessibility.homeLink")}
        >
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

        <div className={styles.navActions}>
          <ThemeToggle />
          <LanguageSwitcher />

          {checkedSession && isLoggedIn && (
            <>
              <NotificationBell />
              <Link
                href="/settings"
                className={styles.navBtn}
                aria-label={t("settings.title")}
              >
                <SettingsIcon size={18} />
              </Link>
              <button
                className={styles.navBtn}
                onClick={handleLogout}
                aria-label={t("auth.logout")}
              >
                <LogOutIcon size={18} />
              </button>
            </>
          )}

          {checkedSession && !isLoggedIn && (
            <>
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
            </>
          )}

          {isLanding && (
            <button
              className={cn(
                styles.hamburger,
                menuOpen && styles.hamburgerOpen
              )}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? t("accessibility.closeMenu") : t("accessibility.openMenu")}
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
