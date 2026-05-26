import React, { Profiler } from "react";
import { recordBrainRuntime } from "./runtimeTelemetry";

export function BrainRenderProfiler({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={(profilerId, phase, actualDuration, baseDuration, startTime, commitTime) => {
        recordBrainRuntime({
          type: "render",
          name: profilerId,
          durationMs: actualDuration,
          metadata: { phase, baseDuration, startTime, commitTime },
        });
      }}
    >
      {children}
    </Profiler>
  );
}
