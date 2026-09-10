"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, type ReactNode } from "react";

type GetToken = () => Promise<string | null>;
const previewGetToken: GetToken = async () => null;
const TokenContext = createContext<GetToken>(previewGetToken);

function AuthTokenBridge({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const tokenGetter = useCallback(() => getToken(), [getToken]);
  return <TokenContext.Provider value={tokenGetter}>{children}</TokenContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <TokenContext.Provider value={previewGetToken}>{children}</TokenContext.Provider>;
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AuthTokenBridge>{children}</AuthTokenBridge>
    </ClerkProvider>
  );
}

export function useToken() {
  return useContext(TokenContext);
}
