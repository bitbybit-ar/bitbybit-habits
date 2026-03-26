"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/button";
import styles from "./status-page.module.scss";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <p className={styles.icon}>
          <span role="img" aria-label="warning">&#9888;&#65039;</span>
        </p>
        <h2 className={styles.title}>{t("title")}</h2>
        <p className={styles.description}>{t("description")}</p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre className={styles.devError}>{error.message}</pre>
        )}
        <Button onClick={reset}>{t("tryAgain")}</Button>
      </div>
    </div>
  );
}
