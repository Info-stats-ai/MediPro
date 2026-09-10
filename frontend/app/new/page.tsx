"use client";

import { AlertCircle, Check, FileText, Loader2, Sparkles, Type, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { useToken } from "@/components/providers";

export default function NewDocumentPage() {
  const router = useRouter();
  const getToken = useToken();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"text" | "pdf">("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function chooseFile(selected?: File) {
    if (!selected) return;
    if (selected.type !== "application/pdf" || selected.size > 15 * 1024 * 1024) {
      setError("Choose a PDF smaller than 15 MB.");
      return;
    }
    setError("");
    setFile(selected);
  }

  async function generate() {
    if (!title.trim() || (mode === "text" && text.trim().length < 30) || (mode === "pdf" && !file)) return;
    setBusy(true); setError(""); setProgress(8); setStatus("Securing clinical content…");
    try {
      let body: FormData | { title: string; text: string };
      if (mode === "pdf") {
        body = new FormData();
        body.append("file", file!);
        body.append("title", title.trim());
      } else {
        body = { title: title.trim(), text };
      }
      const created = await api.createDocument(getToken, body);
      const id = created.id;
      const summary = api.summarizeDocument(getToken, id);
      await Promise.all([
        summary,
        api.streamProgress(getToken, id, (value, message) => { setProgress(value); setStatus(message); })
      ]);
      router.push(`/documents/${id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center"><p className="eyebrow">New clinical document</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Turn a note into understanding</h1><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">Add encounter text or a PDF. You&apos;ll review the clinical note before sharing anything with a patient.</p></div>
      <section className="card overflow-hidden">
        <div className="grid grid-cols-2 border-b border-slate-100 p-2">
          <button onClick={() => setMode("text")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "text" ? "bg-sage-100 text-sage-700" : "text-slate-500 hover:bg-slate-50"}`}><Type className="size-4" />Paste text</button>
          <button onClick={() => setMode("pdf")} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "pdf" ? "bg-sage-100 text-sage-700" : "text-slate-500 hover:bg-slate-50"}`}><UploadCloud className="size-4" />Upload PDF</button>
        </div>
        <div className="p-5 sm:p-7">
          <label className="mb-5 block"><span className="mb-2 block text-sm font-semibold text-ink">Document title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="e.g. Hypertension follow-up" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-sage-500 focus:bg-white" /></label>
          {mode === "text" ? (
            <label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Encounter note</span><textarea value={text} onChange={(event) => setText(event.target.value)} rows={14} placeholder="Paste the de-identified or authorized clinical note here…" className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 placeholder:text-slate-400 focus:border-sage-500 focus:bg-white" /><span className="mt-2 block text-right text-xs text-slate-400">{text.length.toLocaleString()} characters</span></label>
          ) : (
            <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className="grid min-h-80 place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              {file ? <div><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sage-100 text-sage-700"><FileText className="size-7" /></div><p className="mt-4 font-semibold text-ink">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload</p><button onClick={() => setFile(null)} className="mx-auto mt-4 flex items-center gap-1 text-xs font-semibold text-coral"><X className="size-3.5" />Remove</button></div> : <div><UploadCloud className="mx-auto size-9 text-sage-600" /><p className="mt-4 font-semibold text-ink">Drop your PDF here</p><p className="mt-1 text-sm text-slate-500">or choose a file · maximum 15 MB</p><button onClick={() => inputRef.current?.click()} className="btn-secondary mt-5">Choose PDF</button></div>}
              <input ref={inputRef} type="file" accept="application/pdf" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />
            </div>
          )}
          {error && <p role="alert" className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="size-4" />{error}</p>}
          {busy && <div className="mt-5 rounded-2xl bg-sage-50 p-4" aria-live="polite"><div className="flex items-center justify-between text-xs font-semibold text-sage-700"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{status}</span><span>{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-sage-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>}
          <div className="mt-6 flex flex-col-reverse gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex max-w-lg gap-2 text-xs leading-5 text-slate-500"><Check className="mt-0.5 size-4 shrink-0 text-sage-600" />AI output requires clinician review and approval. Do not rely on generated content for diagnosis or treatment decisions.</p><button onClick={generate} disabled={busy || !title.trim() || (mode === "text" ? text.trim().length < 30 : !file)} className="btn-primary shrink-0 px-6 py-3"><Sparkles className="size-4" />Generate views</button></div>
        </div>
      </section>
    </div>
  );
}
