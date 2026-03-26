import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    include: {
      flashcards: {
        select: {
          id: true,
          nextReviewDate: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();
  const decksWithStats = decks.map((deck) => ({
    ...deck,
    totalCards: deck.flashcards.length,
    dueCards: deck.flashcards.filter((c) => new Date(c.nextReviewDate) <= now).length,
    flashcards: undefined,
  }));

  return NextResponse.json(decksWithStats);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const deck = await prisma.deck.create({
    data: { name, description, userId: session.user.id },
  });

  return NextResponse.json(deck, { status: 201 });
}
