"use client";

import { AlertCircle, ArrowLeft, FileText, Loader2, LockKeyhole, Sparkles, Type, UploadCloud, X } from "lucide-react";
import Link from "next/link";
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
  const [dragging, setDragging] = useState(false);

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
    if (!title.trim()) {
      setError("Enter a document title to continue.");
      return;
    }
    if (mode === "text" && text.trim().length < 30) {
      setError("Add more clinical content before generating the document.");
      return;
    }
    if (mode === "pdf" && !file) {
      setError("Choose a PDF to continue.");
      return;
    }
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
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sage-700"><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</Link>
      <header className="max-w-3xl">
        <p className="eyebrow">New clinical document</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-.03em] text-ink md:text-4xl">Turn documentation into understanding</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 md:text-base">Add authorized encounter text or a PDF. Review is required before generated content is used or shared.</p>
      </header>
      <section className="card overflow-hidden" aria-labelledby="source-heading">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4 sm:p-6">
          <h2 id="source-heading" className="text-sm font-bold text-ink">Choose a source</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/60 p-1.5" role="tablist" aria-label="Document source">
            <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => { setMode("text"); setError(""); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "text" ? "bg-white text-sage-700 shadow-sm" : "text-slate-600 hover:bg-white/60 hover:text-ink"}`}><Type className="size-4" aria-hidden="true" />Paste text</button>
            <button type="button" role="tab" aria-selected={mode === "pdf"} onClick={() => { setMode("pdf"); setError(""); }} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "pdf" ? "bg-white text-sage-700 shadow-sm" : "text-slate-600 hover:bg-white/60 hover:text-ink"}`}><UploadCloud className="size-4" aria-hidden="true" />Upload PDF</button>
          </div>
        </div>
        <div className="p-5 sm:p-7 md:p-8">
          <label className="mb-6 block" htmlFor="document-title"><span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-ink">Document title <span className="text-xs font-normal text-slate-400">{title.length}/200</span></span><input id="document-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} maxLength={200} placeholder="Add a clear internal title" className="field" autoComplete="off" /></label>
          {mode === "text" ? (
            <label className="block" htmlFor="encounter-note"><span className="mb-2 block text-sm font-semibold text-ink">Encounter note</span><textarea id="encounter-note" value={text} onChange={(event) => { setText(event.target.value); setError(""); }} rows={14} placeholder="Paste authorized clinical documentation" className="field min-h-72 resize-y leading-6" /><span className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-400"><span>Use only content you are authorized to process.</span><span>{text.length.toLocaleString()} characters</span></span></label>
          ) : (
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }} className={`grid min-h-80 place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-sage-500 bg-sage-50" : "border-slate-200 bg-slate-50/70"}`}>
              {file ? <div className="max-w-md"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-sage-100 text-sage-700"><FileText className="size-7" aria-hidden="true" /></div><p className="mt-4 break-all font-semibold text-ink">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to upload</p><button type="button" onClick={() => setFile(null)} className="mx-auto mt-4 flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-coral hover:bg-red-50"><X className="size-3.5" aria-hidden="true" />Remove file</button></div> : <div><UploadCloud className="mx-auto size-9 text-sage-600" aria-hidden="true" /><p className="mt-4 font-semibold text-ink">Drop a PDF here</p><p className="mt-1 text-sm text-slate-500">PDF only · maximum file size 15 MB</p><button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary mt-5">Choose PDF</button></div>}
              <input ref={inputRef} type="file" accept="application/pdf" className="sr-only" aria-label="Choose PDF" onChange={(event) => chooseFile(event.target.files?.[0])} />
            </div>
          )}
          {error && <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{error}</p>}
          {busy && <div className="mt-5 rounded-2xl border border-sage-100 bg-sage-50 p-5" aria-live="polite" aria-busy="true"><div className="flex items-center justify-between gap-4 text-sm font-semibold text-sage-700"><span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" />{status}</span><span>{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-sage-100" role="progressbar" aria-label="Document processing progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-sage-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-500">Keep this page open while the secure workspace prepares both views.</p></div>}
          <div className="mt-7 flex flex-col gap-5 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex max-w-xl gap-3 text-xs leading-5 text-slate-500"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sage-50 text-sage-700"><LockKeyhole className="size-4" aria-hidden="true" /></span><p><strong className="block text-slate-700">Clinician review is required.</strong>AI output may contain errors or omissions and must not be relied on for diagnosis or treatment decisions.</p></div><button type="button" onClick={generate} disabled={busy || !title.trim() || (mode === "text" ? text.trim().length < 30 : !file)} className="btn-primary w-full shrink-0 px-6 py-3 sm:w-auto"><Sparkles className="size-4" aria-hidden="true" />{busy ? "Generating views…" : "Generate views"}</button></div>
        </div>
      </section>
    </div>
  );
}
