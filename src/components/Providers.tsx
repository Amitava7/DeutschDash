"use client";

import { SessionProvider } from "next-auth/react";
import { LevelProvider } from "@/context/LevelContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <LevelProvider>{children}</LevelProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
