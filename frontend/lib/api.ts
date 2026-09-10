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

type TokenGetter = () => Promise<string | null>;

function apiBaseUrl() {
  if (process.env.NODE_ENV !== "development") return "";
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

async function request<T>(path: string, getToken: TokenGetter, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

const emptyClinical: ClinicalNote = {
  chiefComplaint: "",
  hpi: "",
  assessment: [],
  plan: [],
  medications: [],
  followUp: ""
};
const emptyPatient: PatientNote = {
  summary: "",
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
    } : emptyClinical,
    patientView: patient ? {
      summary: patient.overview,
      nextSteps: patient.what_to_do,
      medications: patient.medications,
      urgentFlags: patient.when_to_seek_help,
      teachBack: patient.questions_for_clinician
    } : emptyPatient
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
    return { id: created.id };
  },
  summarizeDocument(getToken: TokenGetter, id: string) {
    return request(`/api/documents/${encodeURIComponent(id)}/summarize`, getToken, { method: "POST" });
  },
  async updateClinical(getToken: TokenGetter, id: string, clinical: ClinicalNote) {
    const document = await request<ApiDocument>(`/api/documents/${encodeURIComponent(id)}`, getToken, {
      method: "PATCH", body: JSON.stringify({ clinical_summary: toApiClinical(clinical) })
    });
    return toDetail(document);
  },
  async streamProgress(getToken: TokenGetter, id: string, onProgress: (value: number, message: string) => void) {
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl()}/api/documents/${encodeURIComponent(id)}/stream`, {
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
