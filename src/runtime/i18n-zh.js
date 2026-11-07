/* T3 Code 简体中文运行时翻译（由 scripts/build-runtime.mjs 注入词典后生成 dist/zh-CN.js） */
(function () {
  "use strict";
  var OFF_KEY = "t3code:i18n:off";
  try {
    if (localStorage.getItem(OFF_KEY) === "1") return;
  } catch (e) {}
  if (window.__t3i18n) return;

  /** @type {Record<string,string>} */
  var DICT = /*__DICT__*/ {};
  /** @type {Array<[string,string]>} 原文模板(含 {0}) → 译文模板 */
  var TEMPLATES = /*__TEMPLATES__*/ [];

  var exact = new Map();
  for (var k in DICT) if (Object.prototype.hasOwnProperty.call(DICT, k)) exact.set(norm(k), DICT[k]);

  // 编译模板：{n} → 捕获组；用最长字面片段做预筛
  var patterns = [];
  TEMPLATES.forEach(function (pair) {
    var src = norm(pair[0]);
    var order = [];
    var lits = src.split(/\{(\d+)\}/);
    var re = "^";
    var longest = "";
    for (var i = 0; i < lits.length; i++) {
      if (i % 2 === 0) {
        re += lits[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (lits[i].trim().length > longest.length) longest = lits[i].trim();
      } else {
        order.push(+lits[i]);
        re += "(.+?)";
      }
    }
    re += "$";
    if (!longest || longest.length < 2) return; // 纯占位模板太宽泛
    patterns.push({ re: new RegExp(re), order: order, to: pair[1], probe: longest });
  });
  patterns.sort(function (a, b) { return b.probe.length - a.probe.length; });

  function norm(s) { return s.replace(/\s+/g, " ").trim(); }

  var cache = new Map();
  function translate(raw) {
    var key = norm(raw);
    if (!key || !/[A-Za-z]/.test(key)) return null;
    var hit = exact.get(key);
    if (hit !== undefined) return hit;
    if (cache.has(key)) return cache.get(key);
    var out = null;
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      if (key.indexOf(p.probe) === -1) continue;
      var m = p.re.exec(key);
      if (!m) continue;
      var vals = {};
      for (var j = 0; j < p.order.length; j++) {
        var v = m[j + 1];
        var tv = exact.get(v); // 占位值本身若是可翻译短语也翻译
        vals[p.order[j]] = tv !== undefined ? tv : v;
      }
      out = p.to.replace(/\{(\d+)\}/g, function (_, n) { return vals[n] != null ? vals[n] : ""; });
      break;
    }
    if (cache.size > 5000) cache.clear();
    cache.set(key, out);
    if (out === null) noteMissing(key);
    return out;
  }

  // 保留原文首尾空白
  function apply(raw, zh) {
    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    return lead + zh + trail;
  }

  // ---- 跳过区域：代码、终端、编辑器、用户/助手消息正文 ----
  var SKIP_SELECTOR = [
    "pre", "code", "kbd", "samp", "textarea", "script", "style", "noscript",
    "[contenteditable]:not([contenteditable=false])", ".cm-editor", ".monaco-editor", ".xterm",
    ".chat-markdown", "[data-user-message-body]", "[data-thread-find-text]", "[data-i18n-skip]", "[translate=no]",
  ].join(",");
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, PRE: 1, CODE: 1, KBD: 1, NOSCRIPT: 1 };

  function inSkip(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP_TAGS[el.tagName]) return true;
    return !!(el.closest && el.closest(SKIP_SELECTOR));
  }

  // 品牌：<svg aria-label="T3"> 后紧跟的 "Code" 不翻译
  function isBrand(node, parent) {
    var t = node.nodeValue.trim();
    if (t !== "Code" && t !== "Code (Beta)") return false;
    var prev = node.previousSibling || parent.previousElementSibling;
    while (prev && prev.nodeType === 3 && !prev.nodeValue.trim()) prev = prev.previousSibling;
    return !!(prev && prev.nodeType === 1 && /^svg$/i.test(prev.tagName) && /T3/.test(prev.getAttribute("aria-label") || ""));
  }

  var done = new WeakMap(); // Text 节点 → 上次我们写入的值
  function doText(node) {
    var v = node.nodeValue;
    if (!v || v.length > 600 || done.get(node) === v) return;
    var parent = node.parentNode;
    if (!parent || inSkip(parent)) return;
    if (isBrand(node, parent)) return;
    var zh = translate(v);
    if (zh == null) return;
    var nv = apply(v, zh);
    done.set(node, nv);
    if (nv !== v) node.nodeValue = nv;
  }

  var ATTRS = ["placeholder", "title", "aria-label", "alt", "aria-description", "data-tooltip"];
  var attrDone = new WeakMap();
  function doAttrs(el) {
    if (!el.getAttribute) return;
    var memo;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      var v = el.getAttribute(a);
      if (!v) continue;
      memo = memo || attrDone.get(el) || {};
      if (memo[a] === v) continue;
      var zh = translate(v);
      if (zh == null) continue;
      memo[a] = zh;
      attrDone.set(el, memo);
      if (zh !== v) el.setAttribute(a, zh);
    }
    // 按钮型 input 的 value
    if (el.tagName === "INPUT" && (el.type === "button" || el.type === "submit") && el.value) {
      var z = translate(el.value);
      if (z != null && z !== el.value) el.value = z;
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (root.tagName === "INPUT" || root.tagName === "TEXTAREA") return doAttrs(root);
      if (inSkip(root)) return;
      doAttrs(root);
    }
    var tw = document.createTreeWalker(root, 1 | 4, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (n.tagName === "INPUT" || n.tagName === "TEXTAREA") { doAttrs(n); return 2; }
          if (SKIP_TAGS[n.tagName] || (n.matches && n.matches(SKIP_SELECTOR))) return 2; // REJECT 整棵子树
          return 1;
        }
        return 1;
      },
    });
    var n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }

  // ---- 未翻译文案收集（调试用） ----
  var missing = new Map();
  function noteMissing(key) {
    if (missing.size > 3000 || key.length > 300) return;
    if (!/[A-Za-z]{2}/.test(key) || /^[\w.\/\\:-]+$/.test(key) && !/^[A-Z][a-z]+$/.test(key)) return;
    missing.set(key, (missing.get(key) || 0) + 1);
  }

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === "characterData") doText(r.target);
      else if (r.type === "attributes") {
        var t = r.target;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || !inSkip(t)) doAttrs(t);
      }
      else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
    }
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
    walk(document.documentElement);
  }

  document.documentElement.setAttribute("lang", "zh-CN");
  start();

  window.__t3i18n = {
    version: "/*__VERSION__*/",
    size: exact.size,
    translate: translate,
    retranslate: function () { walk(document.documentElement); },
    missing: function () {
      return Array.from(missing.entries()).sort(function (a, b) { return b[1] - a[1]; }).map(function (e) { return e[0]; });
    },
    disable: function () { try { localStorage.setItem(OFF_KEY, "1"); } catch (e) {} location.reload(); },
    enable: function () { try { localStorage.removeItem(OFF_KEY); } catch (e) {} location.reload(); },
  };
  window.__t3i18nMissing = function () {
    var list = window.__t3i18n.missing();
    try { copy(JSON.stringify(list, null, 1)); } catch (e) {}
    return list;
  };
})();
