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
  setLevel: () => {},
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
    setLevelState(newLevel);
    // Persist to DB and update session
    try {
      await fetch("/api/user/level", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: newLevel }),
      });
      await update({ level: newLevel });
    } catch {
      // ignore errors silently — UI already updated
    }
  };

  return (
    <LevelContext.Provider value={{ level, setLevel }}>
      {children}
    </LevelContext.Provider>
  );
}

export const useLevel = () => useContext(LevelContext);
