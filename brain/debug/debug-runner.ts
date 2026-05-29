import { execFileSync, spawnSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const DEBUG_DIR = path.join(ROOT, "brain/debug");
const RUNS_DIR = path.join(DEBUG_DIR, "runs");
const BACKUP_DIR = path.join(DEBUG_DIR, "backups");
const MEMORY_GRAPH_PATH = path.join(DEBUG_DIR, "memory-graph.json");
const DOCS_DIR = path.join(ROOT, "brain/reference-docs");
const UI_REGRESSION_REPORT = path.join(
  DEBUG_DIR,
  "ui-regression",
  "latest.json",
);

type Mode = "audit" | "fix" | "scan" | "long-horizon";

type CommandResult = {
  command: string;
  ok: boolean;
  exitCode: number;
  output: string;
  startedAt: string;
  finishedAt: string;
  timedOut?: boolean;
};

type ComponentTarget = {
  id: string;
  name: string;
  file: string;
  kind: string;
};

type DebugPhase = {
  id: string;
  title: string;
  description: string;
};

type PhaseStatus = DebugPhase & {
  status: "completed";
  startedAt: string;
  finishedAt: string;
  details?: unknown;
};

type DetectorReport = Record<string, string[]>;

type DeterministicFixResult = {
  text: string;
  changes: string[];
  rules: Array<{
    id: string;
    evidence: string;
  }>;
};

type RunEvent = {
  timestamp: string;
  type: string;
  message: string;
  data?: unknown;
};

const DEBUG_PROCESS: DebugPhase[] = [
  {
    id: "parse-architecture",
    title: "Parse architecture",
    description: "Load /brain context and source metadata for the target.",
  },
  {
    id: "understand-purpose",
    title: "Understand purpose",
    description:
      "Classify the file role, target kind, and implementation intent.",
  },
  {
    id: "lock-scope",
    title: "Lock scope",
    description:
      "Confirm the target belongs to the requested task scope before spending global gates.",
  },
  {
    id: "analyze-dependencies",
    title: "Analyze dependencies",
    description:
      "Run impact analysis and capture upstream/downstream coupling.",
  },
  {
    id: "verify-mutation-boundary",
    title: "Verify boundary",
    description:
      "Check generated-artifact, database, routing, API, and broad shared-state boundaries before patching.",
  },
  {
    id: "detect-anti-patterns",
    title: "Detect anti-patterns",
    description:
      "Scan for risky implementation patterns and maintainability drift.",
  },
  {
    id: "detect-performance",
    title: "Detect performance issues",
    description: "Benchmark before patching and inspect avoidable hot paths.",
  },
  {
    id: "detect-stale-state",
    title: "Detect stale state",
    description: "Check hooks, stores, subscriptions, and cached state risks.",
  },
  {
    id: "detect-render",
    title: "Detect render problems",
    description:
      "Inspect React rendering, list keys, layout churn, and branch safety.",
  },
  {
    id: "detect-memory-leaks",
    title: "Detect memory leaks",
    description:
      "Check timers, listeners, sockets, observers, and cleanup paths.",
  },
  {
    id: "detect-async",
    title: "Detect async issues",
    description:
      "Check fetch, promises, abortability, error handling, and races.",
  },
  {
    id: "detect-typing",
    title: "Detect typing issues",
    description: "Check unsafe casts, implicit any usage, and weak contracts.",
  },
  {
    id: "detect-animation",
    title: "Detect animation issues",
    description:
      "Check motion usage, smoothness, reduced-motion, and layout animation risk.",
  },
  {
    id: "detect-api",
    title: "Detect API issues",
    description: "Check client/server contract usage and response handling.",
  },
  {
    id: "detect-accessibility",
    title: "Detect accessibility issues",
    description:
      "Check icon buttons, images, labels, keyboard reachability, and semantics.",
  },
  {
    id: "verify-live-surface",
    title: "Verify live surface",
    description:
      "For UI targets, require rendered, interactive, non-static surfaces that can be smoke-tested.",
  },
  {
    id: "execute-browser",
    title: "Execute browser",
    description:
      "Run the local app in a real browser automation context before accepting UI findings.",
  },
  {
    id: "test-viewports",
    title: "Test viewports",
    description:
      "Verify mobile, tablet, and desktop dimensions for overflow, clipping, and blank states.",
  },
  {
    id: "simulate-interactions",
    title: "Simulate interactions",
    description:
      "Click, type, toggle, navigate, and scroll through the target surface where possible.",
  },
  {
    id: "instrument-runtime",
    title: "Instrument runtime",
    description:
      "Capture browser console errors, frame timing, responsiveness, and route/runtime signals.",
  },
  {
    id: "check-visual-regression",
    title: "Check visual regression",
    description:
      "Record screenshot hashes and visual nonblank/overflow evidence for regression comparison.",
  },
  {
    id: "test-state-transitions",
    title: "Test state transitions",
    description:
      "Exercise route, toggle, loading, empty, disabled, error, and persisted-state transitions.",
  },
  {
    id: "compare-best-practices",
    title: "Compare against best practices",
    description:
      "Compare implementation against official docs and local architecture rules.",
  },
  {
    id: "search-documentation-patterns",
    title: "Search documentation patterns",
    description:
      "Map relevant official docs packs and secondary evidence slots.",
  },
  {
    id: "generate-improvements",
    title: "Generate improvements",
    description:
      "Produce a target-specific strategy from findings and evidence.",
  },
  {
    id: "gate-patch-safety",
    title: "Gate patch safety",
    description:
      "Patch only when evidence, scope, hash guard, and validation plan are strong enough.",
  },
  {
    id: "apply-patch",
    title: "Apply patch",
    description:
      "Apply guarded deterministic fixes with hash checks and rollback backup.",
  },
  {
    id: "run-validation",
    title: "Run validation",
    description: "Run format, lint, type, build, and local verification gates.",
  },
  {
    id: "run-regression-tests",
    title: "Run regression tests",
    description:
      "Measure post-change runtime, responsiveness, and regression signals.",
  },
  {
    id: "persist-findings",
    title: "Persist findings into brain",
    description:
      "Write append-only run artifacts, component ledger, and memory graph nodes.",
  },
];

const DEBUG_LOOP = [
  "scan",
  "scope",
  "understand",
  "audit",
  "boundary check",
  "detect bugs",
  "verify live UI",
  "execute browser",
  "test viewports",
  "simulate interactions",
  "instrument runtime",
  "check visual regressions",
  "test state transitions",
  "search best practices",
  "compare implementations",
  "gate patch safety",
  "patch issues",
  "run focused validation",
  "measure targeted regressions",
  "persist findings into brain",
  "repeat",
];

const SOURCE_FILE_PATTERN =
  /^(src\/.*\.(ts|tsx|js|jsx|json)|brain\/.*\.ts|scripts\/.*\.ts|(server|generate-brain|init-task-memory)\.ts)$/;

const EXCLUDED_SOURCE_PATTERNS = [
  /^brain\/debug\/runs\//,
  /^brain\/debug\/backups\//,
  /^brain\/reference-docs\//,
  /^brain\/runtime\/plans\//,
  /^brain\/.*\.(json|md)$/,
  /^dist\//,
  /^node_modules\//,
  /\/__snapshots__\//,
  /\/coverage\//,
  /\.tmp$/,
  /\.cache/,
];

function arg(name: string, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function writeJson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function appendNdjson(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(value)}\n`);
}

function run(
  command: string,
  args: string[],
  options: {
    allowFailure?: boolean;
    maxBuffer?: number;
    timeoutMs?: number;
    env?: NodeJS.ProcessEnv;
  } = {},
): CommandResult {
  const startedAt = new Date().toISOString();
  const label = [command, ...args].join(" ");
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: options.maxBuffer ?? 1024 * 1024 * 12,
    env: options.env ? { ...process.env, ...options.env } : process.env,
    timeout: options.timeoutMs,
  });
  const timedOut =
    (result.error as { code?: string } | undefined)?.code === "ETIMEDOUT";
  const output = `${result.stdout || ""}${result.stderr || ""}`.slice(-180_000);
  const commandResult = {
    command: label,
    ok: result.status === 0,
    exitCode: result.status ?? (timedOut ? 124 : 1),
    output: timedOut
      ? `${output}\nCommand timed out after ${options.timeoutMs}ms.`
      : output,
    startedAt,
    finishedAt: new Date().toISOString(),
    timedOut,
  };
  if (!commandResult.ok && !options.allowFailure) {
    throw new Error(
      `${label} failed with exit ${commandResult.exitCode}\n${output}`,
    );
  }
  return commandResult;
}

function labelCommand(result: CommandResult, suffix: string): CommandResult {
  return { ...result, command: `${result.command} ${suffix}` };
}

function runUiRegressionWithRetry(componentCommands: CommandResult[]) {
  const first = run("npm", ["run", "--silent", "brain:ui-regression"], {
    allowFailure: true,
    maxBuffer: 1024 * 1024 * 24,
    timeoutMs: 90_000,
  });
  componentCommands.push(first);
  if (first.ok || first.timedOut) return first;

  const retry = labelCommand(
    run("npm", ["run", "--silent", "brain:ui-regression"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
      timeoutMs: 90_000,
    }),
    "(retry after failed sample)",
  );
  componentCommands.push(retry);
  return retry;
}

function sourceFilesFromGit() {
  try {
    return execFileSync("git", ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 4,
    })
      .split("\n")
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFilesFromGit() {
  try {
    const changed = new Set<string>();
    for (const args of [
      ["diff", "--name-only", "HEAD"],
      ["diff", "--name-only", "--cached"],
    ]) {
      execFileSync("git", args, {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
      })
        .split("\n")
        .map((file) => file.trim())
        .filter(Boolean)
        .forEach((file) => changed.add(file));
    }
    return [...changed];
  } catch {
    return [];
  }
}

function isAuditableSourceFile(file: string) {
  return (
    SOURCE_FILE_PATTERN.test(file) &&
    !EXCLUDED_SOURCE_PATTERNS.some((pattern) => pattern.test(file))
  );
}

function targetKindForFile(file: string) {
  if (/^src\/components\//.test(file)) return "component";
  if (/^src\/views\//.test(file)) return "route";
  if (/^src\/hooks\//.test(file) || /\/use[A-Z][^/]*\.(ts|tsx)$/.test(file))
    return "hook";
  if (/^src\/context\//.test(file)) return "context";
  if (/^src\/store\//.test(file) || /store/i.test(path.basename(file)))
    return "store";
  if (/^src\/memory\//.test(file)) return "service";
  if (/^src\/lib\//.test(file)) return "utility";
  if (/^src\/brain-runtime\//.test(file)) return "service";
  if (/^scripts\//.test(file)) return "utility";
  if (/^brain\//.test(file)) return "brain-tooling";
  if (/^server\.ts$/.test(file)) return "api-service";
  return "file";
}

function targetNameForFile(file: string) {
  const basename = path.basename(file).replace(/\.(tsx?|jsx?|json)$/, "");
  const normalized = basename
    .replace(/[-_.]+(.)?/g, (_, next: string) =>
      next ? next.toUpperCase() : "",
    )
    .replace(/^./, (char) => char.toUpperCase());
  return normalized || file;
}

function discoverSourceTargets(): ComponentTarget[] {
  return sourceFilesFromGit()
    .filter(isAuditableSourceFile)
    .filter((file) => fs.existsSync(path.join(ROOT, file)))
    .map((file) => ({
      id: `source:${file}`,
      name: targetNameForFile(file),
      file,
      kind: targetKindForFile(file),
    }));
}

function targetSortGroup(target: ComponentTarget) {
  if (/^src\/views\//.test(target.file)) return 0;
  if (/^src\/components\//.test(target.file)) return 1;
  if (
    /^src\/(store|hooks|context|memory|lib|brain-runtime)\//.test(target.file)
  )
    return 2;
  if (/^server\.ts$/.test(target.file)) return 3;
  if (/^scripts\//.test(target.file)) return 4;
  if (/^brain\//.test(target.file)) return 5;
  return 6;
}

function sortDebugTargets(targets: ComponentTarget[]) {
  return [...targets].sort(
    (a, b) =>
      targetSortGroup(a) - targetSortGroup(b) ||
      a.file.localeCompare(b.file) ||
      a.kind.localeCompare(b.kind) ||
      a.name.localeCompare(b.name),
  );
}

function targetPriority(target: ComponentTarget) {
  if (target.id.startsWith("file:")) return 10;
  if (target.id.startsWith("source:")) return 30;
  if (target.kind === "file") return 20;
  return 40;
}

function bestTargetForFile(
  current: ComponentTarget | undefined,
  candidate: ComponentTarget,
) {
  if (!current) return candidate;
  const currentPriority = targetPriority(current);
  const candidatePriority = targetPriority(candidate);
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority ? candidate : current;
  }
  const currentHasFriendlyName = current.name !== current.file;
  const candidateHasFriendlyName = candidate.name !== candidate.file;
  if (candidateHasFriendlyName !== currentHasFriendlyName) {
    return candidateHasFriendlyName ? candidate : current;
  }
  return candidate.name.length < current.name.length ? candidate : current;
}

function dedupeTargetsByFile(targets: ComponentTarget[]) {
  const byFile = new Map<string, ComponentTarget>();
  for (const target of targets) {
    byFile.set(target.file, bestTargetForFile(byFile.get(target.file), target));
  }
  return sortDebugTargets([...byFile.values()]);
}

function discoverTargets(scope: string): ComponentTarget[] {
  const graph = readJson<{
    nodes: Array<{ id: string; type: string; label: string; file?: string }>;
  }>(path.join(ROOT, "brain/knowledge/graph.json"), { nodes: [] });
  const graphKinds = new Set([
    "component",
    "route",
    "hook",
    "file",
    "store",
    "service",
    "context",
    "utility",
    "api",
    "database",
    "server",
    "module",
  ]);
  const fromGraph = graph.nodes
    .filter((node) => graphKinds.has(node.type))
    .filter((node) => node.file && isAuditableSourceFile(node.file))
    .map((node) => ({
      id: node.id,
      name: node.label,
      file: node.file as string,
      kind:
        node.type === "file"
          ? targetKindForFile(node.file as string)
          : node.type,
    }));
  const unique = dedupeTargetsByFile([
    ...fromGraph,
    ...discoverSourceTargets(),
  ]);
  if (scope === "all") return unique;
  if (scope === "changed") {
    const changed = new Set(changedFilesFromGit());
    return unique.filter((target) => changed.has(target.file));
  }
  const normalized = scope.replace(/^component:/, "").replace(/^file:/, "");
  return unique.filter(
    (target) =>
      target.name.toLowerCase().includes(normalized.toLowerCase()) ||
      target.file.toLowerCase().includes(normalized.toLowerCase()) ||
      target.kind.toLowerCase().includes(normalized.toLowerCase()),
  );
}

function isUiTarget(target: ComponentTarget) {
  return (
    /\.(tsx|jsx)$/.test(target.file) &&
    (/^src\/(components|views)\//.test(target.file) ||
      target.kind === "component" ||
      target.kind === "route")
  );
}

function isGeneratedOrArtifactTarget(target: ComponentTarget) {
  return (
    /^brain\/(debug\/runs|debug\/backups|reference-docs|snapshots|verification)\//.test(
      target.file,
    ) || /\.(json|md|map)$/.test(target.file)
  );
}

function targetTouchesHighRiskBoundary(target: ComponentTarget, text: string) {
  return {
    database: /dexie|db\.version|indexedDB|schema/i.test(text),
    routing: /ViewState|setActiveView|activeView|createBrowserRouter/i.test(
      text,
    ),
    api:
      /^server\.ts$/.test(target.file) ||
      /app\.(get|post|put|patch|delete)/.test(text),
    websocket: /WebSocket|EventSource|SSE/i.test(text),
    sharedState: /zustand|useStore|create<|set\(/.test(text),
  };
}

function liveSurfaceReview(target: ComponentTarget, text: string) {
  const interactiveSignals = [
    /onClick=/,
    /onChange=/,
    /onSubmit=/,
    /useState\(/,
    /aria-pressed=/,
    /role=["']tab/,
    /input\b|select\b|textarea\b/,
  ];
  const isInteractive = interactiveSignals.some((pattern) =>
    pattern.test(text),
  );
  const notes: string[] = [];
  if (!isUiTarget(target)) {
    notes.push("Non-UI target; live surface smoke is not required.");
  } else if (isInteractive) {
    notes.push(
      "UI target has local interactive controls or stateful preview signals.",
    );
  } else {
    notes.push(
      "UI target looks static; verify the rendered surface has testable controls before accepting visual changes.",
    );
  }
  if (
    target.file === "src/views/RevisionView.tsx" &&
    /UI Component Snapshots/i.test(text) &&
    !/LiveComponentPreview/.test(text)
  ) {
    notes.push(
      "Revision design-language snapshots should use live previews, not static mock cards.",
    );
  }
  return {
    required: isUiTarget(target),
    requiredEvidence: isUiTarget(target)
      ? [
          "actual browser execution",
          "viewport testing",
          "interaction simulation",
          "runtime instrumentation",
          "visual regression checks",
          "state transition testing",
        ]
      : [],
    interactiveSignals: interactiveSignals
      .filter((pattern) => pattern.test(text))
      .map((pattern) => pattern.source),
    notes,
  };
}

function shouldRunWorkspaceGates(scope: string, changed: boolean) {
  return changed || scope !== "all";
}

/**
 * Skill.md §99-105: Every UI target must collect evidence for actual browser
 * execution, viewport testing, interaction simulation, runtime instrumentation,
 * visual regression checks, and state transition testing — regardless of
 * whether the file changed or the scope is "all". This is SEPARATE from the
 * workspace gate (lint/build/benchmark) deferral which still applies.
 */
function shouldRunBrowserEvidence(target: ComponentTarget) {
  return isUiTarget(target);
}

function shouldRunTargetRuntime(
  scope: string,
  target: ComponentTarget,
  changed: boolean,
) {
  // Runtime benchmark and full workspace gates still defer for unchanged all-scope.
  return changed || (scope !== "all" && isUiTarget(target));
}

function docsForFile(file: string) {
  const text = fs.existsSync(path.join(ROOT, file))
    ? fs.readFileSync(path.join(ROOT, file), "utf8")
    : "";
  const packageToDoc: Array<[RegExp, string]> = [
    [/from ['"]react['"]|React\./, "react"],
    [/typescript|\.tsx?$|type\s+|interface\s+/, "typescript"],
    [/tailwind|className=/, "tailwind"],
    [/motion\/react|from ['"]motion/, "motion"],
    [/dexie|useLiveQuery|db\./, "dexie"],
    [/zustand|useStore/, "zustand"],
    [/playwright|page\./, "playwright"],
    [/three|react-force-graph-3d|THREE/, "three"],
    [/react-pdf|pdfjs|Document|Page/, "react-pdf"],
    [/express|app\.(get|post|put|patch|delete)/, "express"],
  ];
  return packageToDoc
    .filter(([pattern]) => pattern.test(text))
    .map(([, doc]) => doc);
}

function detectTechnology(file: string, text: string, docs: string[]) {
  const technologies = new Set<string>();
  if (/\.(ts|tsx)$/.test(file)) technologies.add("TypeScript");
  if (/\.tsx$/.test(file) || /from ['"]react['"]|React\./.test(text))
    technologies.add("React");
  if (/className=|tailwind/i.test(text)) technologies.add("Tailwind CSS");
  if (/from ['"]motion\/react['"]|from ['"]framer-motion['"]/.test(text))
    technologies.add("Motion/Framer");
  if (/dexie|useLiveQuery|db\./.test(text)) technologies.add("Dexie");
  if (/zustand|create<|useStore/.test(text)) technologies.add("Zustand");
  if (/express|app\.(get|post|put|patch|delete)/.test(text))
    technologies.add("Express");
  if (/WebSocket|EventSource|SSE|fetch\(/.test(text))
    technologies.add("Browser networking");
  if (/react-force-graph-3d|three|THREE/.test(text))
    technologies.add("Three.js");
  docs.forEach((doc) => technologies.add(doc));
  return [...technologies];
}

function inferPurpose(target: ComponentTarget, text: string) {
  const exports = [
    ...text.matchAll(/export\s+(?:function|const|class)\s+(\w+)/g),
  ]
    .map((match) => match[1])
    .slice(0, 4);
  const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .slice(0, 6);
  const signals = [
    `${target.kind} target for ${target.name}`,
    exports.length
      ? `exports ${exports.join(", ")}`
      : "no named exports detected",
    imports.length
      ? `depends on ${imports.join(", ")}`
      : "no static imports detected",
  ];
  return signals.join("; ");
}

function pushIf(
  report: DetectorReport,
  category: string,
  condition: boolean,
  message: string,
) {
  if (!condition) return;
  report[category] = report[category] || [];
  report[category].push(message);
}

function detectIssues(target: ComponentTarget, text: string): DetectorReport {
  const report: DetectorReport = {
    antiPatterns: [],
    performance: [],
    responsiveness: [],
    staleState: [],
    render: [],
    memoryLeaks: [],
    async: [],
    typing: [],
    animation: [],
    smoothness: [],
    api: [],
    accessibility: [],
  };
  const browserSource = /^src\//.test(target.file);
  const jsxSource = /\.(tsx|jsx)$/.test(target.file);
  const reactSurface =
    jsxSource ||
    target.kind === "component" ||
    target.kind === "route" ||
    /from ['"]react['"]|React\./.test(text);

  pushIf(
    report,
    "antiPatterns",
    browserSource && /\bconsole\.(log|debug)\(/.test(text),
    "Browser debug console output is present; keep only intentional warnings/errors in UI code.",
  );
  pushIf(
    report,
    "antiPatterns",
    /new Function\(|eval\(/.test(text),
    "Dynamic code execution pattern detected and should be avoided unless sandboxed.",
  );
  pushIf(
    report,
    "performance",
    /\.toArray\(\)(?!\s*\.then\([^)]*slice)/.test(text) &&
      !/\.limit\(\d+\)/.test(text),
    "Dexie collection loads without an obvious limit; verify large datasets stay bounded.",
  );
  pushIf(
    report,
    "performance",
    /import\s+.*shiki|import\s+.*mermaid|import\s+.*react-force-graph-3d/.test(
      text,
    ),
    "Heavy renderer import is static; confirm it is route- or interaction-gated.",
  );
  pushIf(
    report,
    "responsiveness",
    jsxSource &&
      /(?:w|h)-\[\d+(?:px|rem)\]/.test(text) &&
      !/\b(max-w|min-w|sm:|md:|lg:|xl:)/.test(text),
    "Fixed dimensions appear without nearby responsive constraints.",
  );
  pushIf(
    report,
    "staleState",
    reactSurface &&
      /useEffect\(\s*\(\)\s*=>[\s\S]*?,\s*\[\s*\]\s*\)/.test(text) &&
      /useStore|props|active|current|selected/.test(text),
    "Empty dependency effect references app state signals; verify it cannot go stale.",
  );
  pushIf(
    report,
    "render",
    jsxSource &&
      /\.map\([\s\S]{0,220}=>[\s\S]{0,220}<[^>]+>/.test(text) &&
      !/\bkey=/.test(text),
    "Mapped JSX without an obvious key prop can cause unstable React reconciliation.",
  );
  pushIf(
    report,
    "memoryLeaks",
    hasPotentialLeakyEventListener(text),
    "Global or external event listener registration found without matching removal in the same file.",
  );
  pushIf(
    report,
    "memoryLeaks",
    /setInterval\(/.test(text) && !/clearInterval\(/.test(text),
    "Interval allocation found without matching clearInterval cleanup.",
  );
  pushIf(
    report,
    "async",
    /fetch\(/.test(text) && !/response\.ok|\.ok\)/.test(text),
    "Fetch usage does not show an explicit response.ok branch in this file.",
  );
  pushIf(
    report,
    "async",
    /fetch\(/.test(text) && !/AbortController|signal/.test(text),
    "Fetch usage is not obviously abortable; verify route changes cannot race stale updates.",
  );
  pushIf(
    report,
    "typing",
    /\bany\b|as any/.test(text),
    "Unsafe any typing is present; prefer explicit local contracts.",
  );
  pushIf(
    report,
    "animation",
    reactSurface &&
      /motion\./.test(text) &&
      !/useReducedMotion|prefers-reduced-motion/.test(text),
    "Motion usage lacks an obvious reduced-motion path.",
  );
  pushIf(
    report,
    "smoothness",
    jsxSource && /transition-all/.test(text),
    "transition-all can animate expensive layout properties; prefer scoped transition properties.",
  );
  pushIf(
    report,
    "api",
    /\/api\//.test(text) && !/try\s*{|catch\s*\(/.test(text),
    "API call path appears without local error handling.",
  );
  pushIf(
    report,
    "api",
    target.file === "server.ts" &&
      /\/api\/documents\/ingest/.test(text) &&
      /execFile\(/.test(text) &&
      !/maxBuffer/.test(text),
    "Document ingestion shells out without an enlarged maxBuffer; scanned PDFs can overflow stdout with base64 page images.",
  );
  pushIf(
    report,
    "api",
    target.file === "server.ts" &&
      /web_search/.test(text) &&
      !/Source-material questions come first/.test(text),
    "Chat search policy does not explicitly prioritize selected text, active book context, and current page vision before live web search.",
  );
  pushIf(
    report,
    "api",
    /deepseek\/deepseek-chat/.test(text) &&
      !/normalizeAiModel|legacy|deprecated|compatibility/.test(text),
    "Legacy DeepSeek chat alias detected; prefer the explicit DeepSeek V4 Flash model slug where chat defaults are configured.",
  );
  pushIf(
    report,
    "api",
    target.file === "server/web-search.ts" &&
      /latest\|current\|recent/.test(text) &&
      !/sourceMaterialRequest/.test(text),
    "Freshness detector lacks a source-material guard; current page/screen questions may trigger unnecessary web search.",
  );
  pushIf(
    report,
    "api",
    target.file === "scripts/classify_and_extract.py" &&
      /Scanned/.test(text) &&
      !/MAX_VISION_PAGES/.test(text),
    "Scanned document extraction renders page images without an explicit page cap.",
  );
  pushIf(
    report,
    "accessibility",
    jsxSource && /<img\b(?![^>]*\balt=)/.test(text),
    "Image element without an alt attribute detected.",
  );
  pushIf(
    report,
    "accessibility",
    jsxSource &&
      /<button\b(?![^>]*(aria-label|aria-labelledby|title=))[^>]*>\s*<([A-Z]\w*)\b/.test(
        text,
      ),
    "Icon-first button may need an accessible label.",
  );
  pushIf(
    report,
    "render",
    target.file === "src/views/RevisionView.tsx" &&
      /UI Component Snapshots/i.test(text) &&
      !/LiveComponentPreview/.test(text),
    "Design-language UI snapshots should render live component previews instead of static mockups.",
  );
  pushIf(
    report,
    "render",
    target.file === "src/views/RevisionView.tsx" &&
      /Wireframe Connections/i.test(text) &&
      !/markerEnd|arrow|connections/i.test(text),
    "Design-language wireframes should show clear directional connections, not isolated labels.",
  );
  pushIf(
    report,
    "render",
    target.file === "src/views/RevisionView.tsx" &&
      /WireframeMap/.test(text) &&
      /wireframeNodes[\s\S]{0,500}absolute/.test(text),
    "Wireframe map uses absolute floating nodes; prefer responsive zones or graph layout so labels cannot overlap on notebook widths.",
  );
  pushIf(
    report,
    "render",
    target.file === "src/views/RevisionView.tsx" &&
      /Library Book Card/.test(text) &&
      !/PatternCard/.test(text),
    "Design-language library snapshots should reuse the real book-card visual primitive rather than a generic card.",
  );

  if (target.kind === "route" || target.kind === "component") {
    pushIf(
      report,
      "render",
      text.length > 35_000,
      "Large React surface; consider extracting stable subcomponents if render churn appears.",
    );
  }

  return report;
}

function flattenFindings(report: DetectorReport) {
  return Object.entries(report).flatMap(([category, findings]) =>
    findings.map((finding) => `${category}: ${finding}`),
  );
}

function summarizeDocsComparison(docs: string[], report: DetectorReport) {
  const findingCount = flattenFindings(report).length;
  return {
    primaryEvidence: docs,
    status:
      findingCount === 0
        ? "No deterministic divergence from official-doc patterns detected."
        : `${findingCount} deterministic divergence signal(s) need review against official docs.`,
    categories: Object.fromEntries(
      Object.entries(report).map(([category, findings]) => [
        category,
        findings.length,
      ]),
    ),
  };
}

function generateImprovements(report: DetectorReport, changed: boolean) {
  const findings = flattenFindings(report);
  const improvements = findings.map((finding) => {
    const [, detail] = finding.split(": ");
    return detail || finding;
  });
  if (changed) {
    improvements.unshift(
      "Source now satisfies the deterministic formatting gate for this target.",
    );
  }
  if (!changed && findings.length > 0) {
    improvements.unshift(
      "Finding retained for a safe refactor pass; no deterministic patch rule could modify this target without broader semantic review.",
    );
  }
  if (improvements.length === 0) {
    improvements.push(
      "No deterministic patch was required; target was verified against the current gates.",
    );
  }
  return improvements;
}

function hasDetectorFinding(
  report: DetectorReport,
  category: string,
  phrase: string,
) {
  return (report[category] || []).some((finding) => finding.includes(phrase));
}

function addMissingImageAlt(source: string) {
  return source.replace(/<img\b([^>]*)>/g, (match, rawAttrs: string) => {
    if (/\balt\s*=/.test(rawAttrs)) return match;

    const selfClosing = /\/\s*$/.test(rawAttrs);
    const attrs = selfClosing
      ? rawAttrs.replace(/\/\s*$/, "").trimEnd()
      : rawAttrs;
    const suffix = selfClosing ? " />" : ">";
    return `<img alt=""${attrs}${suffix}`;
  });
}

function applyDeterministicFixes(
  target: ComponentTarget,
  source: string,
  report: DetectorReport,
): DeterministicFixResult {
  const isJsx = /\.(tsx|jsx)$/.test(target.file);
  let text = source;
  const changes: string[] = [];
  const rules: DeterministicFixResult["rules"] = [];

  if (
    isJsx &&
    hasDetectorFinding(report, "smoothness", "transition-all") &&
    /\btransition-all\b/.test(text)
  ) {
    text = text.replace(
      /\btransition-all\b/g,
      "transition-[color,background-color,border-color,box-shadow,transform,opacity]",
    );
    changes.push(
      "Replaced broad Tailwind transition-all usage with a scoped transition property list to avoid animating layout-heavy properties.",
    );
    rules.push({
      id: "tailwind-scoped-transition-properties",
      evidence:
        "Local smoothness rule backed by the Tailwind reference docs: transition utilities should name the properties the UI actually animates.",
    });
  }

  if (
    isJsx &&
    hasDetectorFinding(report, "accessibility", "Image element without") &&
    /<img\b/.test(text)
  ) {
    const before = text;
    text = addMissingImageAlt(text);
    if (text !== before) {
      changes.push(
        'Added alt="" to image elements without an explicit accessible text contract.',
      );
      rules.push({
        id: "jsx-image-alt-contract",
        evidence:
          "Accessibility rule backed by React and HTML practice: every image needs an alt contract; decorative or unknown-purpose images use an empty alt string.",
      });
    }
  }

  return { text, changes, rules };
}

function hasPotentialLeakyEventListener(text: string) {
  if (/removeEventListener\(/.test(text)) return false;
  return [...text.matchAll(/\baddEventListener\(/g)].some((match) => {
    const prefix = text.slice(Math.max(0, match.index - 5), match.index);
    return prefix !== "this.";
  });
}

function readUiRegressionReport() {
  return readJson<Record<string, unknown> | null>(UI_REGRESSION_REPORT, null);
}

function summarizeUiRegressionEvidence(report: Record<string, unknown> | null) {
  const results = Array.isArray(report?.results) ? report.results : [];
  return {
    ok: report?.ok === true,
    url: report?.url,
    requiredEvidence: report?.requiredEvidence ?? [],
    viewportCount: results.length,
    viewports: results.map((result) => {
      const item = result as {
        name?: string;
        width?: number;
        height?: number;
        horizontalOverflow?: number;
        browserExecuted?: boolean;
        interactionSimulation?: Record<string, boolean>;
        runtimeInstrumentation?: Record<string, unknown>;
        visualChecks?: Record<string, unknown>;
        stateTransitions?: Record<string, unknown>;
      };
      return {
        name: item.name,
        width: item.width,
        height: item.height,
        browserExecuted: item.browserExecuted,
        horizontalOverflow: item.horizontalOverflow,
        interactionSimulation: item.interactionSimulation,
        runtimeInstrumentation: item.runtimeInstrumentation,
        visualChecks: item.visualChecks,
        stateTransitions: item.stateTransitions,
      };
    }),
    failures: report?.failures ?? [],
  };
}

function ensureDocs() {
  if (!fs.existsSync(path.join(DOCS_DIR, "manifest.json"))) {
    run("npm", ["run", "--silent", "brain:docs:sync"], {
      maxBuffer: 1024 * 1024 * 20,
    });
  }
}

function backupFile(runId: string, file: string) {
  const source = path.join(ROOT, file);
  const destination = path.join(BACKUP_DIR, runId, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return destination;
}

function loadMemoryGraph() {
  return readJson<{ nodes: unknown[]; edges: unknown[]; updatedAt?: string }>(
    MEMORY_GRAPH_PATH,
    { nodes: [], edges: [] },
  );
}

function appendMemoryGraph(
  runId: string,
  target: ComponentTarget,
  summary: Record<string, unknown>,
) {
  const graph = loadMemoryGraph();
  const runNode = {
    id: `debug-run:${runId}`,
    type: "debugRun",
    label: runId,
    timestamp: summary.timestamp,
  };
  const componentNode = {
    id: `debug-component:${target.file}:${target.name}`,
    type: "component",
    label: target.name,
    file: target.file,
  };
  const findingNode = {
    id: `debug-finding:${runId}:${sha256(`${target.file}:${JSON.stringify(summary)}`).slice(0, 12)}`,
    type: "debugFinding",
    label: `${target.name} debug pass`,
    summary,
  };
  graph.nodes.push(runNode, componentNode, findingNode);
  graph.edges.push(
    {
      source: (runNode as any).id,
      target: (componentNode as any).id,
      type: "audited",
    },
    {
      source: (componentNode as any).id,
      target: (findingNode as any).id,
      type: "producedFinding",
    },
  );
  graph.updatedAt = new Date().toISOString();
  writeJson(MEMORY_GRAPH_PATH, graph);
}

function loadQueue(runDir: string, scope: string) {
  const queuePath = path.join(runDir, "queue.json");
  if (fs.existsSync(queuePath))
    return readJson<ComponentTarget[]>(queuePath, []);
  const targets = discoverTargets(scope);
  writeJson(queuePath, targets);
  return targets;
}

function readComponentSummaries(componentsDir: string) {
  if (!fs.existsSync(componentsDir)) return [];
  return fs
    .readdirSync(componentsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      readJson<Record<string, any> | null>(
        path.join(componentsDir, file),
        null,
      ),
    )
    .filter(Boolean)
    .sort((a, b) =>
      String(a?.finishedAt || a?.timestamp || "").localeCompare(
        String(b?.finishedAt || b?.timestamp || ""),
      ),
    );
}

function writeRunSnapshot(
  runDir: string,
  componentsDir: string,
  metadata: Record<string, any>,
  queue: ComponentTarget[],
  completed: Set<string>,
  options: {
    status?: string;
    activeTarget?: ComponentTarget | null;
    activePhase?: DebugPhase | null;
    finalCommands?: CommandResult[];
    finishedAt?: string | null;
    unresolvedRisks?: string[];
  } = {},
) {
  const components = readComponentSummaries(componentsDir);
  const completedCount = Math.max(completed.size, components.length);
  const snapshot = {
    ...metadata,
    status: options.status || metadata.status || "running",
    finishedAt: options.finishedAt ?? metadata.finishedAt ?? null,
    updatedAt: new Date().toISOString(),
    targetCount: queue.length,
    completedCount,
    changedCount: components.filter((item) => item?.changed).length,
    activeTarget: options.activeTarget ?? null,
    activePhase: options.activePhase ?? null,
    processOrder: DEBUG_PROCESS,
    debugLoop: DEBUG_LOOP,
    finalCommands: options.finalCommands || metadata.finalCommands || [],
    unresolvedRisks: options.unresolvedRisks || metadata.unresolvedRisks || [],
    components,
  };
  writeJson(path.join(runDir, "summary.json"), snapshot);
  writeJson(path.join(runDir, "run.json"), snapshot);
  return snapshot;
}

function main() {
  const requestedMode = arg("mode", "fix");
  const mode: Mode = ["audit", "fix", "scan", "long-horizon"].includes(
    requestedMode,
  )
    ? (requestedMode as Mode)
    : "fix";
  const scope = mode === "long-horizon" ? "all" : arg("scope", "all");
  const resume = arg("resume");
  const runId =
    resume || `debug-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runDir = path.join(RUNS_DIR, runId);
  const eventsPath = path.join(runDir, "events.ndjson");
  const componentsDir = path.join(runDir, "components");
  const skipRuntime = hasFlag("skip-runtime");

  fs.mkdirSync(componentsDir, { recursive: true });

  const emit = (event: Omit<RunEvent, "timestamp">) => {
    const payload = { timestamp: new Date().toISOString(), ...event };
    appendNdjson(eventsPath, payload);
    console.log(JSON.stringify(payload));
  };

  const previous = readJson<Record<string, any>>(
    path.join(runDir, "run.json"),
    {},
  );
  const metadata = {
    id: runId,
    mode,
    scope,
    status: "running",
    startedAt: previous.startedAt || new Date().toISOString(),
    skill: "tutor-debug",
  };

  const queue = loadQueue(runDir, scope);
  const completedPath = path.join(runDir, "completed.json");
  const completed = new Set(readJson<string[]>(completedPath, []));
  writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
    status: "running",
  });
  emit({
    type: "run-started",
    message: `Debug run ${runId} started`,
    data: metadata,
  });

  ensureDocs();

  run(
    "npm",
    [
      "run",
      "--silent",
      "brain:postchange",
      "--",
      "--reason",
      `debug-preflight:${runId}`,
    ],
    {
      allowFailure: true,
      timeoutMs: 120_000,
      env: {
        BRAIN_POSTCHANGE_SKIP_RUNTIME:
          skipRuntime || scope === "all"
            ? "1"
            : process.env.BRAIN_POSTCHANGE_SKIP_RUNTIME,
      },
    },
  );

  for (const target of queue) {
    if (completed.has(`${target.kind}:${target.name}:${target.file}`)) continue;
    const targetKey = `${target.kind}:${target.name}:${target.file}`;
    const componentStartedAt = new Date().toISOString();
    const filePath = path.join(ROOT, target.file);
    if (!fs.existsSync(filePath)) continue;
    const auditPhases: PhaseStatus[] = [];

    const startPhase = (phaseId: string) => {
      const phase = DEBUG_PROCESS.find((item) => item.id === phaseId);
      if (!phase) throw new Error(`Unknown debug phase ${phaseId}`);
      const startedAt = new Date().toISOString();
      emit({
        type: "component-phase-started",
        message: `${target.name}: ${phase.title}`,
        data: { target, phase },
      });
      writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
        status: "running",
        activeTarget: target,
        activePhase: phase,
      });
      return { phase, startedAt };
    };

    const finishPhase = (
      phaseState: { phase: DebugPhase; startedAt: string },
      details?: unknown,
    ) => {
      const completedPhase: PhaseStatus = {
        ...phaseState.phase,
        status: "completed",
        startedAt: phaseState.startedAt,
        finishedAt: new Date().toISOString(),
        details,
      };
      auditPhases.push(completedPhase);
      emit({
        type: "component-phase-completed",
        message: `${target.name}: ${phaseState.phase.title} completed`,
        data: { target, phase: completedPhase },
      });
      writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
        status: "running",
        activeTarget: target,
      });
      return completedPhase;
    };

    emit({
      type: "component-started",
      message: `Auditing ${target.name}`,
      data: target,
    });
    writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
      status: "running",
      activeTarget: target,
    });
    const before = fs.readFileSync(filePath);
    const beforeHash = sha256(before);
    const beforeText = before.toString("utf8");
    const docs = docsForFile(target.file);
    const technology = detectTechnology(target.file, beforeText, docs);
    const purpose = inferPurpose(target, beforeText);
    const componentCommands: CommandResult[] = [];
    const findings: string[] = [];
    const changes: string[] = [];
    const backupPath = backupFile(runId, target.file);

    const parsePhase = startPhase("parse-architecture");
    componentCommands.push(
      run(
        "npm",
        [
          "run",
          "--silent",
          "brain:retrieve",
          "--",
          `${target.name} ${target.file} debug refactor`,
        ],
        { allowFailure: true },
      ),
    );
    finishPhase(parsePhase, {
      sourceHash: beforeHash,
      retrieveCommand: componentCommands.at(-1),
    });

    const purposePhase = startPhase("understand-purpose");
    finishPhase(purposePhase, { purpose, technology, targetKind: target.kind });

    const scopePhase = startPhase("lock-scope");
    finishPhase(scopePhase, {
      scope,
      queueLength: queue.length,
      targetPosition:
        queue.findIndex(
          (item) => `${item.kind}:${item.name}:${item.file}` === targetKey,
        ) + 1,
      scopePolicy:
        scope === "all"
          ? "All-scope pass is allowed, but expensive workspace gates are deferred unless this target changes."
          : "Focused scope: target-level workspace gates and UI smoke checks are enabled.",
    });

    const dependencyPhase = startPhase("analyze-dependencies");
    componentCommands.push(
      run("npm", ["run", "--silent", "brain:impact", "--", target.file], {
        allowFailure: true,
      }),
    );
    const impactCommand = componentCommands.at(-1);
    finishPhase(dependencyPhase, {
      command: impactCommand,
      dependencyAnalysis: impactCommand?.ok
        ? "Impact analysis completed."
        : "Impact analysis returned a non-zero exit and is recorded for review.",
    });

    const boundaryPhase = startPhase("verify-mutation-boundary");
    const boundarySignals = targetTouchesHighRiskBoundary(target, beforeText);
    finishPhase(boundaryPhase, {
      generatedOrArtifactTarget: isGeneratedOrArtifactTarget(target),
      boundarySignals,
      policy:
        Object.values(boundarySignals).some(Boolean) ||
        isGeneratedOrArtifactTarget(target)
          ? "High-risk boundary detected; deterministic patches must stay local and require postchange verification."
          : "No high-risk boundary detected for this target.",
    });

    const detectorReport = detectIssues(target, beforeText);

    let benchmarkBefore: CommandResult | null = null;
    const detectorPhases: Array<{
      phaseId: string;
      category: keyof DetectorReport;
      benchmarkBefore?: boolean;
    }> = [
      { phaseId: "detect-anti-patterns", category: "antiPatterns" },
      {
        phaseId: "detect-performance",
        category: "performance",
        benchmarkBefore: true,
      },
      { phaseId: "detect-stale-state", category: "staleState" },
      { phaseId: "detect-render", category: "render" },
      { phaseId: "detect-memory-leaks", category: "memoryLeaks" },
      { phaseId: "detect-async", category: "async" },
      { phaseId: "detect-typing", category: "typing" },
      { phaseId: "detect-animation", category: "animation" },
      { phaseId: "detect-api", category: "api" },
      { phaseId: "detect-accessibility", category: "accessibility" },
    ];

    for (const detectorPhase of detectorPhases) {
      const phase = startPhase(detectorPhase.phaseId);
      if (
        detectorPhase.benchmarkBefore &&
        !skipRuntime &&
        shouldRunTargetRuntime(scope, target, false)
      ) {
        benchmarkBefore = run(
          "npm",
          ["run", "--silent", "brain:runtime-benchmark"],
          {
            allowFailure: true,
            maxBuffer: 1024 * 1024 * 24,
            timeoutMs: 90_000,
          },
        );
        componentCommands.push(benchmarkBefore);
      }
      finishPhase(phase, {
        category: detectorPhase.category,
        findings:
          detectorPhase.phaseId === "detect-performance"
            ? [
                ...(detectorReport.performance || []),
                ...(detectorReport.responsiveness || []),
                ...(detectorReport.smoothness || []),
              ]
            : detectorReport[detectorPhase.category] || [],
        benchmarkBefore: detectorPhase.benchmarkBefore ? benchmarkBefore : null,
        skipped: detectorPhase.benchmarkBefore
          ? skipRuntime || !shouldRunTargetRuntime(scope, target, false)
          : false,
      });
    }

    const liveSurfacePhase = startPhase("verify-live-surface");
    const liveSurface = liveSurfaceReview(target, beforeText);
    if (liveSurface.required && liveSurface.interactiveSignals.length === 0) {
      findings.push(
        "render: UI target needs a live interactive smoke path before visual changes are accepted.",
      );
    }
    finishPhase(liveSurfacePhase, liveSurface);

    let browserEvidenceCommand: CommandResult | null = null;
    let browserEvidenceReport: Record<string, unknown> | null = null;
    // Skill.md: ALL UI targets require browser evidence — not gated by changed/scope.
    const shouldCollectBrowserEvidence =
      liveSurface.required && !skipRuntime && shouldRunBrowserEvidence(target);
    if (shouldCollectBrowserEvidence) {
      browserEvidenceCommand = runUiRegressionWithRetry(componentCommands);
      browserEvidenceReport = readUiRegressionReport();
      if (!browserEvidenceCommand.ok) {
        findings.push(
          "render: Browser-backed UI regression evidence failed for this target.",
        );
      }
    }
    const browserEvidenceSummary = summarizeUiRegressionEvidence(
      browserEvidenceReport,
    );
    const browserExecutionPhase = startPhase("execute-browser");
    finishPhase(browserExecutionPhase, {
      command: browserEvidenceCommand,
      browserExecuted: browserEvidenceSummary.viewports.every(
        (viewport) => viewport.browserExecuted,
      ),
      skipped: !shouldCollectBrowserEvidence,
      policy:
        "UI targets must collect actual browser execution evidence through /browser when available or the Playwright-backed UI regression probe.",
    });
    const viewportPhase = startPhase("test-viewports");
    finishPhase(viewportPhase, {
      viewportCount: browserEvidenceSummary.viewportCount,
      viewports: browserEvidenceSummary.viewports.map((viewport) => ({
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        horizontalOverflow: viewport.horizontalOverflow,
      })),
      skipped: !shouldCollectBrowserEvidence,
    });
    const interactionPhase = startPhase("simulate-interactions");
    finishPhase(interactionPhase, {
      interactions: browserEvidenceSummary.viewports.map((viewport) => ({
        name: viewport.name,
        interactionSimulation: viewport.interactionSimulation,
      })),
      skipped: !shouldCollectBrowserEvidence,
    });
    const instrumentationPhase = startPhase("instrument-runtime");
    finishPhase(instrumentationPhase, {
      runtimeInstrumentation: browserEvidenceSummary.viewports.map(
        (viewport) => ({
          name: viewport.name,
          runtimeInstrumentation: viewport.runtimeInstrumentation,
        }),
      ),
      skipped: !shouldCollectBrowserEvidence,
    });
    const visualPhase = startPhase("check-visual-regression");
    finishPhase(visualPhase, {
      visualChecks: browserEvidenceSummary.viewports.map((viewport) => ({
        name: viewport.name,
        visualChecks: viewport.visualChecks,
      })),
      failures: browserEvidenceSummary.failures,
      skipped: !shouldCollectBrowserEvidence,
    });
    const stateTransitionPhase = startPhase("test-state-transitions");
    finishPhase(stateTransitionPhase, {
      stateTransitions: browserEvidenceSummary.viewports.map((viewport) => ({
        name: viewport.name,
        stateTransitions: viewport.stateTransitions,
      })),
      skipped: !shouldCollectBrowserEvidence,
    });

    const bestPracticePhase = startPhase("compare-best-practices");
    const bestPracticeComparison = summarizeDocsComparison(
      docs,
      detectorReport,
    );
    finishPhase(bestPracticePhase, bestPracticeComparison);

    const docsPhase = startPhase("search-documentation-patterns");
    const docsEvidence = docs.map((id) => ({
      id,
      file: path.relative(ROOT, path.join(DOCS_DIR, `${id}.md`)),
      role: "official-docs-primary-evidence",
    }));
    finishPhase(docsPhase, { docsEvidence });

    findings.push(...flattenFindings(detectorReport));

    const improvementsPhase = startPhase("generate-improvements");
    let plannedImprovements = generateImprovements(detectorReport, false);
    finishPhase(improvementsPhase, { plannedImprovements });

    const patchSafetyPhase = startPhase("gate-patch-safety");
    finishPhase(patchSafetyPhase, {
      mode,
      canPatch:
        (mode === "fix" || mode === "long-horizon") &&
        !isGeneratedOrArtifactTarget(target),
      hashGuard: beforeHash,
      patchPolicy:
        mode !== "fix" && mode !== "long-horizon"
          ? "Audit mode records findings only."
          : isGeneratedOrArtifactTarget(target)
            ? "Generated or artifact target is not patched directly."
            : mode === "long-horizon"
              ? "Long-Horizon Task Mode audits every queued target and may apply deterministic local patches with hash guard and rollback backup."
              : "Fix mode may apply deterministic local patches with hash guard and rollback backup.",
    });

    const patchPhase = startPhase("apply-patch");
    let deterministicFix: DeterministicFixResult = {
      text: fs.readFileSync(filePath, "utf8"),
      changes: [],
      rules: [],
    };
    const formatCheck = run("npx", ["prettier", "--check", target.file], {
      allowFailure: true,
    });
    componentCommands.push(formatCheck);

    if (!formatCheck.ok) findings.push("Prettier reported formatting drift.");

    if (
      (mode === "fix" || mode === "long-horizon") &&
      !isGeneratedOrArtifactTarget(target)
    ) {
      const currentHash = sha256(fs.readFileSync(filePath));
      if (currentHash !== beforeHash)
        throw new Error(`Source hash changed before fix for ${target.file}`);

      deterministicFix = applyDeterministicFixes(
        target,
        fs.readFileSync(filePath, "utf8"),
        detectorReport,
      );
      if (deterministicFix.changes.length > 0) {
        fs.writeFileSync(filePath, deterministicFix.text);
        changes.push(...deterministicFix.changes);
      }

      if (!formatCheck.ok || deterministicFix.changes.length > 0) {
        componentCommands.push(
          run("npx", ["prettier", "--write", target.file]),
        );
      }
      const afterHash = sha256(fs.readFileSync(filePath));
      if (afterHash !== beforeHash) {
        if (!formatCheck.ok)
          changes.push(
            "Applied Prettier formatting to match the repository formatting gate.",
          );
        componentCommands.push(
          run(
            "npm",
            [
              "run",
              "--silent",
              "brain:postchange",
              "--",
              "--reason",
              `debug-component:${target.file}`,
            ],
            { allowFailure: true },
          ),
        );
      }
    }
    finishPhase(patchPhase, {
      changed: changes.length > 0,
      changes,
      deterministicRules: deterministicFix.rules,
      backupPath,
      hashGuard: { beforeHash, currentHash: sha256(fs.readFileSync(filePath)) },
    });

    const validationPhase = startPhase("run-validation");
    const validationFormat = run("npx", ["prettier", "--check", target.file], {
      allowFailure: true,
    });
    componentCommands.push(validationFormat);
    const changedAfterPatch = sha256(fs.readFileSync(filePath)) !== beforeHash;
    const runWorkspaceGates = shouldRunWorkspaceGates(scope, changedAfterPatch);
    const lint = runWorkspaceGates
      ? run("npm", ["run", "--silent", "lint"], {
          allowFailure: true,
          timeoutMs: 90_000,
        })
      : null;
    if (lint) componentCommands.push(lint);
    const build = runWorkspaceGates
      ? run("npm", ["run", "--silent", "build"], {
          allowFailure: true,
          maxBuffer: 1024 * 1024 * 24,
          timeoutMs: 120_000,
        })
      : null;
    if (build) componentCommands.push(build);
    if (!validationFormat.ok)
      findings.push(
        "Prettier validation still fails after this component pass.",
      );
    if (lint && !lint.ok)
      findings.push("TypeScript/lint gate failed for the current workspace.");
    if (build && !build.ok)
      findings.push("Production build failed after this component pass.");
    finishPhase(validationPhase, {
      validationFormat,
      lint,
      build,
      skippedWorkspaceGates: !runWorkspaceGates,
      policy: runWorkspaceGates
        ? "Workspace gates ran because this was a focused scope or the target changed."
        : "Workspace lint/build deferred to final gates because all-scope target was unchanged.",
    });

    const regressionPhase = startPhase("run-regression-tests");
    let benchmarkAfter: CommandResult | null = null;
    let uiRegression: CommandResult | null = browserEvidenceCommand;
    let uiRegressionReport: Record<string, unknown> | null =
      browserEvidenceReport;
    const runTargetRuntime = shouldRunTargetRuntime(
      scope,
      target,
      changedAfterPatch,
    );
    if (!skipRuntime && runTargetRuntime) {
      benchmarkAfter = run(
        "npm",
        ["run", "--silent", "brain:runtime-benchmark"],
        {
          allowFailure: true,
          maxBuffer: 1024 * 1024 * 24,
          timeoutMs: 90_000,
        },
      );
      componentCommands.push(benchmarkAfter);
      if (!uiRegression) {
        uiRegression = runUiRegressionWithRetry(componentCommands);
        uiRegressionReport = readUiRegressionReport();
      }
    }
    finishPhase(regressionPhase, {
      benchmarkBefore,
      benchmarkAfter,
      uiRegression,
      uiRegressionReport,
      skipped: skipRuntime || !runTargetRuntime,
      policy: runTargetRuntime
        ? "Target-level runtime/UI regression ran because this target changed or scope is focused UI."
        : "Target-level runtime/UI regression deferred to final gates for unchanged all-scope target.",
    });

    const afterHash = sha256(fs.readFileSync(filePath));
    plannedImprovements = generateImprovements(
      detectorReport,
      beforeHash !== afterHash,
    );
    const persistPhase = startPhase("persist-findings");
    const componentSummary = {
      timestamp: new Date().toISOString(),
      target,
      componentName: target.name,
      file: target.file,
      kind: target.kind,
      beforeHash,
      afterHash,
      changed: beforeHash !== afterHash,
      backupPath,
      processOrder: DEBUG_PROCESS,
      auditSequence: DEBUG_LOOP,
      auditPhases,
      technology,
      purpose,
      dependencyAnalysis: impactCommand?.ok
        ? "Impact analysis completed."
        : "Impact analysis needs review; command output is attached.",
      detectors: detectorReport,
      bestPracticeComparison,
      docsEvidence,
      findings,
      changes,
      whatChanged: changes.length
        ? changes
        : findings.length
          ? [
              "No automatic source patch was applied; the findings need a safe semantic refactor rule or a model-backed cleanup pass.",
            ]
          : ["No source patch was applied during this target pass."],
      reason: changes.length
        ? "The debug runner changed the file because deterministic local evidence and official-doc comparison identified a safe cleanup rule."
        : findings.length
          ? "The debug runner found review-worthy issues, but none matched a safe deterministic auto-fix rule for this target."
          : "No deterministic source change was needed for this component pass.",
      whyChanged: changes.length
        ? "The guarded patch was limited to the affected file, protected by a source hash check, rollback backup, formatting, lint, build, runtime benchmark, and UI regression verification."
        : findings.length
          ? "Findings were preserved in the ledger instead of patched blindly. Add or enable a safe refactor rule before changing this source automatically."
          : "Current source matched the active debug rules and verification gates.",
      deterministicRules: deterministicFix.rules,
      improvements: plannedImprovements,
      improvementSummary: plannedImprovements.join(" "),
      benchmarkBefore,
      benchmarkAfter,
      uiRegression,
      uiRegressionReport,
      regressionResults: {
        validationFormat,
        lint,
        build,
        benchmarkBefore,
        benchmarkAfter,
        uiRegression,
        uiRegressionReport,
      },
      commands: componentCommands,
      startedAt: componentStartedAt,
      finishedAt: new Date().toISOString(),
    };
    finishPhase(persistPhase, {
      componentSummaryFile: path.join(
        "brain/debug/runs",
        runId,
        "components",
        `${sha256(targetKey).slice(0, 16)}.json`,
      ),
      memoryGraph: path.relative(ROOT, MEMORY_GRAPH_PATH),
    });
    writeJson(
      path.join(componentsDir, `${sha256(targetKey).slice(0, 16)}.json`),
      componentSummary,
    );
    appendMemoryGraph(runId, target, componentSummary);
    completed.add(targetKey);
    writeJson(completedPath, [...completed]);
    writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
      status: "running",
    });
    emit({
      type: "component-completed",
      message: `Completed ${target.name}`,
      data: componentSummary,
    });
  }

  const finalCommands = [
    run("npm", ["run", "--silent", "brain:generate"], {
      allowFailure: true,
      timeoutMs: 120_000,
    }),
    run("npm", ["run", "--silent", "brain:embed"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
      timeoutMs: 120_000,
    }),
    ...(!skipRuntime
      ? [
          run("npm", ["run", "--silent", "brain:runtime-benchmark"], {
            allowFailure: true,
            maxBuffer: 1024 * 1024 * 24,
            timeoutMs: 90_000,
          }),
          run("npm", ["run", "--silent", "brain:ui-regression"], {
            allowFailure: true,
            maxBuffer: 1024 * 1024 * 24,
            timeoutMs: 90_000,
          }),
        ]
      : []),
    run("npm", ["run", "--silent", "brain:verify"], {
      allowFailure: true,
      timeoutMs: 60_000,
    }),
    run("npm", ["run", "--silent", "brain:drift-check"], {
      allowFailure: true,
      timeoutMs: 60_000,
    }),
    run("npm", ["run", "--silent", "brain:self-audit"], {
      allowFailure: true,
      timeoutMs: 60_000,
    }),
    run("npm", ["run", "--silent", "format:check"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
      timeoutMs: 60_000,
    }),
    run("npm", ["run", "--silent", "lint"], {
      allowFailure: true,
      timeoutMs: 90_000,
    }),
    run("npm", ["run", "--silent", "build"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
      timeoutMs: 120_000,
    }),
  ];
  const ok = finalCommands.every((command) => command.ok);
  const summary = writeRunSnapshot(
    runDir,
    componentsDir,
    metadata,
    queue,
    completed,
    {
      status: ok ? "completed" : "failed-verification",
      finishedAt: new Date().toISOString(),
      finalCommands,
    },
  );
  emit({
    type: "run-completed",
    message: `Debug run ${summary.status}`,
    data: summary,
  });
  if (!ok) process.exit(1);
}

main();
