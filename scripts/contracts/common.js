/**
 * Shared contract rules for the full-stack note app (frontend + backend).
 * rootDir is two levels above this file: scripts/contracts/ → repo root.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Git / npm root (parent of scripts/) */
export const rootDir = path.resolve(__dirname, "..", "..");

function fail(message) {
  console.error(`\x1b[31m[contracts]\x1b[0m ${message}`);
  process.exit(1);
}

function readText(relativePath) {
  const abs = path.join(rootDir, relativePath);
  return fs.readFileSync(abs, "utf8");
}

function requirePath(relativePath, label) {
  const abs = path.join(rootDir, relativePath);
  if (!fs.existsSync(abs)) {
    fail(`Missing ${label}: ${relativePath}`);
  }
  return abs;
}

function requireDir(relativePath, label) {
  const abs = requirePath(relativePath, label);
  if (!fs.statSync(abs).isDirectory()) {
    fail(`Expected directory for ${label}: ${relativePath}`);
  }
  return abs;
}

function parseJson(relativePath) {
  const abs = requirePath(relativePath, "file");
  try {
    return JSON.parse(readText(relativePath));
  } catch {
    fail(`Invalid JSON: ${relativePath}`);
  }
}

export function assertWorkspacesPresent() {
  requireDir("frontend", "frontend workspace");
  requireDir("backend", "backend workspace");
}

export function assertRootPackageJson() {
  const pkg = parseJson("package.json");
  if (pkg.private !== true) {
    fail('Root package.json must set "private": true.');
  }
  if (pkg.type !== "module") {
    fail('Root package.json must set "type": "module" for ESM hook scripts.');
  }
}

export function assertChildPackageJsons() {
  parseJson("frontend/package.json");
  parseJson("backend/package.json");
}

export function assertBackendIndex() {
  requirePath("backend/src/index.js", "backend entry");
  const src = readText("backend/src/index.js");
  if (!/\b3000\b/.test(src)) {
    fail("backend/src/index.js must reference port 3000 (e.g. process.env.PORT || 3000).");
  }
  if (!/\.listen\s*\(/.test(src)) {
    fail("backend/src/index.js must call .listen(...) on the HTTP server.");
  }
  if (!/app\.use\s*\(\s*["']\/api\/[Nn]otes["']/.test(src)) {
    fail(
      "backend/src/index.js must mount notes API with app.use('/api/notes'...) or '/api/Notes'.",
    );
  }
}

export function assertViteDevPort() {
  requirePath("frontend/vite.config.js", "Vite config");
  const viteSrc = readText("frontend/vite.config.js");
  if (!/\b5173\b/.test(viteSrc)) {
    fail("frontend/vite.config.js must configure the dev server to use port 5173.");
  }
}

export function assertBackendDependsOnDotenv() {
  const pkg = parseJson("backend/package.json");
  if (!pkg.dependencies?.dotenv) {
    fail('backend/package.json must list "dotenv" in dependencies.');
  }
}

export function assertEnvIgnoredAndNotTracked() {
  let ignored = false;
  try {
    execSync(`git -C "${rootDir}" check-ignore -q -- backend/.env`, {
      stdio: "pipe",
    });
    ignored = true;
  } catch {
    ignored = false;
  }
  if (!ignored) {
    fail(
      "backend/.env must match a gitignore rule (e.g. backend/.env or .env in root .gitignore).",
    );
  }
  const tracked = execSync(`git -C "${rootDir}" ls-files -- backend/.env`, {
    encoding: "utf8",
  }).trim();
  if (tracked.length > 0) {
    fail("backend/.env must not be tracked; remove it from git history/index.");
  }
  const envAbs = path.join(rootDir, "backend", ".env");
  if (fs.existsSync(envAbs)) {
    const body = readText("backend/.env");
    if (!/^\s*MONGODB_URI\s*=/m.test(body) && !/^\s*MONGO_URI\s*=/m.test(body)) {
      fail("When backend/.env exists it must define MONGODB_URI= or MONGO_URI=.");
    }
  }
}

/** Full contract suite used by contracts:precommit */
export function runContractChecks() {
  assertWorkspacesPresent();
  assertRootPackageJson();
  assertChildPackageJsons();
  assertBackendIndex();
  assertViteDevPort();
  assertBackendDependsOnDotenv();
  assertEnvIgnoredAndNotTracked();
}
