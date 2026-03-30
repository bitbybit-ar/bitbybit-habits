"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

interface CreateFamilyModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateFamilyModal({ onClose, onCreated }: CreateFamilyModalProps) {
  const t = useTranslations();
  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        onCreated();
      } else {
        setError(data.error || t("auth.connectionError"));
      }
    } catch {
      setError(t("auth.connectionError"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal onClose={onClose} size="sm" title={t("family.createFamily")}>
      <FormInput
        id="create-family-name"
        label={t("family.familyName")}
        value={familyName}
        onChange={setFamilyName}
        placeholder={t("family.familyName")}
        error={error || undefined}
      />
      <Button
        variant="primary"
        size="sm"
        onClick={handleCreate}
        disabled={creating || !familyName.trim()}
        style={{ marginTop: 16, width: "100%" }}
      >
        {creating ? t("common.loading") : t("family.createFamily")}
      </Button>
    </Modal>
  );
}
