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

export const api = {
  listDocuments: (getToken: TokenGetter, query = "") =>
    request<ClinicalDocument[]>(`/documents?q=${encodeURIComponent(query)}`, getToken),
  getDocument: (getToken: TokenGetter, id: string) =>
    request<DocumentDetail>(`/documents/${encodeURIComponent(id)}`, getToken),
  createDocument: (getToken: TokenGetter, body: FormData | { text: string }) =>
    request<{ id: string }>("/documents", getToken, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  updateClinical: (getToken: TokenGetter, id: string, clinical: ClinicalNote) =>
    request<DocumentDetail>(`/documents/${encodeURIComponent(id)}`, getToken, {
      method: "PATCH", body: JSON.stringify({ clinical })
    }),
  regeneratePatient: (getToken: TokenGetter, id: string) =>
    request<DocumentDetail>(`/documents/${encodeURIComponent(id)}/patient-view`, getToken, { method: "POST" }),
  async streamProgress(getToken: TokenGetter, id: string, onProgress: (value: number, message: string) => void) {
    const token = await getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/documents/${encodeURIComponent(id)}/events`, {
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
        const event = JSON.parse(line.slice(5)) as { progress: number; message: string };
        onProgress(event.progress, event.message);
      }
    }
  }
};
