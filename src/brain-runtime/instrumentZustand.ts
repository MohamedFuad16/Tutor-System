import { recordBrainRuntime } from "./runtimeTelemetry";

type StoreLike = {
  getState: () => unknown;
  subscribe: (listener: (state: unknown, previousState: unknown) => void) => () => void;
};

export function instrumentZustand(useStore: StoreLike) {
  const marker = "__brainRuntimeZustandInstrumented";
  if ((window as any)[marker]) return;
  (window as any)[marker] = true;

  useStore.subscribe((state, previousState) => {
    const current = state as Record<string, unknown>;
    const previous = previousState as Record<string, unknown>;
    const changed = Object.keys(current).filter((key) => current[key] !== previous[key]);
    changed.forEach((field) => {
      recordBrainRuntime({
        type: "state",
        name: field,
        metadata: {
          previousType: typeof previous[field],
          nextType: typeof current[field],
        },
      });
    });
  });
}
