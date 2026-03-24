"use client";

import { useTranslations } from "next-intl";
import { BoltIcon, FlameIcon, ClockIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import styles from "./stats-bar.module.scss";

interface StatItem {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  iconClass: string;
  highlight?: boolean;
}

interface StatsBarDefaultProps {
  totalSats: number;
  bestStreak: number;
  pendingCount: number;
  items?: never;
}

interface StatsBarCustomProps {
  items: StatItem[];
  totalSats?: never;
  bestStreak?: never;
  pendingCount?: never;
}

type StatsBarProps = (StatsBarDefaultProps | StatsBarCustomProps) & {
  compact?: boolean;
};

export function StatsBar(props: StatsBarProps) {
  const t = useTranslations();
  const iconSize = props.compact ? 14 : 22;

  const items: StatItem[] = props.items ?? [
    {
      icon: <BoltIcon size={iconSize} />,
      value: props.totalSats!.toLocaleString(),
      label: `${t("sats.sats")} ${t("sats.earned")}`,
      iconClass: styles.iconSats,
      highlight: true,
    },
    {
      icon: <FlameIcon size={iconSize} />,
      value: props.bestStreak!,
      label: t("dashboard.streak"),
      iconClass: styles.iconStreak,
    },
    {
      icon: <ClockIcon size={iconSize} />,
      value: props.pendingCount!,
      label: t("dashboard.pendingApproval"),
      iconClass: styles.iconPending,
    },
  ];

  return (
    <div className={cn(styles.statsBar, props.compact && styles.compact)}>
      {items.map((item, index) => (
        <div key={index} className={cn(styles.statCard, item.highlight && styles.statCardHighlight)}>
          <div className={cn(styles.iconWrapper, item.iconClass)}>
            {item.icon}
          </div>
          <div className={styles.statContent}>
            <span className={cn(styles.statValue, item.highlight && styles.statValueHighlight)}>
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </span>
            <span className={styles.statLabel}>{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { StatItem };
export default StatsBar;
