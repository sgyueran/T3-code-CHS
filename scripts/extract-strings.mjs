// 从 server.asar 的 client/assets/*.js 提取候选 UI 文案 → dict/_candidates.json
import fs from "node:fs";
import path from "node:path";
import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { resolveInstallDir, pristineAsar, readAsarText, listAsar, ROOT } from "./lib.mjs";

const CLIENT = "apps/server/dist/client/assets/";
// 非 UI 的大块：语法高亮语言包、图像解码、PDF、图标表等
const SKIP_FILE = /^(heic-to|lucideIconByName|PdfViewer|wasm|emacs-lisp|cpp|.*-grammar|mermaid|katex|shiki|onig|vitesse|github-|one-dark|material|dracula|nord|monokai|solarized)/i;

const UI_KEYS = new Set([
  "children", "placeholder", "title", "aria-label", "ariaLabel", "label", "description", "tooltip",
  "message", "alt", "text", "heading", "subtitle", "hint", "helperText", "emptyText", "emptyMessage",
  "confirmLabel", "cancelLabel", "actionLabel", "buttonLabel", "detail", "details", "summary", "caption",
  "content", "header", "footer", "name", "displayName", "shortLabel", "longLabel", "status", "reason",
  "error", "errorMessage", "successMessage", "body", "prompt", "explanation", "note", "badge", "value",
]);
const UI_CALLEES = /^(toast|jsxs?|jsxDEV|createElement|t|notify|alert|confirm|Error|success|error|warning|info|loading|message|addToast|showToast|setError|setMessage|setStatus)$/;

function looksLikeUi(s) {
  const t = s.trim();
  if (t.length < 2 || t.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (/^(https?:|wss?:|file:|data:|blob:|mailto:|\/\/|\.\/|\.\.\/|#[0-9a-f]{3,8}$)/i.test(t)) return false;
  if (/^[a-z0-9]+([:\-_./][a-z0-9]+)+$/.test(t)) return false; // kebab/snake/path/event 名
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(t)) return false; // camelCase
  if (/^[A-Z0-9_]+$/.test(t)) return false; // CONST
  if (/^[\w-]+\/[\w.+-]+$/.test(t)) return false; // MIME
  // tailwind/class 列表：全是小写 token，含 - : [ 等
  if (/^[a-z0-9!\[\]():\-/.%#_&>*@=~,]+( [a-z0-9!\[\]():\-/.%#_&>*@=~,]+)*$/.test(t) && /[-:\[]/.test(t)) return false;
  if (/[{};]\s*$/.test(t) && /[{}]/.test(t)) return false; // CSS/代码片段
  if (/^\s*(function|const|let|var|import|export|return)\b/.test(t)) return false;
  // 必须像人话：含空格，或首字母大写的单词
  if (!/\s/.test(t) && !/^[A-Z][a-z]+[A-Za-z]*[.!?…:]?$/.test(t) && !/^[A-Z][a-z]+(-[A-Za-z]+)+$/.test(t)) return false;
  return true;
}

function ctxOf(ancestors) {
  const parent = ancestors[ancestors.length - 2];
  if (!parent) return "?";
  if (parent.type === "Property") {
    const k = parent.key;
    return "key:" + (k.name ?? k.value);
  }
  if (parent.type === "CallExpression" || parent.type === "NewExpression") {
    const c = parent.callee;
    const name = c.type === "Identifier" ? c.name : c.type === "MemberExpression" ? (c.property.name ?? "") : "";
    return "call:" + name;
  }
  if (parent.type === "ArrayExpression") {
    const gp = ancestors[ancestors.length - 3];
    if (gp?.type === "Property") return "arr:" + (gp.key.name ?? gp.key.value);
    return "arr";
  }
  if (parent.type === "TemplateLiteral") return "tpl";
  return parent.type;
}

function isUiCtx(ctx) {
  const [kind, name] = ctx.split(":");
  if (kind === "key" || kind === "arr") return UI_KEYS.has(name);
  if (kind === "call") return UI_CALLEES.test(name);
  return ctx === "ConditionalExpression" || ctx === "LogicalExpression" || ctx === "ReturnStatement" || ctx === "AssignmentExpression" || ctx === "BinaryExpression";
}

const { res } = resolveInstallDir();
const archive = pristineAsar(res, "server.asar");
const files = listAsar(archive).filter((p) => p.startsWith(CLIENT) && p.endsWith(".js"));
const out = new Map(); // text -> {ctx:Set, files:Set, count}
let parsed = 0, failed = 0, skipped = 0;

function add(text, ctx, file) {
  const key = text.replace(/\s+/g, " ").trim();
  if (!looksLikeUi(key)) return;
  let e = out.get(key);
  if (!e) out.set(key, (e = { ctx: new Set(), files: new Set(), count: 0 }));
  e.ctx.add(ctx); e.files.add(file); e.count++;
}

for (const f of files) {
  const base = path.basename(f);
  if (SKIP_FILE.test(base)) { skipped++; continue; }
  const src = readAsarText(archive, f);
  let ast;
  try {
    ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module", allowHashBang: true });
    parsed++;
  } catch {
    failed++;
    continue;
  }
  walk.fullAncestor(ast, (node, _st, ancestors) => {
    if (node.type === "Literal" && typeof node.value === "string") {
      const ctx = ctxOf(ancestors);
      if (isUiCtx(ctx)) add(node.value, ctx, base);
    } else if (node.type === "TemplateLiteral" && node.quasis.length) {
      const parent = ancestors[ancestors.length - 2];
      if (parent?.type === "TaggedTemplateExpression") return; // css`` 等
      // 用 {0} {1} 占位还原整句，便于生成 pattern
      let s = "";
      node.quasis.forEach((q, i) => {
        s += q.value.cooked ?? q.value.raw;
        if (i < node.expressions.length) s += `{${i}}`;
      });
      const ctx = ctxOf(ancestors);
      if (/[A-Za-z]{2}/.test(s.replace(/\{\d+\}/g, "")) && isUiCtx(ctx)) add(s, ctx, base);
    }
  });
}

const list = [...out.entries()]
  .map(([text, e]) => ({ text, count: e.count, ctx: [...e.ctx].slice(0, 4), files: [...e.files].slice(0, 3) }))
  .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
fs.writeFileSync(path.join(ROOT, "dict", "_candidates.json"), JSON.stringify(list, null, 1));
console.log(`解析 ${parsed} 个文件，失败 ${failed}，跳过 ${skipped}；候选文案 ${list.length} 条 → dict/_candidates.json`);
