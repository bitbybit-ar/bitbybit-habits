"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { Onboarding } from "@/components/dashboard/onboarding";
import styles from "../dashboard.module.scss";

export default function OnboardingPreview() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!dismissed) return;

    async function checkSession() {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data.success && data.data) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
    checkSession();
  }, [dismissed, router]);

  return (
    <div className={styles.container}>
      <Onboarding displayName="Satoshi" onDismiss={() => setDismissed(true)} />
    </div>
  );
}
