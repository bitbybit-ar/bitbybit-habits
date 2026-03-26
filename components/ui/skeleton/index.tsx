import styles from "./skeleton.module.scss";

interface SkeletonProps {
  variant?: "line" | "pill" | "card" | "circle";
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = "line", width, height, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className ?? ""}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.cardHeader}>
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className={styles.cardLines}>
          <Skeleton width="60%" height="14px" />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton width="100%" height="10px" />
      <Skeleton width="80%" height="10px" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className={styles.dashboardSkeleton}>
      {/* Stats bar skeleton */}
      <div className={styles.statsRow}>
        <Skeleton variant="pill" width="100%" height="72px" />
        <Skeleton variant="pill" width="100%" height="72px" />
        <Skeleton variant="pill" width="100%" height="72px" />
      </div>
      {/* Tab bar skeleton */}
      <div className={styles.tabRow}>
        <Skeleton variant="pill" width="80px" height="36px" />
        <Skeleton variant="pill" width="80px" height="36px" />
        <Skeleton variant="pill" width="80px" height="36px" />
      </div>
      {/* Content cards skeleton */}
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default Skeleton;
