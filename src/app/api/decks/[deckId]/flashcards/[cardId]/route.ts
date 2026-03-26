import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ deckId: string; cardId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deckId, cardId } = await params;

  const card = await prisma.flashcard.findFirst({
    where: { id: cardId, deckId },
    include: { deck: true },
  });

  if (!card || card.deck.userId !== session.user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  await prisma.flashcard.delete({ where: { id: cardId } });
  return NextResponse.json({ success: true });
}
