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

type Mode = "audit" | "fix";

type CommandResult = {
  command: string;
  ok: boolean;
  exitCode: number;
  output: string;
  startedAt: string;
  finishedAt: string;
};

type ComponentTarget = {
  id: string;
  name: string;
  file: string;
  kind: string;
};

type RunEvent = {
  timestamp: string;
  type: string;
  message: string;
  data?: unknown;
};

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
  options: { allowFailure?: boolean; maxBuffer?: number } = {},
): CommandResult {
  const startedAt = new Date().toISOString();
  const label = [command, ...args].join(" ");
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: options.maxBuffer ?? 1024 * 1024 * 12,
    env: process.env,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.slice(-180_000);
  const commandResult = {
    command: label,
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    output,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  if (!commandResult.ok && !options.allowFailure) {
    throw new Error(
      `${label} failed with exit ${commandResult.exitCode}\n${output}`,
    );
  }
  return commandResult;
}

function discoverTargets(scope: string): ComponentTarget[] {
  const graph = readJson<{
    nodes: Array<{ id: string; type: string; label: string; file?: string }>;
  }>(path.join(ROOT, "brain/knowledge/graph.json"), { nodes: [] });
  const fromGraph = graph.nodes
    .filter((node) =>
      ["component", "route", "hook", "file"].includes(node.type),
    )
    .filter(
      (node) =>
        node.file &&
        (/^src\/(components|views|brain-runtime|memory)\//.test(node.file) ||
          /^brain\/.*\.ts$/.test(node.file) ||
          /^(server|generate-brain|init-task-memory)\.ts$/.test(node.file) ||
          /^scripts\/.*\.ts$/.test(node.file)),
    )
    .map((node) => ({
      id: node.id,
      name: node.label,
      file: node.file as string,
      kind: node.type,
    }));
  const unique = [
    ...new Map(
      fromGraph.map((target) => [
        `${target.kind}:${target.name}:${target.file}`,
        target,
      ]),
    ).values(),
  ].sort((a, b) => a.file.localeCompare(b.file));
  if (scope === "all") return unique;
  const normalized = scope.replace(/^component:/, "").replace(/^file:/, "");
  return unique.filter(
    (target) =>
      target.name.includes(normalized) || target.file.includes(normalized),
  );
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
    .map((file) => readJson<Record<string, any> | null>(path.join(componentsDir, file), null))
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
    finalCommands: options.finalCommands || metadata.finalCommands || [],
    unresolvedRisks: options.unresolvedRisks || metadata.unresolvedRisks || [],
    components,
  };
  writeJson(path.join(runDir, "summary.json"), snapshot);
  writeJson(path.join(runDir, "run.json"), snapshot);
  return snapshot;
}

function main() {
  const mode = (arg("mode", "fix") as Mode) || "fix";
  const scope = arg("scope", "all");
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

  const previous = readJson<Record<string, any>>(path.join(runDir, "run.json"), {});
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
    { allowFailure: true },
  );

  for (const target of queue) {
    if (completed.has(`${target.kind}:${target.name}:${target.file}`)) continue;
    const targetKey = `${target.kind}:${target.name}:${target.file}`;
    const componentStartedAt = new Date().toISOString();
    const filePath = path.join(ROOT, target.file);
    if (!fs.existsSync(filePath)) continue;

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
    const docs = docsForFile(target.file);
    const componentCommands: CommandResult[] = [];
    const findings: string[] = [];
    const changes: string[] = [];
    const backupPath = backupFile(runId, target.file);

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
    componentCommands.push(
      run("npm", ["run", "--silent", "brain:impact", "--", target.file], {
        allowFailure: true,
      }),
    );
    const formatCheck = run("npx", ["prettier", "--check", target.file], {
      allowFailure: true,
    });
    componentCommands.push(formatCheck);
    const lint = run("npm", ["run", "--silent", "lint"], {
      allowFailure: true,
    });
    componentCommands.push(lint);

    if (!formatCheck.ok) findings.push("Prettier reported formatting drift.");
    if (!lint.ok)
      findings.push("TypeScript/lint gate failed for the current workspace.");

    if (mode === "fix" && !formatCheck.ok) {
      const currentHash = sha256(fs.readFileSync(filePath));
      if (currentHash !== beforeHash)
        throw new Error(`Source hash changed before fix for ${target.file}`);
      run("npx", ["prettier", "--write", target.file]);
      const afterHash = sha256(fs.readFileSync(filePath));
      if (afterHash !== beforeHash) {
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

    const build = run("npm", ["run", "--silent", "build"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
    });
    componentCommands.push(build);
    if (!build.ok)
      findings.push("Production build failed after this component pass.");
    if (!skipRuntime && mode === "fix" && changes.length > 0) {
      componentCommands.push(
        run("npm", ["run", "--silent", "brain:runtime-benchmark"], {
          allowFailure: true,
          maxBuffer: 1024 * 1024 * 24,
        }),
      );
    }

    const afterHash = sha256(fs.readFileSync(filePath));
    const componentSummary = {
      timestamp: new Date().toISOString(),
      target,
      file: target.file,
      beforeHash,
      afterHash,
      changed: beforeHash !== afterHash,
      backupPath,
      docsEvidence: docs.map((id) => ({
        id,
        file: path.relative(ROOT, path.join(DOCS_DIR, `${id}.md`)),
        role: "official-docs-primary-evidence",
      })),
      findings,
      changes,
      reason: changes.length
        ? "The debug runner changed the file because a deterministic verification gate failed."
        : "No deterministic source change was needed for this component pass.",
      commands: componentCommands,
      startedAt: componentStartedAt,
      finishedAt: new Date().toISOString(),
    };
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
    run("npm", ["run", "--silent", "brain:generate"], { allowFailure: true }),
    run("npm", ["run", "--silent", "brain:embed"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
    }),
    run("npm", ["run", "--silent", "brain:runtime-benchmark"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
    }),
    run("npm", ["run", "--silent", "brain:verify"], { allowFailure: true }),
    run("npm", ["run", "--silent", "brain:drift-check"], {
      allowFailure: true,
    }),
    run("npm", ["run", "--silent", "brain:self-audit"], { allowFailure: true }),
    run("npm", ["run", "--silent", "format:check"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
    }),
    run("npm", ["run", "--silent", "lint"], { allowFailure: true }),
    run("npm", ["run", "--silent", "build"], {
      allowFailure: true,
      maxBuffer: 1024 * 1024 * 24,
    }),
  ];
  const ok = finalCommands.every((command) => command.ok);
  const summary = writeRunSnapshot(runDir, componentsDir, metadata, queue, completed, {
    status: ok ? "completed" : "failed-verification",
    finishedAt: new Date().toISOString(),
    finalCommands,
  });
  emit({
    type: "run-completed",
    message: `Debug run ${summary.status}`,
    data: summary,
  });
  if (!ok) process.exit(1);
}

main();
