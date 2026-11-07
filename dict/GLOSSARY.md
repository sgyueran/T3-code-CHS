# T3 Code 汉化术语表

T3 Code 是一个桌面端 AI 编程智能体客户端（可连接 Codex / Claude Code / Cursor / OpenCode 等 Agent，管理项目、对话、工作树、终端、Git、PR）。

## 统一译法
| 英文 | 中文 |
|---|---|
| Thread | 对话 |
| Session | 会话 |
| Project | 项目 |
| Workspace | 工作区 |
| Worktree | 工作树 |
| Environment | 环境 |
| Machine / Host | 机器 / 主机 |
| Device | 设备 |
| Provider | 提供方 |
| Model | 模型 |
| Agent | Agent（保留） |
| Prompt | 提示词 |
| Composer | 输入框 |
| Message | 消息 |
| Branch | 分支 |
| Commit | 提交 |
| Push / Pull | 推送 / 拉取 |
| Pull request / PR | 拉取请求 / PR（短标签用 PR） |
| Merge / Rebase | 合并 / 变基 |
| Diff | 差异 |
| Repository / Repo | 仓库 |
| Source control | 源代码管理 |
| Stage / Unstage | 暂存 / 取消暂存 |
| Snapshot | 快照 |
| Terminal | 终端 |
| Settings | 设置 |
| Archive / Unarchive | 归档 / 取消归档 |
| Approve / Reject | 批准 / 拒绝 |
| Plan (mode) | 计划（模式） |
| Tool call | 工具调用 |
| Token | Token |
| Compact / Compaction | 压缩上下文 / 上下文压缩 |
| Sandbox | 沙箱 |
| Permission | 权限 |
| Connection | 连接 |
| Relay | 中继 |
| Pairing / Pair | 配对 |
| Remote | 远程 |
| Local | 本地 |
| Keybinding / Shortcut | 快捷键 |
| Theme | 主题 |
| Appearance | 外观 |
| Diagnostics | 诊断 |
| Usage | 用量 |
| Scheduled task | 定时任务 |
| Integration | 集成 |
| Preview | 预览 |
| Sidebar | 侧边栏 |
| Panel | 面板 |
| Side chat | 旁聊 |
| Queue / Queued | 队列 / 已排队 |
| Snooze / Snoozed | 暂缓 / 已暂缓 |
| Settle / Settled / Un-settle | 标记完成 / 已完成 / 取消完成 |
| Interrupt | 中断 |
| Retry | 重试 |
| Dismiss | 关闭（提示类）/ 忽略 |
| Loading… / Saving… | 加载中… / 保存中… |

## 不翻译
品牌与产品名（T3 Code, T3 Connect, Codex, Claude, Cursor, OpenCode, GitHub, GitLab, Bitbucket, Tailscale, WSL, VS Code, macOS, Windows, Linux, ACP, MCP, OAuth, API, CLI, SSH, URL, JSON 等）、快捷键名（Enter, Esc, Tab, ⌘, Ctrl, Shift…）、模型 ID、文件名/路径/命令。

## 规则
- 简体中文，简洁的软件 UI 风格；按钮用动词短语（“保存”而非“保存它”）。
- 保留 `{0}` `{1}` 等占位符（可以调整顺序），保留首尾标点风格：英文句号 → 中文句号“。”，省略号“…”保持“…”，冒号 → “：”。
- 单个词碎片（如句子被拆开的 "Snoozed, "）也照样翻译，保持可拼接。
- 如果字符串明显不是界面文案（代码标识符、CSS、正则、内部枚举值如 `PrimaryConnectionTarget`、日志格式），值写 `null` 表示跳过。
