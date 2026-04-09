import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function FlashcardsIndexPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const deck = await prisma.deck.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (deck) {
    redirect(`/flashcards/${deck.id}`);
  }

  return (
    <div className="text-center space-y-4 py-16">
      <p className="text-lg font-medium">You have no decks yet.</p>
      <Link href="/dashboard">
        <Button>Go to Dashboard to create a deck</Button>
      </Link>
    </div>
  );
}
