"use client";

import { cn } from "@/lib/utils";
import styles from "./bottom-nav.module.scss";

interface NavTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomNavProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={cn(styles.navItem, activeTab === tab.key && styles.navItemActive)}
          onClick={() => onTabChange(tab.key)}
          aria-label={tab.label}
          aria-current={activeTab === tab.key ? "page" : undefined}
        >
          <div className={styles.navIcon}>{tab.icon}</div>
          <span className={styles.navLabel}>{tab.label}</span>
          {tab.badge != null && tab.badge > 0 && (
            <span className={styles.navBadge}>{tab.badge > 9 ? "9+" : tab.badge}</span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
