import { recordBrainRuntime } from "./runtimeTelemetry";

type BrainDbLike = {
  tables: Array<{
    name: string;
    [key: string]: any;
  }>;
};

const READ_OPS = [
  "get",
  "toArray",
  "filter",
  "where",
  "orderBy",
  "limit",
  "count",
  "first",
];
const WRITE_OPS = [
  "add",
  "put",
  "update",
  "delete",
  "clear",
  "bulkAdd",
  "bulkPut",
];

export function instrumentDexie(db: BrainDbLike) {
  const marker = "__brainRuntimeDexieInstrumented";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  db.tables.forEach((table) => {
    [...READ_OPS, ...WRITE_OPS].forEach((operation) => {
      if (typeof table[operation] !== "function") return;
      const original = table[operation].bind(table);
      table[operation] = (...args: unknown[]) => {
        const startedAt = performance.now();
        try {
          const result = original(...args);
          const done = (status: "ok" | "error", error?: unknown) => {
            recordBrainRuntime({
              type: "database",
              name: table.name,
              durationMs: performance.now() - startedAt,
              metadata: {
                operation,
                mutation: WRITE_OPS.includes(operation),
                status,
                error:
                  error instanceof Error
                    ? error.message
                    : error
                      ? String(error)
                      : undefined,
              },
            });
          };
          if (result && typeof result.then === "function") {
            return result
              .then((value: unknown) => {
                done("ok");
                return value;
              })
              .catch((error: unknown) => {
                done("error", error);
                throw error;
              });
          }
          done("ok");
          return result;
        } catch (error) {
          recordBrainRuntime({
            type: "database",
            name: table.name,
            durationMs: performance.now() - startedAt,
            metadata: {
              operation,
              mutation: WRITE_OPS.includes(operation),
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            },
          });
          throw error;
        }
      };
    });
  });
}
