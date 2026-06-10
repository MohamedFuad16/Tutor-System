import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const tmpDir = path.join(rootDir, ".tmp-test");
const analyticsViewPath = path.join(rootDir, "src/views/AnalyticsView.tsx");
const outfile = path.join(tmpDir, "analytics-view-test-utils.mjs");

let buildPromise;

const stubModule = (contents) => ({
  contents,
  loader: "js",
});

const analyticsViewTestPlugin = {
  name: "analytics-view-test-plugin",
  setup(pluginBuild) {
    pluginBuild.onLoad(
      { filter: /src\/views\/AnalyticsView\.tsx$/ },
      async () => {
        const source = await readFile(analyticsViewPath, "utf8");
        return {
          contents: `${source}

export const __analyticsViewTestUtils = {
  formatPercent,
  shortConceptName,
  normalizeConceptForAnalytics,
};
`,
          loader: "tsx",
          resolveDir: path.dirname(analyticsViewPath),
        };
      },
    );

    pluginBuild.onResolve(
      {
        filter:
          /^(\.\.\/memory\/longterm\.memory|\.\.\/lib\/translations|\.\.\/hooks\/useMotionPreference|\.\.\/store|dexie-react-hooks|react|recharts|gsap)$/,
      },
      (args) => ({
        path: args.path,
        namespace: "analytics-view-test-stub",
      }),
    );

    pluginBuild.onLoad(
      { filter: /.*/, namespace: "analytics-view-test-stub" },
      (args) => {
        if (args.path === "react") {
          return stubModule(`
            export const Fragment = Symbol.for("react.fragment");
            export const useEffect = () => {};
            export const useLayoutEffect = () => {};
            export const useMemo = (factory) => factory();
            export const useRef = (value) => ({ current: value });
            export const useState = (value) => [value, () => {}];
            const React = { createElement: () => null, Fragment };
            export default React;
          `);
        }

        if (args.path === "recharts") {
          return stubModule(`
            const Stub = () => null;
            export const ResponsiveContainer = Stub;
            export const BarChart = Stub;
            export const Bar = Stub;
            export const XAxis = Stub;
            export const YAxis = Stub;
            export const Tooltip = Stub;
            export const CartesianGrid = Stub;
            export const PieChart = Stub;
            export const Pie = Stub;
            export const Cell = Stub;
          `);
        }

        if (args.path === "gsap") {
          return stubModule(`
            export const gsap = {
              context: () => ({ revert: () => {} }),
              fromTo: () => {},
            };
          `);
        }

        if (args.path === "dexie-react-hooks") {
          return stubModule(`
            export const useLiveQuery = () => undefined;
          `);
        }

        if (args.path === "../memory/longterm.memory") {
          return stubModule(`
            export const db = {
              concepts: { toArray: async () => [] },
              interactions: { count: async () => 0 },
              sessions: { count: async () => 0 },
              learningBooks: { toArray: async () => [] },
              learningBookConcepts: { toArray: async () => [] },
              learningEntries: { toArray: async () => [] },
            };
          `);
        }

        if (args.path === "../lib/translations") {
          return stubModule(`
            export const useTranslation = () => ({
              language: "en",
              t: (key) => key,
            });
          `);
        }

        if (args.path === "../store") {
          return stubModule(`
            const state = {
              activeUserId: "local-default-user",
              learnerName: "Learner",
            };
            export const useStore = (selector) =>
              typeof selector === "function" ? selector(state) : state;
          `);
        }

        return stubModule("export const useMotionPreference = () => false;");
      },
    );
  },
};

const loadAnalyticsUtils = async () => {
  if (!buildPromise) {
    buildPromise = (async () => {
      await mkdir(tmpDir, { recursive: true });
      await build({
        entryPoints: [analyticsViewPath],
        outfile,
        bundle: true,
        platform: "node",
        format: "esm",
        plugins: [analyticsViewTestPlugin],
        logLevel: "silent",
      });
    })();
  }

  await buildPromise;
  const moduleUrl = `${pathToFileURL(outfile).href}?case=${Date.now()}_${Math.random()}`;
  return (await import(moduleUrl)).__analyticsViewTestUtils;
};

test("analytics progress normalizes concept mastery into chart-safe values", async () => {
  const { normalizeConceptForAnalytics } = await loadAnalyticsUtils();

  assert.deepEqual(
    normalizeConceptForAnalytics({
      id: "concept-1",
      name: " Retrieval practice ",
      mastery: 0.22,
      p_learn: 0.83,
      confidence: 1.8,
      lastReviewedAt: "1730000000000",
    }),
    {
      id: "concept-1",
      name: "Retrieval practice",
      mastery: 0.83,
      confidence: 1,
      lastReviewedAt: 1730000000000,
    },
  );

  assert.deepEqual(
    normalizeConceptForAnalytics({
      mastery: Number.POSITIVE_INFINITY,
      confidence: -0.25,
      lastReviewedAt: Number.NaN,
    }),
    {
      id: "Untitled concept",
      name: "Untitled concept",
      mastery: 0,
      confidence: 0,
      lastReviewedAt: 0,
    },
  );

  assert.deepEqual(
    normalizeConceptForAnalytics({
      id: "fallback-confidence",
      name: "Fallback confidence",
      mastery: 0.62,
    }),
    {
      id: "fallback-confidence",
      name: "Fallback confidence",
      mastery: 0.62,
      confidence: 0.62,
      lastReviewedAt: 0,
    },
  );
});

test("analytics progress formats compact, bounded display labels", async () => {
  const { formatPercent, shortConceptName } = await loadAnalyticsUtils();

  assert.equal(formatPercent(-12), "0%");
  assert.equal(formatPercent(44.5), "45%");
  assert.equal(formatPercent(180), "100%");
  assert.equal(formatPercent(Number.NaN), "0%");

  assert.equal(shortConceptName(""), "Untitled concept");
  assert.equal(shortConceptName("  "), "Untitled concept");
  assert.equal(shortConceptName("Spaced repetition"), "Spaced repetition");
  assert.equal(
    shortConceptName("Long concept title for display"),
    "Long concept tit...",
  );
});
