"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import FlipCard from "@/components/FlipCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Flashcard {
  id: string;
  germanWord: string;
  englishTranslation: string;
  nextReviewDate: string;
  currentInterval: number;
  easeLevel: number;
}

export default function ReviewPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/decks/${deckId}/flashcards`)
      .then((r) => r.json())
      .then((data: Flashcard[]) => {
        setCards(data);
        const now = new Date();
        const due = data.filter((c) => new Date(c.nextReviewDate) <= now);
        setDueCards(due);
        if (due.length === 0) setSessionDone(true);
        setLoading(false);
      });
  }, [deckId]);

  const handleRating = async (rating: "easy" | "hard") => {
    const card = dueCards[currentIndex];
    if (!card) return;

    const res = await fetch(
      `/api/decks/${deckId}/flashcards/${card.id}/review`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      }
    );

    if (!res.ok) {
      toast.error("Failed to save rating");
      return;
    }

    const updated = await res.json();

    if (rating === "hard") {
      // Re-queue at the end
      setDueCards((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        next.push({ ...card, ...updated });
        return next;
      });
      // currentIndex stays the same (next card slides in)
    } else {
      setDueCards((prev) => {
        const next = [...prev];
        next.splice(currentIndex, 1);
        return next;
      });
    }

    // Update cards state
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, ...updated } : c))
    );

    if (currentIndex >= dueCards.length - 1) {
      const remaining = rating === "hard" ? dueCards.length : dueCards.length - 1;
      if (remaining <= 0 || (rating !== "hard" && dueCards.length - 1 <= 0)) {
        setSessionDone(true);
      } else if (rating !== "hard") {
        setCurrentIndex(Math.max(0, dueCards.length - 2));
      }
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading cards...</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center space-y-4 py-16">
        <p className="text-lg font-medium">No cards in this deck yet.</p>
        <Link href={`/flashcards/${deckId}/manage`}>
          <Button>Add Cards</Button>
        </Link>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="text-center space-y-4 py-16">
        <div className="text-4xl">✓</div>
        <p className="text-xl font-semibold">All caught up!</p>
        <p className="text-muted-foreground">No cards due for review right now.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Link href={`/flashcards/${deckId}/manage`}>
            <Button>Manage Cards</Button>
          </Link>
        </div>
      </div>
    );
  }

  const current = dueCards[currentIndex];

  return (
    <div className="max-w-md mx-auto py-8 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <span className="text-sm text-muted-foreground">
          {dueCards.length} card{dueCards.length !== 1 ? "s" : ""} remaining
        </span>
      </div>

      {current && (
        <FlipCard
          germanWord={current.germanWord}
          englishTranslation={current.englishTranslation}
          easeLevel={current.easeLevel}
          onRating={handleRating}
          cardNumber={currentIndex + 1}
          totalCards={dueCards.length}
        />
      )}
    </div>
  );
}
