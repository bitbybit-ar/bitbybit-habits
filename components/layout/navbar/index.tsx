"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LogInIcon, UserPlusIcon } from "@/components/icons";
import styles from "./navbar.module.scss";
import { cn } from "@/lib/utils";

export const Navbar: React.FC = () => {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);

  const NAV_LINKS = [
    { href: "#how-it-works", label: t("landing.nav.howItWorks") },
    { href: "#use-cases", label: t("landing.nav.useCases") },
    { href: "#why-lightning", label: t("landing.nav.whyLightning") },
    { href: "#tech-stack", label: t("landing.nav.techStack") },
    { href: "#roadmap", label: t("landing.nav.roadmap") },
    { href: "#team", label: t("landing.nav.team") },
  ];

  useEffect(() => {
    const hero = document.querySelector("[data-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className={cn(styles.navbar, visible && styles.visible)}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={styles.container}>
        <a href="#" className={styles.brand} aria-label="BitByBit home">
          BitByBit
        </a>
        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <div className={styles.authButtons}>
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
