import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";

const STANDARD_DECK_SIZE = 20;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const globalDeck = await prisma.deck.findFirst({
      where: { isDefault: true, userId: { isSet: false } },
      include: { flashcards: { select: { germanWord: true, englishTranslation: true, level: true } } },
    });

    if (!globalDeck || globalDeck.flashcards.length === 0) {
      return NextResponse.json({ error: "No standard words available" }, { status: 404 });
    }

    const shuffled = [...globalDeck.flashcards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, STANDARD_DECK_SIZE);

    const deck = await prisma.deck.create({
      data: {
        name: "B1 Vocabulary",
        description: `${STANDARD_DECK_SIZE} standard B1 words`,
        userId: session.user.id,
        flashcards: {
          create: selected.map((w) => ({
            germanWord: w.germanWord,
            englishTranslation: w.englishTranslation,
            level: w.level,
          })),
        },
      },
    });

    return NextResponse.json(deck, { status: 201 });
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
