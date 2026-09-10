"use client";

import { AlertCircle, ArrowRight, Calendar, ChevronRight, FileText, RefreshCw, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, type ClinicalDocument } from "@/lib/api";
import { useToken } from "./providers";

const statusStyle = {
  ready: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  needs_review: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  processing: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
};

export function DocumentList({ limit }: { limit?: number }) {
  const getToken = useToken();
  const [query, setQuery] = useState("");
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      api.listDocuments(getToken, query)
        .then(setDocuments)
        .catch((cause: Error) => setError(cause.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [getToken, query, requestKey]);

  const visible = useMemo(() => {
    const term = query.toLowerCase();
    return documents.filter((doc) => `${doc.title} ${doc.patient}`.toLowerCase().includes(term)).slice(0, limit);
  }, [documents, query, limit]);

  return (
    <section className="card overflow-hidden" aria-labelledby="document-list-title">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div><h2 id="document-list-title" className="text-lg font-bold tracking-tight text-ink">{limit ? "Recent documents" : "All documents"}</h2><p className="mt-1 text-sm text-slate-500">Only records available to your organization are shown.</p></div>
        <label className="relative block md:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Search documents</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" className="field py-2.5 pl-9 pr-10" type="search" />
          {query && <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-ink" aria-label="Clear search"><X className="size-3.5" /></button>}
        </label>
      </div>
      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <div className="divide-y divide-slate-100" aria-label="Loading documents">
            {[0, 1, 2].map((item) => <div key={item} className="flex animate-pulse items-center gap-4 p-5 sm:p-6"><div className="size-11 rounded-xl bg-slate-100" /><div className="flex-1"><div className="h-3 w-2/5 rounded bg-slate-100" /><div className="mt-3 h-2.5 w-1/4 rounded bg-slate-100" /></div><div className="hidden h-6 w-24 rounded-full bg-slate-100 sm:block" /></div>)}
          </div>
        )}
        {!loading && error ? (
          <div className="grid min-h-64 place-items-center p-8 text-center"><div className="max-w-md"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700"><AlertCircle className="size-6" /></div><h3 className="mt-4 font-semibold text-ink">Unable to load documents</h3><p className="mt-2 text-sm leading-6 text-slate-600">{error}</p><button type="button" onClick={() => setRequestKey((key) => key + 1)} className="btn-secondary mt-5"><RefreshCw className="size-4" />Try again</button></div></div>
        ) : !loading && visible.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center"><div className="max-w-sm"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-sage-50 ring-1 ring-sage-100"><FileText className="size-6 text-sage-600" /></div><h3 className="font-semibold text-ink">{query ? "No matching documents" : "No documents yet"}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{query ? "Clear the search or use a different term." : "Create a document when you have authorized clinical content ready for review."}</p>{query ? <button type="button" className="btn-secondary mt-5" onClick={() => setQuery("")}><X className="size-4" />Clear search</button> : <Link className="btn-primary mt-5" href="/new"><Sparkles className="size-4" />Create document</Link>}</div></div>
        ) : !loading && (
          <ul className="divide-y divide-slate-100">
            {visible.map((doc) => (
              <li key={doc.id}><Link href={`/documents/${doc.id}`} className="group grid gap-3 p-5 transition duration-200 hover:bg-sage-50/60 sm:p-6 md:grid-cols-[minmax(0,1fr)_160px_140px_24px] md:items-center">
                <div className="flex min-w-0 items-start gap-3.5"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-sage-100 text-sage-700 ring-1 ring-inset ring-sage-500/10 transition group-hover:bg-sage-600 group-hover:text-white"><FileText className="size-5" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{doc.title}</p><p className="mt-1.5 truncate text-xs text-slate-500">{doc.patient}<span aria-hidden="true"> · </span>{doc.source === "pdf" ? "PDF upload" : "Pasted note"}</p></div></div>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="size-3.5" aria-hidden="true" />{doc.encounterDate}</span>
                <span className={`status-badge w-fit ${statusStyle[doc.status]}`}><span className="size-1.5 rounded-full bg-current" />{doc.status.replace("_", " ")}</span>
                <ChevronRight className="hidden size-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sage-600 sm:block" />
              </Link></li>
            ))}
          </ul>
        )}
      </div>
      {limit && !loading && !error && documents.length > visible.length && <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 text-right sm:px-6"><Link href="/history" className="inline-flex items-center gap-2 text-sm font-semibold text-sage-700 hover:text-sage-600">View document history <ArrowRight className="size-4" /></Link></div>}
    </section>
  );
}
