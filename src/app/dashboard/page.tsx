"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DeckSummary {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  totalCards: number;
  dueCards: number;
}

interface PracticeStats {
  tense: {
    totalSessions: number;
    avgScore: number | null;
    breakdown: Record<string, { sessions: number; avgScore: number | null }>;
  };
  reading: {
    totalSessions: number;
    avgScore: number | null;
  };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PracticeStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [creatingStandard, setCreatingStandard] = useState(false);

  const fetchDecks = async () => {
    const res = await fetch("/api/decks");
    if (res.ok) setDecks(await res.json());
    setLoading(false);
  };

  const fetchStats = async () => {
    const res = await fetch("/api/practice/stats");
    if (res.ok) setStats(await res.json());
  };

  useEffect(() => {
    fetchDecks();
    fetchStats();
  }, []);

  const createDeck = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    setCreating(false);
    if (res.ok) {
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      fetchDecks();
      toast.success("Deck created");
    } else {
      toast.error("Failed to create deck");
    }
  };

  const createStandardDeck = async () => {
    setCreatingStandard(true);
    const res = await fetch("/api/decks/from-standard", { method: "POST" });
    setCreatingStandard(false);
    if (res.ok) {
      fetchDecks();
      toast.success("Deck created with 20 standard B1 words");
    } else {
      toast.error("Failed to create standard deck");
    }
  };

  const deleteDeck = async (id: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    const res = await fetch(`/api/decks/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchDecks();
      toast.success("Deck deleted");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {session?.user?.username}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Level: <span className="font-medium text-foreground">{session?.user?.level}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createStandardDeck} disabled={creatingStandard}>
            {creatingStandard ? "Creating..." : "Create Deck with Standard Words"}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>New Deck</Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Flashcard Decks</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : decks.length === 0 ? (
          <p className="text-muted-foreground">No decks yet. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Card
                key={deck.id}
                className={`transition-all ${
                  deck.dueCards === 0 && deck.totalCards > 0
                    ? "border-green-400 dark:border-green-600"
                    : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{deck.name}</CardTitle>
                    {deck.dueCards === 0 && deck.totalCards > 0 && (
                      <span className="text-green-500 text-lg">✓</span>
                    )}
                  </div>
                  {deck.description && (
                    <CardDescription className="text-xs">{deck.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex gap-2 text-sm">
                    <Badge variant="secondary">{deck.totalCards} cards</Badge>
                    {deck.dueCards > 0 && (
                      <Badge variant="destructive">{deck.dueCards} due</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="gap-2">
                  <Link href={`/flashcards/${deck.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      {deck.dueCards > 0 ? "Review" : "Browse"}
                    </Button>
                  </Link>
                  <Link href={`/flashcards/${deck.id}/manage`} className="flex-1">
                    <Button variant="ghost" size="sm" className="w-full">
                      Manage
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteDeck(deck.id)}
                  >
                    ×
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tense Practice</CardTitle>
            <CardDescription>Fill-in-the-blank exercises</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {stats && (
              <div className="flex gap-2 text-sm flex-wrap">
                <Badge variant="secondary">{stats.tense.totalSessions} sessions</Badge>
                {stats.tense.avgScore != null && (
                  <Badge variant={stats.tense.avgScore >= 70 ? "default" : "destructive"}>
                    avg {stats.tense.avgScore}%
                  </Badge>
                )}
                {Object.entries(stats.tense.breakdown).map(([tense, data]) => (
                  <Badge key={tense} variant="outline" className="text-xs">
                    {tense}: {data.sessions}×{data.avgScore != null ? ` ${data.avgScore}%` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/tense">
              <Button variant="outline" size="sm">Start Practice</Button>
            </Link>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reading Comprehension</CardTitle>
            <CardDescription>Passages with comprehension questions</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {stats && (
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">{stats.reading.totalSessions} sessions</Badge>
                {stats.reading.avgScore != null && (
                  <Badge variant={stats.reading.avgScore >= 70 ? "default" : "destructive"}>
                    avg {stats.reading.avgScore}%
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/reading">
              <Button variant="outline" size="sm">Start Reading</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Deck</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Verbs, Travel vocabulary"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Short description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDeck} disabled={creating || !newName.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
