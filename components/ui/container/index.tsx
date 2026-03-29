import { cn } from "@/lib/utils";
import styles from "./container.module.scss";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
  column?: boolean;
}

export function Container({ children, className, center, column }: ContainerProps) {
  return (
    <div className={cn(styles.container, center && styles.center, column && styles.column, className)}>
      {children}
    </div>
  );
}

export default Container;
