import { PageSpinner } from "@/components/ui/spinner";
import styles from "./loading.module.scss";

export default function AuthLoading() {
  return (
    <div className={styles.container}>
      <PageSpinner />
    </div>
  );
}
