import styles from "./spinner.module.scss";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[size]} ${className ?? ""}`} role="status" aria-label={label ?? "Loading"}>
      <div className={styles.block} />
      <div className={styles.block} />
      <div className={styles.block} />
      <div className={styles.block} />
    </div>
  );
}
