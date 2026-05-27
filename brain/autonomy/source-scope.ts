import * as fs from "fs";
import * as path from "path";

export const ROOT = process.cwd();

const ALLOW = [
  /^src\//,
  /^server\.ts$/,
  /^generate-brain\.ts$/,
  /^init-task-memory\.ts$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^tsconfig\.json$/,
  /^brain\/.*\.ts$/,
  /^scripts\/.*\.ts$/,
  /^skills\/.*\/SKILL\.md$/,
];

const EXCLUDE = [
  /^dist\//,
  /^node_modules\//,
  /^build\//,
  /^coverage\//,
  /^brain\/snapshots\//,
  /^brain\/diffs\//,
  /^brain\/verification\//,
  /^brain\/debug\/runs\//,
  /^brain\/debug\/backups\//,
  /^brain\/reference-docs\//,
  /^brain\/autonomy\/status\.json$/,
  /(^|\/)\.DS_Store$/,
  /(^|\/)\.[^/]+$/,
  /\.d\.ts$/,
  /\.map$/,
  /__brain_audit_probe/,
  /~$/,
  /\.tmp$/,
];

export function rel(file: string) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

export function isSourceScoped(relativePath: string) {
  return (
    ALLOW.some((pattern) => pattern.test(relativePath)) &&
    !EXCLUDE.some((pattern) => pattern.test(relativePath))
  );
}

export function isIgnored(relativePath: string) {
  return EXCLUDE.some((pattern) => pattern.test(relativePath));
}

export function watchRoots() {
  return [
    "src",
    "brain",
    "scripts",
    "skills",
    "server.ts",
    "generate-brain.ts",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
  ]
    .map((item) => path.join(ROOT, item))
    .filter((item) => fs.existsSync(item));
}
