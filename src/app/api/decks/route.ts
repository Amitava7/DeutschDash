import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { parseJsonBody, validateStringLengths } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decks = await prisma.deck.findMany({
      where: { userId: session.user.id },
      include: {
        flashcards: {
          select: {
            id: true,
            userProgress: {
              where: { userId: session.user.id },
              select: { nextReviewDate: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const decksWithStats = decks.map((deck) => ({
      ...deck,
      totalCards: deck.flashcards.length,
      dueCards: deck.flashcards.filter((c) => {
        const progress = c.userProgress[0];
        return !progress || new Date(progress.nextReviewDate) <= now;
      }).length,
      flashcards: undefined,
    }));

    return NextResponse.json(decksWithStats);
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [body, parseError] = await parseJsonBody<{ name?: string; description?: string }>(req);
  if (parseError) return parseError;

  const { name, description } = body;
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const lengthError = validateStringLengths(body, ["name", "description"]);
  if (lengthError) return lengthError;

  try {
    const deck = await prisma.deck.create({
      data: { name, description, userId: session.user.id },
    });

    return NextResponse.json(deck, { status: 201 });
  } catch (error) {
    return handleApiError(error) ?? NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
