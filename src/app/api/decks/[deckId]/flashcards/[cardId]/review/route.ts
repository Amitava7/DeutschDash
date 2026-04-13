import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/srs";
import { handleApiError } from "@/lib/api-error";
import { parseJsonBody } from "@/lib/validation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId, cardId } = await params;

  const [body, parseError] = await parseJsonBody<{ rating?: string }>(req);
  if (parseError) return parseError;

  const { rating } = body;

  if (rating !== "easy" && rating !== "hard") {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  try {
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, deckId },
      include: { deck: true },
    });

    if (!card || (card.deck.userId !== null && card.deck.userId !== session.user.id)) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const existing = await prisma.userCardProgress.findUnique({
      where: { userId_flashcardId: { userId: session.user.id, flashcardId: cardId } },
    });

    const { nextReviewDate, newInterval, newEaseLevel } = calculateNextReview(
      rating,
      existing?.currentInterval ?? 0,
      existing?.easeLevel ?? 0
    );

    const progress = await prisma.userCardProgress.upsert({
      where: { userId_flashcardId: { userId: session.user.id, flashcardId: cardId } },
      update: {
        nextReviewDate,
        currentInterval: newInterval,
        easeLevel: newEaseLevel,
        lastReviewedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        flashcardId: cardId,
        nextReviewDate,
        currentInterval: newInterval,
        easeLevel: newEaseLevel,
        lastReviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: card.id,
      germanWord: card.germanWord,
      englishTranslation: card.englishTranslation,
      nextReviewDate: progress.nextReviewDate,
      currentInterval: progress.currentInterval,
      easeLevel: progress.easeLevel,
    });
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
