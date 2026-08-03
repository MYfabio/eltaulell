import { createRequire } from "node:module";
import { createLocalDb, type DatabaseClient } from "@/lib/local-db";

const globalForPrisma = globalThis as unknown as {
  localDb?: DatabaseClient;
  prisma?: DatabaseClient;
};

function createProductionDb() {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new () => DatabaseClient;
  };
  return new PrismaClient();
}

const localPreview = process.env.ELTAULELL_LOCAL_PREVIEW === "1";

export const db: DatabaseClient = localPreview
  ? (globalForPrisma.localDb ??= createLocalDb())
  : (globalForPrisma.prisma ??= createProductionDb());
