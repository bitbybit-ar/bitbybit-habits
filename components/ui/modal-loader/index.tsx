import { Spinner } from "@/components/ui/spinner";
import styles from "./modal-loader.module.scss";

interface ModalLoaderProps {
  message?: string;
}

export function ModalLoader({ message }: ModalLoaderProps) {
  return (
    <div className={styles.loader}>
      <Spinner size="md" />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}

export default ModalLoader;
