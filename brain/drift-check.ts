import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const SNAPSHOT_PATH = path.join(ROOT, "brain/snapshots/file-hashes.json");
const ALLOW = [/^src\//, /^server\.ts$/, /^generate-brain\.ts$/, /^init-task-memory\.ts$/, /^package\.json$/, /^package-lock\.json$/, /^tsconfig\.json$/, /^brain\/.*\.ts$/, /^scripts\/.*\.ts$/];
const EXCLUDE = [/^dist\//, /^node_modules\//, /^build\//, /^coverage\//, /^brain\/snapshots\//, /^brain\/diffs\//, /^brain\/verification\//, /(^|\/)\.DS_Store$/, /(^|\/)\.[^/]+$/, /\.d\.ts$/, /\.map$/, /__brain_audit_probe/];

function rel(file: string) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function include(file: string) {
  return ALLOW.some((pattern) => pattern.test(file)) && !EXCLUDE.some((pattern) => pattern.test(file));
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    const relative = rel(absolute);
    if (EXCLUDE.some((pattern) => pattern.test(relative))) return [];
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

function currentFiles() {
  const roots = ["src", "brain", "scripts", "server.ts", "generate-brain.ts", "init-task-memory.ts", "package.json", "package-lock.json", "tsconfig.json"];
  const files = roots.flatMap((item) => {
    const absolute = path.join(ROOT, item);
    if (!fs.existsSync(absolute)) return [];
    return fs.statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
  return Object.fromEntries(
    files
      .map((file) => rel(file))
      .filter(include)
      .map((file) => [file, { hash: sha256(fs.readFileSync(path.join(ROOT, file))) }]),
  );
}

function main() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.log(JSON.stringify({ ok: false, stale: true, reason: "Missing snapshot. Run npm run brain:generate." }, null, 2));
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as { generatedAt: string; files: Record<string, { hash: string }> };
  const current = currentFiles();
  const changed = Object.entries(current).filter(([file, data]) => snapshot.files[file]?.hash !== data.hash).map(([file]) => file);
  const deleted = Object.keys(snapshot.files).filter((file) => !current[file]);
  const added = Object.keys(current).filter((file) => !snapshot.files[file]);
  const stale = changed.length > 0 || deleted.length > 0 || added.length > 0;
  const targets = [...new Set([...changed, ...deleted, ...added].map((file) => {
    if (file.startsWith("src/store/")) return "state-flow";
    if (file === "server.ts") return "api-contracts";
    if (file === "src/App.tsx") return "route-map";
    if (file.startsWith("src/components/") || file.startsWith("src/views/")) return "render-graph";
    if (file.startsWith("src/memory/")) return "database-impact";
    if (file.startsWith("brain/")) return "brain-tooling";
    return "knowledge-graph";
  }))];
  const result = {
    ok: !stale,
    stale,
    checkedAt: new Date().toISOString(),
    snapshotGeneratedAt: snapshot.generatedAt,
    changed,
    added,
    deleted,
    regenerationTargets: targets,
  };
  console.log(JSON.stringify(result, null, 2));
  if (stale) process.exit(1);
}

main();
