// 从 _candidates.json 筛出值得翻译的条目 → dict/_todo.json（排除已在词典中的）
import fs from "node:fs";
const l = JSON.parse(fs.readFileSync("dict/_candidates.json", "utf8"));
const dict = fs.existsSync("dict/zh-CN.json") ? JSON.parse(fs.readFileSync("dict/zh-CN.json", "utf8")) : {};
const strong = /^(key:(children|label|title|description|aria-label|ariaLabel|placeholder|message|detail|tooltip|hint|text|buttonLabel|alt|summary|heading|actionLabel|subtitle|caption|shortLabel|reason|error|confirmLabel|cancelLabel|emptyText)|arr:children|call:(t|confirm|info|toast|success|warning|createElement))$/;
const noise = /^(utils|renderScheduler|engine-javascript|langs|officePreview|document\.worker|binaryPreview|jszip|dist-|embeddedScripts|ChatMarkdown|runtime-|worker-rpc)/;
const weakOnly = /Binary|Assign|key:name|key:value/;
const out = l.filter((x) => {
  const t = x.text;
  if (dict[t] !== undefined) return false;
  if (/^\s*</.test(t) || /[<>]/.test(t) && /=["']/.test(t)) return false; // HTML/SVG
  if (/rgb\(|var\(--|px\b.*px\b|^inset /.test(t)) return false; // CSS
  if (/^[\w$.]+\(\)?$/.test(t)) return false;
  if (x.files.every((f) => noise.test(f))) return false;
  if (x.ctx.some((c) => strong.test(c))) return true;
  if (x.ctx.every((c) => weakOnly.test(c))) return false;
  if (x.ctx.every((c) => /call:[Ee]rror/.test(c))) return /^[A-Z]/.test(t) && /\s/.test(t) && t.length < 200; // 面向用户的错误信息
  return true;
}).map((x) => x.text);
fs.writeFileSync("dict/_todo.json", JSON.stringify(out, null, 0));
console.log("待翻译", out.length, "条，字符", out.reduce((s, t) => s + t.length, 0));
