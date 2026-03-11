"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Navbar from "@/components/layout/navbar";
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

  useEffect(() => {
    async function checkFamilies() {
      try {
        const res = await fetch("/api/families");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) {
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
    return <div className={styles.loading}><p>{t("common.loading")}</p></div>;
  }

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        {step === "role" && (
          <>
            <div className={styles.header}>
              <h1 className={styles.title}>
                <span>{t("onboarding.postReg.chooseRole")}</span>
              </h1>
              <p className={styles.subtitle}>{t("onboarding.postReg.chooseRoleDesc")}</p>
            </div>

            <div className={styles.rolesExplainer}>
              <div className={styles.roleExplain}>
                <div className={styles.explainIcon}>👨‍👩‍👧</div>
                <h4>Sponsor</h4>
                <p>{t("onboarding.postReg.sponsorDesc")}</p>
              </div>
              <div className={styles.roleExplain}>
                <div className={styles.explainIcon}>🧒</div>
                <h4>Kid</h4>
                <p>{t("onboarding.postReg.kidDesc")}</p>
              </div>
            </div>

            <div className={styles.roles}>
              <div className={styles.roleCard} onClick={() => setStep("sponsor")}>
                <div className={styles.roleIcon}>🛡️</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmSponsor")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.sponsorDesc")}</div>
              </div>
              <div className={styles.roleCard} onClick={() => setStep("kid")}>
                <div className={styles.roleIcon}>⚡</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmKid")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.kidDesc")}</div>
              </div>
            </div>
          </>
        )}

        {step === "sponsor" && (
          <div className={styles.formCard}>
            <button className={styles.backButton} onClick={() => setStep("role")}>
              ← {t("common.back")}
            </button>
            <h2 className={styles.formTitle}>{t("onboarding.postReg.createYourFamily")}</h2>
            <p className={styles.formSubtitle}>{t("family.familyName")}</p>
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
          </div>
        )}

        {step === "kid" && (
          <div className={styles.formCard}>
            <button className={styles.backButton} onClick={() => setStep("role")}>
              ← {t("common.back")}
            </button>
            <h2 className={styles.formTitle}>{t("onboarding.postReg.joinAFamily")}</h2>
            <p className={styles.formSubtitle}>{t("onboarding.postReg.enterCode")}</p>
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
          </div>
        )}

        {step === "done" && (
          <div className={styles.successCard}>
            <div className={styles.successEmoji}>🎉</div>
            <h2 className={styles.formTitle}>{t("onboarding.postReg.allSet")}</h2>
            <p className={styles.formSubtitle}>{t("onboarding.postReg.allSetDesc")}</p>
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
    </>
  );
}
