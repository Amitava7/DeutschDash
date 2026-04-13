import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { parseJsonBody, validateStringLengths } from "@/lib/validation";

const GRID_SIZE = 6;

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

function generateCrossword(
  wordPool: { word: string; hint: string }[]
): { grid: string[][]; placed: PlacedWord[] } | null {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill("")
  );
  const placed: PlacedWord[] = [];
  const shuffled = shuffle(wordPool);

  // Try to place the first word horizontally in the middle
  const firstWord = shuffled.find((w) => w.word.length <= GRID_SIZE);
  if (!firstWord) return null;

  const startCol = Math.floor((GRID_SIZE - firstWord.word.length) / 2);
  const startRow = Math.floor(GRID_SIZE / 2);
  for (let i = 0; i < firstWord.word.length; i++) {
    grid[startRow][startCol + i] = firstWord.word[i];
  }
  placed.push({
    word: firstWord.word,
    hint: firstWord.hint,
    row: startRow,
    col: startCol,
    direction: "across",
    number: 1,
  });

  const remaining = shuffled.filter((w) => w !== firstWord);

  // Try to place more words by finding intersections
  for (const candidate of remaining) {
    if (placed.length >= 8) break; // enough words for a good puzzle

    const bestPlacement = findBestPlacement(grid, candidate.word);
    if (bestPlacement) {
      const { row, col, direction } = bestPlacement;
      for (let i = 0; i < candidate.word.length; i++) {
        if (direction === "across") {
          grid[row][col + i] = candidate.word[i];
        } else {
          grid[row + i][col] = candidate.word[i];
        }
      }
      placed.push({
        word: candidate.word,
        hint: candidate.hint,
        row,
        col,
        direction,
        number: placed.length + 1,
      });
    }
  }

  if (placed.length < 3) return null; // need at least 3 words

  // Reassign numbers in reading order (top-to-bottom, left-to-right)
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
  word: string
): { row: number; col: number; direction: "across" | "down" } | null {
  const candidates: { row: number; col: number; direction: "across" | "down"; intersections: number }[] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // Try placing across
      if (c + word.length <= GRID_SIZE) {
        const result = checkPlacement(grid, word, r, c, "across");
        if (result.valid && result.intersections > 0) {
          candidates.push({ row: r, col: c, direction: "across", intersections: result.intersections });
        }
      }
      // Try placing down
      if (r + word.length <= GRID_SIZE) {
        const result = checkPlacement(grid, word, r, c, "down");
        if (result.valid && result.intersections > 0) {
          candidates.push({ row: r, col: c, direction: "down", intersections: result.intersections });
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  // Prefer placements with more intersections
  candidates.sort((a, b) => b.intersections - a.intersections);
  return candidates[0];
}

function checkPlacement(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): { valid: boolean; intersections: number } {
  let intersections = 0;
  const dr = direction === "down" ? 1 : 0;
  const dc = direction === "across" ? 1 : 0;

  // Check cell before the word is empty
  const beforeR = row - dr;
  const beforeC = col - dc;
  if (beforeR >= 0 && beforeC >= 0 && grid[beforeR][beforeC] !== "") {
    return { valid: false, intersections: 0 };
  }

  // Check cell after the word is empty
  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;
  if (afterR < GRID_SIZE && afterC < GRID_SIZE && grid[afterR][afterC] !== "") {
    return { valid: false, intersections: 0 };
  }

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const cell = grid[r][c];

    if (cell !== "") {
      // Cell occupied — must match the letter
      if (cell !== word[i]) {
        return { valid: false, intersections: 0 };
      }
      intersections++;
    } else {
      // Cell empty — check that adjacent cells perpendicular to direction are also empty
      // (to avoid words running parallel right next to each other)
      if (direction === "across") {
        if (r > 0 && grid[r - 1][c] !== "" && !isPartOfExistingWord(grid, r - 1, c, "down", r, c)) {
          return { valid: false, intersections: 0 };
        }
        if (r < GRID_SIZE - 1 && grid[r + 1][c] !== "" && !isPartOfExistingWord(grid, r + 1, c, "down", r, c)) {
          return { valid: false, intersections: 0 };
        }
      } else {
        if (c > 0 && grid[r][c - 1] !== "" && !isPartOfExistingWord(grid, r, c - 1, "across", r, c)) {
          return { valid: false, intersections: 0 };
        }
        if (c < GRID_SIZE - 1 && grid[r][c + 1] !== "" && !isPartOfExistingWord(grid, r, c + 1, "across", r, c)) {
          return { valid: false, intersections: 0 };
        }
      }
    }
  }

  return { valid: true, intersections };
}

function isPartOfExistingWord(
  _grid: string[][],
  _adjR: number,
  _adjC: number,
  _checkDir: string,
  _curR: number,
  _curC: number
): boolean {
  // Simplified: if adjacent cell is occupied and this cell is empty,
  // it would create an unintended adjacency. Return false to be safe.
  return false;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [body, parseError] = await parseJsonBody<{ level?: string }>(request);
    if (parseError) return parseError;

    const { level } = body;

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

    // Deduplicate words by word text to prevent same hint appearing twice
    const seen = new Set<string>();
    const wordPool = words
      .filter((w: { word: string }) => {
        if (seen.has(w.word)) return false;
        seen.add(w.word);
        return true;
      })
      .map((w: { word: string; hint: string }) => ({ word: w.word, hint: w.hint }));

    // Try generating a valid crossword (retry a few times since it's random)
    let result = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      result = generateCrossword(wordPool);
      if (result && result.placed.length >= 3) break;
    }

    if (!result) {
      return NextResponse.json(
        { error: "Could not generate crossword. Try again." },
        { status: 500 }
      );
    }

    // Build the final grid with blacked-out cells
    const finalGrid = result.grid.map((row) =>
      row.map((cell) => (cell === "" ? "#" : ""))
    );

    // Create practice session
    const practiceSession = await prisma.practiceSession.create({
      data: {
        type: "crossword",
        level: level || "B1",
        score: 0,
        totalQuestions: result.placed.length,
        userId: session.user.id,
        data: {
          placed: result.placed as unknown as import("@prisma/client").Prisma.JsonArray,
        },
      },
    });

    return NextResponse.json({
      sessionId: practiceSession.id,
      grid: finalGrid,
      size: GRID_SIZE,
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

    const sessionData = existing.data as { placed: PlacedWord[] } | null;
    if (!sessionData?.placed) {
      return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
    }

    // Rebuild the solution grid server-side from stored placed words
    const solutionGrid: string[][] = Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill("")
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

    // Calculate correctness per cell
    const correctCells = solutionGrid.map((row, r) =>
      row.map((cell, c) => {
        if (cell === "") return true;
        return userGrid?.[r]?.[c] === cell;
      })
    );

    // Calculate score: count correct words
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
