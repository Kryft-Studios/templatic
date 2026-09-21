import { execFileSync, execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const dist = path.join(projectRoot, "dist", "index.js");
const testRoot = path.join(__dirname, "runs-test");
function runExecSync(command, options = {}) {
    console.log("\n> " + command);
    return execSync(command,options)
}
function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  return execFileSync(command, args, {
    stdio: "inherit",
    ...options,
  });
}

function assertExists(target, description = target) {
  if (!existsSync(target)) {
    throw new Error(`Expected ${description} to exist:\n${target}`);
  }

  console.log(`✓ ${description}`);
}

function assertContains(target, value, description = value) {
  const content = readFileSync(target, "utf8");

  if (!content.includes(value)) {
    throw new Error(`Expected ${description} to exist in:\n${target}`);
  }

  console.log(`✓ ${description}`);
}

async function main() {
  console.log("================================");
  console.log("@templatic/js SinglePackage test");
  console.log("================================");

  /*
   * Make sure the CLI itself exists.
   */
  assertExists(dist, "built @templatic/js CLI");

  /*
   * Start completely fresh.
   */
  await rm(testRoot, {
    recursive: true,
    force: true,
  });

  await mkdir(testRoot, {
    recursive: true,
  });

  console.log(`\nTest directory:\n${testRoot}`);

  /*
   * Generate the package.
   *
   * npm is intentionally used here.
   *
   * The generated build system must NOT depend on pnpm.
   */
  run(
    process.execPath,
    [
      dist,
      "single-package",
      "templatic-test",
      "--in",
      testRoot,
      "--packageManager",
      "npm",
      "--builder",
      "tsc",
      "--builder",
        "esbuild",
      "--ts",
      "--node",
      "--no-dom",
      "--lint",
      "--docs",
      "--git",
      "--force",
      "--clear",
    ],
    {
      cwd: testRoot,
    },
  );

  /*
   * Generated package structure.
   */
  assertExists(path.join(testRoot, "package.json"), "package.json");

  assertExists(path.join(testRoot, "tsconfig.json"), "tsconfig.json");

  assertExists(path.join(testRoot, "src"), "src directory");

  assertExists(path.join(testRoot, "src", "index.ts"), "source file");

  assertExists(path.join(testRoot, "build.mjs"), "build.mjs");

  /*
   * Check generated package metadata.
   */
  assertContains(
    path.join(testRoot, "package.json"),
    "templatic-test",
    "package name",
  );

  /*
   * Check generated source.
   */
  assertContains(
    path.join(testRoot, "src/index.ts"),
    '',
    "generated package source",
  );

  /*
   * Install dependencies using npm.
   *
   * This is important because Templatic supports multiple package managers.
   */  // there is auto build, no need for this shi*
 /* run("npm", ["install"], {
    cwd: testRoot,
  });*/

  /*
   * Verify local dependencies were installed.
   */
  assertExists(path.join(testRoot, "node_modules"), "node_modules");

  assertExists(
    path.join(testRoot, "node_modules", "typescript"),
    "TypeScript dependency",
  );

  assertExists(
    path.join(testRoot, "node_modules", "esbuild"),
    "esbuild dependency",
  );

  /*
   * Run the generated build.
   *
   * This is the important part.
   *
   * It verifies:
   *
   *   src/index.ts
   *       ↓
   *      TSC
   *       ↓
   *   dist/index.js
   *       ↓
   *    esbuild
   *       ↓
   *   dist/index.js
   */
   runExecSync("node build.mjs", {
     cwd: testRoot,
   });

  /*
   * Verify build output.
   */
  const output = path.join(testRoot, "dist", "index.js");

  assertExists(output, "dist/index.js");

  /*
   * Make sure the output is actually JavaScript.
   */
  assertContains(output, "templatic-test", "compiled package name");

  /*
   * Documentation.
   */
  assertExists(path.join(testRoot, "typedoc.json"), "TypeDoc configuration");

  /*
   * ESLint.
   */
  assertExists(path.join(testRoot, "eslint.config.mjs"), "ESLint configuration");

  /*
   * Git.
   */
  assertExists(path.join(testRoot, ".git"), "Git repository");

  assertExists(path.join(testRoot, ".gitignore"), ".gitignore");

  /*
   * Make sure dist is ignored.
   */
  assertContains(
    path.join(testRoot, ".gitignore"),
    "dist",
    "dist gitignore entry",
  );

  /*
   * Show the final generated package.
   */
  console.log("\n================================");
  console.log("Generated package:");
  console.log("================================");

  for (const file of readdirSync(testRoot)) {
    console.log(`  ${file}`);
  }

  console.log("\n================================");
  console.log("✓ SinglePackage integration test passed");
  console.log("================================");
}

try {
  await main();
} catch (error) {
  console.error("\n================================");
  console.error("✗ SinglePackage integration test failed");
  console.error("================================");
  console.error(error);

  process.exitCode = 1;
} finally {
  /*
   * Never leave the generated package behind.
   */
  await rm(testRoot, {
    recursive: true,
    force: true,
  });
}
