import { execFileSync } from "child_process";

export type RetrievedContext = {
  task: string;
  contextPacks: unknown[];
  dependencyAwareFiles: string[];
  chunks: Array<{
    file: string;
    startLine: number;
    endLine: number;
    score: number;
    confidence: string;
    snippet: string;
  }>;
  retrievalConfidence: string;
};

export function retrieveContext(task: string): RetrievedContext {
  const output = execFileSync(
    "npm",
    ["run", "--silent", "brain:retrieve-semantic", "--", task],
    { encoding: "utf8" },
  );
  return JSON.parse(output) as RetrievedContext;
}
