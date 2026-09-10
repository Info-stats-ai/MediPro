import { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { documentId, ownedDocument } from "@/lib/server/documents";
import { jsonError, requireUserId } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import type { StoredDocument } from "@/lib/server/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const encoder = new TextEncoder();
const terminal = new Set(["complete", "failed"]);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = requireUserId();
    await rateLimit(userId, "documents:stream");
    const initial = await ownedDocument(params.id, userId);
    const id = documentId(params.id);
    const stream = new ReadableStream({
      async start(controller) {
        let status = initial.summary_status;
        controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify({ event: "status", status })}\n\n`));
        if (terminal.has(status)) {
          controller.close();
          return;
        }
        const deadline = Date.now() + 55_000;
        while (!request.signal.aborted && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 1_000));
          const current = await (await db()).collection<StoredDocument>("documents").findOne(
            { _id: id, owner_id: userId },
            { projection: { summary_status: 1 } }
          );
          if (!current) break;
          if (current.summary_status !== status) {
            status = current.summary_status;
            controller.enqueue(encoder.encode(
              `event: status\ndata: ${JSON.stringify({ event: "status", status })}\n\n`
            ));
          } else {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
          if (terminal.has(status)) break;
        }
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
