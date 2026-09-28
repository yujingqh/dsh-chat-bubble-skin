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

- 该皮肤依赖 DSH 内部 CSS Modules 类名，**每次 DSH 升级都可能失效**，需重新适配。
  - 0.1.1：markdown 类名 hash 变化（已适配）。
  - 0.1.2：DSH 将消息渲染移到 `dsh-client-ui-chat` 包，类名整体重构（`Sxvs8a_*` → `hWmORq_*`、`gdEzaW_*` → `Sixlwa_*`），且输入框改为 contenteditable（已适配）。
  - 0.1.3：代码块顶栏类名换代（`_banner_*`/`_copyButton_*` → `_header_*`/`_action_*`）；快捷键迁移至官方 `ctx.shortcuts` 注册表（已适配）。

### 维护速查

**所有 DSH 依赖的选择器集中在 `lib/client.js` 顶部的 `SEL` 常量里。**
DSH 升级后若样式失效，通常**只需改 `SEL` 一处**：

```js
var SEL = {
  frame: ".pI_x6G_frame",          // 三列框架根（主题变量挂在它上面）
  root: ".wSkVaW_root",            // 会话区根（插件 data-dsh-* 属性挂载点）
  card: ".uV2eYG_card",            // 输入框卡片（调色盘按钮挂载点）
  cardScroll: ".uV2eYG_scroll",    // 输入框滚动容器（高度调整目标）
  bubbleAI: ".hWmORq_root",        // AI 消息根（气泡背景色）
  bubbleAIBody: ".hWmORq_body",    // AI 正文容器（文字染色）
  bubbleUser: ".Sixlwa_bubble",    // 用户气泡（用户气泡色）
  bubbleUserStack: ".Sixlwa_userStack",
  column: ".EvIC1a_column",        // 对话区列（宽度变量）
};
```

定位新类名的方法：DevTools 选中目标元素 → 取其 class 中形如 `xxxx_NNN_1` 的那个
（CSS Modules 产物）→ 更新 `SEL` 对应项。

**优先使用 DSH 主动提供的稳定锚点**，不要换成哈希类名：

| 稳定锚点 | 含义 |
| --- | --- |
| `[data-chat-flow-kind="assistant-step"]` | AI 消息步骤 |
| `[data-chat-flow-kind="user"]` | 用户消息 |
| `[data-code-block-banner]` | 代码块顶栏 |
| `[data-conversation-scroll]` | 对话滚动容器 |

### 修改插件时的两个坑（都实际踩过）

**1. CSS 注释里不能出现反引号**

CSS 是拼在 JS 模板字符串里的，注释中一个反引号就会**提前终止模板**，
后续文本被当成表达式求值，产生 `NaN` 并吞掉花括号 —— 结果是整条规则
被浏览器静默丢弃，而 `node --check` **查不出来**（JS 语法本身是合法的）。

改完务必确认生成结果：非注释区无 `NaN`、花括号配平。

**2. 快捷键不要声明 Linux profile**

DSH 的 `isWebBindingAllowed` 对各平台有白名单校验，**Linux 只接受极少数组合**
（`Mod+Slash`、`Mod+Shift+Comma`、`Mod+Shift+Period`）。声明 `web:linux` 或
`desktop:linux` 且键位不在白名单内时，`ctx.shortcuts.register` 会**抛错**，
进而导致 Cordis 判定插件激活失败，**整个 DSH 启动被拦成错误页**。

当前只声明 `web:windows`、`web:macos`、`desktop:windows`、`desktop:macos`。
未声明的 profile 即"不绑定"，是安全的。

## 快捷键

通过 DSH 官方快捷键服务注册，可在 **设置 → 快捷键** 中查看和改键。

| 命令 | 默认键位 |
| --- | --- |
| 加宽 / 收窄对话区 | `Mod+Alt+→` / `Mod+Alt+←` |
| 增大 / 减小输入框高度 | `Mod+Alt+↑` / `Mod+Alt+↓` |

`Mod` 在 macOS 上为 `Command`，在 Windows 上为 `Control`。

插件同时保留一个裸 `keydown` 监听作为兜底（DSH 未提供 `shortcuts` 服务时
仍可用，键位为 `Alt+Shift+方向键`）；官方通道注册成功后该兜底自动停用，
不会重复触发。

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
