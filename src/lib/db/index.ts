import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

// Always store on globalThis — prevents a new PrismaClient being created on
// every HMR cycle in dev AND on every module re-evaluation in production
// (possible in some serverless cold-start scenarios).
globalForPrisma.prisma = db;
