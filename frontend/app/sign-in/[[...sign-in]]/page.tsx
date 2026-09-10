"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <div className="grid min-h-[70vh] place-items-center"><SignIn /></div>;
}
