// Recreates data/e2e.db from scratch: delete (incl. WAL/SHM files), migrate and seed with the real seed script.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

const path = process.env.DATABASE_PATH ?? "data/e2e.db";
if (!path.endsWith("e2e.db")) throw new Error(`Refusing to reset ${path}: not an e2e database`);
mkdirSync("data", { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true });
execFileSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", env: { ...process.env, DATABASE_PATH: path } });
