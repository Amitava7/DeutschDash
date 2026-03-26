import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTensePractice } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tense, level } = await req.json();
  if (!tense) {
    return NextResponse.json({ error: "Tense required" }, { status: 400 });
  }

  const effectiveLevel = level || session.user.level || "B1";

  try {
    const questions = await generateTensePractice(tense, effectiveLevel);

    // Save session record
    await prisma.practiceSession.create({
      data: {
        type: "tense",
        tense,
        level: effectiveLevel,
        totalQuestions: questions.length,
        userId: session.user.id,
        data: questions as unknown as import("@prisma/client").Prisma.JsonArray,
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json({ error: "Failed to generate practice" }, { status: 500 });
  }
}
