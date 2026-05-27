import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();

export type ImpactReport = {
  target: string;
  staticImpact: unknown;
  runtimeImpact: unknown;
};

export function analyzeImpactForFiles(files: string[]): ImpactReport[] {
  return files.slice(0, 8).map((file) => {
    const staticOutput = execFileSync(
      "npm",
      ["run", "--silent", "brain:impact", "--", file],
      { encoding: "utf8" },
    );
    const runtimePath = path.join(
      ROOT,
      "brain/runtime/runtime-impact-map.json",
    );
    const runtimeImpact = fs.existsSync(runtimePath)
      ? JSON.parse(fs.readFileSync(runtimePath, "utf8"))
      : null;
    return {
      target: file,
      staticImpact: JSON.parse(staticOutput),
      runtimeImpact,
    };
  });
}
