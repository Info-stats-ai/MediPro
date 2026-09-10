import { ArrowRight, FileCheck2, LockKeyhole, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { DocumentList } from "@/components/document-list";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Clinical workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink md:text-4xl">Your documents</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">Create clinician-ready structure and plain-language patient guidance from authorized clinical documentation.</p>
        </div>
        <Link href="/new" className="btn-primary w-full px-5 py-3 sm:w-fit"><Plus className="size-4" aria-hidden="true" />New document</Link>
      </section>

      <section className="relative isolate overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-xl shadow-ink/10 md:p-8 lg:p-10">
        <div className="absolute -right-24 -top-32 -z-10 size-80 rounded-full bg-sage-500/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 -z-10 size-56 rounded-full bg-coral/10 blur-3xl" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10"><Sparkles className="size-5 text-[#B8E0D0]" aria-hidden="true" /></div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl">Make the next conversation clearer.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">Paste encounter text or upload a PDF, review the generated clinical view, then prepare a patient-friendly explanation.</p>
            <Link href="/new" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#B8E0D0] transition hover:text-white">Start a document <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><FileCheck2 className="mt-0.5 size-5 shrink-0 text-[#B8E0D0]" aria-hidden="true" /><div><p className="text-sm font-semibold">Clinician review built in</p><p className="mt-1 text-xs leading-5 text-slate-300">Verify and edit generated content before use or sharing.</p></div></div>
            <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#B8E0D0]" aria-hidden="true" /><div><p className="text-sm font-semibold">Organization-scoped access</p><p className="mt-1 text-xs leading-5 text-slate-300">Documents are shown only within your authenticated workspace.</p></div></div>
          </div>
        </div>
      </section>

      <DocumentList limit={4} />
    </div>
  );
}
