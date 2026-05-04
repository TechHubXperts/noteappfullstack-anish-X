#!/usr/bin/env node
/**
 * Layout guard for the monorepo shape. Overlaps with scripts/contracts/common.js
 * on purpose (same project rules); keep both files in sync when rules change.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runContractChecks, rootDir } from "./contracts/common.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fail(message) {
  console.error(`\x1b[31m[layout]\x1b[0m ${message}`);
  process.exit(1);
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
}

function assertThisScriptPath() {
  const expected = path.join(rootDir, "scripts", "fullstack-layout-check.js");
  const here = path.resolve(__dirname, "fullstack-layout-check.js");
  if (expected !== here) {
    fail("fullstack-layout-check.js must live at scripts/fullstack-layout-check.js.");
  }
}

function assertHookScripts() {
  requirePath(".husky/pre-commit", "husky pre-commit");
  requirePath(".husky/pre-push", "husky pre-push");
}

function assertContractScripts() {
  requirePath("scripts/contracts/common.js", "contracts common");
  requirePath("scripts/contracts/precommit.js", "contracts precommit");
}

function assertSrcTrees() {
  requireDir("frontend/src", "frontend/src");
  requireDir("backend/src", "backend/src");
  requirePath("frontend/index.html", "frontend/index.html");
  requirePath("backend/src/index.js", "backend/src/index.js");
}

function assertScriptsDirUnderRoot() {
  requireDir("scripts", "scripts directory");
  requireDir("scripts/contracts", "scripts/contracts directory");
}

function assertReadmePresent() {
  requirePath("README.md", "README");
}

function assertCiWorkflowPresent() {
  requirePath(".github/workflows/ci.yml", "GitHub Actions CI workflow");
}

function assertFrontendUsesVite() {
  const raw = fs.readFileSync(path.join(rootDir, "frontend/package.json"), "utf8");
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    fail("frontend/package.json must be valid JSON.");
  }
  if (!pkg.devDependencies?.vite) {
    fail('frontend/package.json must list "vite" in devDependencies.');
  }
}

function assertBackendUsesExpress() {
  const raw = fs.readFileSync(path.join(rootDir, "backend/package.json"), "utf8");
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    fail("backend/package.json must be valid JSON.");
  }
  if (!pkg.dependencies?.express) {
    fail('backend/package.json must list "express" in dependencies.');
  }
}

runContractChecks();
assertThisScriptPath();
assertScriptsDirUnderRoot();
assertHookScripts();
assertContractScripts();
assertSrcTrees();
assertReadmePresent();
assertCiWorkflowPresent();
assertFrontendUsesVite();
assertBackendUsesExpress();
console.log("[layout] OK");
