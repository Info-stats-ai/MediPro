import type { ObjectId } from "mongodb";

export type SummaryStatus =
  | "not_started"
  | "clinical_processing"
  | "clinical_ready"
  | "patient_processing"
  | "complete"
  | "failed";

export interface UrgentFlag {
  label: string;
  rationale: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ClinicalSummary {
  overview: string;
  diagnoses: string[];
  medications: string[];
  plan: string[];
  follow_up: string[];
  urgent_flags: UrgentFlag[];
  disclaimer: string;
}

export interface PatientSummary {
  overview: string;
  what_to_do: string[];
  medications: string[];
  when_to_seek_help: string[];
  questions_for_clinician: string[];
  disclaimer: string;
}

export interface EditHistoryEntry {
  edited_at: Date;
  editor_user_id: string;
  previous_clinical_summary: ClinicalSummary | null;
}

export interface StoredDocument {
  _id?: ObjectId;
  owner_id: string;
  title: string;
  text: string;
  patient_reference: string | null;
  source_type: "text" | "pdf";
  source_key: string | null;
  summary_status: SummaryStatus;
  clinical_summary: ClinicalSummary | null;
  patient_summary: PatientSummary | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  edit_history: EditHistoryEntry[];
}
