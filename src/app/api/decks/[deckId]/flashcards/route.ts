import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;

  try {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, OR: [{ userId: { isSet: false } }, { userId: session.user.id }] },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { deckId },
      include: {
        userProgress: {
          where: { userId: session.user.id },
        },
      },
    });

    const result = flashcards
      .map((card) => {
        const progress = card.userProgress[0] ?? null;
        return {
          id: card.id,
          germanWord: card.germanWord,
          englishTranslation: card.englishTranslation,
          level: card.level,
          deckId: card.deckId,
          nextReviewDate: progress?.nextReviewDate ?? new Date(0),
          currentInterval: progress?.currentInterval ?? 0,
          easeLevel: progress?.easeLevel ?? 0,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
      );

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId } = await params;

  try {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: session.user.id },
    });

    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const { germanWord, englishTranslation } = await req.json();
    if (!germanWord || !englishTranslation) {
      return NextResponse.json({ error: "Both fields required" }, { status: 400 });
    }

    const card = await prisma.flashcard.create({
      data: { germanWord, englishTranslation, deckId },
    });

    return NextResponse.json(
      {
        id: card.id,
        germanWord: card.germanWord,
        englishTranslation: card.englishTranslation,
        level: card.level,
        deckId: card.deckId,
        nextReviewDate: new Date(),
        currentInterval: 0,
        easeLevel: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
