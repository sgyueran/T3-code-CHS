// 开发辅助：通过 CDP 连接已启动的 T3 Code（需 --remote-debugging-port=9229）
// node scripts/cdp.mjs eval "<js>" | shot <out.png> | missing [out.json]
import fs from "node:fs";
const PORT = process.env.CDP_PORT || 9229;
const [cmd, arg] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === "page" && t.url.startsWith("t3code://")) || list.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result?.result?.value;
};
if (cmd === "eval") console.log(JSON.stringify(await evaluate(arg), null, 1));
else if (cmd === "shot") {
  const r = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(arg || "shot.png", Buffer.from(r.result.data, "base64"));
  console.log("saved", arg || "shot.png");
} else if (cmd === "missing") {
  const m = await evaluate("window.__t3i18n ? window.__t3i18n.missing() : null");
  if (arg) fs.writeFileSync(arg, JSON.stringify(m, null, 1));
  console.log(m ? `${m.length} 条未翻译` : "运行时未加载", (m || []).slice(0, 80));
}
ws.close();
