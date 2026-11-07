// 给 T3 Code 打汉化补丁：
//  1) server.asar：client/index.html 注入 <script src="/i18n/zh-CN.js">，新增 client/i18n/zh-CN.js
//  2) app.asar：main.cjs 原生菜单/对话框字符串替换
// 用法：npm run patch [-- --dir <安装目录>] [--force] [--no-main]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { resolveInstallDir, ROOT } from "./lib.mjs";
import { readFile, rewrite } from "./asar-rewrite.mjs";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const NO_MAIN = args.includes("--no-main");
const { dir, res } = resolveInstallDir();
const MARKER = path.join(res, "t3code-chs.json");
const CLIENT = "apps/server/dist/client";
const MAIN = "apps/desktop/dist-electron/main.cjs";
const SCRIPT_TAG = '<script src="/i18n/zh-CN.js" data-t3code-chs></script>';

function log(...a) { console.log("[t3code-chs]", ...a); }

// ---------- 0. 确保应用未运行 ----------
function isRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq T3 Code (Beta).exe" /NH', { encoding: "utf8" });
    return /T3 Code/i.test(out);
  } catch { return false; }
}
if (isRunning() && !FORCE) {
  console.error("T3 Code 正在运行（包括托盘/后台进程）。请先完全退出后再打补丁，或加 --force。");
  process.exit(1);
}

// ---------- 1. 构建运行时 ----------
execSync(`node "${path.join(ROOT, "scripts", "build-runtime.mjs")}"`, { stdio: "inherit" });
const runtime = fs.readFileSync(path.join(ROOT, "dist", "zh-CN.js"));

const marker = fs.existsSync(MARKER) ? JSON.parse(fs.readFileSync(MARKER, "utf8")) : {};
const stamp = (f) => { const s = fs.statSync(f); return { size: s.size, mtimeMs: Math.round(s.mtimeMs) }; };
const same = (a, b) => a && b && a.size === b.size && a.mtimeMs === b.mtimeMs;

/** 返回未打补丁的原版路径；必要时（首次/应用已更新）刷新 .orig 备份 */
function pristine(name) {
  const cur = path.join(res, name);
  const orig = cur + ".orig";
  if (fs.existsSync(orig) && same(marker[name], stamp(cur))) return orig; // 当前是我们打过补丁的
  if (fs.existsSync(orig)) log(`${name} 与上次补丁记录不一致（应用可能已更新/已还原），刷新备份`);
  else log(`备份 ${name} → ${name}.orig`);
  fs.copyFileSync(cur, orig);
  return orig;
}

// ---------- 2. server.asar ----------
{
  const name = "server.asar";
  const src = pristine(name);
  let html = readFile(src, `${CLIENT}/index.html`).toString("utf8");
  if (!html.includes("data-t3code-chs")) {
    const m = html.match(/<meta charset="[^"]*"\s*\/?>/i);
    if (m) html = html.replace(m[0], `${m[0]}\n    ${SCRIPT_TAG}`);
    else html = html.replace(/<head>/i, `<head>\n    ${SCRIPT_TAG}`);
  }
  if (!html.includes("data-t3code-chs")) throw new Error("index.html 注入失败：找不到 <head>");
  rewrite(src, path.join(res, name), {
    [`${CLIENT}/index.html`]: Buffer.from(html, "utf8"),
    [`${CLIENT}/i18n/zh-CN.js`]: runtime,
  });
  // 校验
  const check = readFile(path.join(res, name), `${CLIENT}/index.html`).toString("utf8");
  const rt = readFile(path.join(res, name), `${CLIENT}/i18n/zh-CN.js`);
  if (!check.includes("data-t3code-chs") || !rt.equals(runtime)) throw new Error("server.asar 校验失败");
  marker[name] = stamp(path.join(res, name));
  log(`server.asar 已注入（运行时 ${(runtime.length / 1024).toFixed(0)} KB）`);
}

// ---------- 3. app.asar（原生菜单/对话框） ----------
if (!NO_MAIN) {
  const name = "app.asar";
  const src = pristine(name);
  let code = readFile(src, MAIN).toString("utf8");
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, "dict", "main-zh.json"), "utf8"));
  let ok = 0;
  const warn = [];
  for (const [from, to, min = 1] of rules.replace) {
    const n = code.split(from).length - 1;
    if (n < min) warn.push(`命中 ${n}/${min}: ${from.slice(0, 70)}`);
    if (n) { code = code.split(from).join(to); ok++; }
  }
  let roleHits = 0;
  for (const [role, label] of Object.entries(rules.roles)) {
    // 仅给没有显式 label 的 role 项补 label
    const re = new RegExp(`role: "${role}"(?!,\\s*label:)`, "g");
    code = code.replace(re, () => { roleHits++; return `role: "${role}", label: ${JSON.stringify(label)}`; });
  }
  rewrite(src, path.join(res, name), { [MAIN]: Buffer.from(code, "utf8") });
  marker[name] = stamp(path.join(res, name));
  log(`app.asar 已汉化：字符串规则 ${ok}/${rules.replace.length}，菜单角色 ${roleHits} 处`);
  for (const w of warn) log("  警告", w);
}

// ---------- 4. 记录 ----------
let appVersion = "?";
try { appVersion = JSON.parse(readFile(path.join(res, "app.asar.orig"), "package.json").toString()).version; } catch {}
marker.appVersion = appVersion;
marker.patchedAt = new Date().toISOString();
marker.patchVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
fs.writeFileSync(MARKER, JSON.stringify(marker, null, 2));
log(`完成。T3 Code ${appVersion} @ ${dir}`);
log("还原：npm run restore；临时关闭翻译：在开发者工具执行 __t3i18n.disable()");
