import { ArrowRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { DocumentList } from "@/components/document-list";

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Clinical workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink md:text-4xl">Your documents</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Turn clinical documentation into clear care guidance—without losing the clinical detail.</p></div>
        <Link href="/new" className="btn-primary w-fit px-5 py-3"><Plus className="size-4" />New document</Link>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-ink p-6 text-white shadow-soft md:p-8">
        <div className="absolute -right-16 -top-24 size-64 rounded-full bg-sage-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10"><Sparkles className="size-5 text-[#B8E0D0]" /></div><div><p className="font-bold">A clearer conversation starts here</p><p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">Paste a note or upload a PDF. MediNotes structures the clinical record and creates an empathetic, plain-language patient handout.</p></div></div><Link href="/new" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#B8E0D0]">Get started <ArrowRight className="size-4" /></Link></div>
      </section>

      <DocumentList limit={4} />
    </div>
  );
}
