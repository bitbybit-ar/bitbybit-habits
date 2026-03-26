import { useTranslations } from "next-intl";
import Button from "@/components/ui/button";
import styles from "./status-page.module.scss";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.code}>404</p>
        <h2 className={styles.title}>{t("title")}</h2>
        <p className={styles.description}>{t("description")}</p>
        <Button href="/">{t("backHome")}</Button>
      </div>
    </div>
  );
}
