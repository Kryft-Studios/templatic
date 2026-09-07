#!/usr/bin/env node

import { setupRepoSP } from "@kryft/setupjs";
import process from "node:process";
import path from "node:path";

const name = process.argv[2];

if (!name) {
    console.error("Usage: pnpm newpkg <name>");
    process.exit(1);
}

const dir = path.join("packages", name);

await setupRepoSP(
    false,
    dir,
    false,
    false
);
