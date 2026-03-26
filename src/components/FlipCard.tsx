"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FlipCardProps {
  germanWord: string;
  englishTranslation: string;
  easeLevel: number;
  onRating: (rating: "easy" | "hard") => void;
  cardNumber: number;
  totalCards: number;
}

export default function FlipCard({
  germanWord,
  englishTranslation,
  easeLevel,
  onRating,
  cardNumber,
  totalCards,
}: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleRating = (rating: "easy" | "hard") => {
    setAnimating(true);
    setTimeout(() => {
      setFlipped(false);
      setAnimating(false);
      onRating(rating);
    }, 200);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm text-muted-foreground">
        {cardNumber} / {totalCards}
      </div>

      <div
        className="relative w-full max-w-md cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => !flipped && setFlipped(true)}
      >
        <div
          className={`relative w-full transition-transform duration-500 ${
            animating ? "scale-95 opacity-50" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.5s, opacity 0.2s, scale 0.2s",
          }}
        >
          {/* Front */}
          <div
            className="border rounded-xl p-10 bg-card text-card-foreground shadow-sm min-h-[200px] flex flex-col items-center justify-center gap-3"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest">German</p>
            <p className="text-4xl font-bold">{germanWord}</p>
            <p className="text-xs text-muted-foreground mt-4">Click to reveal translation</p>
            {easeLevel > 0 && (
              <Badge variant="outline" className="mt-2">
                Level {easeLevel}
              </Badge>
            )}
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 border rounded-xl p-10 bg-card text-card-foreground shadow-sm min-h-[200px] flex flex-col items-center justify-center gap-3"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest">English</p>
            <p className="text-4xl font-bold">{englishTranslation}</p>
            <p className="text-sm text-muted-foreground">{germanWord}</p>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex gap-3 mt-2">
          <Button
            variant="outline"
            className="w-28 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => handleRating("hard")}
          >
            Hard
          </Button>
          <Button
            className="w-28 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleRating("easy")}
          >
            Easy
          </Button>
        </div>
      )}

      {!flipped && (
        <Button variant="outline" onClick={() => setFlipped(true)}>
          Show Translation
        </Button>
      )}
    </div>
  );
}
