"use client";

import { AlertCircle, AlertTriangle, ArrowLeft, Check, CheckCircle2, Clipboard, Edit3, HeartHandshake, Loader2, Pill, Plus, Printer, RefreshCw, Save, Stethoscope, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ClinicalNote, type DocumentDetail } from "@/lib/api";
import { useToken } from "@/components/providers";

function Section({ title, icon: Icon, children, tone = "default" }: { title: string; icon: typeof Stethoscope; children: React.ReactNode; tone?: "default" | "warm" | "urgent" }) {
  const tones = { default: "bg-white border-slate-200", warm: "bg-[#FFFCF8] border-orange-100", urgent: "bg-red-50 border-red-200" };
  return <section className={`print-break-avoid rounded-2xl border p-5 md:p-6 ${tones[tone]}`}><div className="mb-4 flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-lg ${tone === "urgent" ? "bg-red-100 text-red-700" : "bg-sage-100 text-sage-700"}`}><Icon className="size-4" /></span><h2 className="font-bold text-ink">{title}</h2></div>{children}</section>;
}

function EditableText({ value, onChange, multiline = true }: { value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = "field border-sage-200 bg-sage-50/60 text-slate-700";
  return multiline ? <textarea className={className} value={value} onChange={(e) => onChange(e.target.value)} rows={4} /> : <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function EditableList({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  return <div className="space-y-2">{values.map((item, index) => <div key={index} className="flex items-center gap-2"><EditableText multiline={false} value={item} onChange={(value) => onChange(values.map((current, i) => i === index ? value : current))} /><button type="button" onClick={() => onChange(values.filter((_, i) => i !== index))} className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label={`Remove item ${index + 1}`}><Trash2 className="size-4" /></button></div>)}<button type="button" onClick={() => onChange([...values, ""])} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-sage-700 hover:bg-sage-50"><Plus className="size-4" />Add item</button></div>;
}

function ClinicianView({ note, editing, setNote }: { note: ClinicalNote; editing: boolean; setNote: (note: ClinicalNote) => void }) {
  const field = (key: keyof ClinicalNote, value: string | string[]) => setNote({ ...note, [key]: value });
  return <div className="grid gap-4 xl:grid-cols-2">
    <Section title="Chief complaint" icon={Stethoscope}><Content editing={editing} value={note.chiefComplaint} onChange={(v) => field("chiefComplaint", v)} /></Section>
    <Section title="History of present illness" icon={Clipboard}><Content editing={editing} value={note.hpi} onChange={(v) => field("hpi", v)} /></Section>
    <Section title="Assessment" icon={CheckCircle2}><ListContent editing={editing} values={note.assessment} onChange={(v) => field("assessment", v)} /></Section>
    <Section title="Plan" icon={Check}><ListContent editing={editing} values={note.plan} onChange={(v) => field("plan", v)} /></Section>
    <Section title="Medications" icon={Pill}><ListContent editing={editing} values={note.medications} onChange={(v) => field("medications", v)} /></Section>
    <Section title="Follow-up" icon={RefreshCw}><Content editing={editing} value={note.followUp} onChange={(v) => field("followUp", v)} /></Section>
  </div>;
}

function Content({ editing, value, onChange }: { editing: boolean; value: string; onChange: (value: string) => void }) {
  return editing ? <EditableText value={value} onChange={onChange} /> : value ? <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{value}</p> : <p className="text-sm italic text-slate-400">No content was generated for this section.</p>;
}

function ListContent({ editing, values, onChange }: { editing: boolean; values: string[]; onChange: (value: string[]) => void }) {
  return editing ? <EditableList values={values} onChange={onChange} /> : values.length ? <ul className="space-y-2.5">{values.map((value, index) => <li key={`${value}-${index}`} className="flex gap-2.5 text-sm leading-6 text-slate-600"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage-500" />{value}</li>)}</ul> : <p className="text-sm italic text-slate-400">No content was generated for this section.</p>;
}

function PatientView({ detail }: { detail: DocumentDetail }) {
  const [checked, setChecked] = useState<boolean[]>(detail.patientView.teachBack.map(() => false));
  return <div className="patient-handout mx-auto max-w-4xl space-y-4">
    <div className="hidden border-b-2 border-sage-600 pb-4 print:block"><p className="text-2xl font-bold text-ink">Your visit, explained</p><p className="text-sm text-slate-500">{detail.encounterDate} · MediNotes patient handout</p></div>
    <Section title="What we talked about" icon={HeartHandshake} tone="warm">{detail.patientView.summary ? <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{detail.patientView.summary}</p> : <p className="text-sm italic text-slate-400">No patient summary is available.</p>}</Section>
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="What to do next" icon={CheckCircle2}>{detail.patientView.nextSteps.length ? <ol className="space-y-3">{detail.patientView.nextSteps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sage-100 text-xs font-bold text-sage-700">{index + 1}</span>{step}</li>)}</ol> : <p className="text-sm italic text-slate-400">No next steps are available.</p>}</Section>
      <Section title="Your medicines" icon={Pill}>{detail.patientView.medications.length ? <ul className="space-y-3">{detail.patientView.medications.map((medication, index) => <li key={`${medication}-${index}`} className="flex gap-2.5 text-sm leading-6 text-slate-700"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage-500" />{medication}</li>)}</ul> : <p className="text-sm italic text-slate-400">No medicines are listed in this handout.</p>}</Section>
    </div>
    {detail.patientView.urgentFlags.length > 0 && <Section title="When to get urgent help" icon={AlertTriangle} tone="urgent"><ul className="space-y-2">{detail.patientView.urgentFlags.map((flag, index) => <li key={`${flag}-${index}`} className="flex gap-2 text-sm font-medium leading-6 text-red-800"><span aria-hidden="true">•</span>{flag}</li>)}</ul></Section>}
    <section className="print-break-avoid overflow-hidden rounded-2xl border border-[#B9D6CA] bg-[#F0F8F4]">
      <div className="border-b border-[#CDE2D9] p-5 md:p-6"><p className="eyebrow">A MediNotes Pro exclusive</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-ink"><UserRound className="size-5 text-sage-600" />Teach-Back Check</h2><p className="mt-2 text-sm leading-6 text-slate-600">In your own words, answer these questions. This helps you and your care team know what needs another explanation.</p></div>
      <div className="space-y-3 p-5 md:p-6">{detail.patientView.teachBack.length ? detail.patientView.teachBack.map((question, index) => <label key={`${question}-${index}`} className="flex cursor-pointer gap-3 rounded-xl border border-transparent bg-white p-4 shadow-sm transition hover:border-sage-200"><input type="checkbox" checked={checked[index]} onChange={() => setChecked(checked.map((item, i) => i === index ? !item : item))} className="no-print mt-1 size-4 accent-[#39725E]" /><span className="hidden size-4 shrink-0 rounded border border-slate-500 print:block" /><span className={`text-sm leading-6 ${checked[index] ? "text-slate-400 line-through print:text-slate-700 print:no-underline" : "text-slate-700"}`}>{question}<span className="mt-5 hidden border-b border-slate-400 print:block" /></span></label>) : <p className="rounded-xl bg-white p-4 text-sm italic text-slate-400">No Teach-Back questions are available.</p>}</div>
    </section>
    <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Patient information notice:</strong> This handout is for education and does not replace medical advice from your clinician. Follow the plan your care team gave you. If you think you have an emergency, call your local emergency number.</p>
  </div>;
}

function toSoap(note: ClinicalNote) {
  return `S: ${note.chiefComplaint}\n\nHPI: ${note.hpi}\n\nA:\n${note.assessment.map((item) => `- ${item}`).join("\n")}\n\nP:\n${note.plan.map((item) => `- ${item}`).join("\n")}\n\nMEDICATIONS:\n${note.medications.map((item) => `- ${item}`).join("\n")}\n\nFOLLOW-UP: ${note.followUp}`;
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const getToken = useToken();
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [note, setNote] = useState<ClinicalNote | null>(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [requestKey, setRequestKey] = useState(0);
  const [view, setView] = useState<"clinician" | "patient">("clinician");
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoadError("");
    setDetail(null);
    setNote(null);
    api.getDocument(getToken, params.id)
      .then((data) => { setDetail(data); setNote(data.clinical); })
      .catch((error: Error) => setLoadError(error.message));
  }, [getToken, params.id, requestKey]);

  async function save() {
    if (!detail || !note) return;
    setActionError("");
    setWorking("Saving…");
    try {
      await api.updateClinical(getToken, detail.id, note);
      await api.streamProgress(getToken, detail.id, () => undefined);
      const updated = await api.getDocument(getToken, detail.id);
      setDetail(updated);
      setNote(updated.clinical);
      setEditing(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to save the document.");
    } finally { setWorking(""); }
  }

  async function regenerate() {
    if (!detail || !note) return;
    setActionError("");
    setWorking("Regenerating…");
    try {
      await api.updateClinical(getToken, detail.id, note);
      await api.streamProgress(getToken, detail.id, () => undefined);
      const updated = await api.getDocument(getToken, detail.id);
      setDetail(updated);
      setNote(updated.clinical);
      setEditing(false);
      setView("patient");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to regenerate the patient view.");
    } finally { setWorking(""); }
  }

  async function copySoap() {
    if (!note) return;
    setActionError("");
    try {
      await navigator.clipboard.writeText(toSoap(note));
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch {
      setActionError("The SOAP note could not be copied. Check browser clipboard permissions and try again.");
    }
  }

  if (loadError) {
    return <div className="card mx-auto max-w-xl p-8 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700"><AlertTriangle className="size-6" /></div><h1 className="mt-4 text-xl font-bold text-ink">Document unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-600">{loadError}</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={() => setRequestKey((key) => key + 1)} className="btn-primary"><RefreshCw className="size-4" />Try again</button><Link href="/" className="btn-secondary">Back to dashboard</Link></div></div>;
  }
  if (!detail || !note) {
    return <div className="grid min-h-[55vh] place-items-center" aria-live="polite" aria-busy="true"><div className="text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white shadow-soft"><Loader2 className="size-6 animate-spin text-sage-600" /></div><p className="mt-4 text-sm font-semibold text-ink">Opening secure document</p><p className="mt-1 text-xs text-slate-500">Loading the clinician and patient views…</p></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-4">
        <Link href="/" className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 hover:text-sage-700"><ArrowLeft className="size-4" />Back to dashboard</Link>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="eyebrow">{detail.patient}<span aria-hidden="true"> · </span>{detail.encounterDate}</span><span className={`status-badge ${detail.status === "ready" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" : detail.status === "processing" ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200" : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"}`}><span className="size-1.5 rounded-full bg-current" />{detail.status.replace("_", " ")}</span></div><h1 className="mt-2 break-words text-2xl font-bold tracking-[-.03em] text-ink md:text-3xl">{detail.title}</h1></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button onClick={copySoap} className="btn-secondary">{copied ? <Check className="size-4 text-sage-600" /> : <Clipboard className="size-4" />}{copied ? "Copied" : "Copy EHR / SOAP"}</button>
            <button onClick={() => window.print()} className="btn-secondary"><Printer className="size-4" />Print / Save PDF</button>
            {view === "clinician" && (editing ? <><button type="button" onClick={() => { setNote(detail.clinical); setEditing(false); setActionError(""); }} disabled={Boolean(working)} className="btn-secondary"><X className="size-4" />Cancel</button><button onClick={save} disabled={Boolean(working)} className="btn-primary">{working ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{working || "Save changes"}</button></> : <button onClick={() => setEditing(true)} className="btn-primary"><Edit3 className="size-4" />Edit note</button>)}
          </div>
        </div>
      </div>

      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Document view">
          <button role="tab" aria-selected={view === "clinician"} onClick={() => setView("clinician")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${view === "clinician" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}><Stethoscope className="size-4" />Clinician <span className="hidden sm:inline">View</span></button>
          <button role="tab" aria-selected={view === "patient"} onClick={() => { setView("patient"); setEditing(false); }} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${view === "patient" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-ink"}`}><HeartHandshake className="size-4" />Patient <span className="hidden sm:inline">View</span></button>
        </div>
        <button onClick={regenerate} disabled={Boolean(working)} className="btn-secondary border-0 shadow-none"><RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} />{working === "Regenerating…" ? working : "Regenerate patient view"}</button>
      </div>

      {actionError && <div role="alert" className="no-print flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><span className="flex gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" />{actionError}</span><button type="button" onClick={() => setActionError("")} className="rounded p-1 hover:bg-red-100" aria-label="Dismiss error"><X className="size-4" /></button></div>}

      <div className="print-sheet rounded-2xl border border-slate-200/80 bg-[#FCFDFC] p-3 shadow-soft sm:p-4 md:p-6">
        {view === "clinician" ? <ClinicianView note={note} editing={editing} setNote={setNote} /> : <PatientView detail={detail} />}
      </div>

      {view === "clinician" && <div className="no-print flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p><strong>Clinician review required.</strong> AI-generated content may contain errors or omissions. A licensed clinician must verify accuracy, clinical appropriateness, and patient-specific context before using or sharing this document.</p></div>}
    </div>
  );
}
