import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildDatasourceUrl(): string {
  const base = process.env.MONGODB_URI ?? "mongodb://localhost:27017/deutschdash";
  const url = new URL(base);
  if (!url.searchParams.has("serverSelectionTimeoutMS")) {
    url.searchParams.set("serverSelectionTimeoutMS", "5000");
  }
  if (!url.searchParams.has("connectTimeoutMS")) {
    url.searchParams.set("connectTimeoutMS", "5000");
  }
  if (!url.searchParams.has("socketTimeoutMS")) {
    url.searchParams.set("socketTimeoutMS", "10000");
  }
  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
  });


prisma
  .$connect()
  .catch((e: unknown) =>
    console.error("Failed to connect to MongoDB:", e)
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
