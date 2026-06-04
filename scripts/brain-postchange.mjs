#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

const valueForArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasArg = (name) => args.includes(name);
const reason = valueForArg("--reason") || "unspecified";
const full = hasArg("--full");

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const run = (label, command, commandArgs) =>
  new Promise((resolve, reject) => {
    console.log(`\n[brain:postchange] ${label}`);
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code}`));
    });
  });

const graphifyOutPath = path.join(process.cwd(), "graphify-out");
const scratchPatterns = [
  "server.mjs",
  ".tmp-test",
  "node_modules/.cache",
  "/private/tmp",
  "codex-runtimes",
];

const textFilesIn = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await textFilesIn(fullPath)));
    } else if (/\.(json|md|html)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

const checkGraphifyScratchRefs = async () => {
  try {
    await stat(graphifyOutPath);
  } catch {
    console.log("[brain:postchange] graphify-out absent; scratch scan skipped");
    return;
  }

  const files = await textFilesIn(graphifyOutPath);
  const hits = [];
  for (const filePath of files) {
    const text = await readFile(filePath, "utf8");
    for (const pattern of scratchPatterns) {
      if (text.includes(pattern)) {
        hits.push(
          `${path.relative(process.cwd(), filePath)} includes ${pattern}`,
        );
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(
      `Graphify artifacts contain scratch references:\n${hits.join("\n")}`,
    );
  }

  console.log("[brain:postchange] graphify-out scratch scan passed");
};

console.log(`[brain:postchange] reason=${reason}`);
console.log(
  "[brain:postchange] Graphify remains the code architecture graph; this compatibility preflight does not regenerate graphify-out.",
);

try {
  await run("format check", npmCommand, ["run", "format:check"]);
  await run("typecheck", npmCommand, ["run", "lint"]);
  await run("production build", npmCommand, ["run", "build"]);
  await run("diff whitespace check", "git", ["diff", "--check"]);
  if (full) {
    await run("full test suite", npmCommand, ["run", "test"]);
  }
  await checkGraphifyScratchRefs();
  console.log("\n[brain:postchange] passed");
} catch (error) {
  console.error(`\n[brain:postchange] failed: ${error.message}`);
  process.exit(1);
}
