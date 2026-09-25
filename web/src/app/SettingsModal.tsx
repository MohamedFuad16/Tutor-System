/**
 * Settings: profile, language, voice routing, motion, access code, and a
 * read-only system panel showing which models and providers are live.
 */
import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, Mic, Search, Volume2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Modal, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { LANGUAGES } from "@/lib/i18n";
import { queryClient, useHealth } from "@/lib/queries";
import { useApp, type VoiceInputMode, type VoiceOutputMode } from "@/store/app";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm text-fog-50">{label}</div>
        {hint && <div className="text-xs text-fog-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-white/6 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cx(
            "rounded-full px-3 py-1 text-xs transition-colors",
            value === option.value ? "bg-white text-ink-900" : "text-fog-400 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

type SystemInfo = {
  llm: {
    limiters?: Array<{
      name: string;
      active: number;
      queued: number;
      effectiveConcurrency: number;
      maxConcurrency: number;
      throttled: number;
    }>;
  };
  metrics: {
    llmTtftMs: Record<string, { p50: number | null; p95: number | null; n: number }>;
    timersMs: Record<string, { p50: number | null; p95: number | null; n: number }>;
  };
  voiceSessions: number;
};

export function SettingsModal() {
  const open = useApp((state) => state.settingsOpen);
  const state = useApp();
  const health = useHealth();
  const system = useQuery({
    queryKey: ["system"],
    queryFn: () => api<SystemInfo>("/system"),
    enabled: open,
    refetchInterval: open ? 5000 : false,
  });
  const [name, setName] = useState(state.learnerName);
  const [code, setCode] = useState(state.accessCode);

  const save = async () => {
    state.set({ learnerName: name.trim() || "Learner", accessCode: code.trim() });
    await api("/profile", { method: "POST", json: { name: name.trim() } }).catch(() => undefined);
    queryClient.invalidateQueries();
    state.set({ settingsOpen: false });
  };

  const h = health.data;
  const eot = system.data?.metrics.timersMs["voice.eot_to_first_audio"];
  const chatTtft = Object.entries(system.data?.metrics.llmTtftMs ?? {}).find(([key]) => key.endsWith(":chat"))?.[1];

  return (
    <Modal open={open} onClose={() => state.set({ settingsOpen: false })} title="Settings" width={620}>
      <section className="divide-y divide-white/6">
        <Row label="Your name" hint="The tutor uses it to address you.">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-56 rounded-xl bg-white/6 px-3 py-2 text-sm outline-none ring-1 ring-white/8 focus:ring-signal/60"
          />
        </Row>
        <Row label="Language" hint="Interface and default reply language.">
          <select
            value={state.language}
            onChange={(event) => state.set({ language: event.target.value })}
            className="w-56 rounded-xl bg-white/6 px-3 py-2 text-sm outline-none ring-1 ring-white/8"
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code} className="bg-ink-850">
                {language.label}
              </option>
            ))}
          </select>
        </Row>
        <Row label="Voice input" hint="Live server transcription is faster and supports interruptions.">
          <Segmented<VoiceInputMode>
            value={state.voiceInput}
            onChange={(value) => state.set({ voiceInput: value })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "server", label: "Server" },
              { value: "browser", label: "Browser" },
            ]}
          />
        </Row>
        <Row label="Voice output" hint="Server voices sound more natural; browser voices work offline.">
          <Segmented<VoiceOutputMode>
            value={state.voiceOutput}
            onChange={(value) => state.set({ voiceOutput: value })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "server", label: "Server" },
              { value: "browser", label: "Browser" },
            ]}
          />
        </Row>
        <Row label="Motion" hint="Animations and transitions.">
          <Segmented
            value={state.motion ? "on" : "off"}
            onChange={(value) => state.set({ motion: value === "on" })}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Reduced" },
            ]}
          />
        </Row>
        {h?.accessCodeRequired && (
          <Row label="Access code" hint="Required by this deployment.">
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-56 rounded-xl bg-white/6 px-3 py-2 text-sm outline-none ring-1 ring-white/8"
            />
          </Row>
        )}
      </section>

      <section className="mt-5 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/6">
        <h3 className="mb-3 flex items-center gap-2 text-sm text-fog-200">
          <Activity className="size-4 text-signal" /> System
        </h3>
        <div className="grid gap-2 text-xs text-fog-400 sm:grid-cols-2">
          <Status
            icon={<Cpu className="size-3.5" />}
            label="Models"
            value={h ? `${h.llm.fastModel} · ${h.llm.smartModel}` : "…"}
            ok={h?.llm.provider !== "mock"}
            warn={h?.llm.provider === "mock" ? "offline mock model" : undefined}
          />
          <Status
            icon={<Mic className="size-3.5" />}
            label="Speech"
            value={h ? (h.speech.stt ? h.speech.provider : "browser only") : "…"}
            ok={Boolean(h?.speech.stt)}
          />
          <Status icon={<Search className="size-3.5" />} label="Search" value={h?.search.provider ?? "…"} ok />
          <Status
            icon={<Volume2 className="size-3.5" />}
            label="Voice latency p50"
            value={
              eot?.p50 != null
                ? `${eot.p50} ms`
                : chatTtft?.p50 != null
                  ? `chat TTFT ${chatTtft.p50} ms`
                  : "no samples yet"
            }
            ok
          />
        </div>
        {system.data?.llm.limiters && (
          <div className="mt-3 space-y-1.5">
            {system.data.llm.limiters.map((limiter) => (
              <div key={limiter.name} className="flex items-center gap-2 font-mono text-[0.7rem] text-fog-500">
                <span className="w-40 truncate">{limiter.name}</span>
                <span>
                  {limiter.active}/{limiter.effectiveConcurrency} active · {limiter.queued} queued
                  {limiter.throttled ? ` · throttled ${limiter.throttled}×` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => state.set({ settingsOpen: false })}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          Save
        </Button>
      </div>
    </Modal>
  );
}

function Status({
  icon,
  label,
  value,
  ok,
  warn,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  ok?: boolean;
  warn?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
      <span className={cx(ok ? "text-ok" : "text-warn")}>{icon}</span>
      <span className="text-fog-500">{label}</span>
      <span className="ml-auto truncate text-fog-200" title={value}>
        {warn ?? value}
      </span>
    </div>
  );
}
