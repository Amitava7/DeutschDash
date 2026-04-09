"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLevel } from "@/context/LevelContext";

interface Question {
  question: string;
  options: string[];
  correct_answer: string;
}

interface ReadingContent {
  topic: string;
  paragraph: string;
  questions: Question[];
}

export default function ReadingPage() {
  const { level } = useLevel();
  const [content, setContent] = useState<ReadingContent | null>(null);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<(string | null)[]>([]);

  const load = async () => {
    setLoading(true);
    setError("");
    setContent(null);
    setRevealed([]);
    setSelected([]);

    const res = await fetch("/api/practice/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "random", level }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to load content. Please try again.");
      return;
    }

    const data: ReadingContent = await res.json();
    setContent(data);
    setTopic(data.topic ?? "");
    setRevealed(new Array(data.questions.length).fill(false));
    setSelected(new Array(data.questions.length).fill(null));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleReveal = (i: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const selectOption = (qi: number, option: string) => {
    if (revealed[qi]) return;
    setSelected((prev) => {
      const next = [...prev];
      next[qi] = option;
      return next;
    });
    setRevealed((prev) => {
      const next = [...prev];
      next[qi] = true;
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reading Comprehension</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reading passages with comprehension questions · Level {level}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="text-muted-foreground text-sm animate-pulse">
          Loading your passage...
        </div>
      )}

      {content && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reading Pane */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Text</h2>
              <Badge variant="outline">{level}</Badge>
              {topic && <Badge variant="secondary">{topic}</Badge>}
            </div>
            <div className="border rounded-xl p-6 bg-card leading-relaxed text-sm">
              {content.paragraph.split("\n").map((line, i) => (
                <p key={i} className={i > 0 ? "mt-3" : ""}>
                  {line}
                </p>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              Next Passage
            </Button>
          </div>

          {/* Questions Pane */}
          <div className="space-y-5">
            <h2 className="font-semibold">Questions</h2>
            {content.questions.map((q, qi) => (
              <div key={qi} className="border rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isSelected = selected[qi] === opt;
                    const isCorrect = opt === q.correct_answer;
                    const showResult = revealed[qi];

                    let optClass =
                      "w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ";
                    if (showResult && isCorrect) {
                      optClass += "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300";
                    } else if (showResult && isSelected && !isCorrect) {
                      optClass += "border-red-400 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300";
                    } else if (isSelected && !showResult) {
                      optClass += "border-primary bg-accent";
                    } else {
                      optClass += "hover:bg-accent hover:border-border";
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => selectOption(qi, opt)}
                        className={optClass}
                        disabled={showResult}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => toggleReveal(qi)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {revealed[qi] ? "Hide Answer" : "Reveal Answer"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
