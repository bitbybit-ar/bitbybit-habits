"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon } from "@/components/icons";
import styles from "./back-link.module.scss";

interface BackLinkProps {
  onClick?: () => void;
}

export function BackLink({ onClick }: BackLinkProps) {
  const router = useRouter();
  const t = useTranslations();

  return (
    <button
      type="button"
      className={styles.backLink}
      onClick={onClick ?? (() => router.back())}
    >
      <ArrowLeftIcon size={16} />
      {t("common.back")}
    </button>
  );
}
