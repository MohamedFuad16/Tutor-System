/**
 * Store facade: one database handle, one repository per aggregate.
 */
import path from "node:path";
import { createActivityRepo } from "./activity.js";
import { openDatabase, type Db } from "./db.js";
import { createFileStore } from "./files.js";
import { createGuideRepo } from "./guides.js";
import { createLearningRepo } from "./learning.js";
import { createLibraryRepo } from "./library.js";
import { createMessageRepo } from "./messages.js";
import { createRetrieval } from "./retrieval.js";

export function createStore(dataDir: string, options: { inMemory?: boolean } = {}) {
  const db: Db = openDatabase(options.inMemory ? ":memory:" : path.join(dataDir, "tutor.sqlite"));
  return {
    db,
    library: createLibraryRepo(db),
    messages: createMessageRepo(db),
    retrieval: createRetrieval(db),
    guides: createGuideRepo(db),
    learning: createLearningRepo(db),
    activity: createActivityRepo(db),
    files: createFileStore(path.join(dataDir, "files")),
    close: () => db.close(),
  };
}

export type Store = ReturnType<typeof createStore>;
