"use client";

import { Calendar, ChevronRight, FileText, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, MOCK_DOCUMENTS, type ClinicalDocument } from "@/lib/api";
import { useToken } from "./providers";

const statusStyle = {
  ready: "bg-emerald-50 text-emerald-700",
  needs_review: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700"
};

export function DocumentList({ limit }: { limit?: number }) {
  const getToken = useToken();
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<ClinicalDocument[]>(MOCK_DOCUMENTS);
  const [loading, setLoading] = useState(Boolean(process.env.NEXT_PUBLIC_API_URL));

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_URL) return;
    const timer = setTimeout(() => {
      setLoading(true);
      api.listDocuments(getToken, query).then(setDocuments).catch(() => setDocuments(MOCK_DOCUMENTS)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [getToken, query]);

  const visible = useMemo(() => {
    const term = query.toLowerCase();
    return documents.filter((doc) => `${doc.title} ${doc.patient}`.toLowerCase().includes(term)).slice(0, limit);
  }, [documents, query, limit]);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold text-ink">{limit ? "Recent documents" : "All documents"}</h2><p className="mt-1 text-xs text-slate-500">Only records in your organization are shown.</p></div>
        <label className="relative block sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search documents</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient or note…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400" />
        </label>
      </div>
      <div aria-live="polite">
        {loading && <div className="h-1 animate-pulse bg-sage-500" />}
        {!loading && visible.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div><div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-sage-50"><FileText className="size-6 text-sage-600" /></div><h3 className="font-semibold text-ink">No documents found</h3><p className="mt-1 text-sm text-slate-500">Try another search or create your first clinical note.</p><Link className="btn-primary mt-5" href="/new"><Sparkles className="size-4" />Create document</Link></div></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((doc) => (
              <li key={doc.id}><Link href={`/documents/${doc.id}`} className="group grid gap-3 p-5 transition hover:bg-sage-50/50 sm:grid-cols-[1fr_150px_130px_24px] sm:items-center">
                <div className="flex min-w-0 items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage-100 text-sage-700"><FileText className="size-5" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{doc.title}</p><p className="mt-1 text-xs text-slate-500">{doc.patient} · {doc.source === "pdf" ? "PDF upload" : "Pasted note"}</p></div></div>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="size-3.5" />{doc.encounterDate}</span>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyle[doc.status]}`}>{doc.status.replace("_", " ")}</span>
                <ChevronRight className="hidden size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sage-600 sm:block" />
              </Link></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
