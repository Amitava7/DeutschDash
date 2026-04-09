import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sessions = await prisma.practiceSession.findMany({
      where: { userId: session.user.id },
      select: { type: true, tense: true, score: true, totalQuestions: true },
    });

    const tenseSessions = sessions.filter((s) => s.type === "tense");
    const readingSessions = sessions.filter((s) => s.type === "reading");

    const avgScore = (arr: typeof sessions) => {
      const scored = arr.filter((s) => s.score != null && s.totalQuestions);
      if (!scored.length) return null;
      const pct = scored.reduce(
        (sum, s) => sum + s.score! / s.totalQuestions!,
        0
      );
      return Math.round((pct / scored.length) * 100);
    };

    const tenseBreakdown: Record<string, { sessions: number; avgScore: number | null }> = {};
    for (const s of tenseSessions) {
      const key = s.tense ?? "unknown";
      if (!tenseBreakdown[key]) tenseBreakdown[key] = { sessions: 0, avgScore: null };
      tenseBreakdown[key].sessions++;
    }
    for (const key of Object.keys(tenseBreakdown)) {
      tenseBreakdown[key].avgScore = avgScore(
        tenseSessions.filter((s) => (s.tense ?? "unknown") === key)
      );
    }

    return NextResponse.json({
      tense: {
        totalSessions: tenseSessions.length,
        avgScore: avgScore(tenseSessions),
        breakdown: tenseBreakdown,
      },
      reading: {
        totalSessions: readingSessions.length,
        avgScore: avgScore(readingSessions),
      },
    });
  } catch (error) {
    const dbResponse = handleApiError(error);
    if (dbResponse) return dbResponse;
    console.error("Practice stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
