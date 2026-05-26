import * as fs from "fs";
import * as path from "path";

const brainDir = path.join(process.cwd(), "brain");
const retrievalDir = path.join(brainDir, "retrieval");
const tasksDir = path.join(brainDir, "tasks");

[retrievalDir, tasksDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Create base task memory
const baseTask = {
  id: "task-001",
  objective: "Build the /brain AI engineering intelligence platform",
  systemsAffected: ["/brain", "Entire Repository"],
  filesChanged: ["brain/indexes/*", "brain/impact/*", "brain/retrieval/*", "brain/tasks/*"],
  architecturalDecisions: [
    "Used ts-morph for AST parsing because native node ast parsing is limited.",
    "Broke the brain down into impact, indexes, rules, and retrieval directories for efficient RAG.",
    "Generated dependency graphs to map the blast radius of future changes."
  ],
  downstreamRisks: [
    "The brain must be regenerated on every commit, otherwise it will drift from the codebase."
  ],
  migrationNotes: "All future autonomous agents MUST read the /brain before touching code.",
  followupWork: "Integrate this into a pre-commit hook to auto-regenerate AST graphs."
};

fs.writeFileSync(path.join(tasksDir, "task-memory.json"), JSON.stringify([baseTask], null, 2));

console.log("Task memory initialized.");
