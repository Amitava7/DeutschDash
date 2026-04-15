"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLevel } from "@/context/LevelContext";

const SIZE_OPTIONS = [
  { value: "6", label: "6 × 6" },
  { value: "8", label: "8 × 8" },
  { value: "10", label: "10 × 10" },
  { value: "12", label: "12 × 12" },
];

const SPECIAL_CHARS = ["Ä", "Ö", "Ü", "ß"];

interface Clue {
  number: number;
  hint: string;
  row: number;
  col: number;
  length: number;
}

interface PuzzleData {
  sessionId: string;
  grid: string[][];
  size: number;
  clues: { across: Clue[]; down: Clue[] };
}

export default function CrosswordPage() {
  const { level } = useLevel();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [correctCells, setCorrectCells] = useState<boolean[][]>([]);
  const [solution, setSolution] = useState<string[][] | null>(null);
  const [checkScore, setCheckScore] = useState<{ correct: number; total: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<"across" | "down">("across");
  const [gridSize, setGridSize] = useState("6");
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setChecked(false);
    setPuzzle(null);
    setSolution(null);
    setCheckScore(null);
    setSelectedCell(null);

    const res = await fetch("/api/practice/crossword", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, size: Number(gridSize) }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to generate crossword. Please try again.");
      return;
    }

    const data: PuzzleData = await res.json();
    setPuzzle(data);
    setUserGrid(
      data.grid.map((row) => row.map((cell) => (cell === "#" ? "#" : "")))
    );
    setCorrectCells(
      data.grid.map((row) => row.map(() => false))
    );
    inputRefs.current = Array.from({ length: data.size }, () =>
      Array(data.size).fill(null)
    );
  }, [level, gridSize]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize]);

  const handleCellChange = (row: number, col: number, value: string) => {
    if (checked || !puzzle) return;
    const char = value.toUpperCase().slice(-1);
    if (char && !/^[A-ZÄÖÜß]$/.test(char)) return;

    setUserGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = char;
      return next;
    });

    // Auto-advance to next cell
    if (char) {
      const dr = selectedDirection === "down" ? 1 : 0;
      const dc = selectedDirection === "across" ? 1 : 0;
      const nextR = row + dr;
      const nextC = col + dc;
      if (
        nextR < puzzle.size &&
        nextC < puzzle.size &&
        puzzle.grid[nextR][nextC] !== "#"
      ) {
        inputRefs.current[nextR]?.[nextC]?.focus();
        setSelectedCell({ row: nextR, col: nextC });
      }
    }
  };

  const handleKeyDown = (row: number, col: number, e: React.KeyboardEvent) => {
    if (!puzzle) return;

    if (e.key === "Backspace" && userGrid[row][col] === "") {
      const dr = selectedDirection === "down" ? 1 : 0;
      const dc = selectedDirection === "across" ? 1 : 0;
      const prevR = row - dr;
      const prevC = col - dc;
      if (prevR >= 0 && prevC >= 0 && puzzle.grid[prevR][prevC] !== "#") {
        setUserGrid((prev) => {
          const next = prev.map((r) => [...r]);
          next[prevR][prevC] = "";
          return next;
        });
        inputRefs.current[prevR]?.[prevC]?.focus();
        setSelectedCell({ row: prevR, col: prevC });
      }
    }

    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      let nextR = row;
      let nextC = col;
      if (e.key === "ArrowRight") nextC++;
      if (e.key === "ArrowLeft") nextC--;
      if (e.key === "ArrowDown") nextR++;
      if (e.key === "ArrowUp") nextR--;

      if (nextR >= 0 && nextR < puzzle.size && nextC >= 0 && nextC < puzzle.size && puzzle.grid[nextR][nextC] !== "#") {
        inputRefs.current[nextR]?.[nextC]?.focus();
        setSelectedCell({ row: nextR, col: nextC });
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") setSelectedDirection("across");
        if (e.key === "ArrowUp" || e.key === "ArrowDown") setSelectedDirection("down");
      }
    }

    // Toggle direction on Tab
    if (e.key === "Tab") {
      e.preventDefault();
      setSelectedDirection((d) => (d === "across" ? "down" : "across"));
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setSelectedDirection((d) => (d === "across" ? "down" : "across"));
    }
    setSelectedCell({ row, col });
    inputRefs.current[row]?.[col]?.focus();
  };

  const insertSpecialChar = (char: string) => {
    if (!selectedCell || !puzzle || checked) return;
    const { row, col } = selectedCell;
    if (puzzle.grid[row][col] === "#") return;

    setUserGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = char;
      return next;
    });
  };

  const checkAnswers = async () => {
    if (!puzzle) return;

    const res = await fetch("/api/practice/crossword", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: puzzle.sessionId,
        userGrid,
      }),
    });

    if (!res.ok) return;

    const data = await res.json();
    setCorrectCells(data.correctCells);
    setSolution(data.solution);
    setCheckScore({ correct: data.score, total: data.total });
    setChecked(true);
  };

  const getCellNumber = (row: number, col: number): number | null => {
    if (!puzzle) return null;
    const allClues = [...puzzle.clues.across, ...puzzle.clues.down];
    const clue = allClues.find((c) => c.row === row && c.col === col);
    return clue ? clue.number : null;
  };

  const isHighlighted = (row: number, col: number): boolean => {
    if (!selectedCell || !puzzle) return false;
    const allClues = [...puzzle.clues.across, ...puzzle.clues.down];

    for (const clue of allClues) {
      const isAcross = puzzle.clues.across.includes(clue);
      const dir = isAcross ? "across" : "down";
      if (dir !== selectedDirection) continue;

      for (let i = 0; i < clue.length; i++) {
        const r = clue.row + (isAcross ? 0 : i);
        const c = clue.col + (isAcross ? i : 0);
        if (r === selectedCell.row && c === selectedCell.col) {
          // This clue contains the selected cell, highlight all cells of this clue
          for (let j = 0; j < clue.length; j++) {
            const hr = clue.row + (isAcross ? 0 : j);
            const hc = clue.col + (isAcross ? j : 0);
            if (hr === row && hc === col) return true;
          }
        }
      }
    }
    return false;
  };

  const getClueWord = (clue: Clue, isAcross: boolean, grid: string[][]) => {
    let word = "";
    for (let i = 0; i < clue.length; i++) {
      const r = clue.row + (isAcross ? 0 : i);
      const c = clue.col + (isAcross ? i : 0);
      word += grid[r][c];
    }
    return word;
  };

  const isClueCorrect = (clue: Clue, isAcross: boolean) => {
    if (!solution) return false;
    for (let i = 0; i < clue.length; i++) {
      const r = clue.row + (isAcross ? 0 : i);
      const c = clue.col + (isAcross ? i : 0);
      if (userGrid[r][c] !== solution[r][c]) return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Crossword</h1>
          <p className="text-sm text-muted-foreground mt-1">
            German crossword puzzle · Level {level} · Tab to toggle direction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Grid size:</span>
          <Select value={gridSize} onValueChange={(v) => v && setGridSize(v)}>
            <SelectTrigger className="w-[100px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="text-muted-foreground text-sm animate-pulse">
          Generating crossword...
        </div>
      )}

      {puzzle && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Grid */}
          <div className="space-y-3">
            <div
              className="inline-grid gap-0 border-2 border-foreground"
              style={{
                gridTemplateColumns: `repeat(${puzzle.size}, ${puzzle.size <= 8 ? 48 : 36}px)`,
                gridTemplateRows: `repeat(${puzzle.size}, ${puzzle.size <= 8 ? 48 : 36}px)`,
              }}
            >
              {puzzle.grid.map((row, r) =>
                row.map((cell, c) => {
                  const cellNum = getCellNumber(r, c);
                  const isBlack = cell === "#";
                  const isSelected = selectedCell?.row === r && selectedCell?.col === c;
                  const highlighted = isHighlighted(r, c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`relative border border-border ${isBlack
                          ? "bg-foreground dark:bg-zinc-800"
                          : checked
                            ? correctCells[r][c]
                              ? "bg-green-50 dark:bg-green-950"
                              : "bg-red-50 dark:bg-red-950"
                            : isSelected
                              ? "bg-blue-200 dark:bg-blue-900"
                              : highlighted
                                ? "bg-blue-100 dark:bg-blue-950"
                                : "bg-background"
                        }`}
                      onClick={() => !isBlack && handleCellClick(r, c)}
                    >
                      {cellNum && (
                        <span className="absolute top-0 left-0.5 text-[9px] font-bold leading-none text-muted-foreground select-none">
                          {cellNum}
                        </span>
                      )}
                      {!isBlack && (
                        <input
                          ref={(el) => {
                            if (inputRefs.current[r]) inputRefs.current[r][c] = el;
                          }}
                          className="w-full h-full bg-transparent text-center text-lg font-bold uppercase caret-transparent outline-none"
                          value={userGrid[r]?.[c] || ""}
                          onChange={(e) => handleCellChange(r, c, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(r, c, e)}
                          onFocus={() => setSelectedCell({ row: r, col: c })}
                          maxLength={2}
                          disabled={checked}
                          autoComplete="off"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Special characters */}
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">Special:</span>
              {SPECIAL_CHARS.map((ch) => (
                <Button
                  key={ch}
                  variant="outline"
                  size="sm"
                  className="w-9 h-9 text-base font-bold"
                  onClick={() => insertSpecialChar(ch)}
                  disabled={checked}
                >
                  {ch}
                </Button>
              ))}
            </div>

            {/* Check / Score */}
            {!checked ? (
              <Button onClick={checkAnswers}>Check Answers</Button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium">
                    Score: {checkScore?.correct} / {checkScore?.total} words correct
                  </span>
                  {checkScore?.correct === checkScore?.total && (
                    <Badge variant="default">Perfect!</Badge>
                  )}
                </div>
                <Button variant="outline" onClick={load}>
                  New Crossword
                </Button>
              </div>
            )}
          </div>

          {/* Clues */}
          <div className="flex-1 space-y-4 min-w-[250px]">
            <div>
              <h3 className="font-semibold text-sm mb-2">Across</h3>
              <ul className="space-y-1">
                {puzzle.clues.across.map((clue) => (
                  <li
                    key={`a-${clue.number}`}
                    className="text-sm cursor-pointer hover:bg-accent rounded px-2 py-1 transition-colors"
                    onClick={() => {
                      setSelectedDirection("across");
                      setSelectedCell({ row: clue.row, col: clue.col });
                      inputRefs.current[clue.row]?.[clue.col]?.focus();
                    }}
                  >
                    <span className="font-bold mr-1">{clue.number}.</span>
                    {clue.hint}
                    {checked && !isClueCorrect(clue, true) && (
                      <span className="text-xs text-red-600 dark:text-red-400 ml-1 font-medium">
                        → {solution && getClueWord(clue, true, solution)}
                      </span>
                    )}
                    {checked && isClueCorrect(clue, true) && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-2">Down</h3>
              <ul className="space-y-1">
                {puzzle.clues.down.map((clue) => (
                  <li
                    key={`d-${clue.number}`}
                    className="text-sm cursor-pointer hover:bg-accent rounded px-2 py-1 transition-colors"
                    onClick={() => {
                      setSelectedDirection("down");
                      setSelectedCell({ row: clue.row, col: clue.col });
                      inputRefs.current[clue.row]?.[clue.col]?.focus();
                    }}
                  >
                    <span className="font-bold mr-1">{clue.number}.</span>
                    {clue.hint}
                    {checked && !isClueCorrect(clue, false) && (
                      <span className="text-xs text-red-600 dark:text-red-400 ml-1 font-medium">
                        → {solution && getClueWord(clue, false, solution)}
                      </span>
                    )}
                    {checked && isClueCorrect(clue, false) && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-1">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
