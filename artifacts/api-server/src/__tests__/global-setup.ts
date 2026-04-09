/**
 * Vitest global setup — runs once in the main process before any test workers start.
 * Sets env vars so @workspace/db module loads without throwing in a clean environment.
 * No real DB connection is made; tests that need DB operations mock @workspace/db.
 */
export function setup() {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://test:test@localhost:5432/nexvault_test_noop";
  }
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "nexvault-test-secret-32-chars-min!!";
  }
  if (!process.env.DEMO_MODE) {
    process.env.DEMO_MODE = "true";
  }
}
