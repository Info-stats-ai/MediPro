"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <div className="card mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-bold text-ink">Authentication not configured</h1><p className="mt-2 text-sm text-slate-500">Add Clerk keys to enable secure sign-up. The app is currently in preview mode.</p><Link href="/" className="btn-primary mt-5">Return to dashboard</Link></div>;
  }
  return <div className="grid min-h-[70vh] place-items-center"><SignUp /></div>;
}
