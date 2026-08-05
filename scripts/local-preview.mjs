import path from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextServerPath = path.join(
  root,
  "node_modules",
  "next",
  "dist",
  "server",
  "lib",
  "start-server.js",
);
const port = process.env.LOCAL_PREVIEW_PORT || "3000";
const localStateDirectory = path.join(root, ".local-preview");
const localStateFile = path.join(localStateDirectory, "state.json");

mkdirSync(localStateDirectory, { recursive: true });
rmSync(localStateFile, { force: true });

process.env.AUTH_SECRET = "eltaulell-local-preview-only";
process.env.DATABASE_URL = "postgresql://local-preview.invalid/eltaulell";
process.env.ELTAULELL_CONSTRAINED_RUNTIME = "1";
process.env.ELTAULELL_LOCAL_PREVIEW = "1";
process.env.ELTAULELL_LOCAL_STATE_FILE = localStateFile;
process.env.NEXT_TELEMETRY_DISABLED = "1";
console.log(`Obrint El Taulell a http://localhost:${port}/acces`);
const { startServer } = await import(pathToFileURL(nextServerPath).href);
await startServer({
  allowRetry: false,
  dir: root,
  hostname: "127.0.0.1",
  isDev: true,
  port: Number(port),
});
