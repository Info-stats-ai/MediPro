import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/server/config";
import { createSchema, newDocument, serializeDocument } from "@/lib/server/documents";
import { db } from "@/lib/server/db";
import { HttpError, jsonError, requireUserId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import type { StoredDocument } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:create");
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new HttpError(400, "Request body must be valid JSON");
    }
    const payload = createSchema.parse(raw);
    if (payload.text.length > config().MAX_NOTE_CHARS) {
      throw new HttpError(413, "Note exceeds configured size limit");
    }
    const document = newDocument(userId, payload, "text", null);
    const result = await (await db()).collection<StoredDocument>("documents").insertOne(document);
    document._id = result.insertedId;
    return NextResponse.json(serializeDocument(document), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:list");
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("page_size") ?? 20) || 20));
    const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 100);
    const tenantFilter: Record<string, unknown> = { owner_id: userId };
    if (search) {
      const pattern = escapeRegex(search);
      tenantFilter.$or = [
        { title: { $regex: pattern, $options: "i" } },
        { text: { $regex: pattern, $options: "i" } }
      ];
    }
    const collection = (await db()).collection<StoredDocument>("documents");
    const [items, total] = await Promise.all([
      collection.find(tenantFilter).sort({ created_at: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      collection.countDocuments(tenantFilter)
    ]);
    return NextResponse.json({
      items: items.map(serializeDocument),
      page,
      page_size: pageSize,
      total,
      pages: total ? Math.ceil(total / pageSize) : 0
    });
  } catch (error) {
    return jsonError(error);
  }
}
