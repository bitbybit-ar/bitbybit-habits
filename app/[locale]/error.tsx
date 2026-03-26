"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "1.5rem" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          <span role="img" aria-label="warning">&#9888;&#65039;</span>
        </p>
        <h2>{t("title")}</h2>
        <p style={{ color: "var(--color-text-secondary)", maxWidth: 400, margin: "0.5rem auto 1.5rem" }}>
          {t("description")}
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <pre style={{ fontSize: "0.75rem", color: "var(--color-error)", marginBottom: "1rem", whiteSpace: "pre-wrap", maxWidth: 500, margin: "0 auto 1rem" }}>
            {error.message}
          </pre>
        )}
        <Button onClick={reset}>{t("tryAgain")}</Button>
      </div>
    </div>
  );
}
