import { execFileSync, type ExecFileSyncOptions } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ROOT } from "./source-scope";

const STATUS_PATH = path.join(ROOT, "brain/autonomy/status.json");

type StepResult = {
  name: string;
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  exitCode?: number;
  output: string;
};

function arg(name: string, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function ensureDir(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeStatus(value: unknown) {
  ensureDir(STATUS_PATH);
  fs.writeFileSync(STATUS_PATH, `${JSON.stringify(value, null, 2)}\n`);
}

function runStep(
  name: string,
  command: string,
  args: string[],
  options: ExecFileSyncOptions = {},
): StepResult {
  const startedAt = new Date().toISOString();
  try {
    const output = execFileSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    }) as string;
    return {
      name,
      ok: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      output,
    };
  } catch (error: any) {
    const output = `${error?.stdout?.toString?.() ?? ""}${error?.stderr?.toString?.() ?? ""}`;
    return {
      name,
      ok: false,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: typeof error?.status === "number" ? error.status : 1,
      output,
    };
  }
}

function parseJsonOutput(output: string) {
  try {
    return JSON.parse(output);
  } catch {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(output.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function main() {
  const reason = arg("reason", "source-change");
  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];

  const drift = runStep("brain:drift-check", "npm", [
    "run",
    "--silent",
    "brain:drift-check",
  ]);
  steps.push(drift);
  const driftPayload = parseJsonOutput(drift.output);
  const driftReportedStale = Boolean(driftPayload?.stale);
  const stale = driftReportedStale || (!drift.ok && Boolean(driftPayload));

  if (stale) {
    steps.push(
      runStep("brain:generate", "npm", ["run", "--silent", "brain:generate"]),
    );
    steps.push(
      runStep("brain:embed", "npm", ["run", "--silent", "brain:embed"]),
    );
    if (process.env.BRAIN_POSTCHANGE_SKIP_RUNTIME !== "1") {
      steps.push(
        runStep("brain:runtime-benchmark", "npm", [
          "run",
          "--silent",
          "brain:runtime-benchmark",
        ]),
      );
    }
  }

  steps.push(
    runStep("brain:verify", "npm", ["run", "--silent", "brain:verify"]),
  );
  steps.push(
    runStep("brain:self-audit", "npm", ["run", "--silent", "brain:self-audit"]),
  );

  const ok = steps.every(
    (step) =>
      step.ok || (step.name === "brain:drift-check" && driftReportedStale),
  );
  const status = {
    ok,
    staleBeforeRefresh: stale,
    reason,
    startedAt,
    finishedAt: new Date().toISOString(),
    snapshotGeneratedAt: driftPayload?.snapshotGeneratedAt ?? null,
    regenerationTargets: driftPayload?.regenerationTargets ?? [],
    steps,
  };
  writeStatus(status);
  console.log(JSON.stringify(status, null, 2));
  if (!ok) process.exit(1);
}

main();
