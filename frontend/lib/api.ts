export type DocumentStatus = "processing" | "ready" | "needs_review";

export interface ClinicalDocument {
  id: string;
  title: string;
  patient: string;
  encounterDate: string;
  updatedAt: string;
  status: DocumentStatus;
  source: "paste" | "pdf";
}

export interface ClinicalNote {
  chiefComplaint: string;
  hpi: string;
  assessment: string[];
  plan: string[];
  medications: string[];
  followUp: string;
}

export interface PatientNote {
  summary: string;
  nextSteps: string[];
  medications: string[];
  urgentFlags: string[];
  teachBack: string[];
}

export interface DocumentDetail extends ClinicalDocument {
  clinical: ClinicalNote;
  patientView: PatientNote;
}

interface ApiUrgentFlag {
  label: string;
  rationale: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface ApiClinicalSummary {
  overview: string;
  diagnoses: string[];
  medications: string[];
  plan: string[];
  follow_up: string[];
  urgent_flags: ApiUrgentFlag[];
  disclaimer: string;
}

interface ApiPatientSummary {
  overview: string;
  what_to_do: string[];
  medications: string[];
  when_to_seek_help: string[];
  questions_for_clinician: string[];
  disclaimer: string;
}

interface ApiDocument {
  id: string;
  title: string;
  patient_reference?: string | null;
  source_type: "text" | "pdf";
  summary_status: string;
  clinical_summary?: ApiClinicalSummary | null;
  patient_summary?: ApiPatientSummary | null;
  created_at: string;
  updated_at: string;
}

interface ApiDocumentList {
  items: ApiDocument[];
  total: number;
}

export const MOCK_DOCUMENTS: ClinicalDocument[] = [
  { id: "mn-1042", title: "Follow-up — persistent cough", patient: "Elena R.", encounterDate: "Sep 9, 2026", updatedAt: "12 min ago", status: "needs_review", source: "paste" },
  { id: "mn-1039", title: "Annual wellness visit", patient: "Marcus T.", encounterDate: "Sep 8, 2026", updatedAt: "Yesterday", status: "ready", source: "pdf" },
  { id: "mn-1035", title: "New onset lower back pain", patient: "Jordan K.", encounterDate: "Sep 6, 2026", updatedAt: "Sep 6", status: "ready", source: "paste" },
  { id: "mn-1031", title: "Diabetes medication review", patient: "Priya S.", encounterDate: "Sep 4, 2026", updatedAt: "Sep 4", status: "ready", source: "pdf" }
];

export const MOCK_DETAIL: DocumentDetail = {
  ...MOCK_DOCUMENTS[0],
  clinical: {
    chiefComplaint: "Persistent dry cough for approximately three weeks.",
    hpi: "42-year-old patient reports a nonproductive cough beginning after a viral upper respiratory illness. Symptoms are worse at night and with cold air. No fever, hemoptysis, dyspnea at rest, or known sick contacts. OTC dextromethorphan provides limited relief.",
    assessment: ["Post-viral cough, most likely", "Consider cough-variant asthma if symptoms persist", "No current evidence of bacterial pneumonia"],
    plan: ["Trial albuterol inhaler: 2 puffs every 4–6 hours as needed", "Hydration, humidified air, and honey at bedtime", "Chest radiograph if no improvement within 2 weeks"],
    medications: ["Albuterol HFA 90 mcg — 2 puffs PRN cough/wheeze", "Continue cetirizine 10 mg daily"],
    followUp: "Follow up in 2 weeks or sooner for worsening symptoms."
  },
  patientView: {
    summary: "Your cough most likely started with your recent cold and is taking longer than usual to settle down. Your lungs do not show signs of pneumonia today. Cold air and nighttime can make this kind of cough worse.",
    nextSteps: ["Use the new inhaler when your cough or wheezing is bothersome.", "Drink plenty of fluids. A humidifier or a spoonful of honey before bed may help.", "If you are not improving in 2 weeks, contact the clinic. We may order a chest X-ray."],
    medications: ["Albuterol inhaler: Take 2 puffs every 4–6 hours when needed. Ask the pharmacist to show you how to use it.", "Keep taking cetirizine 10 mg once each day."],
    urgentFlags: ["Get urgent help now for severe trouble breathing, blue lips, chest pain, fainting, or coughing up blood."],
    teachBack: ["What do you think is causing your cough?", "Show or explain how you will use your inhaler.", "When should you contact the clinic, and what symptoms mean you need urgent help?"]
  }
};

type TokenGetter = () => Promise<string | null>;

async function request<T>(path: string, getToken: TokenGetter, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

const fallbackClinical: ClinicalNote = {
  chiefComplaint: "",
  hpi: "Summary generation is still in progress.",
  assessment: [],
  plan: [],
  medications: [],
  followUp: ""
};
const fallbackPatient: PatientNote = {
  summary: "The patient explanation is still being generated.",
  nextSteps: [],
  medications: [],
  urgentFlags: [],
  teachBack: []
};

function toListItem(document: ApiDocument): ClinicalDocument {
  const updated = new Date(document.updated_at);
  return {
    id: document.id,
    title: document.title,
    patient: document.patient_reference || "Patient not specified",
    encounterDate: new Date(document.created_at).toLocaleDateString(),
    updatedAt: updated.toLocaleString(),
    status: document.summary_status === "complete" ? "ready" : document.summary_status === "failed" ? "needs_review" : "processing",
    source: document.source_type === "pdf" ? "pdf" : "paste"
  };
}

function toDetail(document: ApiDocument): DocumentDetail {
  const base = toListItem(document);
  const clinical = document.clinical_summary;
  const patient = document.patient_summary;
  return {
    ...base,
    clinical: clinical ? {
      chiefComplaint: document.title,
      hpi: clinical.overview,
      assessment: clinical.diagnoses,
      plan: clinical.plan,
      medications: clinical.medications,
      followUp: clinical.follow_up.join("\n")
    } : fallbackClinical,
    patientView: patient ? {
      summary: patient.overview,
      nextSteps: patient.what_to_do,
      medications: patient.medications,
      urgentFlags: patient.when_to_seek_help,
      teachBack: patient.questions_for_clinician
    } : fallbackPatient
  };
}

function toApiClinical(note: ClinicalNote): ApiClinicalSummary {
  return {
    overview: `${note.chiefComplaint}\n\n${note.hpi}`,
    diagnoses: note.assessment,
    medications: note.medications,
    plan: note.plan,
    follow_up: note.followUp.split("\n").filter(Boolean),
    urgent_flags: [],
    disclaimer: "AI-generated draft for clinician review. It may contain errors or omissions and does not replace professional medical judgment, diagnosis, or emergency care."
  };
}

export const api = {
  async listDocuments(getToken: TokenGetter, query = "") {
    const search = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
    const result = await request<ApiDocumentList>(`/api/documents${search}`, getToken);
    return result.items.map(toListItem);
  },
  async getDocument(getToken: TokenGetter, id: string) {
    return toDetail(await request<ApiDocument>(`/api/documents/${encodeURIComponent(id)}`, getToken));
  },
  async createDocument(getToken: TokenGetter, body: FormData | { title: string; text: string }) {
    const endpoint = body instanceof FormData ? "/api/documents/upload" : "/api/documents";
    const created = await request<ApiDocument>(endpoint, getToken, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
    await request(`/api/documents/${encodeURIComponent(created.id)}/summarize`, getToken, { method: "POST" });
    return { id: created.id };
  },
  async updateClinical(getToken: TokenGetter, id: string, clinical: ClinicalNote) {
    const document = await request<ApiDocument>(`/api/documents/${encodeURIComponent(id)}`, getToken, {
      method: "PATCH", body: JSON.stringify({ clinical_summary: toApiClinical(clinical) })
    });
    return toDetail(document);
  },
  async streamProgress(getToken: TokenGetter, id: string, onProgress: (value: number, message: string) => void) {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/documents/${encodeURIComponent(id)}/stream`, {
      headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });
    if (!response.ok || !response.body) throw new Error("Unable to connect to processing stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((item) => item.startsWith("data:"));
        if (!line) continue;
        const event = JSON.parse(line.slice(5)) as { event?: string; status?: string };
        const updates: Record<string, [number, string]> = {
          clinical_processing: [35, "Structuring the clinician note…"],
          clinical_ready: [70, "Clinical view ready…"],
          patient_processing: [85, "Writing the patient explanation…"],
          complete: [100, "Ready for clinician review"]
        };
        const update = updates[event.status ?? ""];
        if (update) onProgress(...update);
      }
    }
  }
};
