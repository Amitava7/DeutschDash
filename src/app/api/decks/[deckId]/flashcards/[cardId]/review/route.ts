import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateNextReview } from "@/lib/srs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId, cardId } = await params;
  const { rating } = await req.json();

  if (rating !== "easy" && rating !== "hard") {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deckId },
    include: { deck: true },
  });

  if (!card || card.deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { nextReviewDate, newInterval, newEaseLevel } = calculateNextReview(
    rating,
    card.currentInterval,
    card.easeLevel
  );

  const updated = await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      nextReviewDate,
      currentInterval: newInterval,
      easeLevel: newEaseLevel,
    },
  });

  return NextResponse.json(updated);
}
