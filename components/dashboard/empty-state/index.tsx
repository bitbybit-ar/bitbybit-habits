import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import styles from "./empty-state.module.scss";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, action, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.emptyState, className)}>
      <span className={styles.icon}>{icon}</span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>
      {actionLabel && onAction ? (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : action}
    </div>
  );
}
