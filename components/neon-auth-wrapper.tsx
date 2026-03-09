"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";

export function NeonAuthUIWrapper({ children }: { children: React.ReactNode }) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <NeonAuthUIProvider
      authClient={authClient as any}
      social={{ providers: ["google"] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
