"use client";

import { SessionProvider } from "next-auth/react";
import { LevelProvider } from "@/context/LevelContext";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LevelProvider>{children}</LevelProvider>
    </SessionProvider>
  );
}
