"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useSessionContext } from "@/lib/session-context";
import { Onboarding } from "@/components/dashboard/onboarding";
import styles from "../dashboard.module.scss";

export default function OnboardingPreview() {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const { session, isLoading, refreshSession } = useSessionContext();

  // Refresh session when dismissed, then redirect based on result
  useEffect(() => {
    if (dismissed) void refreshSession();
  }, [dismissed, refreshSession]);

  useEffect(() => {
    if (!dismissed || isLoading) return;
    router.push(session ? "/dashboard" : "/login");
  }, [dismissed, isLoading, session, router]);

  return (
    <div className={styles.container}>
      <Onboarding displayName="Satoshi" onDismiss={() => setDismissed(true)} />
    </div>
  );
}
