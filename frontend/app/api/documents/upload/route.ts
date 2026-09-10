import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { createSchema, newDocument, serializeDocument } from "@/lib/server/documents";
import { db } from "@/lib/server/db";
import { extractPdf } from "@/lib/server/extraction";
import { HttpError, jsonError, requireUserId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { deleteRawFile, putRawFile } from "@/lib/server/storage";
import type { StoredDocument } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let sourceKey: string | null = null;
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:upload");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(422, "A PDF file is required");
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      throw new HttpError(415, "Only PDF uploads are supported");
    }
    if (file.size > config().MAX_UPLOAD_BYTES) {
      throw new HttpError(413, "PDF exceeds configured size limit");
    }
    const data = Buffer.from(await file.arrayBuffer());
    if (data.subarray(0, 4).toString() !== "%PDF") throw new HttpError(422, "File is not a valid PDF");
    const extracted = await extractPdf(data);
    if (extracted.length > config().MAX_NOTE_CHARS) {
      throw new HttpError(413, "Extracted note exceeds configured size limit");
    }
    const payload = createSchema.parse({
      title: form.get("title"),
      text: extracted,
      patient_reference: form.get("patient_reference") || null
    });
    const tenantKey = createHash("sha256").update(userId).digest("hex").slice(0, 24);
    sourceKey = await putRawFile(`${tenantKey}/${randomUUID()}.pdf`, data);
    const document = newDocument(userId, payload, "pdf", sourceKey);
    const result = await (await db()).collection<StoredDocument>("documents").insertOne(document);
    document._id = result.insertedId;
    return NextResponse.json(serializeDocument(document), { status: 201 });
  } catch (error) {
    await deleteRawFile(sourceKey).catch(() => undefined);
    return jsonError(error);
  }
}
