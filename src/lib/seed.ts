/**
 * Run with: npx ts-node -e "require('./src/lib/seed')"
 * Or use the Prisma seed mechanism.
 *
 * This creates a default admin user if not present.
 */
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

async function seed() {
  const existing = await prisma.user.findUnique({ where: { username: "admin" } });
  if (existing) {
    console.log("Admin user already exists");
    return;
  }

  const hashed = await bcrypt.hash("password", 2);
  const user = await prisma.user.create({
    data: { username: "admin", password: hashed, level: "B1" },
  });

  await prisma.deck.create({
    data: {
      name: "Common Verbs",
      description: "Essential German verbs for everyday conversation",
      isDefault: true,
      userId: user.id,
      flashcards: {
        create: [
          { germanWord: "gehen", englishTranslation: "to go" },
          { germanWord: "kommen", englishTranslation: "to come" },
          { germanWord: "machen", englishTranslation: "to make/do" },
          { germanWord: "sehen", englishTranslation: "to see" },
          { germanWord: "wissen", englishTranslation: "to know (a fact)" },
          { germanWord: "können", englishTranslation: "to be able to / can" },
          { germanWord: "müssen", englishTranslation: "to have to / must" },
          { germanWord: "wollen", englishTranslation: "to want" },
          { germanWord: "sollen", englishTranslation: "should / to be supposed to" },
          { germanWord: "werden", englishTranslation: "to become / will" },
        ],
      },
    },
  });

  console.log("Seeded: admin / password — with 10 flashcards in 'Common Verbs'");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
