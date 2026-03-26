"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Flashcard {
  id: string;
  germanWord: string;
  englishTranslation: string;
  nextReviewDate: string;
  easeLevel: number;
  currentInterval: number;
}

export default function ManageDeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [german, setGerman] = useState("");
  const [english, setEnglish] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCards = async () => {
    const res = await fetch(`/api/decks/${deckId}/flashcards`);
    if (res.ok) setCards(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!german.trim() || !english.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/decks/${deckId}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ germanWord: german.trim(), englishTranslation: english.trim() }),
    });
    setAdding(false);
    if (res.ok) {
      setGerman("");
      setEnglish("");
      fetchCards();
      toast.success("Card added");
    } else {
      toast.error("Failed to add card");
    }
  };

  const deleteCard = async (id: string) => {
    const res = await fetch(`/api/decks/${deckId}/flashcards/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      toast.success("Card deleted");
    }
  };

  const isDue = (card: Flashcard) => new Date(card.nextReviewDate) <= new Date();

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage Cards</h1>
        <Link href={`/flashcards/${deckId}`}>
          <Button variant="outline" size="sm">Review Deck</Button>
        </Link>
      </div>

      <form onSubmit={addCard} className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-sm">Add New Card</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">German Word</Label>
            <Input
              value={german}
              onChange={(e) => setGerman(e.target.value)}
              placeholder="e.g. Haus"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">English Translation</Label>
            <Input
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="e.g. House"
              required
            />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={adding}>
          {adding ? "Adding..." : "Add Card"}
        </Button>
      </form>

      <div>
        <h2 className="font-semibold text-sm mb-3">
          {loading ? "Loading..." : `${cards.length} card${cards.length !== 1 ? "s" : ""}`}
        </h2>
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 border rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-medium">{card.germanWord}</span>
                <span className="text-muted-foreground text-sm">→</span>
                <span className="text-muted-foreground text-sm truncate">
                  {card.englishTranslation}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isDue(card) ? (
                  <Badge variant="destructive" className="text-xs">due</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    L{card.easeLevel}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                  onClick={() => deleteCard(card.id)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
