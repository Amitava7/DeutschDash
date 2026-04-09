import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function handleApiError(error: unknown): NextResponse | null {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    console.error("Database error:", error.message);
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 }
    );
  }
  return null;
}
