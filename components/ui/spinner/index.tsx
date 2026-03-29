import styles from "./spinner.module.scss";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[size]} ${className ?? ""}`} role="status" aria-label="Loading">
      <div className={styles.block} />
      <div className={styles.block} />
      <div className={styles.block} />
      <div className={styles.block} />
    </div>
  );
}
