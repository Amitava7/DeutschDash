"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLevel } from "@/context/LevelContext";

const TENSES = [
  "Präsens (Present)",
  "Präteritum (Simple Past)",
  "Perfekt (Present Perfect)",
  "Plusquamperfekt (Past Perfect)",
  "Futur I (Future)",
  "Futur II (Future Perfect)",
  "Konjunktiv II (Subjunctive II)",
];

interface Question {
  sentence: string;
  correct_answer: string;
  hint: string;
}

interface AnswerState {
  value: string;
  correct: boolean | null;
}

export default function TensePracticePage() {
  const { level } = useLevel();
  const [tense, setTense] = useState(TENSES[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (selectedTense: string) => {
    setLoading(true);
    setError("");
    setChecked(false);
    setQuestions([]);
    setAnswers([]);

    const res = await fetch("/api/practice/tense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tense: selectedTense, level }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to load practice. Please try again.");
      return;
    }

    const data = await res.json();
    setQuestions(data.questions);
    setAnswers(data.questions.map(() => ({ value: "", correct: null })));
  }, [level]);

  useEffect(() => {
    load(tense);
  }, [tense, load]);

  const normalizeGerman = (s: string) =>
    s
      .toLowerCase()
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ß/g, "ss");

  const checkAnswers = () => {
    setAnswers((prev) =>
      prev.map((a, i) => ({
        ...a,
        correct:
          normalizeGerman(a.value.trim()) ===
          normalizeGerman(questions[i].correct_answer.trim()),
      }))
    );
    setChecked(true);
  };

  const score = answers.filter((a) => a.correct === true).length;

  const renderSentence = (sentence: string, index: number, answer: AnswerState) => {
    const parts = sentence.split("___");
    return (
      <div key={index} className="flex items-center gap-1 flex-wrap">
        <span className="text-sm">{parts[0]}</span>
        <Input
          className={`inline-block w-32 h-7 text-sm px-2 ${
            answer.correct === true
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : answer.correct === false
              ? "border-red-400 bg-red-50 dark:bg-red-950"
              : ""
          }`}
          value={answer.value}
          onChange={(e) => {
            if (checked) return;
            setAnswers((prev) => {
              const next = [...prev];
              next[index] = { ...next[index], value: e.target.value };
              return next;
            });
          }}
          placeholder={questions[index]?.hint || ""}
          disabled={checked}
        />
        {parts[1] && <span className="text-sm">{parts[1]}</span>}
        {checked && answer.correct === false && (
          <span className="text-xs text-green-600 font-medium">
            ({questions[index].correct_answer})
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tense Practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill-in-the-blank exercises · Level {level}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tense</Label>
        <Select
          value={tense}
          onValueChange={(v) => {
            setTense(v ?? TENSES[0]);
          }}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TENSES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="text-muted-foreground text-sm animate-pulse">
          Loading sentences...
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-6">
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-2">
                <span className="text-xs text-muted-foreground font-mono">{i + 1}.</span>
                {renderSentence(q.sentence, i, answers[i])}
                <p className="text-xs text-muted-foreground">Hint: {q.hint}</p>
              </div>
            ))}
          </div>

          {!checked ? (
            <Button onClick={checkAnswers}>Check Answers</Button>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Score: {score} / {questions.length}
                {score === questions.length && " — Perfect!"}
              </div>
              <Button variant="outline" onClick={() => load(tense)}>
                Next Exercises
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
