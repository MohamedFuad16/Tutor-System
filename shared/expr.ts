/**
 * A tiny, safe math expression compiler for board graphs ("x^2 - 5x + 6",
 * "sin(2x)/x", "y = 3e^(-x)"). The tutor writes the expression; nothing it
 * writes is ever evaluated as code. Supports + - * / ^ (and **), implicit
 * multiplication ("2x", "3(x+1)"), |x|, pi, e and the usual functions.
 * Shared so the server can reject a graph it could not draw.
 */

type Node =
  | { t: "num"; v: number }
  | { t: "x" }
  | { t: "neg"; a: Node }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { t: "fn"; f: (value: number) => number; a: Node };

const FUNCTIONS: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
};

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

type Token = { k: "num"; v: number } | { k: "id"; v: string } | { k: "op"; v: string };

function tokenize(source: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(source.slice(i));
    if (number) {
      tokens.push({ k: "num", v: Number(number[0]) });
      i += number[0].length;
      continue;
    }
    const word = /^[a-z][a-z0-9]*/i.exec(source.slice(i));
    if (word) {
      // Split glued names like "xsin" or "pix" into known pieces.
      let rest = word[0].toLowerCase();
      while (rest) {
        const known = [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS), "x"]
          .filter((name) => rest.startsWith(name))
          .sort((a, b) => b.length - a.length)[0];
        if (!known) return null;
        tokens.push({ k: "id", v: known });
        rest = rest.slice(known.length);
      }
      i += word[0].length;
      continue;
    }
    if (source.startsWith("**", i)) {
      tokens.push({ k: "op", v: "^" });
      i += 2;
      continue;
    }
    if ("+-*/^()|".includes(ch)) {
      tokens.push({ k: "op", v: ch });
      i += 1;
      continue;
    }
    return null;
  }
  return tokens;
}

function parse(tokens: Token[]): Node | null {
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (value: string) => peek()?.k === "op" && peek()!.v === value;
  const startsAtom = () => {
    const token = peek();
    return Boolean(token && (token.k === "num" || token.k === "id" || (token.k === "op" && token.v === "(")));
  };

  function expression(): Node {
    let node = term();
    while (isOp("+") || isOp("-")) {
      const op = tokens[pos++].v as "+" | "-";
      node = { t: "bin", op, a: node, b: term() };
    }
    return node;
  }
  function term(): Node {
    let node = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = tokens[pos++].v as "*" | "/";
        node = { t: "bin", op, a: node, b: unary() };
      } else if (startsAtom()) {
        node = { t: "bin", op: "*", a: node, b: power() };
      } else return node;
    }
  }
  function unary(): Node {
    if (isOp("-")) {
      pos += 1;
      return { t: "neg", a: unary() };
    }
    if (isOp("+")) {
      pos += 1;
      return unary();
    }
    return power();
  }
  function power(): Node {
    const base = atom();
    if (isOp("^")) {
      pos += 1;
      return { t: "bin", op: "^", a: base, b: unary() };
    }
    return base;
  }
  function atom(): Node {
    const token = tokens[pos++];
    if (!token) throw new Error("end");
    if (token.k === "num") return { t: "num", v: token.v };
    if (token.k === "id") {
      if (token.v === "x") return { t: "x" };
      if (token.v in CONSTANTS) return { t: "num", v: CONSTANTS[token.v] };
      const f = FUNCTIONS[token.v];
      // "sin x" and "sin(x)" both work.
      const argument = isOp("(") ? atom() : power();
      return { t: "fn", f, a: argument };
    }
    if (token.v === "(") {
      const inner = expression();
      if (!isOp(")")) throw new Error("paren");
      pos += 1;
      return inner;
    }
    if (token.v === "|") {
      const inner = expression();
      if (!isOp("|")) throw new Error("abs");
      pos += 1;
      return { t: "fn", f: Math.abs, a: inner };
    }
    throw new Error("token");
  }

  try {
    const node = expression();
    return pos === tokens.length ? node : null;
  } catch {
    return null;
  }
}

function evaluate(node: Node, x: number): number {
  switch (node.t) {
    case "num":
      return node.v;
    case "x":
      return x;
    case "neg":
      return -evaluate(node.a, x);
    case "fn":
      return node.f(evaluate(node.a, x));
    case "bin": {
      const a = evaluate(node.a, x);
      const b = evaluate(node.b, x);
      if (node.op === "+") return a + b;
      if (node.op === "-") return a - b;
      if (node.op === "*") return a * b;
      if (node.op === "/") return a / b;
      return a ** b;
    }
  }
}

/** Normalises what people and models write: "y = 2x²", "f(x) = 3·x − 1", "π". */
export function normalizeExpression(source: string) {
  return source
    .trim()
    .replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, "")
    .replace(/[−–]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/\\pi/g, "pi")
    .replace(/[{}]/g, (brace) => (brace === "{" ? "(" : ")"));
}

/** Compiles an expression in x to a function, or null if it can't be read safely. */
export function compileExpression(source: string): ((x: number) => number) | null {
  const text = normalizeExpression(String(source ?? ""));
  if (!text || text.length > 200) return null;
  const tokens = tokenize(text);
  if (!tokens?.length) return null;
  const ast = parse(tokens);
  if (!ast) return null;
  return (x: number) => {
    const value = evaluate(ast, x);
    return Number.isFinite(value) ? value : Number.NaN;
  };
}
