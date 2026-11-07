// 开发辅助（只读）：依次切换页面 hash，不点击任何控件，收集未翻译文案 → dict/_missing.json
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const routes = ["/settings/general","/settings/appearance","/settings/providers","/settings/connections","/settings/access","/settings/projects","/settings/threads","/settings/source-control","/settings/snap-shot","/settings/keybindings","/settings/integrations","/settings/scheduled-tasks","/settings/secrets","/settings/storage","/settings/worktrees","/settings/diagnostics","/settings/devices","/settings/labs","/settings/beta","/settings/maintenance","/settings/about","/settings/archived","/settings/usage","/usage","/pull-requests","/settings","/"];
const run = (...a) => execFileSync("node", ["scripts/cdp.mjs", ...a], { encoding: "utf8" });
for (const r of routes) {
  run("eval", `location.hash = '#${r}'; new Promise(r => setTimeout(r, 1800))`);
  process.stdout.write(".");
}
const missing = JSON.parse(run("eval", "window.__t3i18n.missing()"));
const prev = fs.existsSync("dict/_missing.json") ? JSON.parse(fs.readFileSync("dict/_missing.json", "utf8")) : [];
const all = [...new Set([...prev, ...missing])];
fs.writeFileSync("dict/_missing.json", JSON.stringify(all, null, 1));
console.log(`\n未翻译 ${missing.length} 条（累计 ${all.length}）→ dict/_missing.json`);
