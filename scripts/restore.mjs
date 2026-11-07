// 用 .orig 备份还原 server.asar / app.asar
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { resolveInstallDir } from "./lib.mjs";

const { res } = resolveInstallDir();
try {
  const out = execSync('tasklist /FI "IMAGENAME eq T3 Code (Beta).exe" /NH', { encoding: "utf8" });
  if (/T3 Code/i.test(out) && !process.argv.includes("--force")) {
    console.error("T3 Code 正在运行，请先完全退出。");
    process.exit(1);
  }
} catch {}

const marker = path.join(res, "t3code-chs.json");
const m = fs.existsSync(marker) ? JSON.parse(fs.readFileSync(marker, "utf8")) : {};
for (const name of ["server.asar", "app.asar"]) {
  const cur = path.join(res, name);
  const orig = cur + ".orig";
  if (!fs.existsSync(orig)) { console.log(`[t3code-chs] 无 ${name}.orig，跳过`); continue; }
  const s = fs.statSync(cur);
  const rec = m[name];
  if (rec && (rec.size !== s.size || rec.mtimeMs !== Math.round(s.mtimeMs))) {
    console.log(`[t3code-chs] ${name} 不是补丁版本（应用可能已更新），不覆盖；删除过期备份`);
    fs.rmSync(orig);
    continue;
  }
  fs.copyFileSync(orig, cur);
  fs.rmSync(orig);
  console.log(`[t3code-chs] 已还原 ${name}`);
}
if (fs.existsSync(marker)) fs.rmSync(marker);
