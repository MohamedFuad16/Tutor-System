import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const hooksPath = path.join(ROOT, ".githooks");
const preCommit = path.join(hooksPath, "pre-commit");

function main() {
  if (!fs.existsSync(path.join(ROOT, ".git"))) {
    console.log(JSON.stringify({ ok: true, installed: false, reason: "No .git directory found." }, null, 2));
    return;
  }
  if (!fs.existsSync(preCommit)) throw new Error("Missing .githooks/pre-commit.");
  fs.chmodSync(preCommit, 0o755);
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: ROOT, stdio: "ignore" });
  console.log(JSON.stringify({ ok: true, installed: true, hooksPath: ".githooks" }, null, 2));
}

main();
