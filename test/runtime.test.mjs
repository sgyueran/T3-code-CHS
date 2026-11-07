// 运行时引擎测试：node test/runtime.test.mjs
import { JSDOM } from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";

const code = fs.readFileSync(new URL("../dist/zh-CN.js", import.meta.url), "utf8");
const dict = JSON.parse(fs.readFileSync(new URL("../dict/zh-CN.json", import.meta.url), "utf8"));
const dom = new JSDOM(`<!doctype html><html lang="en"><head><title>Settings</title></head><body>
<button id="b">Cancel</button>
<input id="i" placeholder="Search threads">
<div class="chat-markdown"><p id="md">Cancel</p></div>
<pre><code id="c">Cancel</code></pre>
<span id="sp">  Retry  </span>
</body></html>`, { runScripts: "outside-only" });
const { window } = dom;
window.eval(code);
const $ = (id) => window.document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));

assert.equal(window.document.documentElement.lang, "zh-CN");
assert.equal($("b").textContent, dict["Cancel"]);
assert.equal($("md").textContent, "Cancel", "markdown 正文不翻译");
assert.equal($("c").textContent, "Cancel", "代码不翻译");
assert.equal($("sp").textContent, `  ${dict["Retry"]}  `, "保留首尾空白");
console.log("title:", window.document.title, "| placeholder:", $("i").placeholder);

// 动态插入 + React 式 nodeValue 改写
const d = window.document.createElement("div");
d.textContent = "Retry";
window.document.body.appendChild(d);
await tick();
assert.equal(d.textContent, dict["Retry"]);
d.firstChild.nodeValue = "Cancel";
await tick();
assert.equal(d.textContent, dict["Cancel"]);
// 属性变化
$("b").setAttribute("title", "Retry");
await tick();
assert.equal($("b").getAttribute("title"), dict["Retry"]);

// 模板
const t = window.__t3i18n;
const tplKey = Object.keys(dict).find((k) => /^Snoozed, \{0\} left$/.test(k));
if (tplKey) console.log("template:", t.translate("Snoozed, 5m left"));
const anyTpl = Object.entries(dict).find(([k, v]) => v && /^[A-Z][a-z]+ [a-z]+ \{0\}\.?$/.test(k));
if (anyTpl) console.log("template:", anyTpl[0], "→", t.translate(anyTpl[0].replace("{0}", "foo")));
console.log("missing sample:", t.missing().slice(0, 5), "dict size", t.size);
console.log("ALL OK");

// ---- 回归：INPUT placeholder 与品牌词 ----
{
  const dom2 = new JSDOM(`<!doctype html><html><body>
  <input id="s" placeholder="Search">
  <span id="brand"><svg aria-label="T3"></svg> Code</span>
  <span id="plain">Code</span></body></html>`, { runScripts: "outside-only" });
  dom2.window.eval(code);
  const g = (id) => dom2.window.document.getElementById(id);
  assert.equal(g("s").placeholder, dict["Search"], "input placeholder 应翻译");
  assert.ok(g("brand").textContent.includes("Code") && !g("brand").textContent.includes("代码"), "T3 Code 品牌不翻译");
  assert.equal(g("plain").textContent, dict["Code"], "单独的 Code 仍翻译");
  console.log("regression OK");
}
