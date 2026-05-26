import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const TASK_DIR = path.join(ROOT, "brain/tasks");
const MEMORY_PATH = path.join(TASK_DIR, "task-memory.json");
const DECISION_CHAINS_PATH = path.join(TASK_DIR, "decision-chains.json");
const RISK_HISTORY_PATH = path.join(TASK_DIR, "risk-history.json");
const FRAGILE_SYSTEMS_PATH = path.join(TASK_DIR, "fragile-systems.json");

type VerificationResults = Record<string, unknown>;

type TaskRecord = {
  id: string;
  timestamp: string;
  objective: string;
  systemsAffected: string[];
  filesChanged: string[];
  invariantsTouched: string[];
  risksIntroduced: string[];
  verificationResults: VerificationResults;
  unresolvedIssues: string[];
  regenerationStatus: string;
  decisions?: string[];
  failureModes?: string[];
  migrations?: string[];
  rollbackNotes?: string[];
  linkedTaskIds?: string[];
};

type MemoryIndexes = {
  decisionChains: Array<{
    key: string;
    tasks: Array<{ id: string; timestamp: string; objective: string; filesChanged: string[]; risksIntroduced: string[] }>;
  }>;
  riskHistory: Array<{
    risk: string;
    count: number;
    tasks: Array<{ id: string; timestamp: string; objective: string; systemsAffected: string[]; unresolvedIssues: string[] }>;
  }>;
  fragileSystems: Array<{
    system: string;
    score: number;
    taskCount: number;
    riskCount: number;
    failureCount: number;
    unresolvedCount: number;
    files: string[];
  }>;
};

function ensureDir() {
  fs.mkdirSync(TASK_DIR, { recursive: true });
}

function parseJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseList(value = "") {
  return normalizeList(value);
}

function normalizeTask(raw: Partial<TaskRecord>, index: number): TaskRecord {
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `task-${index}`,
    timestamp: typeof raw.timestamp === "string" && raw.timestamp ? raw.timestamp : new Date(0).toISOString(),
    objective: typeof raw.objective === "string" && raw.objective ? raw.objective : "Unspecified task",
    systemsAffected: normalizeList(raw.systemsAffected),
    filesChanged: normalizeList(raw.filesChanged),
    invariantsTouched: normalizeList(raw.invariantsTouched),
    risksIntroduced: normalizeList(raw.risksIntroduced),
    verificationResults: raw.verificationResults && typeof raw.verificationResults === "object" && !Array.isArray(raw.verificationResults) ? raw.verificationResults : {},
    unresolvedIssues: normalizeList(raw.unresolvedIssues),
    regenerationStatus: typeof raw.regenerationStatus === "string" && raw.regenerationStatus ? raw.regenerationStatus : "unknown",
    decisions: normalizeList(raw.decisions),
    failureModes: normalizeList(raw.failureModes),
    migrations: normalizeList(raw.migrations),
    rollbackNotes: normalizeList(raw.rollbackNotes),
    linkedTaskIds: normalizeList(raw.linkedTaskIds),
  };
}

function readMemory(): TaskRecord[] {
  const data = parseJson<unknown>(MEMORY_PATH, []);
  if (!Array.isArray(data)) return [];
  return data.map((record, index) => normalizeTask(record as Partial<TaskRecord>, index));
}

function writeJson(file: string, value: unknown) {
  ensureDir();
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMemory(records: TaskRecord[]) {
  writeJson(MEMORY_PATH, records);
  rebuildIndexes(records);
}

function option(args: string[], name: string) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] ?? "" : "";
}

function collectOption(args: string[], name: string) {
  return parseList(option(args, name));
}

function optionListOr(args: string[], name: string, fallback = "") {
  const explicit = collectOption(args, name);
  return explicit.length > 0 ? explicit : parseList(fallback);
}

function append(args: string[]) {
  const record: TaskRecord = {
    id: `task-${Date.now()}`,
    timestamp: new Date().toISOString(),
    objective: option(args, "objective") || args[0] || "Unspecified task",
    systemsAffected: optionListOr(args, "systems", args[1]),
    filesChanged: optionListOr(args, "files", args[2]),
    invariantsTouched: optionListOr(args, "invariants", args[3]),
    risksIntroduced: optionListOr(args, "risks", args[4]),
    verificationResults: option(args, "verification") ? JSON.parse(option(args, "verification")) : args[5] ? JSON.parse(args[5]) : {},
    unresolvedIssues: optionListOr(args, "unresolved", args[6]),
    regenerationStatus: option(args, "regeneration") || args[7] || "unknown",
    decisions: collectOption(args, "decisions"),
    failureModes: collectOption(args, "failures"),
    migrations: collectOption(args, "migrations"),
    rollbackNotes: collectOption(args, "rollback"),
    linkedTaskIds: [],
  };
  const records = linkTasks([...readMemory(), record]);
  writeMemory(records);
  console.log(JSON.stringify(record, null, 2));
}

function linkTasks(records: TaskRecord[]) {
  return records.map((record) => {
    const linked = records
      .filter((candidate) => candidate.id !== record.id)
      .filter((candidate) => {
        const sharedFiles = candidate.filesChanged.some((file) => record.filesChanged.includes(file));
        const sharedInvariants = candidate.invariantsTouched.some((invariant) => record.invariantsTouched.includes(invariant));
        const sharedSystems = candidate.systemsAffected.some((system) => record.systemsAffected.includes(system));
        return sharedFiles || sharedInvariants || sharedSystems;
      })
      .map((candidate) => candidate.id)
      .slice(0, 12);
    return { ...record, linkedTaskIds: linked };
  });
}

function addMapEntry<T>(map: Map<string, T[]>, key: string, value: T) {
  if (!key) return;
  map.set(key, [...(map.get(key) ?? []), value]);
}

function buildIndexes(records: TaskRecord[]): MemoryIndexes {
  const linked = linkTasks(records);
  const decisions = new Map<string, TaskRecord[]>();
  const risks = new Map<string, TaskRecord[]>();
  const systems = new Map<string, TaskRecord[]>();

  linked.forEach((record) => {
    [...record.decisions ?? [], ...record.invariantsTouched].forEach((key) => addMapEntry(decisions, key, record));
    record.risksIntroduced.forEach((risk) => addMapEntry(risks, risk, record));
    record.failureModes?.forEach((failure) => addMapEntry(risks, `failure:${failure}`, record));
    record.systemsAffected.forEach((system) => addMapEntry(systems, system, record));
    record.filesChanged.forEach((file) => addMapEntry(systems, file, record));
  });

  return {
    decisionChains: [...decisions.entries()].sort((a, b) => b[1].length - a[1].length).map(([key, tasks]) => ({
      key,
      tasks: tasks.map((task) => ({
        id: task.id,
        timestamp: task.timestamp,
        objective: task.objective,
        filesChanged: task.filesChanged,
        risksIntroduced: task.risksIntroduced,
      })),
    })),
    riskHistory: [...risks.entries()].sort((a, b) => b[1].length - a[1].length).map(([risk, tasks]) => ({
      risk,
      count: tasks.length,
      tasks: tasks.map((task) => ({
        id: task.id,
        timestamp: task.timestamp,
        objective: task.objective,
        systemsAffected: task.systemsAffected,
        unresolvedIssues: task.unresolvedIssues,
      })),
    })),
    fragileSystems: [...systems.entries()].map(([system, tasks]) => {
      const files = [...new Set(tasks.flatMap((task) => task.filesChanged))].sort();
      const riskCount = tasks.reduce((sum, task) => sum + task.risksIntroduced.length, 0);
      const failureCount = tasks.reduce((sum, task) => sum + (task.failureModes?.length ?? 0), 0);
      const unresolvedCount = tasks.reduce((sum, task) => sum + task.unresolvedIssues.length, 0);
      return {
        system,
        score: tasks.length * 2 + riskCount * 3 + failureCount * 4 + unresolvedCount * 5,
        taskCount: tasks.length,
        riskCount,
        failureCount,
        unresolvedCount,
        files,
      };
    }).sort((a, b) => b.score - a.score),
  };
}

function rebuildIndexes(records = readMemory()) {
  const linked = linkTasks(records);
  const indexes = buildIndexes(linked);
  writeJson(MEMORY_PATH, linked);
  writeJson(DECISION_CHAINS_PATH, {
    metadata: { generatedAt: new Date().toISOString(), taskCount: linked.length },
    chains: indexes.decisionChains,
  });
  writeJson(RISK_HISTORY_PATH, {
    metadata: { generatedAt: new Date().toISOString(), taskCount: linked.length },
    risks: indexes.riskHistory,
  });
  writeJson(FRAGILE_SYSTEMS_PATH, {
    metadata: { generatedAt: new Date().toISOString(), taskCount: linked.length },
    systems: indexes.fragileSystems,
  });
  return indexes;
}

function query(args: string[]) {
  const fieldMap: Record<string, keyof TaskRecord> = {
    system: "systemsAffected",
    invariant: "invariantsTouched",
    risk: "risksIntroduced",
    file: "filesChanged",
    decision: "decisions",
    failure: "failureModes",
    migration: "migrations",
  };
  const records = readMemory();
  const field = option(args, "by");
  const value = (option(args, "value") || args.join(" ")).toLowerCase();
  const key = fieldMap[field] ?? null;
  const matches = records.filter((record) => {
    if (!value) return true;
    if (key) return normalizeList(record[key]).some((item) => item.toLowerCase().includes(value));
    return JSON.stringify(record).toLowerCase().includes(value);
  });
  console.log(JSON.stringify(matches, null, 2));
}

function validate() {
  const records = readMemory();
  const invalid = records.filter((record) => !record.id || !record.timestamp || !record.objective || !Array.isArray(record.filesChanged));
  const result = { ok: invalid.length === 0, taskCount: records.length, invalidTaskIds: invalid.map((record) => record.id) };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

function main() {
  const [command = "query", ...args] = process.argv.slice(2);
  if (command === "append") append(args);
  else if (command === "rebuild") console.log(JSON.stringify(rebuildIndexes(), null, 2));
  else if (command === "validate") validate();
  else query(args);
}

main();
