"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { createContext, useCallback, useContext, type ReactNode } from "react";

type GetToken = () => Promise<string | null>;
const TokenContext = createContext<GetToken>(async () => {
  throw new Error("Authentication provider is unavailable");
});

function AuthTokenBridge({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const tokenGetter = useCallback(() => getToken(), [getToken]);
  return <TokenContext.Provider value={tokenGetter}>{children}</TokenContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-12">
        <section className="card w-full max-w-lg overflow-hidden" role="alert">
          <div className="border-b border-amber-100 bg-amber-50/70 p-6 sm:p-8">
            <div className="grid size-12 place-items-center rounded-2xl bg-white text-amber-700 shadow-sm">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <p className="eyebrow mt-6 text-amber-700">Configuration required</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Secure sign-in is not available</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This workspace cannot open until authentication is configured. No clinical data has been loaded.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-ink">Administrator action needed</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Set <code className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold text-sage-700">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and restart the application.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
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
