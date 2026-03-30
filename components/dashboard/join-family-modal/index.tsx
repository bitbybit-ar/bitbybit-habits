"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormButton } from "@/components/ui/form";
import { resolveApiError } from "@/lib/error-messages";

interface JoinFamilyModalProps {
  onClose: () => void;
  onJoined: () => void;
}

export function JoinFamilyModal({ onClose, onJoined }: JoinFamilyModalProps) {
  const t = useTranslations();
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/families/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: joinCode }),
      });
      const data = await res.json();
      if (data.success) {
        onJoined();
      } else {
        setError(resolveApiError(data.error, t));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setLoading(false);
    }
  }, [joinCode, t, onJoined]);

  return (
    <Modal onClose={onClose} size="sm" title={t("family.joinFamily")}>
      <form onSubmit={handleSubmit}>
        <FormInput
          id="join-code"
          label={t("family.enterInviteCode")}
          placeholder="ABC123"
          maxLength={6}
          value={joinCode}
          onChange={(v) => setJoinCode(v.toUpperCase())}
          error={error || undefined}
        />
        <FormButton
          type="submit"
          loading={loading}
          loadingText={t("common.loading")}
          disabled={!joinCode.trim()}
          style={{ marginTop: 16, width: "100%" }}
        >
          {t("family.join")}
        </FormButton>
      </form>
    </Modal>
  );
}
