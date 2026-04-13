"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface LevelContextType {
  level: Level;
  setLevel: (level: Level) => void;
}

const LevelContext = createContext<LevelContextType>({
  level: "B1",
  setLevel: () => { },
});

export function LevelProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const [level, setLevelState] = useState<Level>("B1");

  useEffect(() => {
    if (session?.user?.level) {
      setLevelState(session.user.level as Level);
    }
  }, [session?.user?.level]);

  const setLevel = async (newLevel: Level) => {
    const previousLevel = level;
    setLevelState(newLevel);
    try {
      const res = await fetch("/api/user/level", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: newLevel }),
      });
      if (!res.ok) throw new Error("Failed to update level");
      await update({ level: newLevel });
    } catch {
      setLevelState(previousLevel);
    }
  };

  return (
    <LevelContext.Provider value={{ level, setLevel }}>
      {children}
    </LevelContext.Provider>
  );
}

export const useLevel = () => useContext(LevelContext);
