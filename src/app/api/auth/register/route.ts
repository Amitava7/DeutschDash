import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, password: hashed, level: "B1" },
  });

  // Create a default deck for the new user
  await prisma.deck.create({
    data: {
      name: "My First Deck",
      description: "Default vocabulary deck",
      isDefault: true,
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
