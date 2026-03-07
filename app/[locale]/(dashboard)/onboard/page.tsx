"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import styles from "./onboard.module.scss";

type Step = "role" | "sponsor" | "kid" | "done";

export default function OnboardPage() {
  const router = useRouter();
  const t = useTranslations();
  const [step, setStep] = useState<Step>("role");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [createdInviteCode, setCreatedInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingFamilies, setCheckingFamilies] = useState(true);

  // If user already has families, skip to dashboard
  useEffect(() => {
    const alreadyOnboarded = localStorage.getItem("bitbybit_onboard_role");
    if (alreadyOnboarded) {
      router.replace("/dashboard");
      return;
    }

    async function checkFamilies() {
      try {
        const res = await fetch("/api/families");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) {
            localStorage.setItem("bitbybit_onboard_role", "existing");
            router.replace("/dashboard");
            return;
          }
        }
      } catch {
        // Continue with onboarding
      }
      setCheckingFamilies(false);
    }

    checkFamilies();
  }, [router]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName }),
      });

      const data = await res.json();

      if (data.success) {
        setCreatedInviteCode(data.data.invite_code);
        localStorage.setItem("bitbybit_onboard_role", "sponsor");
        setStep("done");
      } else {
        setError(data.error);
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/families/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode, role: "kid" }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("bitbybit_onboard_role", "kid");
        setStep("done");
      } else {
        setError(data.error);
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  if (checkingFamilies) {
    return (
      <div className={styles.container}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {step === "role" && (
          <>
            <h1 className={styles.title}>{t("common.appName")}</h1>
            <p className={styles.subtitle}>{t("onboarding.postReg.chooseRole")}</p>
            <div className={styles.roleCards}>
              <div
                className={styles.roleCard}
                onClick={() => setStep("sponsor")}
              >
                <div className={styles.roleEmoji}>🛡️</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmSponsor")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.sponsorDesc")}</div>
              </div>
              <div
                className={styles.roleCard}
                onClick={() => setStep("kid")}
              >
                <div className={styles.roleEmoji}>⚡</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmKid")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.kidDesc")}</div>
              </div>
            </div>
          </>
        )}

        {step === "sponsor" && (
          <>
            <h1 className={styles.title}>{t("onboarding.postReg.createYourFamily")}</h1>
            <p className={styles.subtitle}>{t("family.familyName")}</p>
            <form onSubmit={handleCreateFamily} className={styles.form}>
              <div className={styles.field}>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder={t("family.familyName")}
                  required
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading || !familyName.trim()}
              >
                {loading ? t("common.loading") : t("family.createFamily")}
              </button>
            </form>
          </>
        )}

        {step === "kid" && (
          <>
            <h1 className={styles.title}>{t("onboarding.postReg.joinAFamily")}</h1>
            <p className={styles.subtitle}>{t("onboarding.postReg.enterCode")}</p>
            <form onSubmit={handleJoinFamily} className={styles.form}>
              <div className={styles.field}>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t("family.inviteCode")}
                  required
                  maxLength={6}
                  style={{ textAlign: "center", letterSpacing: "0.15em", fontSize: "1.25rem" }}
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? t("common.loading") : t("family.join")}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className={styles.successSection}>
            <div className={styles.successEmoji}>🎉</div>
            <h1 className={styles.title}>{t("onboarding.postReg.allSet")}</h1>
            <p className={styles.subtitle}>{t("onboarding.postReg.allSetDesc")}</p>
            {createdInviteCode && (
              <div className={styles.inviteCodeDisplay}>
                <p>{t("onboarding.postReg.shareCode")}</p>
                <code>{createdInviteCode}</code>
              </div>
            )}
            <button
              className={styles.submitButton}
              onClick={() => router.push("/dashboard")}
            >
              {t("onboarding.postReg.goToDashboard")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
