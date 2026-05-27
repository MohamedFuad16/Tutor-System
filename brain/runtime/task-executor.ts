import OpenAI from "openai";
import { execFileSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { analyzeImpactForFiles } from "./impact-orchestrator";
import { retrieveContext } from "./context-orchestrator";

const ROOT = process.cwd();
const PLANS_DIR = path.join(ROOT, "brain/runtime/plans");
const FAILURE_DIR = path.join(ROOT, "brain/runtime/failures");

function arg(name: string, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function writeFile(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function taskId(task: string) {
  return `${Date.now()}-${crypto.createHash("sha1").update(task).digest("hex").slice(0, 8)}`;
}

function run(command: string, args: string[]) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function safetyCheck(task: string, files: string[]) {
  const lower = task.toLowerCase();
  if (
    files.some((file) => file.includes("longterm.memory")) &&
    !/(schema|migration|dexie|database)/.test(lower)
  ) {
    throw new Error(
      "Blocked: Dexie schema-sensitive work requires task text to explicitly mention schema, migration, Dexie, or database.",
    );
  }
  if (
    files.includes("server.ts") &&
    !/(api|endpoint|sse|stream|websocket|server)/.test(lower)
  ) {
    throw new Error(
      "Blocked: server contract work requires explicit API/server intent.",
    );
  }
  if (
    files.some((file) =>
      /^brain\/(knowledge|flows|contracts|impact|embeddings|retrieval\/vector-index)/.test(
        file,
      ),
    )
  ) {
    throw new Error(
      "Blocked: generated brain artifacts may only be changed through brain:generate/brain:embed/runtime benchmark.",
    );
  }
}

function renderPlan(
  id: string,
  task: string,
  context: ReturnType<typeof retrieveContext>,
  impacts: ReturnType<typeof analyzeImpactForFiles>,
) {
  return `# Autonomous Task Plan: ${task}

Task ID: ${id}
Generated: ${new Date().toISOString()}
Mode: plan-first gated

## Retrieved Context

Confidence: ${context.retrievalConfidence}

Files:
${context.dependencyAwareFiles.map((file) => `- ${file}`).join("\n")}

## Impact Summary

${impacts.map((impact) => `- ${impact.target}`).join("\n")}

## Required Execution Protocol

1. Inspect the retrieved files above.
2. Preserve mutation boundaries and generated-artifact rules.
3. Apply the minimum source changes needed for the task.
4. Run \`npm run brain:generate\`, \`npm run brain:embed\`, \`npm run brain:runtime-benchmark\`, \`npm run brain:verify\`, \`npm run brain:drift-check\`, \`npm run brain:self-audit\`, \`npm run lint\`, and \`npm run build\`.
5. Append task memory only after verification passes.

## Context Snippets

${context.chunks.map((chunk) => `### ${chunk.file}:${chunk.startLine}\n\n\`\`\`\n${chunk.snippet.slice(0, 2500)}\n\`\`\``).join("\n\n")}
`;
}

async function generatePatch(task: string, plan: string) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    throw new Error(
      "Execute mode requires OPENAI_API_KEY or OPENROUTER_API_KEY.",
    );
  const client = new OpenAI({
    apiKey,
    baseURL:
      process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY
        ? "https://openrouter.ai/api/v1"
        : undefined,
  });
  const response = await client.chat.completions.create({
    model:
      process.env.BRAIN_EXECUTOR_MODEL ||
      (process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY
        ? "openai/gpt-4o-mini"
        : "gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content:
          "Return only a valid unified diff patch. Do not include prose. Do not edit generated brain artifacts directly.",
      },
      { role: "user", content: `Task:\n${task}\n\nPlan and context:\n${plan}` },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? "";
}

async function main() {
  const task = arg("task");
  const mode = arg("mode", "plan");
  if (!task)
    throw new Error(
      'Usage: npm run brain:execute -- --task "<task>" --mode plan|execute',
    );
  const id = taskId(task);
  const context = retrieveContext(task);
  safetyCheck(task, context.dependencyAwareFiles);
  const impacts = analyzeImpactForFiles(context.dependencyAwareFiles);
  run("npm", ["run", "--silent", "brain:verify"]);
  const plan = renderPlan(id, task, context, impacts);
  const planPath = path.join(PLANS_DIR, `${id}.md`);
  writeFile(planPath, plan);

  if (mode !== "execute") {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "plan",
          planPath,
          contextFiles: context.dependencyAwareFiles,
        },
        null,
        2,
      ),
    );
    return;
  }

  try {
    const patch = await generatePatch(task, plan);
    if (!patch.startsWith("diff --git"))
      throw new Error("Model did not return a unified git diff.");
    const patchPath = path.join(PLANS_DIR, `${id}.patch`);
    writeFile(patchPath, `${patch}\n`);
    run("git", ["apply", "--check", patchPath]);
    run("git", ["apply", patchPath]);
    run("npm", ["run", "brain:generate"]);
    run("npm", ["run", "brain:embed"]);
    run("npm", ["run", "brain:runtime-benchmark"]);
    run("npm", ["run", "brain:self-audit"]);
    run("npm", ["run", "brain:verify"]);
    run("npm", ["run", "brain:drift-check"]);
    run("npm", ["run", "lint"]);
    run("npm", ["run", "build"]);
    run("npm", [
      "run",
      "brain:memory",
      "--",
      "append",
      "--objective",
      task,
      "--systems",
      "autonomous-executor",
      "--files",
      context.dependencyAwareFiles.join(","),
      "--invariants",
      "plan-first-gated-execution,generated-artifact-boundary",
      "--risks",
      "model-generated-patch-risk",
      "--verification",
      JSON.stringify({
        brainGenerate: true,
        brainEmbed: true,
        runtimeBenchmark: true,
        selfAudit: true,
        brainVerify: true,
        driftCheck: true,
        lint: true,
        build: true,
      }),
      "--regeneration",
      "complete",
      "--decisions",
      "append-memory-only-after-verification",
    ]);
    console.log(
      JSON.stringify(
        { ok: true, mode: "execute", planPath, patchPath },
        null,
        2,
      ),
    );
  } catch (error) {
    const failurePath = path.join(FAILURE_DIR, `${id}.json`);
    writeFile(
      failurePath,
      `${JSON.stringify({ task, planPath, error: error instanceof Error ? error.message : String(error), generatedAt: new Date().toISOString() }, null, 2)}\n`,
    );
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
