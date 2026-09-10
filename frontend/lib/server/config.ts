import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal("").transform(() => undefined));

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DATABASE: z.string().min(1).default("medinotes"),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
  MAX_NOTE_CHARS: z.coerce.number().int().positive().default(250_000),
  RATE_LIMIT_REQUESTS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  OCR_WEBHOOK_URL: optionalUrl,
  OCR_WEBHOOK_TOKEN: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT_URL: optionalUrl,
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  ADMIN_USER_IDS: z.string().default("")
});

let cached: z.infer<typeof schema> | undefined;

export function config() {
  cached ??= schema.parse(process.env);
  return cached;
}

export function adminIds() {
  return new Set(config().ADMIN_USER_IDS.split(",").map((id) => id.trim()).filter(Boolean));
}
