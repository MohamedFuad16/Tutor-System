import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  isIgnored,
  isSourceScoped,
  rel,
  ROOT,
  watchRoots,
} from "./source-scope";

const STATUS_PATH = path.join(ROOT, "brain/autonomy/status.json");
const DEBOUNCE_MS = Number(process.env.BRAIN_AUTO_DEBOUNCE_MS || 2500);

let timer: NodeJS.Timeout | null = null;
let running = false;
let pendingReason = "";

function writeStatus(patch: Record<string, unknown>) {
  fs.mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  const current = fs.existsSync(STATUS_PATH)
    ? JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"))
    : {};
  fs.writeFileSync(
    STATUS_PATH,
    `${JSON.stringify({ ...current, ...patch }, null, 2)}\n`,
  );
}

function queueRefresh(reason: string) {
  pendingReason = reason;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runRefresh, DEBOUNCE_MS);
  writeStatus({
    watcher: "queued",
    queuedAt: new Date().toISOString(),
    pendingReason,
  });
}

function runRefresh() {
  if (running) {
    queueRefresh(pendingReason || "refresh-running");
    return;
  }
  running = true;
  const reason = pendingReason || "source-change";
  pendingReason = "";
  writeStatus({
    watcher: "running",
    reason,
    startedAt: new Date().toISOString(),
  });

  const child = spawn(
    "npm",
    ["run", "brain:postchange", "--", "--reason", reason],
    {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    },
  );

  child.on("exit", (code) => {
    running = false;
    writeStatus({
      watcher: code === 0 ? "idle" : "failed",
      lastExitCode: code,
      lastFinishedAt: new Date().toISOString(),
    });
  });
}

function shouldHandle(file: string) {
  const relative = file.replace(/\\/g, "/");
  return !isIgnored(relative) && isSourceScoped(relative);
}

function main() {
  const roots = watchRoots();
  writeStatus({
    watcher: "starting",
    roots: roots.map(rel),
    startedAt: new Date().toISOString(),
  });
  roots.forEach((root) => {
    const stats = fs.statSync(root);
    if (!stats.isDirectory()) return;
    fs.watch(root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const relative = rel(path.join(root, String(filename)));
      if (shouldHandle(relative)) queueRefresh(relative);
    });
  });
  roots
    .filter((root) => fs.statSync(root).isFile())
    .forEach((file) => {
      fs.watch(file, () => {
        const relative = rel(file);
        if (shouldHandle(relative)) queueRefresh(relative);
      });
    });
  writeStatus({
    watcher: "idle",
    roots: roots.map(rel),
    readyAt: new Date().toISOString(),
  });
  console.log(
    `Brain autonomy watcher ready for ${roots.length} roots. Debounce: ${DEBOUNCE_MS}ms.`,
  );
}

main();
