import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ownedDocument, patchSchema, serializeDocument } from "@/lib/server/documents";
import { HttpError, jsonError, requireUserId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { deleteRawFile } from "@/lib/server/storage";
import { summarize } from "@/lib/server/summarizer";
import type { StoredDocument } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Context = { params: { id: string } };

export async function GET(_: NextRequest, { params }: Context) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:read");
    return NextResponse.json(serializeDocument(await ownedDocument(params.id, userId)));
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:update");
    const existing = await ownedDocument(params.id, userId);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new HttpError(400, "Request body must be valid JSON");
    }
    const changes = patchSchema.parse(raw);
    const collection = (await db()).collection<StoredDocument>("documents");
    const now = new Date();
    const set: Partial<StoredDocument> = { ...changes, updated_at: now };
    const update = changes.clinical_summary
      ? {
          $set: {
            ...set,
            patient_summary: null,
            summary_status: "patient_processing" as const,
            error_message: null
          },
          $push: {
            edit_history: {
              edited_at: now,
              editor_user_id: userId,
              previous_clinical_summary: existing.clinical_summary
            }
          }
        }
      : { $set: set };
    await collection.updateOne({ _id: existing._id, owner_id: userId }, update);

    if (changes.clinical_summary) {
      try {
        const result = await summarize(existing.text, userId, changes.clinical_summary);
        await collection.updateOne(
          { _id: existing._id, owner_id: userId },
          {
            $set: {
              clinical_summary: result.clinical,
              patient_summary: result.patient,
              summary_status: "complete",
              updated_at: new Date()
            }
          }
        );
      } catch (error) {
        await collection.updateOne(
          { _id: existing._id, owner_id: userId },
          { $set: { summary_status: "failed", error_message: "Summary generation failed", updated_at: new Date() } }
        );
        throw error;
      }
    }
    const updated = await collection.findOne({ _id: existing._id, owner_id: userId });
    if (!updated) throw new HttpError(404, "Document not found");
    return NextResponse.json(serializeDocument(updated));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:delete");
    const existing = await ownedDocument(params.id, userId);
    const result = await (await db()).collection<StoredDocument>("documents").deleteOne({
      _id: existing._id,
      owner_id: userId
    });
    if (!result.deletedCount) throw new HttpError(404, "Document not found");
    await deleteRawFile(existing.source_key);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}
