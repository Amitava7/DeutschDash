import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateReadingComprehension } from "@/lib/claude";
import { prisma } from "@/lib/prisma";

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
    const content = await generateReadingComprehension(topic, effectiveLevel);

    await prisma.practiceSession.create({
      data: {
        type: "reading",
        topic,
        level: effectiveLevel,
        totalQuestions: content.questions.length,
        userId: session.user.id,
        data: content as unknown as import("@prisma/client").Prisma.JsonObject,
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("Claude API error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
