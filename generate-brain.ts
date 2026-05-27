import {
  CallExpression,
  JsxElement,
  JsxSelfClosingElement,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
} from "ts-morph";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

type NodeType =
  | "file"
  | "component"
  | "hook"
  | "store"
  | "storeField"
  | "endpoint"
  | "websocket"
  | "database"
  | "databaseTable"
  | "route"
  | "externalPackage"
  | "contextPack";

type EdgeType =
  | "dependsOn"
  | "imports"
  | "exports"
  | "renders"
  | "wraps"
  | "usesState"
  | "readsStore"
  | "writesStore"
  | "callsEndpoint"
  | "listensTo"
  | "emits"
  | "readsDatabase"
  | "writesDatabase"
  | "mutates"
  | "servedBy"
  | "definedIn";

type GraphNode = {
  id: string;
  type: NodeType;
  label: string;
  file?: string;
  symbol?: string;
  hash?: string;
  loc?: { line: number; column: number };
  metadata?: Record<string, unknown>;
};

type GraphEdge = {
  id: string;
  type: EdgeType;
  source: string;
  target: string;
  confidence: number;
  evidence: {
    file: string;
    line?: number;
    text?: string;
  };
  metadata?: Record<string, unknown>;
};

type FileAnalysis = {
  file: string;
  hash: string;
  imports: Array<{ specifier: string; resolved?: string; external?: string }>;
  exports: string[];
  functions: string[];
  variables: string[];
  classes: string[];
  components: string[];
  hooks: string[];
  storeSelectors: Array<{ field: string; selector: string }>;
  storeWrites: string[];
  apiCalls: string[];
  websocketCalls: string[];
  databaseReads: Array<{ table: string; operation: string }>;
  databaseWrites: Array<{ table: string; operation: string }>;
  renders: string[];
  routes: Array<{ view: string; component: string }>;
};

const ROOT = process.cwd();
const BRAIN_DIR = path.join(ROOT, "brain");
const GENERATED_DIRS = [
  "indexes",
  "impact",
  "contracts",
  "knowledge",
  "retrieval/context-packs",
  "embeddings",
  "compressed-context",
  "flows",
  "snapshots",
  "diffs",
  "rules",
  "tasks",
].map((dir) => path.join(BRAIN_DIR, dir));

const SOURCE_ROOT_ALLOWLIST = [
  /^src\//,
  /^server\.ts$/,
  /^generate-brain\.ts$/,
  /^init-task-memory\.ts$/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^tsconfig\.json$/,
  /^brain\/.*\.ts$/,
  /^scripts\/.*\.ts$/,
];
const EXCLUDE_PATHS = [
  /^dist\//,
  /^node_modules\//,
  /^build\//,
  /^coverage\//,
  /^\.git\//,
  /^brain\/verification\//,
  /^brain\/snapshots\//,
  /^brain\/diffs\//,
  /^brain\/debug\/runs\//,
  /^brain\/debug\/backups\//,
  /^brain\/reference-docs\//,
  /^brain\/autonomy\/status\.json$/,
  /(^|\/)\.DS_Store$/,
  /(^|\/)\.[^/]+$/,
  /\.map$/,
  /\.d\.ts$/,
  /__brain_audit_probe/,
  /~$/,
  /\.tmp$/,
];
const LOCAL_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".css"];
const DB_READ_OPS = new Set([
  "get",
  "toArray",
  "filter",
  "where",
  "orderBy",
  "limit",
  "count",
  "first",
]);
const DB_WRITE_OPS = new Set([
  "add",
  "put",
  "update",
  "delete",
  "clear",
  "bulkAdd",
  "bulkPut",
]);

function ensureDirs() {
  [BRAIN_DIR, ...GENERATED_DIRS].forEach((dir) =>
    fs.mkdirSync(dir, { recursive: true }),
  );
}

function rel(filePath: string) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function sha256(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readIfExists(file: string) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function getCommitMetadata() {
  try {
    return {
      commit: execSync("git rev-parse HEAD", {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: ROOT,
        stdio: ["ignore", "pipe", "ignore"],
      })
        .toString()
        .trim(),
      dirty:
        execSync("git status --short", {
          cwd: ROOT,
          stdio: ["ignore", "pipe", "ignore"],
        })
          .toString()
          .trim().length > 0,
    };
  } catch {
    return { commit: null, branch: null, dirty: null };
  }
}

function isSourceScoped(relativePath: string) {
  return (
    SOURCE_ROOT_ALLOWLIST.some((pattern) => pattern.test(relativePath)) &&
    !EXCLUDE_PATHS.some((pattern) => pattern.test(relativePath))
  );
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    const relative = rel(absolute);
    if (EXCLUDE_PATHS.some((pattern) => pattern.test(relative))) return [];
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

function resolveLocalImport(fromFile: string, specifier: string) {
  if (!specifier.startsWith(".")) return undefined;
  const base = path.resolve(ROOT, path.dirname(fromFile), specifier);
  const candidates = [
    ...LOCAL_EXTENSIONS.map((ext) => base + ext),
    ...LOCAL_EXTENSIONS.map((ext) => path.join(base, "index" + ext)),
  ];
  return candidates.find(
    (candidate) =>
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile() &&
      isSourceScoped(rel(candidate)),
  );
}

function addNode(nodes: Map<string, GraphNode>, node: GraphNode) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
  return node.id;
}

function addEdge(edges: Map<string, GraphEdge>, edge: Omit<GraphEdge, "id">) {
  const id = sha256(
    `${edge.type}|${edge.source}|${edge.target}|${edge.evidence.file}|${edge.evidence.line ?? ""}`,
  ).slice(0, 20);
  if (!edges.has(id)) edges.set(id, { ...edge, id });
}

function lineOf(node: Node) {
  const pos = node.getSourceFile().getLineAndColumnAtPos(node.getStart());
  return { line: pos.line, column: pos.column };
}

function hasJsx(node: Node) {
  return node
    .getDescendants()
    .some(
      (descendant) =>
        Node.isJsxElement(descendant) ||
        Node.isJsxSelfClosingElement(descendant) ||
        descendant.getKind() === SyntaxKind.JsxFragment,
    );
}

function jsxTagName(node: JsxElement | JsxSelfClosingElement) {
  if (Node.isJsxSelfClosingElement(node))
    return node.getTagNameNode().getText();
  return node.getOpeningElement().getTagNameNode().getText();
}

function normalizeEndpoint(endpoint: string) {
  if (!endpoint || endpoint === "*") return endpoint;
  try {
    const url = new URL(endpoint, "http://local.invalid");
    return url.pathname;
  } catch {
    return endpoint.replace(/\?.*$/, "");
  }
}

function endpointNodeId(method: string, endpoint: string) {
  return `endpoint:${method.toUpperCase()} ${endpoint}`;
}

function websocketNodeId(endpoint: string) {
  return `websocket:${endpoint}`;
}

function fileNodeId(file: string) {
  return `file:${file}`;
}

function componentNodeId(name: string) {
  return `component:${name}`;
}

function hookNodeId(name: string) {
  return `hook:${name}`;
}

function storeFieldNodeId(field: string) {
  return `storeField:${field}`;
}

function tableNodeId(table: string) {
  return `databaseTable:${table}`;
}

function routeNodeId(view: string) {
  return `route:${view}`;
}

function packageNodeId(name: string) {
  return `package:${name}`;
}

function extractStoreFields(sourceFiles: SourceFile[]) {
  const fields = new Set<string>();
  sourceFiles.forEach((file) => {
    if (!rel(file.getFilePath()).endsWith("src/store/index.ts")) return;
    file.getInterfaces().forEach((iface) => {
      if (iface.getName() !== "AppState") return;
      iface.getProperties().forEach((prop) => fields.add(prop.getName()));
      iface.getMethods().forEach((method) => fields.add(method.getName()));
    });
  });
  return [...fields].sort();
}

function extractFetchEndpoint(call: CallExpression) {
  if (call.getExpression().getText() !== "fetch") return undefined;
  const arg = call.getArguments()[0];
  if (!arg) return undefined;
  const text = arg.getText().replace(/^['"`]|['"`]$/g, "");
  return text.includes("/api/") ? normalizeEndpoint(text) : undefined;
}

function extractWebSocketEndpoint(call: CallExpression) {
  if (call.getExpression().getText() !== "WebSocket") return undefined;
  const arg = call.getArguments()[0];
  if (!arg) return undefined;
  const text = arg.getText();
  const apiMatch = text.match(/\/api\/[A-Za-z0-9/_-]+/);
  const wsMatch = text.match(/\/ws\/[A-Za-z0-9/_-]+/);
  return apiMatch?.[0] ?? wsMatch?.[0];
}

function extractDbOperation(call: CallExpression) {
  const expression = call.getExpression().getText();
  const match = expression.match(/\bdb\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)$/);
  if (!match) return undefined;
  return { table: match[1], operation: match[2] };
}

function extractServerRoutes(file: SourceFile) {
  const routes: Array<{ method: string; path: string; line: number }> = [];
  const websockets: Array<{ path: string; line: number }> = [];
  file.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
    const expression = call.getExpression().getText();
    const routeMatch = expression.match(/^app\.(get|post|put|patch|delete)$/);
    if (routeMatch) {
      const firstArg = call.getArguments()[0];
      const pathText = firstArg?.getText().replace(/^['"`]|['"`]$/g, "");
      if (pathText)
        routes.push({
          method: routeMatch[1].toUpperCase(),
          path: normalizeEndpoint(pathText),
          line: lineOf(call).line,
        });
    }
  });
  const serverText = file.getFullText();
  [...serverText.matchAll(/pathname\s*===\s*["'`]([^"'`]+)["'`]/g)].forEach(
    (match) => {
      const pos = file.getLineAndColumnAtPos(match.index ?? 0);
      websockets.push({ path: match[1], line: pos.line });
    },
  );
  return { routes, websockets };
}

function inferStoreWrites(file: SourceFile, storeFields: string[]) {
  const text = file.getFullText();
  return storeFields.filter(
    (field) =>
      field.startsWith("set") && new RegExp(`\\b${field}\\s*\\(`).test(text),
  );
}

function extractRoutesFromApp(file: SourceFile) {
  if (!rel(file.getFilePath()).endsWith("src/App.tsx")) return [];
  const text = file.getFullText();
  const routes: Array<{ view: string; component: string }> = [];
  const routeRegex =
    /activeView\s*===\s*['"`]([^'"`]+)['"`]\s*&&\s*\(([\s\S]*?)(?=\n\s*\{activeView\s*===|\n\s*<\/AnimatePresence>)/g;
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(text))) {
    const component = [...match[2].matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)]
      .map((componentMatch) => componentMatch[1])
      .find((name) => !["AnimatePresence"].includes(name));
    if (component) routes.push({ view: match[1], component });
  }
  return routes;
}

function topTokens(text: string, limit = 40) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "const",
    "let",
    "var",
    "return",
    "import",
    "export",
    "type",
    "interface",
    "class",
    "function",
    "true",
    "false",
    "null",
    "undefined",
  ]);
  const counts = new Map<string, number>();
  text
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/)
    .filter((token) => token.length > 2 && !stop.has(token))
    .forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));
  return Object.fromEntries(
    [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit),
  );
}

function chunkSource(file: string, text: string) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  const size = 90;
  for (let start = 0; start < lines.length; start += size) {
    const chunkLines = lines.slice(start, start + size);
    const chunkText = chunkLines.join("\n");
    if (!chunkText.trim()) continue;
    chunks.push({
      id: sha256(`${file}:${start + 1}:${chunkText}`).slice(0, 20),
      file,
      startLine: start + 1,
      endLine: start + chunkLines.length,
      hash: sha256(chunkText),
      tokenWeights: topTokens(chunkText),
    });
  }
  return chunks;
}

function analyzeSourceFile(
  file: SourceFile,
  sourceFiles: SourceFile[],
  storeFields: string[],
  nodes: Map<string, GraphNode>,
  edges: Map<string, GraphEdge>,
) {
  const filePath = rel(file.getFilePath());
  const text = file.getFullText();
  const hash = sha256(text);
  const imports: FileAnalysis["imports"] = [];
  const exports: string[] = [];
  const functions = file
    .getFunctions()
    .map((fn) => fn.getName())
    .filter(Boolean) as string[];
  const variables = file
    .getVariableDeclarations()
    .map((variable) => variable.getName());
  const classes = file
    .getClasses()
    .map((klass) => klass.getName())
    .filter(Boolean) as string[];
  const components = new Set<string>();
  const hooks = new Set<string>();
  const storeSelectors: FileAnalysis["storeSelectors"] = [];
  const apiCalls = new Set<string>();
  const websocketCalls = new Set<string>();
  const databaseReads: FileAnalysis["databaseReads"] = [];
  const databaseWrites: FileAnalysis["databaseWrites"] = [];
  const renders = new Set<string>();
  const routes = extractRoutesFromApp(file);
  const fileId = addNode(nodes, {
    id: fileNodeId(filePath),
    type: "file",
    label: filePath,
    file: filePath,
    hash,
    metadata: { lines: text.split(/\r?\n/).length },
  });

  file.getImportDeclarations().forEach((declaration) => {
    const specifier = declaration.getModuleSpecifierValue();
    const resolved = resolveLocalImport(filePath, specifier);
    if (resolved) {
      const target = rel(resolved);
      imports.push({ specifier, resolved: target });
      addEdge(edges, {
        type: "imports",
        source: fileId,
        target: fileNodeId(target),
        confidence: 1,
        evidence: {
          file: filePath,
          line: lineOf(declaration).line,
          text: declaration.getText(),
        },
      });
      addEdge(edges, {
        type: "dependsOn",
        source: fileId,
        target: fileNodeId(target),
        confidence: 1,
        evidence: {
          file: filePath,
          line: lineOf(declaration).line,
          text: declaration.getText(),
        },
      });
    } else {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : specifier.split("/")[0];
      imports.push({ specifier, external: packageName });
      addNode(nodes, {
        id: packageNodeId(packageName),
        type: "externalPackage",
        label: packageName,
      });
      addEdge(edges, {
        type: "dependsOn",
        source: fileId,
        target: packageNodeId(packageName),
        confidence: 1,
        evidence: {
          file: filePath,
          line: lineOf(declaration).line,
          text: declaration.getText(),
        },
      });
    }
  });

  file
    .getExportDeclarations()
    .forEach((declaration) => exports.push(declaration.getText()));
  file.getExportedDeclarations().forEach((declarations, name) => {
    exports.push(name);
    declarations.forEach((declaration) => {
      addEdge(edges, {
        type: "exports",
        source: fileId,
        target: `${fileId}:export:${name}`,
        confidence: 0.9,
        evidence: {
          file: filePath,
          line: lineOf(declaration).line,
          text: name,
        },
      });
    });
  });

  file.getFunctions().forEach((fn) => {
    const name = fn.getName();
    if (!name) return;
    if (/^[A-Z]/.test(name) && hasJsx(fn)) {
      components.add(name);
      addNode(nodes, {
        id: componentNodeId(name),
        type: "component",
        label: name,
        file: filePath,
        symbol: name,
        loc: lineOf(fn),
      });
      addEdge(edges, {
        type: "definedIn",
        source: componentNodeId(name),
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: lineOf(fn).line },
      });
    }
    if (/^use[A-Z0-9]/.test(name)) {
      hooks.add(name);
      addNode(nodes, {
        id: hookNodeId(name),
        type: "hook",
        label: name,
        file: filePath,
        symbol: name,
        loc: lineOf(fn),
      });
      addEdge(edges, {
        type: "definedIn",
        source: hookNodeId(name),
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: lineOf(fn).line },
      });
    }
  });

  file.getVariableDeclarations().forEach((variable) => {
    const name = variable.getName();
    const initializer = variable.getInitializer();
    if (/^[A-Z]/.test(name) && initializer && hasJsx(initializer)) {
      components.add(name);
      addNode(nodes, {
        id: componentNodeId(name),
        type: "component",
        label: name,
        file: filePath,
        symbol: name,
        loc: lineOf(variable),
      });
      addEdge(edges, {
        type: "definedIn",
        source: componentNodeId(name),
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: lineOf(variable).line },
      });
    }
    if (/^use[A-Z0-9]/.test(name)) {
      hooks.add(name);
      addNode(nodes, {
        id: hookNodeId(name),
        type: "hook",
        label: name,
        file: filePath,
        symbol: name,
        loc: lineOf(variable),
      });
      addEdge(edges, {
        type: "definedIn",
        source: hookNodeId(name),
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: lineOf(variable).line },
      });
    }
  });

  file.getDescendantsOfKind(SyntaxKind.JsxElement).forEach((jsx) => {
    const tag = jsxTagName(jsx);
    if (/^[A-Z]/.test(tag)) renders.add(tag.split(".")[0]);
  });
  file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).forEach((jsx) => {
    const tag = jsxTagName(jsx);
    if (/^[A-Z]/.test(tag)) renders.add(tag.split(".")[0]);
  });

  const declaredComponents = new Set(
    sourceFiles.flatMap((source) => [
      ...source
        .getFunctions()
        .map((fn) => fn.getName())
        .filter((name): name is string => Boolean(name) && /^[A-Z]/.test(name)),
      ...source
        .getVariableDeclarations()
        .map((variable) => variable.getName())
        .filter((name) => /^[A-Z]/.test(name)),
    ]),
  );
  renders.forEach((rendered) => {
    if (!declaredComponents.has(rendered)) return;
    addEdge(edges, {
      type: "renders",
      source:
        components.size === 1 ? componentNodeId([...components][0]) : fileId,
      target: componentNodeId(rendered),
      confidence: 0.8,
      evidence: { file: filePath },
    });
  });

  file.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
    const endpoint = extractFetchEndpoint(call);
    if (endpoint) {
      apiCalls.add(endpoint);
      addNode(nodes, {
        id: endpointNodeId("ANY", endpoint),
        type: "endpoint",
        label: `ANY ${endpoint}`,
        metadata: { discoveredFromClient: true },
      });
      addEdge(edges, {
        type: "callsEndpoint",
        source: fileId,
        target: endpointNodeId("ANY", endpoint),
        confidence: 0.8,
        evidence: {
          file: filePath,
          line: lineOf(call).line,
          text: call.getText().slice(0, 180),
        },
      });
    }

    const wsEndpoint = extractWebSocketEndpoint(call);
    if (wsEndpoint) {
      websocketCalls.add(wsEndpoint);
      addNode(nodes, {
        id: websocketNodeId(wsEndpoint),
        type: "websocket",
        label: wsEndpoint,
      });
      addEdge(edges, {
        type: "listensTo",
        source: fileId,
        target: websocketNodeId(wsEndpoint),
        confidence: 0.8,
        evidence: {
          file: filePath,
          line: lineOf(call).line,
          text: call.getText().slice(0, 180),
        },
      });
    }

    const dbOperation = extractDbOperation(call);
    if (dbOperation) {
      addNode(nodes, {
        id: tableNodeId(dbOperation.table),
        type: "databaseTable",
        label: dbOperation.table,
        metadata: { database: "NeuralNestBrain" },
      });
      const record = {
        table: dbOperation.table,
        operation: dbOperation.operation,
      };
      if (DB_READ_OPS.has(dbOperation.operation)) {
        databaseReads.push(record);
        addEdge(edges, {
          type: "readsDatabase",
          source: fileId,
          target: tableNodeId(dbOperation.table),
          confidence: 0.9,
          evidence: {
            file: filePath,
            line: lineOf(call).line,
            text: call.getText().slice(0, 160),
          },
        });
      }
      if (DB_WRITE_OPS.has(dbOperation.operation)) {
        databaseWrites.push(record);
        addEdge(edges, {
          type: "writesDatabase",
          source: fileId,
          target: tableNodeId(dbOperation.table),
          confidence: 0.9,
          evidence: {
            file: filePath,
            line: lineOf(call).line,
            text: call.getText().slice(0, 160),
          },
        });
        addEdge(edges, {
          type: "mutates",
          source: fileId,
          target: tableNodeId(dbOperation.table),
          confidence: 0.9,
          evidence: {
            file: filePath,
            line: lineOf(call).line,
            text: call.getText().slice(0, 160),
          },
        });
      }
    }

    if (call.getExpression().getText() === "useStore") {
      const selector = call.getArguments()[0]?.getText() ?? "";
      const matches = [...selector.matchAll(/\bstate\.([A-Za-z0-9_]+)/g)];
      matches.forEach((match) => {
        storeSelectors.push({ field: match[1], selector });
        addNode(nodes, {
          id: storeFieldNodeId(match[1]),
          type: "storeField",
          label: match[1],
          file: "src/store/index.ts",
        });
        addEdge(edges, {
          type: "readsStore",
          source: fileId,
          target: storeFieldNodeId(match[1]),
          confidence: 0.9,
          evidence: { file: filePath, line: lineOf(call).line, text: selector },
        });
        addEdge(edges, {
          type: "usesState",
          source: fileId,
          target: storeFieldNodeId(match[1]),
          confidence: 0.9,
          evidence: { file: filePath, line: lineOf(call).line, text: selector },
        });
      });
    }
  });

  const storeWrites = inferStoreWrites(file, storeFields);
  storeWrites.forEach((field) => {
    addNode(nodes, {
      id: storeFieldNodeId(field),
      type: "storeField",
      label: field,
      file: "src/store/index.ts",
    });
    addEdge(edges, {
      type: "writesStore",
      source: fileId,
      target: storeFieldNodeId(field),
      confidence: 0.65,
      evidence: { file: filePath, text: field },
    });
    addEdge(edges, {
      type: "mutates",
      source: fileId,
      target: storeFieldNodeId(field),
      confidence: 0.65,
      evidence: { file: filePath, text: field },
    });
  });

  if (filePath.startsWith("src/")) {
    [...text.matchAll(/\/api\/[A-Za-z0-9/_-]+/g)].forEach((match) => {
      const endpoint = normalizeEndpoint(match[0]);
      if (endpoint.includes("voice-agent")) {
        websocketCalls.add(endpoint);
        addNode(nodes, {
          id: websocketNodeId(endpoint),
          type: "websocket",
          label: endpoint,
          metadata: { path: endpoint },
        });
        addEdge(edges, {
          type: "listensTo",
          source: fileId,
          target: websocketNodeId(endpoint),
          confidence: 0.65,
          evidence: { file: filePath, text: endpoint },
        });
        return;
      }
      if (websocketCalls.has(endpoint)) return;
      apiCalls.add(endpoint);
      addNode(nodes, {
        id: endpointNodeId("ANY", endpoint),
        type: "endpoint",
        label: `ANY ${endpoint}`,
        metadata: { discoveredFromClient: true, path: endpoint },
      });
      addEdge(edges, {
        type: "callsEndpoint",
        source: fileId,
        target: endpointNodeId("ANY", endpoint),
        confidence: 0.55,
        evidence: { file: filePath, text: endpoint },
      });
    });
    [...text.matchAll(/\/ws\/[A-Za-z0-9/_-]+/g)].forEach((match) => {
      const endpoint = match[0];
      websocketCalls.add(endpoint);
      addNode(nodes, {
        id: websocketNodeId(endpoint),
        type: "websocket",
        label: endpoint,
        metadata: { path: endpoint },
      });
      addEdge(edges, {
        type: "listensTo",
        source: fileId,
        target: websocketNodeId(endpoint),
        confidence: 0.55,
        evidence: { file: filePath, text: endpoint },
      });
    });
  }

  routes.forEach((route) => {
    addNode(nodes, {
      id: routeNodeId(route.view),
      type: "route",
      label: route.view,
      file: filePath,
      metadata: { activeView: route.view },
    });
    addEdge(edges, {
      type: "renders",
      source: routeNodeId(route.view),
      target: componentNodeId(route.component),
      confidence: 0.85,
      evidence: { file: filePath, text: `activeView === ${route.view}` },
    });
    addEdge(edges, {
      type: "wraps",
      source: fileId,
      target: routeNodeId(route.view),
      confidence: 0.85,
      evidence: { file: filePath, text: `activeView === ${route.view}` },
    });
  });

  if (filePath === "server.ts") {
    const { routes: serverRoutes, websockets } = extractServerRoutes(file);
    serverRoutes.forEach((route) => {
      const endpointId = endpointNodeId(route.method, route.path);
      addNode(nodes, {
        id: endpointId,
        type: "endpoint",
        label: `${route.method} ${route.path}`,
        file: filePath,
        metadata: { method: route.method, path: route.path },
      });
      addEdge(edges, {
        type: "servedBy",
        source: endpointId,
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: route.line },
      });
      if (route.path.startsWith("/api/"))
        addEdge(edges, {
          type: "emits",
          source: fileId,
          target: endpointId,
          confidence: 0.8,
          evidence: { file: filePath, line: route.line },
        });
    });
    websockets.forEach((ws) => {
      addNode(nodes, {
        id: websocketNodeId(ws.path),
        type: "websocket",
        label: ws.path,
        file: filePath,
        metadata: { path: ws.path },
      });
      addEdge(edges, {
        type: "servedBy",
        source: websocketNodeId(ws.path),
        target: fileId,
        confidence: 1,
        evidence: { file: filePath, line: ws.line },
      });
      addEdge(edges, {
        type: "emits",
        source: fileId,
        target: websocketNodeId(ws.path),
        confidence: 0.8,
        evidence: { file: filePath, line: ws.line },
      });
    });
  }

  return {
    file: filePath,
    hash,
    imports,
    exports: [...new Set(exports)].sort(),
    functions,
    variables,
    classes,
    components: [...components].sort(),
    hooks: [...hooks].sort(),
    storeSelectors,
    storeWrites,
    apiCalls: [...apiCalls].sort(),
    websocketCalls: [...websocketCalls].sort(),
    databaseReads,
    databaseWrites,
    renders: [...renders].sort(),
    routes,
  };
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function buildImpact(
  files: FileAnalysis[],
  nodes: GraphNode[],
  edges: GraphEdge[],
) {
  const byTarget = new Map<string, GraphEdge[]>();
  edges.forEach((edge) => {
    if (!byTarget.has(edge.target)) byTarget.set(edge.target, []);
    byTarget.get(edge.target)!.push(edge);
  });

  const fileImpacts: Record<string, unknown> = {};
  const sourceFiles = new Set(files.map((file) => file.file));
  const edgesByFile = edges.filter(
    (edge) =>
      edge.source.startsWith("file:") || edge.target.startsWith("file:"),
  );

  sourceFiles.forEach((file) => {
    const fileId = fileNodeId(file);
    const directImportDependents = edges
      .filter((edge) => edge.type === "imports" && edge.target === fileId)
      .map((edge) => edge.source.replace(/^file:/, ""))
      .sort();
    const component = files.find((item) => item.file === file)?.components[0];
    const renderedBy = component
      ? edges
          .filter(
            (edge) =>
              edge.type === "renders" &&
              edge.target === componentNodeId(component),
          )
          .map((edge) => edge.source)
      : [];
    const servedEndpoints = edges
      .filter((edge) => edge.type === "servedBy" && edge.target === fileId)
      .map((edge) => edge.source);
    const clientCallers = servedEndpoints.flatMap((endpointId) => {
      const endpointPath = nodes.find((node) => node.id === endpointId)
        ?.metadata?.["path"];
      return edges
        .filter(
          (edge) =>
            edge.type === "callsEndpoint" &&
            (edge.target === endpointId ||
              nodes
                .find((node) => node.id === edge.target)
                ?.label.includes(String(endpointPath))),
        )
        .map((edge) => edge.source.replace(/^file:/, ""));
    });
    const storeFieldsDefined =
      file === "src/store/index.ts"
        ? nodes
            .filter((node) => node.type === "storeField")
            .map((node) => node.id)
        : [];
    const storeReaders = storeFieldsDefined.flatMap((field) =>
      (byTarget.get(field) ?? [])
        .filter((edge) => edge.type === "readsStore")
        .map((edge) => edge.source.replace(/^file:/, "")),
    );
    const databaseTablesDefined = file.endsWith("longterm.memory.ts")
      ? nodes
          .filter((node) => node.type === "databaseTable")
          .map((node) => node.id)
      : [];
    const databaseUsers = databaseTablesDefined.flatMap((table) =>
      (byTarget.get(table) ?? [])
        .filter(
          (edge) =>
            edge.type === "readsDatabase" || edge.type === "writesDatabase",
        )
        .map((edge) => edge.source.replace(/^file:/, "")),
    );
    const affectedFiles = [
      ...new Set([
        ...directImportDependents,
        ...renderedBy
          .filter((id) => id.startsWith("file:"))
          .map((id) => id.replace(/^file:/, "")),
        ...clientCallers,
        ...storeReaders,
        ...databaseUsers,
      ]),
    ]
      .filter(Boolean)
      .sort();
    const semanticFactors = {
      directImportDependents,
      renderedBy,
      clientCallers: [...new Set(clientCallers)].sort(),
      storeReaders: [...new Set(storeReaders)].sort(),
      databaseUsers: [...new Set(databaseUsers)].sort(),
    };
    const riskScore = Math.min(
      100,
      affectedFiles.length * 8 +
        servedEndpoints.length * 20 +
        (file.includes("store") ? 25 : 0) +
        (file === "server.ts" ? 30 : 0) +
        (file.includes("longterm.memory") ? 30 : 0),
    );
    fileImpacts[file] = {
      riskScore,
      blastRadius: affectedFiles,
      semanticFactors,
      affectedTests: files
        .filter(
          (candidate) =>
            candidate.file.includes(".test.") &&
            affectedFiles.some((affected) =>
              candidate.imports.some((imp) => imp.resolved === affected),
            ),
        )
        .map((candidate) => candidate.file),
    };
  });

  const couplingScores = edgesByFile.reduce<
    Record<string, { score: number; edgeTypes: Record<string, number> }>
  >((acc, edge) => {
    const source = edge.source.replace(/^file:/, "");
    const target = edge.target.replace(/^file:/, "");
    if (
      !sourceFiles.has(source) ||
      !sourceFiles.has(target) ||
      source === target
    )
      return acc;
    const key = [source, target].sort().join(" <-> ");
    acc[key] ??= { score: 0, edgeTypes: {} };
    acc[key].score +=
      edge.type === "imports" || edge.type === "dependsOn" ? 1 : 2;
    acc[key].edgeTypes[edge.type] = (acc[key].edgeTypes[edge.type] ?? 0) + 1;
    return acc;
  }, {});

  return { files: fileImpacts, couplingScores };
}

function buildContracts(
  files: FileAnalysis[],
  nodes: GraphNode[],
  edges: GraphEdge[],
) {
  const endpointNodes = nodes.filter(
    (node) => node.type === "endpoint" && node.metadata?.["method"],
  );
  const websocketNodes = nodes.filter((node) => node.type === "websocket");
  const endpoints = Object.fromEntries(
    endpointNodes.map((node) => {
      const pathValue = String(node.metadata?.["path"]);
      const method = String(node.metadata?.["method"]);
      const clients = edges
        .filter((edge) => edge.type === "callsEndpoint")
        .filter((edge) => {
          const label =
            nodes.find((candidate) => candidate.id === edge.target)?.label ??
            "";
          return edge.target === node.id || label.includes(pathValue);
        })
        .map((edge) => edge.source.replace(/^file:/, ""));
      return [
        `${method} ${pathValue}`,
        {
          method,
          path: pathValue,
          serverFile: node.file,
          clients: [...new Set(clients)].sort(),
          responseFormat:
            pathValue === "/api/chat"
              ? "text/event-stream"
              : pathValue === "/api/tts"
                ? "audio/mpeg"
                : "application/json",
          generatedFromSource: true,
        },
      ];
    }),
  );
  const websockets = Object.fromEntries(
    websocketNodes.map((node) => [
      String(node.metadata?.["path"] ?? node.label),
      {
        path: String(node.metadata?.["path"] ?? node.label),
        serverFile: node.file,
        clients: edges
          .filter(
            (edge) => edge.type === "listensTo" && edge.target === node.id,
          )
          .map((edge) => edge.source.replace(/^file:/, "")),
        generatedFromSource: true,
      },
    ]),
  );
  return {
    generatedFromSource: true,
    endpoints,
    websockets,
    clientApiCalls: files.flatMap((file) =>
      file.apiCalls.map((endpoint) => ({ file: file.file, endpoint })),
    ),
  };
}

function buildRouteMap(files: FileAnalysis[], edges: GraphEdge[]) {
  const routes = files.flatMap((file) =>
    file.routes.map((route) => ({ ...route, file: file.file })),
  );
  return {
    generatedFromSource: true,
    model: "Zustand activeView conditional routing in src/App.tsx",
    routes,
    layoutWrappers: edges
      .filter((edge) => edge.type === "wraps")
      .map((edge) => ({
        wrapper: edge.source.replace(/^file:/, ""),
        route: edge.target.replace(/^route:/, ""),
        file: edge.evidence.file,
      })),
  };
}

function buildStateFlow(files: FileAnalysis[], edges: GraphEdge[]) {
  const storeFields = [
    ...new Set(
      edges
        .filter((edge) => edge.target.startsWith("storeField:"))
        .map((edge) => edge.target.replace(/^storeField:/, "")),
    ),
  ].sort();
  return {
    generatedFromSource: true,
    storeFile: "src/store/index.ts",
    fields: storeFields.map((field) => ({
      field,
      readers: edges
        .filter(
          (edge) =>
            edge.type === "readsStore" &&
            edge.target === storeFieldNodeId(field),
        )
        .map((edge) => edge.source.replace(/^file:/, "")),
      writers: edges
        .filter(
          (edge) =>
            edge.type === "writesStore" &&
            edge.target === storeFieldNodeId(field),
        )
        .map((edge) => edge.source.replace(/^file:/, "")),
    })),
    selectorDependencies: files.flatMap((file) =>
      file.storeSelectors.map((selector) => ({ file: file.file, ...selector })),
    ),
  };
}

function buildRenderGraph(edges: GraphEdge[]) {
  return {
    generatedFromSource: true,
    edges: edges
      .filter((edge) => edge.type === "renders" || edge.type === "wraps")
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        confidence: edge.confidence,
        evidence: edge.evidence,
      })),
  };
}

function buildContextPacks(
  files: FileAnalysis[],
  graphEdges: GraphEdge[],
  contracts: unknown,
  routeMap: unknown,
  stateFlow: unknown,
) {
  const packs = [
    {
      id: "state-zustand",
      title: "Zustand State Flow",
      sourceFiles: [
        "src/store/index.ts",
        ...files
          .filter(
            (file) =>
              file.storeSelectors.length > 0 || file.storeWrites.length > 0,
          )
          .map((file) => file.file),
      ],
      invariants: [
        "Global state belongs in src/store/index.ts",
        "Transient component state should stay local",
        "Selectors should remain scoped to fields used by the component",
      ],
      graphRefs: graphEdges
        .filter(
          (edge) => edge.type === "readsStore" || edge.type === "writesStore",
        )
        .map((edge) => edge.id),
      confidence: 0.86,
    },
    {
      id: "api-streaming",
      title: "API, SSE, and WebSocket Coupling",
      sourceFiles: [
        "server.ts",
        "brain/contracts/api-contracts.json",
        ...files
          .filter(
            (file) =>
              file.apiCalls.length > 0 || file.websocketCalls.length > 0,
          )
          .map((file) => file.file),
      ],
      invariants: [
        "SSE events must remain data-prefixed and double-newline terminated",
        "WebSocket paths must stay synchronized between client and server",
      ],
      graphRefs: graphEdges
        .filter(
          (edge) =>
            edge.type === "callsEndpoint" ||
            edge.type === "listensTo" ||
            edge.type === "servedBy",
        )
        .map((edge) => edge.id),
      confidence: 0.84,
    },
    {
      id: "routing-layout",
      title: "Active View Routing and Layout",
      sourceFiles: [
        "src/App.tsx",
        "src/components/Navigation.tsx",
        ...files
          .filter((file) => file.file.startsWith("src/views/"))
          .map((file) => file.file),
      ],
      invariants: [
        "activeView literals in App.tsx and ViewState must stay synchronized",
        "Navigation must use valid ViewState values",
      ],
      graphRefs: graphEdges
        .filter((edge) => edge.type === "wraps" || edge.type === "renders")
        .map((edge) => edge.id),
      confidence: 0.78,
    },
    {
      id: "navigation-dashboard",
      title: "Dashboard and Navigation Feature Surface",
      sourceFiles: [
        "src/App.tsx",
        "src/components/Navigation.tsx",
        "src/store/index.ts",
        ...files
          .filter((file) => file.file.startsWith("src/views/"))
          .map((file) => file.file),
      ],
      invariants: [
        "New top-level features must be represented in ViewState, App view rendering, and Navigation items",
        "Dashboard-like surfaces should not bypass activeView routing",
      ],
      graphRefs: graphEdges
        .filter(
          (edge) =>
            edge.evidence.file === "src/App.tsx" ||
            edge.evidence.file === "src/components/Navigation.tsx" ||
            edge.target.includes("activeView"),
        )
        .map((edge) => edge.id),
      confidence: 0.8,
    },
    {
      id: "ui-animation-system",
      title: "Shared UI Animation and Liquid Glass System",
      sourceFiles: [
        "src/components/SiriLiquidGlass.tsx",
        "src/components/SettingsModal.tsx",
        "src/components/ChatPanel.tsx",
        "src/components/PdfViewer.tsx",
        "src/App.tsx",
        "src/components/PatternCard.tsx",
      ],
      invariants: [
        "Shared animation primitives should preserve the Cosmic Obsidian visual system",
        "Liquid glass changes affect every component that renders SiriLiquidGlass",
      ],
      graphRefs: graphEdges
        .filter(
          (edge) =>
            edge.target === "component:SiriLiquidGlass" ||
            edge.evidence.file.includes("SiriLiquidGlass") ||
            edge.evidence.file.includes("SettingsModal") ||
            edge.evidence.file.includes("ChatPanel"),
        )
        .map((edge) => edge.id),
      confidence: 0.78,
    },
    {
      id: "memory-dexie",
      title: "Dexie Long-Term Memory",
      sourceFiles: [
        "src/memory/longterm.memory.ts",
        ...files
          .filter(
            (file) =>
              file.databaseReads.length > 0 || file.databaseWrites.length > 0,
          )
          .map((file) => file.file),
      ],
      invariants: [
        "Dexie schema changes require migration planning",
        "Large full-table scans should be avoided or bounded",
      ],
      graphRefs: graphEdges
        .filter(
          (edge) =>
            edge.type === "readsDatabase" || edge.type === "writesDatabase",
        )
        .map((edge) => edge.id),
      confidence: 0.82,
    },
  ];
  return packs.map((pack) => ({
    ...pack,
    generatedAt: new Date().toISOString(),
    dependencyReferences: pack.graphRefs.slice(0, 60),
    contractRefs:
      pack.id === "api-streaming"
        ? Object.keys((contracts as { endpoints?: unknown }).endpoints ?? {})
        : [],
    routeRefs:
      pack.id === "routing-layout"
        ? ((routeMap as { routes?: unknown[] }).routes ?? [])
        : [],
    stateRefs:
      pack.id === "state-zustand"
        ? ((stateFlow as { fields?: unknown[] }).fields ?? [])
        : [],
  }));
}

function buildCompressedSummaries(
  files: FileAnalysis[],
  impact: ReturnType<typeof buildImpact>,
  packs: ReturnType<typeof buildContextPacks>,
) {
  const subsystemFiles = {
    frontend: files
      .filter(
        (file) =>
          file.file.startsWith("src/components/") ||
          file.file.startsWith("src/views/") ||
          file.file === "src/App.tsx",
      )
      .map((file) => file.file),
    backend: files
      .filter((file) => file.file === "server.ts")
      .map((file) => file.file),
    state: files
      .filter(
        (file) =>
          file.file === "src/store/index.ts" ||
          file.storeSelectors.length > 0 ||
          file.storeWrites.length > 0,
      )
      .map((file) => file.file),
    memory: files
      .filter((file) => file.file.startsWith("src/memory/"))
      .map((file) => file.file),
    brainTooling: files
      .filter(
        (file) =>
          file.file === "generate-brain.ts" || file.file.startsWith("brain/"),
      )
      .map((file) => file.file),
  };
  return Object.fromEntries(
    Object.entries(subsystemFiles).map(([name, sourceFiles]) => [
      name,
      {
        generatedAt: new Date().toISOString(),
        sourceFiles,
        confidence: sourceFiles.length > 0 ? 0.82 : 0,
        dependencyReferences: sourceFiles.flatMap(
          (file) =>
            files
              .find((candidate) => candidate.file === file)
              ?.imports.map(
                (imp) => imp.resolved ?? imp.external ?? imp.specifier,
              ) ?? [],
        ),
        mutationRisk: sourceFiles
          .map((file) => ({
            file,
            risk:
              (impact.files as Record<string, { riskScore?: number }>)[file]
                ?.riskScore ?? 0,
          }))
          .sort((a, b) => b.risk - a.risk)
          .slice(0, 8),
        contextPacks: packs
          .filter((pack) =>
            pack.sourceFiles.some((file) => sourceFiles.includes(file)),
          )
          .map((pack) => pack.id),
      },
    ]),
  );
}

function main() {
  ensureDirs();
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    skipAddingFilesFromTsConfig: false,
  });
  project.addSourceFilesAtPaths([
    "server.ts",
    "generate-brain.ts",
    "init-task-memory.ts",
    "brain/**/*.ts",
    "scripts/**/*.ts",
  ]);
  const sourceFiles = project
    .getSourceFiles()
    .filter((file) => isSourceScoped(rel(file.getFilePath())));
  const nonTsSourceFiles = [
    ...walk(path.join(ROOT, "src")).filter((file) =>
      /\.(css|json)$/.test(file),
    ),
    path.join(ROOT, "package.json"),
    path.join(ROOT, "package-lock.json"),
    path.join(ROOT, "tsconfig.json"),
  ].filter((file) => fs.existsSync(file) && isSourceScoped(rel(file)));
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const storeFields = extractStoreFields(sourceFiles);
  storeFields.forEach((field) =>
    addNode(nodes, {
      id: storeFieldNodeId(field),
      type: "storeField",
      label: field,
      file: "src/store/index.ts",
    }),
  );
  addNode(nodes, {
    id: "store:zustand",
    type: "store",
    label: "Zustand Store",
    file: "src/store/index.ts",
  });
  addNode(nodes, {
    id: "database:NeuralNestBrain",
    type: "database",
    label: "NeuralNestBrain",
    file: "src/memory/longterm.memory.ts",
  });

  const fileAnalyses = sourceFiles.map((file) =>
    analyzeSourceFile(file, sourceFiles, storeFields, nodes, edges),
  );
  nonTsSourceFiles.forEach((absolute) => {
    const file = rel(absolute);
    if (fileAnalyses.some((analysis) => analysis.file === file)) return;
    const text = readIfExists(absolute);
    addNode(nodes, {
      id: fileNodeId(file),
      type: "file",
      label: file,
      file,
      hash: sha256(text),
      metadata: { lines: text.split(/\r?\n/).length, nonAst: true },
    });
    fileAnalyses.push({
      file,
      hash: sha256(text),
      imports: [],
      exports: [],
      functions: [],
      variables: [],
      classes: [],
      components: [],
      hooks: [],
      storeSelectors: [],
      storeWrites: [],
      apiCalls: [],
      websocketCalls: [],
      databaseReads: [],
      databaseWrites: [],
      renders: [],
      routes: [],
    });
  });

  const generatedAt = new Date().toISOString();
  const packageJson = JSON.parse(
    readIfExists(path.join(ROOT, "package.json")) || "{}",
  );
  const metadata = {
    generatedAt,
    generator: "generate-brain.ts",
    generatorVersion: 2,
    sourceScope: [
      "src/**/*",
      "server.ts",
      "generate-brain.ts",
      "init-task-memory.ts",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "brain/**/*.ts",
      "scripts/**/*.ts",
    ],
    excluded: [
      "dist",
      "node_modules",
      "build",
      "coverage",
      "generated assets",
      "temporary files",
    ],
    commit: getCommitMetadata(),
    package: {
      name: packageJson.name,
      version: packageJson.version,
      react: packageJson.dependencies?.react,
    },
    sourceHash: sha256(
      fileAnalyses
        .map((file) => `${file.file}:${file.hash}`)
        .sort()
        .join("\n"),
    ),
  };
  const graphNodes = [...nodes.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const graphEdges = [...edges.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const graph = { metadata, nodes: graphNodes, edges: graphEdges };
  const impact = buildImpact(fileAnalyses, graphNodes, graphEdges);
  const contracts = buildContracts(fileAnalyses, graphNodes, graphEdges);
  const routeMap = buildRouteMap(fileAnalyses, graphEdges);
  const stateFlow = buildStateFlow(fileAnalyses, graphEdges);
  const renderGraph = buildRenderGraph(graphEdges);
  const packs = buildContextPacks(
    fileAnalyses,
    graphEdges,
    contracts,
    routeMap,
    stateFlow,
  );
  const compressed = buildCompressedSummaries(fileAnalyses, impact, packs);
  const chunks = fileAnalyses.flatMap((analysis) =>
    chunkSource(analysis.file, readIfExists(path.join(ROOT, analysis.file))),
  );
  const snapshot = {
    generatedAt,
    sourceHash: metadata.sourceHash,
    files: Object.fromEntries(
      fileAnalyses.map((analysis) => [
        analysis.file,
        { hash: analysis.hash, generatedAt },
      ]),
    ),
  };

  writeJson(path.join(BRAIN_DIR, "knowledge/schema.json"), {
    nodeTypes: [
      "file",
      "component",
      "hook",
      "store",
      "storeField",
      "endpoint",
      "websocket",
      "database",
      "databaseTable",
      "route",
      "externalPackage",
      "contextPack",
    ],
    edgeTypes: [
      "dependsOn",
      "imports",
      "exports",
      "renders",
      "wraps",
      "usesState",
      "readsStore",
      "writesStore",
      "callsEndpoint",
      "listensTo",
      "emits",
      "readsDatabase",
      "writesDatabase",
      "mutates",
      "servedBy",
      "definedIn",
    ],
    graphNode: [
      "id",
      "type",
      "label",
      "file",
      "symbol",
      "hash",
      "loc",
      "metadata",
    ],
    graphEdge: [
      "id",
      "type",
      "source",
      "target",
      "confidence",
      "evidence",
      "metadata",
    ],
  });
  writeJson(path.join(BRAIN_DIR, "knowledge/graph.json"), graph);
  writeJson(path.join(BRAIN_DIR, "indexes/component-map.json"), {
    metadata,
    files: Object.fromEntries(
      fileAnalyses.map((analysis) => [analysis.file, analysis]),
    ),
  });
  writeJson(path.join(BRAIN_DIR, "indexes/dependency-graph.json"), {
    metadata,
    dependencies: Object.fromEntries(
      fileAnalyses.map((analysis) => [
        analysis.file,
        analysis.imports.map(
          (imp) => imp.resolved ?? imp.external ?? imp.specifier,
        ),
      ]),
    ),
  });
  writeJson(path.join(BRAIN_DIR, "indexes/ast-dependency-graph.json"), {
    metadata,
    dependencies: Object.fromEntries(
      fileAnalyses.map((analysis) => [analysis.file, analysis.imports]),
    ),
  });
  writeJson(path.join(BRAIN_DIR, "indexes/semantic-index.json"), {
    metadata,
    contextPacks: packs.map((pack) => ({
      id: pack.id,
      title: pack.title,
      sourceFiles: pack.sourceFiles,
      invariants: pack.invariants,
    })),
  });
  writeJson(path.join(BRAIN_DIR, "flows/route-map.json"), routeMap);
  writeJson(path.join(BRAIN_DIR, "flows/state-flow.json"), stateFlow);
  writeJson(path.join(BRAIN_DIR, "flows/render-graph.json"), renderGraph);
  writeJson(path.join(BRAIN_DIR, "contracts/api-contracts.json"), contracts);
  writeJson(path.join(BRAIN_DIR, "impact/impact-analysis.json"), {
    metadata,
    ...impact,
  });
  writeJson(path.join(BRAIN_DIR, "impact/ast-impact-analysis.json"), {
    metadata,
    files: impact.files,
  });
  writeJson(path.join(BRAIN_DIR, "embeddings/chunks.json"), {
    metadata,
    chunks,
  });
  writeJson(path.join(BRAIN_DIR, "embeddings/metadata.json"), {
    metadata,
    algorithm: "source-token-sparse-v1",
    chunkCount: chunks.length,
    note: "Deterministic sparse token vectors for local architecture retrieval.",
  });
  packs.forEach((pack) =>
    writeJson(
      path.join(BRAIN_DIR, `retrieval/context-packs/${pack.id}.json`),
      pack,
    ),
  );
  writeJson(path.join(BRAIN_DIR, "compressed-context/subsystems.json"), {
    metadata,
    subsystems: compressed,
  });
  writeJson(path.join(BRAIN_DIR, "snapshots/file-hashes.json"), snapshot);

  console.log(
    `Brain generated: ${fileAnalyses.length} source files, ${graphNodes.length} nodes, ${graphEdges.length} edges, ${chunks.length} retrieval chunks.`,
  );
}

main();
