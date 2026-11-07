# T3 Code 简体中文汉化

给已安装的 **T3 Code (Beta)** 打简体中文补丁，不改源码、不重新编译。

> **非官方项目。** 与 T3 Tools / pingdotgg 无关联，“T3 Code”是其各自所有者的名称。本项目不包含 T3 Code 的任何程序文件，只在**你本机已安装**的副本上做修改。
> 补丁会改写安装目录里的 `app.asar` 和 `server.asar`（先备份为 `*.orig`）。使用风险自负；出问题时 `npm run restore` 即可还原。

**适用版本**：已在 T3 Code (Beta) 0.1.7 / Windows x64 上验证。其他版本词典可能有漏翻，主进程替换规则可能命中不全（打补丁时会打印警告）。

**前置条件**：Windows、Node.js 22+、已安装 T3 Code。

## 原理
- 界面前端在 `resources\server.asar` 的 `apps/server/dist/client/`（React 打包产物，无 i18n 框架）。
- 补丁往 `index.html` 注入 `<script src="/i18n/zh-CN.js">`。脚本内置词典，用 `MutationObserver` 把 DOM 里的文本节点和 `placeholder / title / aria-label / alt` 实时换成中文。
- 原生菜单、右键菜单、对话框在 `resources\app.asar` 的 `main.cjs`，按 `dict/main-zh.json` 里的规则做字符串替换。
- 改包用自带的 `scripts/asar-rewrite.mjs`：原数据区原样拷贝，只追加改动的文件，不碰 `.unpacked` 里的原生模块。Electron 的 asar 完整性 fuse 在该版本是关闭的，所以不会被拦。
- 跳过区域：代码块、终端、编辑器、聊天 Markdown 正文、用户消息正文、`input/textarea` 的内容。

## 使用
```powershell
git clone https://github.com/sgyueran/T3-code-CHS.git && cd T3-code-CHS
npm install
# 先完全退出 T3 Code（含托盘/后台进程）
npm run patch      # 构建词典 → 备份 *.asar.orig → 注入
npm run restore    # 还原原版
```
- 应用自动更新后补丁会被覆盖，重新 `npm run patch` 即可（会识别并刷新备份）。
- 临时关闭翻译：开发者工具里执行 `__t3i18n.disable()`，开启用 `__t3i18n.enable()`。
- 安装目录不在默认位置：`npm run patch -- --dir "D:\path\to\t3code"`。

## 维护词典
| 文件 | 作用 |
|---|---|
| `dict/parts/part-*.json` | 机器翻译分片（key=英文，value=中文，`null`=不翻译） |
| `dict/manual.json` | **人工修订，优先级最高**（改译文请改这里） |
| `dict/main-zh.json` | 主进程菜单/对话框替换规则 |
| `dict/GLOSSARY.md` | 术语表 |
| `dict/zh-CN.json` | 合并产物（自动生成，勿手改） |

含变量的句子用 `{0}` `{1}` 占位（如 `Pin {0} (Ctrl+Shift+P)`）。

升级到新版后补词典的流程：
1. `npm run extract` 提取新版文案 → `dict/_candidates.json`，`node scripts/make-todo.mjs` 得到尚未收录的条目。
2. 打补丁后用 `--remote-debugging-port=9229` 启动应用，`node scripts/crawl.mjs`（只读，仅切换页面）收集漏翻 → `dict/_missing.json`，`node scripts/filter-missing.mjs` 去掉用户数据。
3. 翻译后放进 `dict/parts/` 或 `dict/manual.json`，`npm run build` 再 `npm run patch`。

## 测试
```powershell
node test/runtime.test.mjs   # jsdom 下验证翻译引擎
```

## 许可与致谢
- 本项目代码与词典以 [MIT](LICENSE) 发布。
- 词典中的英文原文来自 T3 Code（MIT 协议，© T3 Tools），仅用于翻译对照。
- 欢迎提交 PR 修正译文：直接改 `dict/manual.json`（优先级最高），无需动其他文件。
