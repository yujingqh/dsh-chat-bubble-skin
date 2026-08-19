# dsh-chat-bubble-skin

一个让 DeepSeek Harness (DSH) Web 界面变成**社交软件风格气泡聊天**的皮肤插件。

社交软件风格的气泡式对话 + 大输入框 + 宽对话区，附带 6 套「节气主题色」和独立的「气泡配色」，并把 Markdown 大代码块做得清晰可读。

> 🇬🇧 English version: see [English](#english) below.

---

## 功能

- **气泡式对话**：assistant / user 消息以圆角气泡呈现，更像微信 / iMessage。
- **大输入框 + 宽对话区**：默认 900px 内容宽度，输入框高度可调。
- **两套配色**：
  - `主题色`：全局背景 + 导航栏（浅色 `bg` 档）。
  - `气泡色`：assistant / user 气泡 + 代码块（跟随主题深色 `dark` 文字 + 浅色 `bg` 背景，清晰可读）。
  - 两套独立选择，均持久化到 `localStorage`。
- **代码块优化**：修复了大代码块在彩色气泡下「代码发白」「复制按钮看不见」「灰色水笔背景」等问题，代码文字跟随主题深色、注释灰色、复制按钮深色可读。

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

## 安装

```bash
dsh plugin --profile web add dsh-chat-bubble
```

或从源码本地 link：

```bash
dsh plugin --profile web add "link:./dsh-chat-bubble"
```

安装后，把鼠标移到输入卡片右上角，会出现两个圆形调色盘按钮：左侧调「主题色」、右侧调「气泡色」。

## 兼容性

- 已验证：DSH `0.1.0-rc.7`（Web profile）。
- 皮肤依赖 DSH 内部 CSS Modules 类名，**DSH 升级后部分样式可能失效**，需重新适配。

## 目录结构

```
dsh-chat-bubble/
├── lib/
│   ├── index.js        # host 端入口（纯 CSS 皮肤，无 host 行为）
│   └── client.js       # 客户端 CSS + JS 注入
├── cordis.patch.yml    # bundle 注册
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
- 6 solar-term theme palettes + independent bubble colors, persisted to `localStorage`
- Readable Markdown code blocks (theme-following dark text on light background; fixed white-text / invisible copy-button / gray-wash issues)

**Install**

```bash
dsh plugin --profile web add dsh-chat-bubble
```

**Shortcuts** (while focused in the composer): `Ctrl+↑/↓` resize input height; `Ctrl+Shift+←/→` resize chat width.

**Compatibility**: verified against DSH `0.1.0-rc.7` (Web profile).

**License**: MIT
