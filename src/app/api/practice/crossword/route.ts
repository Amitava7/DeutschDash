import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { parseJsonBody, validateStringLengths } from "@/lib/validation";

const VALID_SIZES = [6, 8, 10, 12];
const DEFAULT_SIZE = 6;

interface PlacedWord {
  word: string;
  hint: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildWordPool(
  allWords: { word: string; hint: string }[],
  gridSize: number
): { word: string; hint: string }[] {
  const eligible = allWords.filter((w) => w.word.length <= gridSize);

  const short = eligible.filter((w) => w.word.length <= 4);
  const medium = eligible.filter((w) => w.word.length >= 5 && w.word.length <= 6);
  const long = eligible.filter((w) => w.word.length >= 7);

  const targetTotal = Math.floor(gridSize * 3);

  let shortRatio: number, medRatio: number;
  if (gridSize <= 6) {
    shortRatio = 0.40; medRatio = 0.60;
  } else if (gridSize <= 8) {
    shortRatio = 0.30; medRatio = 0.35;
  } else {
    shortRatio = 0.25; medRatio = 0.30;
  }

  const shortCount = Math.max(3, Math.round(targetTotal * shortRatio));
  const medCount = Math.max(3, Math.round(targetTotal * medRatio));
  const longCount = Math.max(0, targetTotal - shortCount - medCount);

  const picked = [
    ...shuffle(short).slice(0, shortCount),
    ...shuffle(medium).slice(0, medCount),
    ...shuffle(long).slice(0, longCount),
  ];

  if (picked.length < targetTotal) {
    const usedWords = new Set(picked.map((w) => w.word));
    const leftovers = shuffle(eligible.filter((w) => !usedWords.has(w.word)));
    picked.push(...leftovers.slice(0, targetTotal - picked.length));
  }

  return shuffle(picked);
}

type DirGrid = number[][];

function placeWord(
  grid: string[][],
  dirGrid: DirGrid,
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
) {
  const dirBit = direction === "across" ? 1 : 2;
  for (let i = 0; i < word.length; i++) {
    if (direction === "across") {
      grid[row][col + i] = word[i];
      dirGrid[row][col + i] |= dirBit;
    } else {
      grid[row + i][col] = word[i];
      dirGrid[row + i][col] |= dirBit;
    }
  }
}

function generateCrossword(
  wordPool: { word: string; hint: string }[],
  gridSize: number
): { grid: string[][]; placed: PlacedWord[] } | null {
  const grid: string[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill("")
  );
  const dirGrid: DirGrid = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(0)
  );
  const placed: PlacedWord[] = [];
  const maxWords = Math.floor(gridSize * 2.5);
  const usedWords = new Set<string>();

  const sorted = [...wordPool].sort((a, b) => b.word.length - a.word.length);

  const seedSlots: { rowFrac: number; colFrac: number; dir: "across" | "down" }[] =
    gridSize <= 6
      ? [
        { rowFrac: 0.25, colFrac: 0.5, dir: "across" },
        { rowFrac: 0.5, colFrac: 0.25, dir: "down" },
      ]
      : gridSize <= 8
        ? [
          { rowFrac: 0.2, colFrac: 0.5, dir: "across" },
          { rowFrac: 0.5, colFrac: 0.2, dir: "down" },
          { rowFrac: 0.8, colFrac: 0.5, dir: "across" },
        ]
        : [
          { rowFrac: 0.15, colFrac: 0.5, dir: "across" },
          { rowFrac: 0.5, colFrac: 0.15, dir: "down" },
          { rowFrac: 0.85, colFrac: 0.5, dir: "across" },
          { rowFrac: 0.5, colFrac: 0.75, dir: "down" },
        ];

  for (const slot of seedSlots) {
    const minLen = Math.max(3, gridSize - 3);
    const seedWord = sorted.find(
      (w) => !usedWords.has(w.word) && w.word.length >= minLen && w.word.length <= gridSize
    ) ?? sorted.find(
      (w) => !usedWords.has(w.word) && w.word.length >= 3 && w.word.length <= gridSize
    );
    if (!seedWord) continue;

    const targetRow = Math.floor(gridSize * slot.rowFrac);
    const targetCol = Math.floor(gridSize * slot.colFrac);

    let row: number, col: number;
    if (slot.dir === "across") {
      row = Math.min(targetRow, gridSize - 1);
      col = Math.max(0, Math.min(
        Math.floor(targetCol - seedWord.word.length / 2),
        gridSize - seedWord.word.length
      ));
    } else {
      col = Math.min(targetCol, gridSize - 1);
      row = Math.max(0, Math.min(
        Math.floor(targetRow - seedWord.word.length / 2),
        gridSize - seedWord.word.length
      ));
    }

    const check = checkPlacement(grid, dirGrid, seedWord.word, row, col, slot.dir, gridSize);
    if (!check.valid) continue;

    placeWord(grid, dirGrid, seedWord.word, row, col, slot.dir);
    usedWords.add(seedWord.word);
    placed.push({
      word: seedWord.word,
      hint: seedWord.hint,
      row,
      col,
      direction: slot.dir,
      number: placed.length + 1,
    });
  }

  if (placed.length === 0) return null;

  const longCandidates = sorted.filter((w) => !usedWords.has(w.word) && w.word.length >= 5);
  for (const candidate of longCandidates) {
    if (placed.length >= maxWords) break;
    const best = findBestPlacement(grid, dirGrid, candidate.word, gridSize);
    if (best) {
      placeWord(grid, dirGrid, candidate.word, best.row, best.col, best.direction);
      usedWords.add(candidate.word);
      placed.push({
        word: candidate.word,
        hint: candidate.hint,
        row: best.row,
        col: best.col,
        direction: best.direction,
        number: placed.length + 1,
      });
    }
  }

  const shortCandidates = sorted.filter((w) => !usedWords.has(w.word) && w.word.length < 5);
  for (const candidate of shortCandidates) {
    if (placed.length >= maxWords) break;
    const best = findBestPlacement(grid, dirGrid, candidate.word, gridSize);
    if (best) {
      placeWord(grid, dirGrid, candidate.word, best.row, best.col, best.direction);
      usedWords.add(candidate.word);
      placed.push({
        word: candidate.word,
        hint: candidate.hint,
        row: best.row,
        col: best.col,
        direction: best.direction,
        number: placed.length + 1,
      });
    }
  }

  if (placed.length < 3) return null;

  placed.sort((a, b) => a.row - b.row || a.col - b.col);
  const numberMap = new Map<string, number>();
  let num = 1;
  for (const p of placed) {
    const key = `${p.row},${p.col}`;
    if (!numberMap.has(key)) {
      numberMap.set(key, num++);
    }
    p.number = numberMap.get(key)!;
  }

  return { grid, placed };
}

function findBestPlacement(
  grid: string[][],
  dirGrid: DirGrid,
  word: string,
  gridSize: number
): { row: number; col: number; direction: "across" | "down" } | null {
  const candidates: { row: number; col: number; direction: "across" | "down"; intersections: number }[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (c + word.length <= gridSize) {
        const result = checkPlacement(grid, dirGrid, word, r, c, "across", gridSize);
        if (result.valid && result.intersections > 0) {
          candidates.push({ row: r, col: c, direction: "across", intersections: result.intersections });
        }
      }
      if (r + word.length <= gridSize) {
        const result = checkPlacement(grid, dirGrid, word, r, c, "down", gridSize);
        if (result.valid && result.intersections > 0) {
          candidates.push({ row: r, col: c, direction: "down", intersections: result.intersections });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.intersections - a.intersections);
  return candidates[0];
}

function checkPlacement(
  grid: string[][],
  dirGrid: DirGrid,
  word: string,
  row: number,
  col: number,
  direction: "across" | "down",
  gridSize: number
): { valid: boolean; intersections: number } {
  let intersections = 0;
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;
  const sameDirBit = direction === "across" ? 1 : 2;

  const beforeR = row - dr;
  const beforeC = col - dc;
  if (beforeR >= 0 && beforeC >= 0 && grid[beforeR][beforeC] !== "") {
    return { valid: false, intersections: 0 };
  }

  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;
  if (afterR < gridSize && afterC < gridSize && grid[afterR][afterC] !== "") {
    return { valid: false, intersections: 0 };
  }

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (cell !== "") {
      if (cell !== word[i]) {
        return { valid: false, intersections: 0 };
      }
      if (dirGrid[r][c] & sameDirBit) {
        return { valid: false, intersections: 0 };
      }
      intersections++;
    } else {
      if (direction === "across") {
        if (r > 0 && grid[r - 1][c] !== "") {
          return { valid: false, intersections: 0 };
        }
        if (r < gridSize - 1 && grid[r + 1][c] !== "") {
          return { valid: false, intersections: 0 };
        }
      } else {
        if (c > 0 && grid[r][c - 1] !== "") {
          return { valid: false, intersections: 0 };
        }
        if (c < gridSize - 1 && grid[r][c + 1] !== "") {
          return { valid: false, intersections: 0 };
        }
      }
    }
  }

  return { valid: true, intersections };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [body, parseError] = await parseJsonBody<{ level?: string; size?: number }>(request);
    if (parseError) return parseError;

    const { level } = body;
    const gridSize = VALID_SIZES.includes(body.size as number) ? (body.size as number) : DEFAULT_SIZE;

    const lengthError = validateStringLengths(body, ["level"]);
    if (lengthError) return lengthError;

    const words = await prisma.crosswordWord.findMany({
      where: { level: level || "B1" },
    });

    if (words.length < 5) {
      return NextResponse.json(
        { error: "Not enough crossword words available" },
        { status: 404 }
      );
    }

    const seen = new Set<string>();
    const deduped = words
      .filter((w: { word: string }) => {
        if (seen.has(w.word)) return false;
        seen.add(w.word);
        return true;
      })
      .map((w: { word: string; hint: string }) => ({ word: w.word, hint: w.hint }));

    let result = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      const wordPool = buildWordPool(deduped, gridSize);
      result = generateCrossword(wordPool, gridSize);
      if (result && result.placed.length >= 3) break;
    }

    if (!result) {
      return NextResponse.json(
        { error: "Could not generate crossword. Try again." },
        { status: 500 }
      );
    }

    const finalGrid = result.grid.map((row) =>
      row.map((cell) => (cell === "" ? "#" : ""))
    );

    const practiceSession = await prisma.practiceSession.create({
      data: {
        type: "crossword",
        level: level || "B1",
        score: 0,
        totalQuestions: result.placed.length,
        userId: session.user.id,
        data: {
          placed: result.placed as unknown as import("@prisma/client").Prisma.JsonArray,
          gridSize,
        },
      },
    });

    return NextResponse.json({
      sessionId: practiceSession.id,
      grid: finalGrid,
      size: gridSize,
      clues: {
        across: result.placed
          .filter((p) => p.direction === "across")
          .map((p) => ({ number: p.number, hint: p.hint, row: p.row, col: p.col, length: p.word.length })),
        down: result.placed
          .filter((p) => p.direction === "down")
          .map((p) => ({ number: p.number, hint: p.hint, row: p.row, col: p.col, length: p.word.length })),
      },
    });
  } catch (error) {
    const dbResponse = handleApiError(error);
    if (dbResponse) return dbResponse;
    console.error("Crossword generation error:", error);
    return NextResponse.json({ error: "Failed to generate crossword" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [body, parseError] = await parseJsonBody<{ sessionId?: string; userGrid?: string[][] }>(request);
    if (parseError) return parseError;

    const { sessionId, userGrid } = body;

    const lengthError = validateStringLengths(body, ["sessionId"]);
    if (lengthError) return lengthError;

    const existing = await prisma.practiceSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = existing.data as { placed: PlacedWord[]; gridSize?: number } | null;
    if (!sessionData?.placed) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    const storedSize = sessionData.gridSize || DEFAULT_SIZE;

    const solutionGrid: string[][] = Array.from({ length: storedSize }, () =>
      Array(storedSize).fill("")
    );
    for (const p of sessionData.placed) {
      for (let i = 0; i < p.word.length; i++) {
        if (p.direction === "across") {
          solutionGrid[p.row][p.col + i] = p.word[i];
        } else {
          solutionGrid[p.row + i][p.col] = p.word[i];
        }
      }
    }

    const correctCells = solutionGrid.map((row, r) =>
      row.map((cell, c) => {
        if (cell === "") return true;
        return userGrid?.[r]?.[c] === cell;
      })
    );

    let correctWords = 0;
    for (const p of sessionData.placed) {
      let wordCorrect = true;
      for (let i = 0; i < p.word.length; i++) {
        const r = p.row + (p.direction === "down" ? i : 0);
        const c = p.col + (p.direction === "across" ? i : 0);
        if (userGrid?.[r]?.[c] !== solutionGrid[r][c]) {
          wordCorrect = false;
          break;
        }
      }
      if (wordCorrect) correctWords++;
    }

    await prisma.practiceSession.update({
      where: { id: sessionId, userId: session.user.id },
      data: { score: correctWords },
    });

    return NextResponse.json({
      correctCells,
      solution: solutionGrid,
      score: correctWords,
      total: sessionData.placed.length,
    });
  } catch (error) {
    const dbResponse = handleApiError(error);
    if (dbResponse) return dbResponse;
    console.error("Crossword score update error:", error);
    return NextResponse.json({ error: "Failed to update score" }, { status: 500 });
  }
}
