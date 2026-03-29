"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WebLNProvider {
  name?: string;
  enable: () => Promise<void>;
  sendPayment: (paymentRequest: string) => Promise<{ preimage: string }>;
}

interface UseWebLNReturn {
  hasExtension: boolean;
  extensionName: string | null;
  sendPayment: (invoice: string) => Promise<{ preimage: string }>;
}

/**
 * Detects WebLN-compatible browser extensions (e.g., Alby)
 * and exposes payment capabilities.
 */
export function useWebLN(): UseWebLNReturn {
  const [hasExtension, setHasExtension] = useState(false);
  const [extensionName, setExtensionName] = useState<string | null>(null);
  const providerRef = useRef<WebLNProvider | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      const webln = (window as unknown as { webln?: WebLNProvider }).webln;
      if (webln) {
        providerRef.current = webln;
        setHasExtension(true);
        setExtensionName(webln.name ?? "WebLN");
      }
    };

    check();
    // Re-check after extensions have time to inject
    const timer = setTimeout(check, 500);
    return () => clearTimeout(timer);
  }, []);

  const sendPayment = useCallback(async (invoice: string): Promise<{ preimage: string }> => {
    const provider = providerRef.current;
    if (!provider) {
      throw new Error("No WebLN extension available");
    }
    await provider.enable();
    return provider.sendPayment(invoice);
  }, []);

  return { hasExtension, extensionName, sendPayment };
}
