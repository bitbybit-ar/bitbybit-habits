"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BoltIcon, CheckIcon, FlameIcon, NostrichIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./auth-card.module.scss";

interface AuthCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  switchText?: string;
  switchLabel?: string;
  switchHref?: string;
  showNostr?: boolean;
  nostrLabel?: string;
  onNostrLogin?: () => void;
  nostrAvailable?: boolean;
  nostrLoading?: boolean;
  error?: string;
  variant?: "login" | "register";
}

export function AuthCard({
  children,
  title,
  subtitle,
  switchText,
  switchLabel,
  switchHref,
  showNostr = true,
  nostrLabel,
  onNostrLogin,
  nostrAvailable = false,
  nostrLoading = false,
  error,
  variant = "login",
}: AuthCardProps) {
  const t = useTranslations();

  return (
    <div className={styles.outerWrapper}>
      <div className={cn(styles.wrapper, variant === "register" && styles.wrapperWide)}>
        {/* Floating decorative icons */}
        <div className={styles.floatingIcons} aria-hidden="true">
          <div className={cn(styles.floatingIcon, styles.iconBolt)}>
            <BoltIcon size={16} />
          </div>
          {variant === "register" && (
            <div className={cn(styles.floatingIcon, styles.iconCheck)}>
              <CheckIcon size={14} />
            </div>
          )}
          <div className={cn(styles.floatingIcon, styles.iconNostrich)}>
            <NostrichIcon size={14} />
          </div>
          <div className={cn(styles.floatingIcon, styles.iconStreak)}>
            <FlameIcon size={14} />
          </div>
        </div>

        {/* Card with side accent bar */}
        <div className={styles.card}>
          <div className={styles.accentBar} aria-hidden="true" />
          <div className={styles.content}>
            <h1 className={styles.title}>{title || t("common.appName")}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

            {children}

            {error && <p className={styles.error}>{error}</p>}

            {showNostr && (
              <>
                <div className={styles.divider}>
                  <span>
                    {nostrLabel ? t("auth.orRegisterWith") : t("auth.orLoginWith")}
                  </span>
                </div>
                {nostrAvailable && onNostrLogin ? (
                  <button
                    className={cn(styles.nostrButton, styles.nostrButtonActive)}
                    onClick={onNostrLogin}
                    disabled={nostrLoading}
                    type="button"
                  >
                    <NostrichIcon size={18} />
                    {nostrLoading
                      ? t("auth.nostrLoginInProgress")
                      : nostrLabel || t("auth.loginWithNostr")}
                  </button>
                ) : (
                  <button className={styles.nostrButton} disabled type="button">
                    <NostrichIcon size={18} />
                    {nostrLabel || t("auth.loginWithNostr")}
                    <span className={styles.comingSoon}>
                      {t("auth.nostrExtensionRequired")}
                    </span>
                  </button>
                )}
              </>
            )}

            {switchText && switchLabel && switchHref && (
              <p className={styles.switchAuth}>
                {switchText}{" "}
                <Link href={switchHref}>{switchLabel}</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthCard;
