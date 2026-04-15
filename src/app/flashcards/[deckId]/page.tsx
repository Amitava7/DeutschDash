"use client";

import { useEffect, useState, useCallback, use } from "react";
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

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function ReviewPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [hardCards, setHardCards] = useState<Flashcard[]>([]);
  const [sessionPhase, setSessionPhase] = useState<"reviewing" | "summary" | "done">("reviewing");
  const [round, setRound] = useState(1);

  useEffect(() => {
    fetch(`/api/decks/${deckId}/flashcards`)
      .then((r) => r.json())
      .then((data: Flashcard[]) => {
        setCards(data);
        const now = new Date();
        const due = data.filter((c) => new Date(c.nextReviewDate) <= now);
        setDueCards(due);
        if (due.length === 0) setSessionPhase("done");
        setLoading(false);
      });
  }, [deckId]);

  const handleRating = useCallback(async (rating: "easy" | "hard") => {
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
      setHardCards((prev) => [...prev, { ...card, ...updated }]);
    }

    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, ...updated } : c))
    );

    const isLast = currentIndex >= dueCards.length - 1;
    if (isLast) {
      const totalHard = rating === "hard" ? hardCards.length + 1 : hardCards.length;
      if (totalHard > 0) {
        setSessionPhase("summary");
      } else {
        setSessionPhase("done");
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [dueCards, currentIndex, deckId, hardCards.length]);

  const handleRedoHard = useCallback(() => {
    const shuffled = shuffleArray(hardCards);
    setDueCards(shuffled);
    setHardCards([]);
    setCurrentIndex(0);
    setRound((prev) => prev + 1);
    setSessionPhase("reviewing");
  }, [hardCards]);

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

  if (sessionPhase === "done") {
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

  if (sessionPhase === "summary") {
    const easyCount = dueCards.length - hardCards.length;
    return (
      <div className="max-w-md mx-auto py-8 space-y-6 text-center">
        <div className="text-4xl">📋</div>
        <p className="text-xl font-semibold">Round {round} complete!</p>
        <div className="space-y-1 text-muted-foreground">
          <p>{easyCount} card{easyCount !== 1 ? "s" : ""} marked easy</p>
          <p>{hardCards.length} card{hardCards.length !== 1 ? "s" : ""} marked hard</p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={() => setSessionPhase("done")}>
            Finish
          </Button>
          <Button onClick={handleRedoHard}>
            Redo {hardCards.length} hard card{hardCards.length !== 1 ? "s" : ""}
          </Button>
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
          {round > 1 ? `Round ${round} · ` : ""}{currentIndex + 1} / {dueCards.length}
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
