"use client";

import { useCallback, useState } from "react";
import { Onboarding } from "@/components/dashboard/onboarding";
import styles from "../dashboard.module.scss";

export default function OnboardingPreview() {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  return (
    <div className={styles.container}>
      {dismissed ? (
        <p style={{ textAlign: "center", color: "#B8A898", marginTop: 80 }}>
          Onboarding completado. En producción acá verías el dashboard.
        </p>
      ) : (
        <Onboarding displayName="Satoshi" onDismiss={handleDismiss} />
      )}
    </div>
  );
}
