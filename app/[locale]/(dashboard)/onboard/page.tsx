"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { BlockLoader } from "@/components/ui/block-loader";
import { FormInput, FormButton } from "@/components/ui/form";
import { resolveApiError } from "@/lib/error-messages";
import styles from "./onboard.module.scss";

type Step = "role" | "sponsor" | "kid" | "done";
type WalkthroughStep = 0 | 1 | 2 | 3;

interface WalkthroughTip {
  title: string;
  description: string;
  icon: string;
}

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
  const [chosenRole, setChosenRole] = useState<"sponsor" | "kid" | null>(null);
  const [walkthroughStep, setWalkthroughStep] = useState<WalkthroughStep>(0);

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
        setChosenRole("sponsor");
        setStep("done");
      } else {
        setError(resolveApiError(data.error, t));
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
        setChosenRole("kid");
        setStep("done");
      } else {
        setError(resolveApiError(data.error, t));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const sponsorTips: WalkthroughTip[] = [
    {
      title: t("onboarding.walkthrough.sponsorTip1Title"),
      description: t("onboarding.walkthrough.sponsorTip1Desc"),
      icon: "👨‍👩‍👧",
    },
    {
      title: t("onboarding.walkthrough.sponsorTip2Title"),
      description: t("onboarding.walkthrough.sponsorTip2Desc"),
      icon: "📝",
    },
    {
      title: t("onboarding.walkthrough.sponsorTip3Title"),
      description: t("onboarding.walkthrough.sponsorTip3Desc"),
      icon: "✅",
    },
  ];

  const kidTips: WalkthroughTip[] = [
    {
      title: t("onboarding.walkthrough.kidTip1Title"),
      description: t("onboarding.walkthrough.kidTip1Desc"),
      icon: "📋",
    },
    {
      title: t("onboarding.walkthrough.kidTip2Title"),
      description: t("onboarding.walkthrough.kidTip2Desc"),
      icon: "✅",
    },
    {
      title: t("onboarding.walkthrough.kidTip3Title"),
      description: t("onboarding.walkthrough.kidTip3Desc"),
      icon: "⚡",
    },
  ];

  const tips = chosenRole === "sponsor" ? sponsorTips : kidTips;

  const handleNextTip = () => {
    if (walkthroughStep < tips.length - 1) {
      setWalkthroughStep((walkthroughStep + 1) as WalkthroughStep);
    } else {
      router.push("/dashboard");
    }
  };

  if (checkingFamilies) {
    return <Container center><BlockLoader /></Container>;
  }

  return (
    <Container column>
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
              <button type="button" className={styles.roleCard} onClick={() => setStep("sponsor")}>
                <div className={styles.roleIcon}>🛡️</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmSponsor")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.sponsorDesc")}</div>
              </button>
              <button type="button" className={styles.roleCard} onClick={() => setStep("kid")}>
                <div className={styles.roleIcon}>⚡</div>
                <div className={styles.roleName}>{t("onboarding.postReg.iAmKid")}</div>
                <div className={styles.roleDesc}>{t("onboarding.postReg.kidDesc")}</div>
              </button>
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
              <FormInput
                id="family-name"
                value={familyName}
                onChange={(v) => setFamilyName(v)}
                placeholder={t("family.familyName")}
                required
              />
              {error && <p className={styles.error}>{error}</p>}
              <FormButton type="submit" loading={loading} loadingText={t("common.loading")} disabled={!familyName.trim()}>
                {t("family.createFamily")}
              </FormButton>
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
              <FormInput
                id="invite-code"
                value={inviteCode}
                onChange={(v) => setInviteCode(v.toUpperCase())}
                placeholder={t("family.inviteCode")}
                required
                maxLength={6}
                style={{ textAlign: "center", letterSpacing: "0.15em", fontSize: "1.25rem" }}
              />
              {error && <p className={styles.error}>{error}</p>}
              <FormButton type="submit" loading={loading} loadingText={t("common.loading")} disabled={!inviteCode.trim()}>
                {t("family.join")}
              </FormButton>
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

            {/* Walkthrough tips */}
            <div className={styles.walkthrough}>
              <h3 className={styles.walkthroughTitle}>
                {t("onboarding.walkthrough.title")}
              </h3>

              <div className={styles.tipCard}>
                <div className={styles.tipIcon}>{tips[walkthroughStep].icon}</div>
                <div className={styles.tipContent}>
                  <h4>{tips[walkthroughStep].title}</h4>
                  <p>{tips[walkthroughStep].description}</p>
                </div>
              </div>

              <div className={styles.tipDots}>
                {tips.map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.tipDot} ${i === walkthroughStep ? styles.tipDotActive : ""}`}
                  />
                ))}
              </div>

              <button className={styles.submitButton} onClick={handleNextTip}>
                {walkthroughStep < tips.length - 1
                  ? t("onboarding.walkthrough.next")
                  : t("onboarding.postReg.goToDashboard")}
              </button>

              {walkthroughStep < tips.length - 1 && (
                <button
                  className={styles.skipButton}
                  onClick={() => router.push("/dashboard")}
                >
                  {t("onboarding.walkthrough.skip")}
                </button>
              )}
            </div>
          </div>
        )}
      </Container>
  );
}
