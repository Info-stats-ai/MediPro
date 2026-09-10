"use client";

import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Clipboard, Download, Edit3, HeartHandshake, Loader2, Pill, RefreshCw, Save, Stethoscope, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, MOCK_DETAIL, type ClinicalNote, type DocumentDetail } from "@/lib/api";
import { useToken } from "@/components/providers";

function Section({ title, icon: Icon, children, tone = "default" }: { title: string; icon: typeof Stethoscope; children: React.ReactNode; tone?: "default" | "warm" | "urgent" }) {
  const tones = { default: "bg-white border-slate-200", warm: "bg-[#FFFCF8] border-orange-100", urgent: "bg-red-50 border-red-200" };
  return <section className={`print-break-avoid rounded-2xl border p-5 md:p-6 ${tones[tone]}`}><div className="mb-4 flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-lg ${tone === "urgent" ? "bg-red-100 text-red-700" : "bg-sage-100 text-sage-700"}`}><Icon className="size-4" /></span><h2 className="font-bold text-ink">{title}</h2></div>{children}</section>;
}

function EditableText({ value, onChange, multiline = true }: { value: string; onChange: (value: string) => void; multiline?: boolean }) {
  const className = "w-full rounded-xl border border-sage-200 bg-sage-50/60 px-3 py-2.5 text-sm leading-6 text-slate-700 focus:bg-white";
  return multiline ? <textarea className={className} value={value} onChange={(e) => onChange(e.target.value)} rows={4} /> : <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function EditableList({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  return <div className="space-y-2">{values.map((item, index) => <div key={index} className="flex gap-2"><span className="mt-2.5 text-sage-600">•</span><EditableText multiline={false} value={item} onChange={(value) => onChange(values.map((current, i) => i === index ? value : current))} /></div>)}</div>;
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
  return editing ? <EditableText value={value} onChange={onChange} /> : <p className="text-sm leading-7 text-slate-600">{value}</p>;
}

function ListContent({ editing, values, onChange }: { editing: boolean; values: string[]; onChange: (value: string[]) => void }) {
  return editing ? <EditableList values={values} onChange={onChange} /> : <ul className="space-y-2.5">{values.map((value) => <li key={value} className="flex gap-2.5 text-sm leading-6 text-slate-600"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage-500" />{value}</li>)}</ul>;
}

function PatientView({ detail }: { detail: DocumentDetail }) {
  const [checked, setChecked] = useState<boolean[]>(detail.patientView.teachBack.map(() => false));
  return <div className="patient-handout mx-auto max-w-4xl space-y-4">
    <div className="hidden border-b-2 border-sage-600 pb-4 print:block"><p className="text-2xl font-bold text-ink">Your visit, explained</p><p className="text-sm text-slate-500">{detail.encounterDate} · MediNotes patient handout</p></div>
    <Section title="What we talked about" icon={HeartHandshake} tone="warm"><p className="text-[15px] leading-7 text-slate-700">{detail.patientView.summary}</p></Section>
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="What to do next" icon={CheckCircle2}><ol className="space-y-3">{detail.patientView.nextSteps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sage-100 text-xs font-bold text-sage-700">{index + 1}</span>{step}</li>)}</ol></Section>
      <Section title="Your medicines" icon={Pill}><ul className="space-y-3">{detail.patientView.medications.map((medication) => <li key={medication} className="flex gap-2.5 text-sm leading-6 text-slate-700"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-sage-500" />{medication}</li>)}</ul></Section>
    </div>
    {detail.patientView.urgentFlags.length > 0 && <Section title="When to get urgent help" icon={AlertTriangle} tone="urgent">{detail.patientView.urgentFlags.map((flag) => <p key={flag} className="text-sm font-medium leading-6 text-red-800">{flag}</p>)}</Section>}
    <section className="print-break-avoid overflow-hidden rounded-2xl border border-[#B9D6CA] bg-[#F0F8F4]">
      <div className="border-b border-[#CDE2D9] p-5 md:p-6"><p className="eyebrow">A MediNotes Pro exclusive</p><h2 className="mt-1 flex items-center gap-2 text-lg font-bold text-ink"><UserRound className="size-5 text-sage-600" />Teach-Back Check</h2><p className="mt-2 text-sm leading-6 text-slate-600">In your own words, answer these questions. This helps you and your care team know what needs another explanation.</p></div>
      <div className="space-y-3 p-5 md:p-6">{detail.patientView.teachBack.map((question, index) => <label key={question} className="flex cursor-pointer gap-3 rounded-xl bg-white p-4 shadow-sm"><input type="checkbox" checked={checked[index]} onChange={() => setChecked(checked.map((item, i) => i === index ? !item : item))} className="no-print mt-1 size-4 accent-[#39725E]" /><span className="hidden size-4 shrink-0 rounded border border-slate-500 print:block" /><span className={`text-sm leading-6 ${checked[index] ? "text-slate-400 line-through print:text-slate-700 print:no-underline" : "text-slate-700"}`}>{question}<span className="mt-5 hidden border-b border-slate-400 print:block" /></span></label>)}</div>
    </section>
    <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Patient information notice:</strong> This handout is for education and does not replace medical advice from your clinician. Follow the plan your care team gave you. If you think you have an emergency, call your local emergency number.</p>
  </div>;
}

function toSoap(note: ClinicalNote) {
  return `S: ${note.chiefComplaint}\n\nHPI: ${note.hpi}\n\nA:\n${note.assessment.map((item) => `- ${item}`).join("\n")}\n\nP:\n${note.plan.map((item) => `- ${item}`).join("\n")}\n\nMEDICATIONS:\n${note.medications.map((item) => `- ${item}`).join("\n")}\n\nFOLLOW-UP: ${note.followUp}`;
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const getToken = useToken();
  const [detail, setDetail] = useState<DocumentDetail>(MOCK_DETAIL);
  const [note, setNote] = useState<ClinicalNote>(MOCK_DETAIL.clinical);
  const [view, setView] = useState<"clinician" | "patient">("clinician");
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_URL) return;
    api.getDocument(getToken, params.id).then((data) => { setDetail(data); setNote(data.clinical); }).catch(() => undefined);
  }, [getToken, params.id]);

  async function save() {
    setWorking("Saving…");
    try {
      if (process.env.NEXT_PUBLIC_API_URL) {
        await api.updateClinical(getToken, detail.id, note);
        await api.streamProgress(getToken, detail.id, () => undefined);
        setDetail(await api.getDocument(getToken, detail.id));
      } else setDetail({ ...detail, clinical: note });
      setEditing(false);
    } finally { setWorking(""); }
  }

  async function regenerate() {
    setWorking("Regenerating…");
    try {
      if (process.env.NEXT_PUBLIC_API_URL) {
        await api.updateClinical(getToken, detail.id, note);
        await api.streamProgress(getToken, detail.id, () => undefined);
        setDetail(await api.getDocument(getToken, detail.id));
      } else await new Promise((resolve) => setTimeout(resolve, 700));
      setView("patient");
    } finally { setWorking(""); }
  }

  async function copySoap() {
    await navigator.clipboard.writeText(toSoap(note));
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-4">
        <Link href="/" className="flex w-fit items-center gap-2 text-xs font-semibold text-slate-500 hover:text-sage-700"><ArrowLeft className="size-4" />Back to dashboard</Link>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><span className="eyebrow">{detail.patient} · {detail.encounterDate}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Needs review</span></div><h1 className="mt-2 text-2xl font-bold tracking-tight text-ink md:text-3xl">{detail.title}</h1></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copySoap} className="btn-secondary">{copied ? <Check className="size-4 text-sage-600" /> : <Clipboard className="size-4" />}{copied ? "Copied" : "Copy EHR / SOAP"}</button>
            <button onClick={() => window.print()} className="btn-secondary"><Download className="size-4" />Export PDF / Print</button>
            {view === "clinician" && (editing ? <button onClick={save} disabled={Boolean(working)} className="btn-primary">{working ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save changes</button> : <button onClick={() => setEditing(true)} className="btn-primary"><Edit3 className="size-4" />Edit note</button>)}
          </div>
        </div>
      </div>

      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button onClick={() => setView("clinician")} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${view === "clinician" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}><Stethoscope className="size-4" />Clinician View</button>
          <button onClick={() => setView("patient")} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${view === "patient" ? "bg-white text-ink shadow-sm" : "text-slate-500"}`}><HeartHandshake className="size-4" />Patient View</button>
        </div>
        <button onClick={regenerate} disabled={Boolean(working)} className="btn-secondary border-0"><RefreshCw className={`size-4 ${working ? "animate-spin" : ""}`} />Regenerate patient version</button>
      </div>

      <div className="print-sheet rounded-2xl border border-slate-200/80 bg-[#FCFDFC] p-4 shadow-soft md:p-6">
        {view === "clinician" ? <ClinicianView note={note} editing={editing} setNote={setNote} /> : <PatientView detail={detail} />}
      </div>

      {view === "clinician" && <div className="no-print flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p><strong>Clinician review required.</strong> AI-generated content may contain errors or omissions. A licensed clinician must verify accuracy, clinical appropriateness, and patient-specific context before using or sharing this document.</p></div>}
    </div>
  );
}
