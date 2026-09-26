/**
 * Dev-only design bench for diagrams: realistic flowcharts on every surface
 * (chat, notebook paper, voice stage), rendered through the real Diagram card.
 * Open http://localhost:<port>/#flowlab on the dev server. Never bundled in
 * production (main.tsx only imports it when import.meta.env.DEV).
 */
import { useState } from "react";
import { Diagram } from "@/components/Diagram";

const SAMPLES: Array<{ title: string; source: string }> = [
  {
    title: "Photosynthesis at a glance",
    source: `flowchart TD
  A([Sunlight reaches the leaf]) --> B[Chlorophyll absorbs light]
  B --> C{Enough water?}
  C -->|Yes| D[Water is split, oxygen released]
  C -->|No| E[Stomata close to save water]
  D --> F[(ATP and NADPH)]
  F --> G[Calvin cycle fixes CO2]
  G --> H([Glucose is built])`,
  },
  {
    title: "Light reactions vs Calvin cycle",
    source: `flowchart LR
  subgraph light [Light reactions · thylakoid]
    A[Photons excite PSII] --> B[Electron transport chain] --> C[ATP synthase]
  end
  subgraph calvin [Calvin cycle · stroma]
    D[Carbon fixation by RuBisCO] --> E[Reduction to G3P] --> F[Regenerate RuBP]
    F -.-> D
  end
  C ==>|ATP + NADPH| D
  E --> G([Sugar leaves the cycle])`,
  },
  {
    title: "Debugging a failing test",
    source: `graph TD
  Start((Test fails)) --> Read[Read the error message]
  Read --> Repro{Reproduces locally?}
  Repro -- no --> Env[Compare CI and local environment]
  Repro -- yes --> Bisect[Bisect recent commits]
  Env --> Fix
  Bisect --> Found{Culprit found?}
  Found -->|yes| Fix[Write the fix and a regression test]
  Found -->|no| Log[/Add logging and rerun/]
  Log --> Read
  Fix --> Done([Green build])`,
  },
];

export function FlowLab() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="min-h-screen bg-ink-950 p-6 text-fog-50">
      <h1 className="mb-1 font-display text-xl">Flow lab</h1>
      <p className="mb-6 text-sm text-fog-400">
        Spotlight a step:{" "}
        {["A", "C", "D", "Repro", "Fix"].map((id) => (
          <button
            key={id}
            onClick={() => setActive(active === id ? null : id)}
            className="mr-1 rounded-full bg-white/8 px-2 py-0.5 text-xs"
          >
            {id}
          </button>
        ))}
      </p>
      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <h2 className="mb-2 text-xs tracking-wide text-fog-400 uppercase">Chat (light)</h2>
          <div className="rounded-3xl bg-[#faf8f5] p-4 text-stone-800" data-lab="light">
            {SAMPLES.map((sample) => (
              <Diagram
                key={sample.title}
                source={sample.source}
                title={sample.title}
                theme="light"
                activeNode={active}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs tracking-wide text-fog-400 uppercase">Notebook (paper)</h2>
          <div className="paper rounded-3xl p-4" data-lab="paper">
            {SAMPLES.map((sample) => (
              <Diagram
                key={sample.title}
                source={sample.source}
                title={sample.title}
                theme="paper"
                variant="card"
                activeNode={active}
              />
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-xs tracking-wide text-fog-400 uppercase">Voice stage (dark)</h2>
          <div className="space-y-10 rounded-3xl bg-ink-900 p-4" data-lab="dark">
            {SAMPLES.map((sample) => (
              <Diagram
                key={sample.title}
                source={sample.source}
                title={sample.title}
                theme="dark"
                variant="stage"
                activeNode={active}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
