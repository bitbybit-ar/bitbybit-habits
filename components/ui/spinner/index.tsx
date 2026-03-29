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

export function PageSpinner({ message }: { message?: string }) {
  return (
    <div className={styles.pageSpinner}>
      <div className={styles.glassCard}>
        <Spinner size="lg" />
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

export default Spinner;
