import { config } from "./config";
import { db } from "./db";
import { HttpError } from "./http";

interface RateLimitRow {
  user_id: string;
  action: string;
  window_start: Date;
  count: number;
  expires_at: Date;
}

export async function rateLimit(userId: string, action: string) {
  const settings = config();
  const windowMs = settings.RATE_LIMIT_WINDOW_SECONDS * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs * 2);
  const database = await db();
  const collection = database.collection<RateLimitRow>("rate_limits");

  const result = await collection.findOneAndUpdate(
    { user_id: userId, action, window_start: windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: { user_id: userId, action, window_start: windowStart, expires_at: expiresAt }
    },
    { upsert: true, returnDocument: "after" }
  );
  void collection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => undefined);
  void collection.createIndex(
    { user_id: 1, action: 1, window_start: 1 },
    { unique: true }
  ).catch(() => undefined);

  if (result && result.count > settings.RATE_LIMIT_REQUESTS) {
    throw new HttpError(429, "Rate limit exceeded. Please try again shortly.");
  }
}
