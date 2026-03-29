import { cn } from "@/lib/utils";
import styles from "./dashboard-section.module.scss";

interface DashboardSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export function DashboardSection({ title, children, className, center }: DashboardSectionProps) {
  return (
    <div className={cn(styles.section, center && styles.center, className)}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </div>
  );
}
