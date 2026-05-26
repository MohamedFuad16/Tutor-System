import { db } from "../memory/longterm.memory";
import { useStore } from "../store";
import { ensureBrainRuntime, isBrainRuntimeEnabled } from "./runtimeTelemetry";
import { instrumentDexie } from "./instrumentDexie";
import { instrumentFetch } from "./instrumentFetch";
import { instrumentWebSocket } from "./instrumentWebSocket";
import { instrumentZustand } from "./instrumentZustand";

export function installBrainRuntime() {
  ensureBrainRuntime();
  if (!isBrainRuntimeEnabled()) return;
  instrumentFetch();
  instrumentWebSocket();
  instrumentZustand(useStore);
  instrumentDexie(db);
}
