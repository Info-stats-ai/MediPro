import { ObjectId } from "mongodb";
import { z } from "zod";
import { db } from "./db";
import { HttpError } from "./http";
import type { ClinicalSummary, StoredDocument } from "./types";

const text = z.string().trim().min(1);
export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  text,
  patient_reference: z.string().trim().max(200).nullable().optional()
});

const stringList = z.array(z.string().trim().min(1).max(2_000)).max(100);
export const clinicalSchema = z.object({
  overview: z.string().trim().min(1).max(10_000),
  diagnoses: stringList,
  medications: stringList,
  plan: stringList,
  follow_up: stringList,
  urgent_flags: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    rationale: z.string().trim().min(1).max(500),
    severity: z.enum(["low", "medium", "high", "critical"])
  })).max(30),
  disclaimer: z.string().trim().min(1).max(1_000)
});

export const patientSchema = z.object({
  overview: z.string().trim().min(1).max(10_000),
  what_to_do: stringList,
  medications: stringList,
  when_to_seek_help: stringList,
  questions_for_clinician: stringList,
  disclaimer: z.string().trim().min(1).max(1_000)
});

export const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  patient_reference: z.string().trim().max(200).nullable().optional(),
  clinical_summary: clinicalSchema.optional()
}).strict().refine((value) => Object.keys(value).length > 0, "No changes supplied");

export function documentId(value: string) {
  if (!ObjectId.isValid(value)) throw new HttpError(404, "Document not found");
  return new ObjectId(value);
}

export async function ownedDocument(id: string, ownerId: string) {
  const document = await (await db()).collection<StoredDocument>("documents").findOne({
    _id: documentId(id),
    owner_id: ownerId
  });
  if (!document) throw new HttpError(404, "Document not found");
  return document;
}

export function serializeDocument(document: StoredDocument) {
  return {
    ...document,
    _id: undefined,
    id: document._id!.toHexString(),
    source_key: undefined,
    owner_id: undefined,
    edit_history: document.edit_history.map((entry) => ({
      ...entry,
      editor_user_id: "current_user"
    }))
  };
}

export function newDocument(
  ownerId: string,
  payload: z.infer<typeof createSchema>,
  sourceType: "text" | "pdf",
  sourceKey: string | null
): StoredDocument {
  const now = new Date();
  return {
    owner_id: ownerId,
    title: payload.title,
    text: payload.text,
    patient_reference: payload.patient_reference ?? null,
    source_type: sourceType,
    source_key: sourceKey,
    summary_status: "not_started",
    clinical_summary: null,
    patient_summary: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    edit_history: []
  };
}

export type ValidClinicalSummary = ClinicalSummary;
