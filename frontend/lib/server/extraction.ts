import pdfParse from "pdf-parse";
import { z } from "zod";
import { config } from "./config";
import { HttpError } from "./http";

const ocrResponseSchema = z.object({ text: z.string().trim().min(30) });

async function externalOcr(data: Buffer): Promise<string | null> {
  const settings = config();
  if (!settings.OCR_WEBHOOK_URL) return null;
  const response = await fetch(settings.OCR_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.OCR_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${settings.OCR_WEBHOOK_TOKEN}` }
        : {})
    },
    body: JSON.stringify({
      content_type: "application/pdf",
      document_base64: data.toString("base64")
    }),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store"
  });
  if (!response.ok) throw new HttpError(422, "The configured OCR provider could not extract this PDF");
  const parsed = ocrResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new HttpError(422, "The OCR provider returned no usable text");
  return parsed.data.text;
}

export async function extractPdf(data: Buffer) {
  let text = "";
  try {
    const result = await pdfParse(data);
    text = result.text.trim();
  } catch {
    throw new HttpError(422, "Invalid or unreadable PDF");
  }
  if (text.length >= 30) return text;

  const ocrText = await externalOcr(data);
  if (ocrText) return ocrText;
  throw new HttpError(
    422,
    "This PDF appears to be scanned and contains no extractable text. Configure OCR_WEBHOOK_URL or upload a text-based PDF."
  );
}
