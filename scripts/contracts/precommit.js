#!/usr/bin/env node
/**
 * Contract checks invoked from npm run contracts:precommit.
 * Cwd must be the repository root.
 */
import { runContractChecks } from "./common.js";

runContractChecks();
console.log("[contracts] OK");
