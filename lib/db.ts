import { createRequire } from "node:module";
import { createLocalDb, type DatabaseClient } from "@/lib/local-db";

export type { DatabaseClient } from "@/lib/local-db";

const globalForPrisma = globalThis as unknown as {
  localDb?: DatabaseClient;
  localDbVersion?: number;
  prisma?: DatabaseClient;
};

const LOCAL_DB_VERSION = 13;

function createProductionDb() {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: new () => DatabaseClient;
  };
  return new PrismaClient();
}

const localPreview = process.env.ELTAULELL_LOCAL_PREVIEW === "1";

function getLocalDb() {
  if (!globalForPrisma.localDb || globalForPrisma.localDbVersion !== LOCAL_DB_VERSION) {
    globalForPrisma.localDb = createLocalDb();
    globalForPrisma.localDbVersion = LOCAL_DB_VERSION;
  }
  return globalForPrisma.localDb;
}

export const db: DatabaseClient = localPreview
  ? getLocalDb()
  : (globalForPrisma.prisma ??= createProductionDb());
