import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

export default function CaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
