// 合并 dict/parts/*.json + dict/manual.json → dict/zh-CN.json，并生成 dist/zh-CN.js
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib.mjs";

const dictDir = path.join(ROOT, "dict");
const merged = {};
const partsDir = path.join(dictDir, "parts");
const parts = fs.existsSync(partsDir) ? fs.readdirSync(partsDir).filter((f) => /^part-\d+\.json$/.test(f)).sort() : [];
for (const f of parts) Object.assign(merged, JSON.parse(fs.readFileSync(path.join(partsDir, f), "utf8")));
// 人工修订优先级最高
const manualPath = path.join(dictDir, "manual.json");
if (fs.existsSync(manualPath)) Object.assign(merged, JSON.parse(fs.readFileSync(manualPath, "utf8")));

const norm = (s) => s.replace(/\s+/g, " ").trim();
const exact = {};
const templates = [];
let bad = 0;
for (const [en, zh] of Object.entries(merged)) {
  if (zh == null || zh === "" || typeof zh !== "string") continue;
  const k = norm(en);
  if (!k) continue;
  const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
  if (/\{\d+\}/.test(k)) {
    if (ph(k) !== ph(zh)) { bad++; console.warn("占位符不一致，跳过:", k, "→", zh); continue; }
    templates.push([k, norm(zh)]);
  } else {
    exact[k] = norm(zh);
  }
}

fs.writeFileSync(path.join(dictDir, "zh-CN.json"), JSON.stringify(Object.fromEntries(Object.entries(merged).sort()), null, 1));

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
let rt = fs.readFileSync(path.join(ROOT, "src", "runtime", "i18n-zh.js"), "utf8");
const UNSAFE = new RegExp("[<" + String.fromCharCode(0x2028, 0x2029) + "]", "g");
const safe = (v) => JSON.stringify(v).replace(UNSAFE, (c) => String.fromCharCode(92) + "u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
rt = rt
  .replace("/*__DICT__*/ {}", safe(exact))
  .replace("/*__TEMPLATES__*/ []", safe(templates))
  .replace("/*__VERSION__*/", `${pkg.version}+${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(path.join(ROOT, "dist"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "dist", "zh-CN.js"), rt);
console.log(`词条 ${Object.keys(exact).length}，模板 ${templates.length}，跳过 ${bad} → dist/zh-CN.js (${(rt.length / 1024).toFixed(0)} KB)`);
