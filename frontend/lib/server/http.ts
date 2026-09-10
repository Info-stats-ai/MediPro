import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireUserId(): string {
  const { userId } = auth();
  if (!userId) throw new HttpError(401, "Authentication required");
  return userId;
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { detail: "Invalid request", errors: error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  console.error("api_request_failed", {
    errorType: error instanceof Error ? error.name : "UnknownError"
  });
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}
