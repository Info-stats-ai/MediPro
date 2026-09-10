"use client";

import { SignUp } from "@clerk/nextjs";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="mx-auto grid min-h-[72vh] max-w-5xl items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_auto]">
      <section className="hidden max-w-lg lg:block">
        <div className="grid size-12 place-items-center rounded-2xl bg-sage-100 text-sage-700"><LockKeyhole className="size-6" /></div>
        <p className="eyebrow mt-6">Secure clinical workspace</p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-.04em] text-ink">Create your MediNotes Pro account</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">Use an authorized organizational identity to set up protected access.</p>
        <div className="mt-8 flex gap-3 rounded-2xl border border-sage-100 bg-sage-50 p-4 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-sage-600" /><p>Do not enter patient information during account creation.</p></div>
      </section>
      <div className="flex justify-center"><SignUp /></div>
    </div>
  );
}
