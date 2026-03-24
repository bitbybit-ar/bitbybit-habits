"use client";

import { Link } from "@/i18n/routing";
import { LogOutIcon, SettingsIcon } from "@/components/icons";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import styles from "./dashboard-layout.module.scss";

export interface DashboardTab {
  key: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

interface DashboardLayoutProps {
  displayName: string;
  headerExtra?: React.ReactNode;
  statsBar: React.ReactNode;
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  displayName,
  headerExtra,
  statsBar,
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  children,
}: DashboardLayoutProps) {
  return (
    <div className={styles.layout}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            ⚡ BitByBit
          </Link>
          <div className={styles.navActions}>
            <ThemeToggle />
            <LanguageSwitcher />
            <NotificationBell />
            <Link href="/settings" className={styles.navBtn} aria-label="Settings">
              <SettingsIcon size={18} />
            </Link>
            <button className={styles.navBtn} onClick={onLogout} aria-label="Logout">
              <LogOutIcon size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Header card */}
      <div className={styles.container}>
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div className={styles.headerWelcome}>
              <h1 className={styles.welcomeText}>
                {displayName}
              </h1>
              {headerExtra}
            </div>
            <div className={styles.headerAvatar}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className={styles.headerStats}>
            {statsBar}
          </div>
        </div>

        {/* Tab bar */}
        <div className={styles.tabBar}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={cn(styles.tabItem, activeTab === tab.key && styles.tabItemActive)}
              onClick={() => onTabChange(tab.key)}
              aria-label={tab.label}
              title={tab.label}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span className={styles.tabBadge}>
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className={styles.contentArea}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
