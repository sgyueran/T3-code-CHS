// dict/_missing.json → dict/_missing_ui.json（去掉用户数据：中文名、路径、URL、模型 ID）
import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("dict/_missing.json", "utf8"));
const keep = m.filter((s) => {
  if (/[一-鿿]/.test(s)) return false;
  if (/^[A-Za-z]:[\/]/.test(s) || /^https?:/.test(s) || /\[1m\]|^\d+(\.\d+)* ·/.test(s)) return false;
  if (/^(Claude|Gemini|Codex|DeepSeek|VS Code|Antigravity|Rider|magpie|T3 Code \(Beta\))/.test(s) && s.split(" ").length < 5) return false;
  if (/^[\w.-]+\/[\w.-]+/.test(s)) return false;
  return true;
});
fs.writeFileSync("dict/_missing_ui.json", JSON.stringify(keep, null, 1));
console.log(m.length, "->", keep.length);
