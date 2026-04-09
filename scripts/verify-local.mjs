#!/usr/bin/env node
/**
 * Nexvault local quality gate — cross-platform (Linux, macOS, Windows).
 * Run via:  pnpm run verify:local
 *
 * Steps:
 *   1. Guard: fail if .github/workflows/ci.yml exists (no-CI policy)
 *   2. Typecheck across all packages
 *   3. API server test suite
 */

import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function log(msg, color = RESET) {
  process.stdout.write(`${color}${msg}${RESET}\n`);
}

function step(label, cmd, args) {
  log(`\n--- ${label} ---`, CYAN);
  const start = Date.now();
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const code = result.status ?? 1;
  if (code !== 0) {
    log(`FAIL: ${label} (exit ${code}, ${elapsed}s)`, RED);
    process.exit(code);
  }
  log(`PASS: ${label} (${elapsed}s)`, GREEN);
}

log("Nexvault - local quality gate", CYAN);
log(`Root: ${ROOT}`);
log(new Date().toISOString());

// ── Guard: no CI workflow file allowed ────────────────────────────────────────
const CI_FILE = resolve(ROOT, ".github", "workflows", "ci.yml");
if (existsSync(CI_FILE)) {
  log("", RED);
  log("FAIL: .github/workflows/ci.yml must not exist (no-CI policy).", RED);
  log("Remove the file and commit again.", RED);
  process.exit(1);
}
log("\nGUARD: .github/workflows/ci.yml absent - OK", GREEN);

// ── Steps ─────────────────────────────────────────────────────────────────────
step("Typecheck (all packages)", "pnpm", ["run", "typecheck"]);
step("API Server tests", "pnpm", ["--filter", "@workspace/api-server", "test"]);

log("\n--- ALL CHECKS PASSED ---", GREEN);
log("Safe to push.", GREEN);
