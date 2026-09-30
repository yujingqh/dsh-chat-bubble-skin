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

### Web 版

```bash
dsh plugin --profile web add dsh-chat-bubble
```

或从源码本地 link：

```bash
dsh plugin --profile web add "link:./dsh-chat-bubble"
```

### 桌面版（Electron）

桌面版 profile 由 Electron 应用独占管理，`dsh` CLI 会直接拒绝
（`profile "desktop" is managed exclusively by the Electron application`），
所以要手工改两处、再让 pnpm 建链接。以链接到源码目录为例：

1. 在 `$DSH_HOME/profiles/desktop/package.json` 里加依赖与 bundle：

```json
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {
    "dsh-chat-bubble": "link:D:/AI/AI test/dsh-chat-bubble"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-chat-bubble"
      ]
    }
  }
}
```

2. 在该目录用**桌面版自带的 pnpm** 安装（官方 `dsh plugin` 走的同一条路）：

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
node --expose-internals "<安装目录>\resources\runtime\pnpm\bin\pnpm.mjs" install
```

3. **重启桌面版**（profile 只在启动时读取），鼠标移到输入卡片右上角即可看到调色盘按钮。

> 桌面版的客户端插件同样要求 `package.json` 里声明 `dsh.client.platform: "web"`
> —— 桌面版外壳就是 web 渲染层，值不用改。

安装后，把鼠标移到输入卡片右上角，会出现**三个**圆形调色盘按钮（从右到左）：
- 最右：我的气泡色
- 中间：AI 气泡色
- 最左：主题色

## 兼容性与维护

- 该皮肤依赖 DSH 的 DOM 结构。**主路径已改为只用 DSH 公开锚点**（`data-*` 与
  CSS 变量），不再依赖 CSS Modules 哈希，抗升级能力大幅提升；哈希只作兜底。
  - 0.1.1：markdown 类名 hash 变化（已适配）。
  - 0.1.2：DSH 将消息渲染移到 `dsh-client-ui-chat` 包，类名整体重构（`Sxvs8a_*` → `hWmORq_*`、`gdEzaW_*` → `Sixlwa_*`），且输入框改为 contenteditable（已适配）。
  - 0.1.3：代码块顶栏类名换代（`_banner_*`/`_copyButton_*` → `_header_*`/`_action_*`）；快捷键迁移至官方 `ctx.shortcuts` 注册表（已适配）。
  - 0.1.4：**同时适配 0.1.7 与 0.2.0 两套运行时**。桌面版打包的是
    `0.2.0-rc.2`，其 CSS Modules 哈希与 npm 上 Web CLI 那份 `0.1.7-rc.2`
    **完全不同**（同一个元素两套类名）。插件内置两套哈希候选 + 稳定锚点优先。
  - 0.1.6：**去掉对哈希的主依赖**。气泡改为直接画在
    `[data-chat-flow-kind="assistant-step"]` / `[data-chat-flow-kind="user"]`
    流节点上（依据：插槽层 `display:contents` 不产生盒子，且该插槽只渲染一个
    正文组件，故流节点盒子 == 原来的哈希容器盒子，几何完全一致）；
    宽度/主题/输入框改走 `data-*` 锚点与 CSS 变量。
    仍保留哈希兜底，并新增「哈希全变但锚点仍在」的 `ANCHOR_ONLY` 路径。

### 两套运行时的类名对照（实测）

| 角色 | 0.1.7-rc.2（Web CLI） | 0.2.0-rc.2（桌面版运行时） |
| --- | --- | --- |
| 三列框架根 `AppFrame.frame` | `.pI_x6G_frame` | `.BynINW_frame` |
| 会话区根 `ConversationRoot.root` | `.wSkVaW_root` | `.Dc7zOa_root` |
| 会话区体 `ConversationRoot.body` | `.wSkVaW_body` | `.Dc7zOa_body` |
| 输入卡片 `InputBar.card` | `.uV2eYG_card` | `.RlGAzG_card` |
| 输入滚动容器 `InputBar.scroll` | `.uV2eYG_scroll` | `.RlGAzG_scroll` |
| 对话区列 `ChatView.column` | `.EvIC1a_column` | `.xz4KEq_column` |
| 我的气泡 `MessageItem.bubble` | `.Sixlwa_bubble` | `.cJsG2q_bubble` |
| 我的气泡层叠 `MessageItem.userStack` | `.Sixlwa_userStack` | `.cJsG2q_userStack` |
| AI 正文根 `AssistantMarkdown.root` | `.hWmORq_root` | `.v5IAXa_root` |
| AI 正文容器 `AssistantMarkdown.body` | `.hWmORq_body` | `.v5IAXa_body` |

**另一处必须注意的坑：插件属性挂在哪一层。**

气泡规则靠 `body[data-dsh-bubble-ai] ...` 这类后代选择器生效，所以
`data-dsh-bubble-ai` / `data-dsh-bubble-user` / `data-dsh-theme`
**必须挂在「包含整个对话列」的祖先上**。

实测运行中桌面版的真实祖先链（2026-09-30）：

```
body
└─ .BynINW_frame
   └─ .Dc7zOa_root            ← ConversationRoot（会话区外壳）
      └─ .Dc7zOa_body
         ├─ [data-conversation-scroll]
         │  └─ .xz4KEq_frame
         │     └─ .xz4KEq_root
         │        └─ .xz4KEq_scroll
         │           └─ .xz4KEq_column
         │              ├─ .xz4KEq_flowItem[data-chat-flow-kind="assistant-step"]
         │              │  └─ .WW4l1q_root → .WW4l1q_body → .WW4l1q_content
         │              │     └─ .v5IAXa_root      ← AI 正文
         │              └─ .xz4KEq_flowItem[data-chat-flow-kind="user"]
         │                 └─ .cJsG2q_userRow → .cJsG2q_userStack → .cJsG2q_bubble
         └─ .RlGAzG_card       ← 输入卡片（调色盘按钮挂载点）
```

注意 `.Dc7zOa_root` **确实**是对话列的祖先，但插件早期版本把属性挂在
更内层、或依赖单一类名时，一旦该元素与对话列变成并列子树就会整片失效。
因此现在统一挂在 `document.body` 上（见 `attrHost()`），这是两套运行时
都成立的祖先。

另外两处已实测确认的事实：

- `data-chat-flow-kind="assistant-step"` 在 **0.1.7 与 0.2.0 都存在**
  （桌面版实测 172 个节点），AI 气泡规则以它为主选择器；
- 0.2.0 的 AI 正文外层多了 `ChatGroupSeat`（`.WW4l1q_*`）包一层，
  但 `AssistantMarkdown` 仍是 `.v5IAXa_root`，选择器穿透即可。

### 维护速查

**这个插件现在有两条路径，优先走「零哈希」那条。**

#### 主路径（默认）：只用 DSH 公开锚点，不含任何哈希

`effective()` 会逐项探测，锚点在就用锚点：

| 角色 | 使用的稳定锚点 |
| --- | --- |
| AI 气泡载体 | `[data-chat-flow-kind="assistant-step"]` |
| 我的气泡载体 | `[data-chat-flow-kind="user"]` |
| 输入卡片 | `[data-composer-card]` |
| 输入滚动容器 | `[data-input-scroll]` |
| 会话区容器（宽度变量） | `[data-conversation-content]` |
| 对话区列 | `[data-chat-flow]` |
| 代码块 / 顶栏 | `.md-code-block` / `[data-code-block-banner]` |
| 属性挂载点 | `document.body` |
| 主题变量 | CSS 变量继承（挂在 body 上） |

**为什么可以给「流节点」直接上色**（这是零哈希方案的关键，别改错）：

```
div[data-chat-flow-kind="assistant-step"]
  └─ div[data-slot="conversation.chat.node"]    style="display:contents"（不产生盒子）
     └─ .v5IAXa_root                             ← AssistantMarkdown
```

1. 插槽那层是 `display: contents`，**完全不影响布局**；
2. 注册到该插槽的 `AssistantNodeView` 源码里只 `return jsx(AssistantMarkdown, {...})`，
   **没有别的子节点**。

两条合起来：流节点的内容盒 **就等于** `AssistantMarkdown` 的盒子。
所以给流节点加背景/圆角/内边距，几何尺寸与给 `.v5IAXa_root` 上色完全一致 ——
既不需要哈希，也不会让气泡变形。用户消息同理。

#### 兜底路径：哈希

若某个锚点探测不到（老运行时、或 DSH 改了锚点），自动退回哈希类名，
集中在 `SEL_CANDIDATES`（两套：0.1.7 与 0.2.0）。若**哈希全变但锚点仍在**，
`resolveSelectors()` 会切到 `ANCHOR_ONLY`，插件继续工作、无需改代码。

因此 DSH 升级后的表现分三种：

| 情况 | 结果 | 你要做什么 |
| --- | --- | --- |
| 锚点仍在（最常见） | 照常工作 | 什么都不用做 |
| 锚点没了、哈希没变 | 走兜底，照常工作 | 什么都不用做 |
| 两者都变了 | 样式失效 | 更新 `SEL_CANDIDATES` / `SAFE` |

定位新类名的方法：DevTools 选中目标元素 → 取其 class 中形如 `xxxx_NNN_1` 的那个
（CSS Modules 产物）→ 更新 `SEL_CANDIDATES` 对应项。
**优先补锚点**（`SAFE` / `ANCHOR`），哈希只是兜底。

**CSS 是在选择器定稿之后才拼接的**，所以注入必须发生在 `ensureCss()` 里。

**优先使用 DSH 主动提供的稳定锚点**，不要换成哈希类名（见 `ANCHOR`）：

| 稳定锚点 | 含义 |
| --- | --- |
| `[data-chat-flow-kind="user"]` | 用户消息（两套运行时都有） |
| `[data-chat-flow-kind="assistant-step"]` | AI 消息节点（两套运行时都有） |
| `[data-chat-flow-kind="turn-process"][data-turn-process-answer]` | 0.2.0 承载最终回答的节点（备选） |
| `.md-code-block` | 代码块容器（两套运行时都保留这个非哈希类名） |
| `[data-code-block-banner]` | 代码块顶栏 |
| `[data-conversation-scroll]` | 对话滚动容器 |
| `[data-composer-card]` / `[data-input-scroll]` | 0.2.0 输入卡片 / 输入滚动容器 |

### 修改插件时的三个坑（都实际踩过）

**1. 逗号选择器列表后面接后缀，只会接到最后一条分支上**

这是最隐蔽的一个，2026-09-30 排查桌面版 AI 气泡不生效时踩到。
基选择器本身是逗号列表（`assistant-step` 与 `turn-process` 两条分支），

```js
// 错误写法：后缀只接到最后一条分支
var aiNode = baseA + ", " + baseB;
css += aiNode + " " + SEL.bubbleAI + " { ... }";
//   => baseA, baseB .v5IAXa_root { ... }
//      第一条分支丢了后缀，规则退化成「只匹配流节点本身」

// 正确写法：每条分支各自接后缀
css += descendants([baseA, baseB], SEL.bubbleAI) + " { ... }";
//   => baseA .v5IAXa_root, baseB .v5IAXa_root { ... }
```

**危险之处**：类名全对、CSS 语法合法、`node --check` 通过、
甚至测试里断言「CSS 含某个类名」也过 —— 只有真正拿选择器去 DOM 里匹配才暴露。
所以 `test-selectors.mjs` 专门断言「每条分支都以正文类名结尾」。

**2. CSS 注释里不能出现反引号**

CSS 是拼在 JS 模板字符串里的，注释中一个反引号就会**提前终止模板**，
后续文本被当成表达式求值，产生 `NaN` 并吞掉花括号 —— 结果是整条规则
被浏览器静默丢弃，而 `node --check` **查不出来**（JS 语法本身是合法的）。

改完务必确认生成结果：非注释区无 `NaN`、花括号配平。

```bash
node scripts/test-client.mjs      # 冒烟：无 NaN、括号配平、两套类名不串台
node scripts/test-selectors.mjs   # 选择器命中：按真实祖先链验证
```

`test-client.mjs` 用 DOM 桩执行真实的 factory，对**两套运行时**各跑一遍。
`test-selectors.mjs` 用探针回传的真实 DOM 结构验证选择器确实能命中 ——
**光断言「CSS 里有这个类名」不够**：类名写对了、属性挂错层，样式照样整片失效。

**3. 快捷键不要声明 Linux profile**

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

For the **Desktop (Electron) app**, the `desktop` profile is reserved — the `dsh` CLI refuses it.
Add the dependency + bundle to `$DSH_HOME/profiles/desktop/package.json`, run
`pnpm install` in that directory with the Desktop-bundled pnpm
(`<install>\resources\runtime\pnpm\bin\pnpm.mjs`, with `ELECTRON_RUN_AS_NODE=1`), then restart the app.

**Shortcuts** (while focused in the composer): `Ctrl+↑/↓` resize input height; `Ctrl+Shift+←/→` resize chat width.

**Compatibility & maintenance**

- Runs on **two runtimes at once**: Web CLI `0.1.7-rc.2` and the runtime packaged inside
  the Desktop app (`0.2.0-rc.2`). Their CSS Modules hashes are entirely different, so the
  plugin resolves selectors per role instead of hardcoding one set.
- **Hash-free main path**: bubbles are painted directly on the flow nodes
  (`[data-chat-flow-kind="assistant-step"]` / `"user"`), and width/theme/composer use
  `data-*` anchors plus CSS variables. The slot wrapper between them is
  `display: contents` (no box), and that slot renders exactly one component, so the flow
  node's box equals the old hash container's box — same geometry, no rebuild needed.
  - `0.1.1`: markdown class-hash change (adapted).
  - `0.1.2`: message rendering moved to `dsh-client-ui-chat` package, class names rebuilt (`Sxvs8a_*` → `hWmORq_*`, `gdEzaW_*` → `Sixlwa_*`), composition input switched to contenteditable (adapted).
  - `0.1.4`: added the `0.2.0-rc.2` selector set for the Desktop runtime, and moved the
    plugin's `data-dsh-*` attributes onto `document.body`. Bubble rules are descendant
    selectors, so the attributes must live on an ancestor of the chat column — mounting
    them on an inner element silently disables every bubble rule.
  - `0.1.5`: fixed a selector-building bug where a comma-separated base list was
    concatenated with a descendant suffix, so the suffix landed on only the last branch
    (see maintenance pitfall #1). This silently disabled the AI bubble on Desktop while
    every class name and the CSS syntax were still correct. Both test suites now guard it.
  - `0.1.6`: dropped the dependency on hashes for the main path; hashes remain a fallback,
    plus an `ANCHOR_ONLY` path for when every hash changes but the anchors survive.
- The plugin prefers stable anchors (`.md-code-block`, `data-code-block-banner`,
  `data-chat-flow-kind`, `[data-composer-card]`, `--dsh-chat-content-width`, etc.)
  to reduce breakage risk.

**Two test suites** guard the fragile parts (both run without a browser):

```bash
node scripts/test-client.mjs      # factory 冒烟：无 NaN、括号配平、两套类名不串台
node scripts/test-selectors.mjs   # 用真实祖先链验证选择器确实能命中
```

`test-selectors.mjs` 尤其重要：它按探针回传的真实 DOM 结构搭出祖先链，
逐条断言选择器命中，并包含一条回归断言（属性挂错层时必须命中不到）。

**License**: MIT
