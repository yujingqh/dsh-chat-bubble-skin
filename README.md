# dsh-chat-bubble-skin

一个让 DeepSeek Harness (DSH) Web 界面变成**社交软件风格气泡聊天**的皮肤插件。

社交软件风格的气泡式对话 + 大输入框 + 宽对话区，附带 6 套「节气主题色」和独立的「AI 气泡色 / 我的气泡色」，并把 Markdown 大代码块做得清晰可读。

> 🇬🇧 English version: see [English](#english) below.

---

## 功能

- **气泡式对话**：assistant / user 消息以圆角气泡呈现，更像微信 / iMessage。
- **大输入框 + 宽对话区**：默认 900px 内容宽度，输入框高度可调。
- **三套配色（独立选择）**：
  - `主题色`：全局背景 + 导航栏（浅色 `bg` 档）。
  - `AI 气泡色`：assistant（AI）消息气泡 + 代码块（跟随主题深色 `dark` 文字 + 浅色 `bg` 背景，清晰可读）。
  - `我的气泡色`：user（你）消息气泡，独立设置，不受 AI 气泡色影响。
  - 三套独立选择，均持久化到 `localStorage`。
- **代码块优化**：修复了大代码块在彩色气泡下「代码发白」「复制按钮看不见」「灰色水笔背景」等问题，代码文字跟随主题深色、注释灰色、复制按钮深色可读。
- **快捷键**：`Ctrl+↑↓` 调输入框高度，`Ctrl+Shift+←→` 调对话区宽度（支持新版 contenteditable 输入框）。

## 配色（6 套节气主题 + 默认还原）

| 名称 | 主色 hex | 浅色 light | 背景 bg | 深色 dark |
| --- | --- | --- | --- | --- |
| 青蓝 | `#4BACC6` | `#9DD0E0` | `#D6EAF0` | `#2A6F80` |
| 紫粉 | `#BA79B1` | `#D6B0D1` | `#EBD8E8` | `#7A4F75` |
| 草绿 | `#91BC31` | `#BED88A` | `#DFECC5` | `#5F7A20` |
| 金黄 | `#ECD452` | `#F5E99B` | `#FAF4CD` | `#9A8A35` |
| 橙色 | `#FF9F71` | `#FFC9AD` | `#FFE4D6` | `#A6684A` |
| 浅绿 | `#C0D09D` | `#DBE5C5` | `#EDF2E2` | `#7D8866` |
| 默认 | — | — | — | — |

「默认」项可一键还原 DSH 原生外观。

## 快捷键（在输入框内）

| 快捷键 | 作用 |
| --- | --- |
| `Ctrl + ↑` / `Ctrl + ↓` | 输入框高度 ±40px |
| `Ctrl + Shift + ←` / `→` | 对话区宽度 ±40px |

> 新版 DSH 输入框是 `contenteditable` 元素，插件已兼容，快捷键同样可用。

## 安装

```bash
dsh plugin --profile web add dsh-chat-bubble
```

或从源码本地 link：

```bash
dsh plugin --profile web add "link:./dsh-chat-bubble"
```

安装后，把鼠标移到输入卡片右上角，会出现**三个**圆形调色盘按钮（从右到左）：
- 最右：我的气泡色
- 中间：AI 气泡色
- 最左：主题色

## 兼容性与维护

- 已验证：DSH `0.1.2-rc.1`（Web profile）。
- 该皮肤依赖 DSH 内部 CSS Modules 类名，**每次 DSH 升级都可能失效**，需重新适配。
  - 0.1.1：markdown 类名 hash 变化（已适配）。
  - 0.1.2：DSH 将消息渲染移到 `dsh-client-ui-chat` 包，类名整体重构（`Sxvs8a_*` → `hWmORq_*`、`gdEzaW_*` → `Sixlwa_*`），且输入框改为 contenteditable（已适配）。
- 已知限制：部分布局类（如输入高度控制的内部类）随 DSH 重构，插件已改用更稳定的锚点（`.md-code-block`、`data-chat-flow-kind`、`--dsh-chat-content-width` 等）尽量降低失效概率。
- 建议使用者在升级 DSH 后，若发现样式失效，检查 `lib/client.js` 中硬编码的 hash 类名是否需要更新。

## 目录结构

```
dsh-chat-bubble/
├── lib/
│   ├── index.js        # host 端入口（纯 CSS 皮肤，无 host 行为）
│   └── client.js       # 客户端 CSS + JS 注入
├── cordis.patch.yml    # bundle 注册
├── README.md
├── LICENSE
└── package.json
```

## License

[MIT](./LICENSE)

---

<a id="english"></a>

## English

A DeepSeek Harness (DSH) Web skin that turns the chat into a **social-app style bubble conversation**.

- Bubble-style assistant/user messages
- Large composer + wide conversation area (900px default)
- 6 solar-term theme palettes + independent **AI bubble** and **user bubble** colors, persisted to `localStorage`
- Readable Markdown code blocks (theme-following dark text on light background; fixed white-text / invisible copy-button / gray-wash issues)
- Shortcuts to resize input height and chat width (supports new contenteditable composer)

**Install**

```bash
dsh plugin --profile web add dsh-chat-bubble
```

**Shortcuts** (while focused in the composer): `Ctrl+↑/↓` resize input height; `Ctrl+Shift+←/→` resize chat width.

**Compatibility & maintenance**

- Verified against DSH `0.1.2-rc.1` (Web profile).
- This skin depends on DSH internal CSS Modules class names, which **may break on every DSH upgrade** and need re-adaptation.
  - `0.1.1`: markdown class-hash change (adapted).
  - `0.1.2`: message rendering moved to `dsh-client-ui-chat` package, class names rebuilt (`Sxvs8a_*` → `hWmORq_*`, `gdEzaW_*` → `Sixlwa_*`), composition input switched to contenteditable (adapted).
- The plugin prefers stable anchors (`.md-code-block`, `data-chat-flow-kind`, `--dsh-chat-content-width`, etc.) to reduce breakage risk.

**License**: MIT
