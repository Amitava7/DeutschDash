import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { parseJsonBody, validateStringLengths } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [body, parseError] = await parseJsonBody<{ tense?: string; level?: string }>(req);
  if (parseError) return parseError;

  const { tense, level } = body;
  if (!tense) {
    return NextResponse.json({ error: "Tense required" }, { status: 400 });
  }

  const lengthError = validateStringLengths(body, ["tense", "level"]);
  if (lengthError) return lengthError;

  const effectiveLevel = level || session.user.level || "B1";

  try {
    const allExercises = await prisma.tenseExercise.findMany({
      where: { tense, level: effectiveLevel },
    });

    if (allExercises.length === 0) {
      return NextResponse.json(
        { error: "No exercises found for this tense" },
        { status: 404 }
      );
    }

    const pastSessions = await prisma.practiceSession.findMany({
      where: { userId: session.user.id, type: "tense", tense },
      select: { data: true },
    });

    const doneIds = new Set<string>();
    for (const s of pastSessions) {
      const d = s.data as { exerciseIds?: string[] } | null;
      if (d?.exerciseIds) d.exerciseIds.forEach((id) => doneIds.add(id));
    }

    let available = allExercises.filter((ex) => !doneIds.has(ex.id));
    if (available.length === 0) available = allExercises;

    // Fisher-Yates shuffle for uniform randomness
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selected = shuffled.slice(0, 10);

    const exerciseIds = selected.map((ex) => ex.id);
    const questions = selected.map((ex) => ({
      sentence: ex.sentence,
      correct_answer: ex.correctAnswer,
      hint: ex.hint,
    }));

    await prisma.practiceSession.create({
      data: {
        type: "tense",
        tense,
        level: effectiveLevel,
        totalQuestions: questions.length,
        userId: session.user.id,
        data: { exerciseIds, questions } as unknown as import("@prisma/client").Prisma.JsonObject,
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    const dbResponse = handleApiError(error);
    if (dbResponse) return dbResponse;
    console.error("Tense practice error:", error);
    return NextResponse.json({ error: "Failed to load practice" }, { status: 500 });
  }
}
