"use client";

import { useState, useCallback } from "react";

interface ConfirmState {
  message: string;
  variant: "danger" | "default";
  resolve: (confirmed: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((message: string, variant: "danger" | "default" = "default"): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, variant, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return {
    confirm,
    confirmState: state,
    handleConfirm,
    handleCancel,
  };
}
