import { NextResponse } from "next/server";

const MAX_STRING_LENGTHS: Record<string, number> = {
  name: 100,
  description: 500,
  germanWord: 200,
  englishTranslation: 200,
  topic: 100,
  tense: 50,
  level: 10,
  rating: 10,
  sessionId: 100,
};

/**
 * Safely parse JSON body from a request with try-catch.
 * Returns [parsedBody, null] on success or [null, errorResponse] on failure.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  req: Request
): Promise<[T, null] | [null, NextResponse]> {
  try {
    const body = await req.json();
    return [body as T, null];
  } catch {
    return [null, NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })];
  }
}

/**
 * Validate that all string fields in the body are within allowed lengths.
 * Returns an error response if any field exceeds its limit, or null if valid.
 */
export function validateStringLengths(
  body: Record<string, unknown> | object,
  fields: string[]
): NextResponse | null {
  for (const field of fields) {
    const value = (body as Record<string, unknown>)[field];
    if (typeof value !== "string") continue;
    const max = MAX_STRING_LENGTHS[field] ?? 200;
    if (value.length > max) {
      return NextResponse.json(
        { error: `${field} must be at most ${max} characters` },
        { status: 400 }
      );
    }
  }
  return null;
}
