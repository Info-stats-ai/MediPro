import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ownedDocument } from "@/lib/server/documents";
import { HttpError, jsonError, requireUserId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { summarize } from "@/lib/server/summarizer";
import type { StoredDocument } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:summarize");
    const document = await ownedDocument(params.id, userId);
    if (["clinical_processing", "patient_processing"].includes(document.summary_status)) {
      throw new HttpError(409, "Summary generation already in progress");
    }
    const collection = (await db()).collection<StoredDocument>("documents");
    await collection.updateOne(
      { _id: document._id, owner_id: userId },
      {
        $set: {
          summary_status: "clinical_processing",
          error_message: null,
          updated_at: new Date()
        }
      }
    );
    try {
      const result = await summarize(document.text, userId);
      await collection.updateOne(
        { _id: document._id, owner_id: userId },
        {
          $set: {
            clinical_summary: result.clinical,
            summary_status: "clinical_ready",
            updated_at: new Date()
          }
        }
      );
      await collection.updateOne(
        { _id: document._id, owner_id: userId },
        { $set: { summary_status: "patient_processing", updated_at: new Date() } }
      );
      await collection.updateOne(
        { _id: document._id, owner_id: userId },
        {
          $set: {
            patient_summary: result.patient,
            summary_status: "complete",
            updated_at: new Date()
          }
        }
      );
    } catch (error) {
      await collection.updateOne(
        { _id: document._id, owner_id: userId },
        { $set: { summary_status: "failed", error_message: "Summary generation failed", updated_at: new Date() } }
      );
      throw error;
    }
    return NextResponse.json(
      { document_id: params.id, status: "complete", stream_url: `/api/documents/${params.id}/stream` },
      { status: 202 }
    );
  } catch (error) {
    return jsonError(error);
  }
}
