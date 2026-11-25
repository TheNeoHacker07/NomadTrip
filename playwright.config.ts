import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3480);
const env = { DATABASE_PATH: "data/e2e.db", ADMIN_PASSWORD: "e2e", PORT: String(PORT) };

export default defineConfig({
  testDir: "e2e",
  // The suite shares one SQLite file and some specs change seat counts, so run strictly one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // The database is recreated BEFORE the server exists (the server opens it lazily, once), then a production build is served.
    command: `npx tsx e2e/reset-db.ts && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en/about`, // a page that does not read the database
    env,
    reuseExistingServer: Boolean(process.env.E2E_REUSE_SERVER), // dev convenience only; CI/acceptance runs always start fresh
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
