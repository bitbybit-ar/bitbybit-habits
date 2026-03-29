import { cn } from "@/lib/utils";
import styles from "./dashboard-section.module.scss";

interface DashboardSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({ title, children, className }: DashboardSectionProps) {
  return (
    <div className={cn(styles.section, className)}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </div>
  );
}
