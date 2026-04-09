import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topic, level } = await req.json();
  if (!topic) {
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  }

  const effectiveLevel = level || session.user.level || "B1";

  try {
    const allPassages = await prisma.readingPassage.findMany({
      where: { level: effectiveLevel },
    });

    if (allPassages.length === 0) {
      return NextResponse.json(
        { error: "No reading passages available. Please run the seed script." },
        { status: 404 }
      );
    }

    const pastSessions = await prisma.practiceSession.findMany({
      where: { userId: session.user.id, type: "reading" },
      select: { data: true },
    });

    const donePassageIds = new Set<string>();
    for (const s of pastSessions) {
      const d = s.data as { passageId?: string } | null;
      if (d?.passageId) donePassageIds.add(d.passageId);
    }

    const topicLower = topic.toLowerCase();
    const topicMatched = allPassages.filter((p) =>
      p.topic.toLowerCase().includes(topicLower) ||
      topicLower.includes(p.topic.toLowerCase())
    );

    let candidates = (topicMatched.length > 0 ? topicMatched : allPassages).filter(
      (p) => !donePassageIds.has(p.id)
    );
    if (candidates.length === 0) {
      candidates = allPassages.filter((p) => !donePassageIds.has(p.id));
    }
    if (candidates.length === 0) {
      candidates = topicMatched.length > 0 ? topicMatched : allPassages;
    }

    const passage = candidates[Math.floor(Math.random() * candidates.length)];

    const content = {
      topic: passage.topic,
      paragraph: passage.paragraph,
      questions: passage.questions,
    };

    await prisma.practiceSession.create({
      data: {
        type: "reading",
        topic: passage.topic,
        level: effectiveLevel,
        totalQuestions: (passage.questions as unknown[]).length,
        userId: session.user.id,
        data: { passageId: passage.id, ...content } as unknown as import("@prisma/client").Prisma.JsonObject,
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    const dbResponse = handleApiError(error);
    if (dbResponse) return dbResponse;
    console.error("Reading practice error:", error);
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}
