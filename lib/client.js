/**
 * dsh-chat-bubble — 客户端 CSS + JS 注入
 *
 * 功能：
 *   1. 气泡式对话
 *   2. 快捷键调整输入框高度和对话区宽度
 *   3. 三个调色盘：主题色 + AI 气泡色 + 我的气泡色，独立选择
 *   4. localStorage 持久化
 *
 * 快捷键（通过 DSH 官方 ctx.shortcuts 注册，可在「设置 → 快捷键」改键）：
 *   Mod+Alt+↑ / ↓   调整输入框高度（±40px）
 *   Mod+Alt+← / →   调整对话区宽度（±40px）
 * Mod 在 macOS 为 Command，其他平台为 Control。
 * 另有裸 keydown 兜底（Alt+Shift+方向键），官方通道生效时自动停用。
 *
 * 维护提示：
 *   - DSH 依赖的选择器全部集中在下方 SEL 常量（见其注释）。
 *   - CSS 注释里**不能出现反引号**（会截断 JS 模板字符串，产生 NaN）。
 *   - 快捷键**不要声明 Linux profile**（会被平台校验拒绝，导致启动失败）。
 */

window.__ModuleLoader__.load({
  id: "dsh-chat-bubble",
  factory: (_require) => {
    // ---- 节气主题色 ----
    var ACCENTS = [
      { name: "青蓝", hex: "#4BACC6", light: "#9DD0E0", bg: "#D6EAF0", dark: "#2A6F80" },
      { name: "紫粉", hex: "#BA79B1", light: "#D6B0D1", bg: "#EBD8E8", dark: "#7A4F75" },
      { name: "草绿", hex: "#91BC31", light: "#BED88A", bg: "#DFECC5", dark: "#5F7A20" },
      { name: "金黄", hex: "#ECD452", light: "#F5E99B", bg: "#FAF4CD", dark: "#9A8A35" },
      { name: "橙色", hex: "#FF9F71", light: "#FFC9AD", bg: "#FFE4D6", dark: "#A6684A" },
      { name: "浅绿", hex: "#C0D09D", light: "#DBE5C5", bg: "#EDF2E2", dark: "#7D8866" },
      { name: "默认", hex: "", light: "", bg: "", dark: "" }, // 还原 DSH 默认外观
    ];

    /**
     * DSH 内部选择器锚点（第三步重构：集中管理）。
     *
     * 重要说明 —— 这些哈希类名（形如 wSkVaW_root）由 CSS Modules 生成，
     * DSH 每次改版都可能更换。DSH 目前**没有**为这些元素提供稳定的
     * data-* 属性或语义类名，所以只能按下表硬编码；价值在于：
     *   - 升级 DSH 后若样式失效，**只需改这一处**，不必全文搜索替换；
     *   - 每个锚点标注了用途与替代方案，便于判断如何重新定位。
     *
     * 已验证稳定的锚点（DSH 主动设置，优先使用，不要换成哈希类名）：
     *   [data-chat-flow-kind="assistant-step"]   AI 消息步骤
     *   [data-chat-flow-kind="user"]             用户消息
     *   [data-code-block-banner]                 代码块顶部栏
     *   [data-conversation-scroll]               对话滚动容器
     *
     * 定位方法（DSH 升级后重新找类名）：
     *   1) 打开 DevTools，选中目标元素；
     *   2) 复制其 class 中形如 xxxx_NNN_1 的那个（CSS Modules 产物）；
     *   3) 更新下面对应项即可。
     */
    var SEL = {
      /** 三列框架根，用于按主题切换 --dsw-alias-bg-base 等变量。 */
      frame: ".pI_x6G_frame",
      /** 会话区根，插件所有 data-dsh-* 属性都挂在这里。 */
      root: ".wSkVaW_root",
      /** 输入框卡片，调色盘按钮的挂载点。 */
      card: ".uV2eYG_card",
      /** 输入框滚动容器，高度调整直接作用于它。 */
      cardScroll: ".uV2eYG_scroll",
      /** AI 消息根，气泡背景色作用于此。 */
      bubbleAI: ".hWmORq_root",
      /** AI 消息正文容器，白名单文字染色作用于此。 */
      bubbleAIBody: ".hWmORq_body",
      /** 用户消息气泡，用户气泡色作用于此。 */
      bubbleUser: ".Sixlwa_bubble",
      /** 用户消息层叠容器，宽度变量作用于此。 */
      bubbleUserStack: ".Sixlwa_userStack",
      /** 对话区列，宽度变量 --dsh-chat-content-width 作用于此。 */
      column: ".EvIC1a_column",
    };

    var css = "";

    // 主题色（全局背景 + 导航栏）：bg 色（默认主题跳过）
    ACCENTS.forEach((a, i) => {
      if (!a.bg) return; // 默认主题不生成 CSS
      css +=
        `
        ` +
        SEL.frame +
        `[data-dsh-theme="` +
        i +
        `"] {
          --dsw-alias-bg-base: ` +
        a.bg +
        `;
          --dsw-specific-input-major: ` +
        a.bg +
        `;
          --dsw-alias-interactive-bg-hover: ` +
        a.light +
        `;
          --dsw-specific-sidebar-fill: ` +
        a.bg +
        `;
        }
      `;
    });

    // 气泡色：AI 气泡色 与 我的气泡色，分别用 data-dsh-bubble-ai / data-dsh-bubble-user 控制
    // 说明：assistant 消息根 (` + SEL.bubbleAI + `) 与正文容器 (.hWmORq_body) 是稳定的；
    // markdown 容器 _markdown_xxx 的 hash 后缀会随 DSH 版本变化，因此用 ` + SEL.bubbleAIBody + ` 作为稳定锚点。
    ACCENTS.forEach((a, i) => {
      if (!a.hex) return; // 默认主题不生成 CSS
      css +=
        `
        /* ===== AI 气泡色 ===== */
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] ` + SEL.bubbleAI + ` {
          background: ` +
        a.hex +
        `;
          color: #fff !important;
        }
        /* AI 彩色气泡里的文字统一白色。
           重构要点：不再用 ` + SEL.bubbleAIBody + ` * 通配符刷白整棵子树 ——
           那会把代码块内部的 svg 图标（stroke=currentColor）也染成白色，
           白图标配浅色顶栏底就完全看不见了。
           改为【白名单式】精确列出需要变白的元素，代码块整块不在其中，
           因此不再需要事后用一堆 !important 规则把代码块"抢救"回深色。
           用 :where() 让这些规则保持 0 特异性，便于后续覆盖。
           注意：本段是 JS 模板字符串的一部分，注释里绝对不能出现反引号，
           否则会提前终止模板、把后续文本当成表达式求值（曾因此产生 NaN
           把整条 CSS 规则写坏）。 */
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] ` + SEL.bubbleAIBody + `,
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] ` + SEL.bubbleAIBody + `
          :where(p, li, ul, ol, h1, h2, h3, h4, h5, h6, strong, em, b, i, del, s,
                 blockquote, td, th, caption, dt, dd, figcaption, summary) {
          color: #fff !important;
        }
        /* 行内小代码块：半透明深色背景 + 白字。
           用 :where() 把 .md-code-block 从祖先里排除不现实（:not 不能含后代组合子），
           所以改为：行内代码只染色，代码块内部由下面 .md-code-block 规则用
           更高特异性覆盖回来。这是必要的，因为 DSH 对两者用同一个 CODE 标签。 */
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] CODE {
          background: rgba(0, 0, 0, 0.15) !important;
          color: #fff !important;
          border-radius: 4px;
          padding: 2px 6px;
        }
        /* 大代码块：跟随主题 —— 浅色背景(bg) + 深色文字(dark)，既配色又清晰可读。
           覆盖面：.shiki(有语法高亮) 与 PRE._plain(无高亮/流式) 两种渲染路径。 */
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE,
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE CODE,
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN,
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN[style],
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block .shiki {
          background: ` +
        a.bg +
        ` !important;
          color: ` +
        a.dark +
        ` !important;
        }
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN[style*="comment"] {
          color: #868e96 !important;
        }
        /* 代码块内的 CODE 还原行内代码样式：去掉 padding/圆角/灰底，
           否则整块代码会被套上一层“灰色水笔”底色。
           特异性 (0,4,1) 高于上面行内代码规则的 (0,3,1)。 */
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE CODE,
        [data-dsh-bubble-ai="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block CODE {
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }
        [data-dsh-bubble-ai="` +
        i +
        `"] ` + SEL.root + ` {
          --dsw-alias-state-business-primary: ` +
        a.hex +
        `;
        }
        /* ===== 我的气泡色 ===== */
        [data-dsh-bubble-user="` +
        i +
        `"] [data-chat-flow-kind="user"] ` + SEL.bubbleUser + ` {
          background: ` +
        a.hex +
        `;
          color: #fff;
        }
        [data-dsh-bubble-user="` +
        i +
        `"] ` + SEL.root + ` {
          --dsw-specific-bubble: ` +
        a.hex +
        `;
        }
      `;
    });

    // ---- 代码块顶部栏：让图标保持 DSH 原生外观 ----
    // 历史背景：原来 AI 气泡色用 `` + SEL.bubbleAIBody + ` * { color:#fff !important }`
    // 通配符刷白整棵正文子树，把代码块顶部栏图标的 currentColor 也染成白色
    // （白图标配浅底 = 看不见），于是这里堆了一大组 !important 规则去"抢救"。
    // 现在通配符已改为白名单式染色（见上方），代码块子树根本不再被染白，
    // 因此原先的抢救规则绝大部分可以去掉，只保留两条真正需要的行为：
    //   1) 图标颜色跟随 DSH 语义色 —— 不写死颜色，深浅色模式自动适配；
    //   2) 语言标签隐藏 —— 节点本身的设计取舍，与本次重构无关。
    // 注意：图标是 <svg fill="none"> + <path stroke="currentColor">，
    // 必须把 color 定到 svg 内部的 path 上，且不要设 fill（会把描边糊成实心）。
    css += `
      .md-code-block [data-code-block-banner] button,
      .md-code-block [data-code-block-banner] button svg,
      .md-code-block [data-code-block-banner] button svg *,
      .md-code-block [class*="action"] svg,
      .md-code-block [class*="action"] svg * {
        color: var(--dsw-alias-label-secondary, #61666b);
        stroke: currentColor;
      }
      .md-code-block [data-code-block-banner] button:hover,
      .md-code-block [data-code-block-banner] button:hover svg,
      .md-code-block [data-code-block-banner] button:hover svg * {
        color: var(--dsw-alias-label-primary, #0f1115);
      }
      /* 语言标签（灰字）保持隐藏：顶部栏只留操作图标，视觉更干净 */
      [data-dsh-bubble-ai] [data-chat-flow-kind="assistant-step"] .md-code-block [class*="infostring"] {
        display: none !important;
      }
    `;

    // 调色盘 CSS
    css += `
      .dsh-bubble-palette-trigger {
        position: absolute;
        top: 6px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.8);
        box-shadow: 0 0 0 1px var(--dsw-alias-border-l1, #ccc);
        cursor: pointer;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.15s;
      }
      ` + SEL.card + `:hover .dsh-bubble-palette-trigger { opacity: 1; }

      .dsh-bubble-palette-trigger--theme { right: 60px; }
      .dsh-bubble-palette-trigger--bubble-ai { right: 36px; }
      .dsh-bubble-palette-trigger--bubble-user { right: 12px; }

      .dsh-bubble-palette {
        position: absolute;
        top: 30px;
        display: flex;
        gap: 4px;
        padding: 6px 8px;
        background: var(--dsw-specific-menu, #fff);
        border: 1px solid var(--dsw-alias-border-l1, #ddd);
        border-radius: 10px;
        box-shadow: var(--dsw-shadow-lv3, 0 4px 16px rgba(0,0,0,0.12));
        z-index: 20;
        opacity: 0;
        pointer-events: none;
        transform: translateY(-4px);
        transition: opacity 0.15s, transform 0.15s;
      }
      .dsh-bubble-palette--theme { right: 54px; }
      .dsh-bubble-palette--bubble-ai { right: 30px; }
      .dsh-bubble-palette--bubble-user { right: 6px; }
      .dsh-bubble-palette.open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0);
      }
      .dsh-bubble-palette-swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: border-color 0.1s, transform 0.1s;
      }
      .dsh-bubble-palette-swatch:hover {
        border-color: var(--dsw-alias-label-primary, #333);
        transform: scale(1.15);
      }
      .dsh-bubble-palette-swatch.active {
        border-color: var(--dsw-alias-label-primary, #333);
        box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--dsw-alias-label-primary, #333);
      }
    `;

    css += /* css */ `
      ` + SEL.root + ` {
        --dsh-chat-content-width: 900px;
        --dsh-composer-card-max-width: calc(900px + 32px);
      }
      [data-chat-flow-kind="assistant-step"] { display: flex; justify-content: flex-start; }
      [data-chat-flow-kind="assistant-step"] ` + SEL.bubbleAI + ` {
        max-width: 100%; border-radius: 18px 18px 18px 6px;
        padding: 12px 18px; margin-bottom: 2px; font-size: 15px; line-height: 26px;
      }
      [data-chat-flow-kind="user"] ` + SEL.bubbleUserStack + ` { max-width: 100%; }
      [data-chat-flow-kind="user"] ` + SEL.bubbleUser + ` {
        border-radius: 18px 18px 6px 18px; padding: 12px 18px;
        font-size: 15px; line-height: 26px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      [data-chat-flow-kind="assistant-step"] + [data-chat-flow-kind="user"],
      [data-chat-flow-kind="user"] + [data-chat-flow-kind="assistant-step"] { margin-top: 8px; }
      @media (max-width: 768px) {
        ` + SEL.root + ` { --dsh-chat-content-width: 100%; }
        [data-chat-flow-kind="assistant-step"] ` + SEL.bubbleAI + `,
        [data-chat-flow-kind="user"] ` + SEL.bubbleUserStack + ` { max-width: 88%; }
      }
    `;

    // ================================================================
    // CSS 注入
    // ================================================================
    if (
      typeof document !== "undefined" &&
      !document.querySelector('style[data-plugin="dsh-chat-bubble"]')
    ) {
      var style = document.createElement("style");
      style.dataset.plugin = "dsh-chat-bubble";
      style.textContent = css;
      document.head.appendChild(style);
    }

    // ================================================================
    // JS
    // ================================================================
    /**
     * setup() 返回的调整函数集合，供官方快捷键注册的命令调用。
     * 顶层先声明（var 提升），setup 执行后填充，apply(ctx) 注册命令时按引用读取。
     */
    var api = null;

    /**
     * 官方快捷键通道是否已接管。
     * 为 true 时裸 keydown 监听器停止响应，避免同一次按键被处理两遍。
     */
    var officialShortcutsActive = false;

    if (typeof document !== "undefined" && !window.__DSH_BUBBLE_INSTALLED__) {
      window.__DSH_BUBBLE_INSTALLED__ = true;
      api = setup();
    }

    function setup() {
      var LS_H = "dsh-bubble-input-height";
      var LS_W = "dsh-bubble-chat-width";
      var LS_T = "dsh-bubble-theme";
      var LS_BA = "dsh-bubble-accent-ai";
      var LS_BU = "dsh-bubble-accent-user";

      function loadSaved(key, fallback) {
        try {
          var v = localStorage.getItem(key);
          if (v !== null) return Number(v);
        } catch (_) {}
        return fallback;
      }

      // DSH 内置拖拽手柄把宽度存在这个键下（dsh-client-ui-conversation）。
      // 插件自己的键还没值时，继承它，避免两套宽度从默认 900 开始打架。
      function loadBuiltinWidth() {
        try {
          var v = localStorage.getItem("dsh.conversation.contentWidth");
          if (v === null) return null;
          var n = Number(v);
          return isFinite(n) && n > 0 ? Math.round(n) : null;
        } catch (_) {
          return null;
        }
      }
      function saveSetting(key, value) {
        try {
          localStorage.setItem(key, String(value));
        } catch (_) {}
      }

      function getHeight() {
        // 读取输入区滚动容器的实际高度（新版高度自适应，取 scroll 的 offsetHeight）
        var scroll = document.querySelector(SEL.cardScroll);
        if (scroll) return scroll.offsetHeight || 120;
        var card = document.querySelector(SEL.card);
        if (!card) return 120;
        return card.offsetHeight || 120;
      }
      // 用户是否已用快捷键手工调过宽度：调过之后 observer 不再用 localStorage 覆盖。
      var widthTouched = false;

      function getWidth() {
        var root = document.querySelector(SEL.root);
        if (!root) return 900;
        // 先读行内样式（快捷键写入的地方），再退回计算样式。
        var w = root.style.getPropertyValue("--dsh-chat-content-width").trim();
        if (!w) {
          w = getComputedStyle(root)
            .getPropertyValue("--dsh-chat-content-width")
            .trim();
        }
        var px = parseFloat(w);
        return isNaN(px) ? 900 : Math.round(px);
      }

      function applyAll() {
        var root = document.querySelector(SEL.root);
        var card = document.querySelector(SEL.card);
        // 刷新后输入卡片是延迟渲染的：root 先出现、card 后出现。
        // 这里分别处理，任一存在就应用对应部分，避免因缺一个元素而全部跳过。
        if (root) {
          // 只在用户尚未手工调宽时套用持久化偏好，否则会抹掉快捷键刚设的值。
          if (!widthTouched) {
            var saved = loadSaved(LS_W, null);
            if (saved === null) saved = loadBuiltinWidth();
            setWidth(saved === null ? 900 : saved, false);
          }
          setTheme(loadSaved(LS_T, 0), false);
          setBubbleAI(loadSaved(LS_BA, 0), false);
          setBubbleUser(loadSaved(LS_BU, 0), false);
        }
        if (card) setHeight(loadSaved(LS_H, 120), false);
      }

      /**
       * 把持久化偏好应用到当前 DOM。刷新后元素分批出现，
       * 因此可重复调用；内部各 set* 都是幂等的。
       */
      function restoreSaved() {
        applyAll();
      }

      function setHeight(px, persist) {
        if (persist === void 0) persist = true;
        var card = document.querySelector(SEL.card);
        if (!card) return;
        // 直接强制输入区滚动容器高度，不依赖 max-height 变量继承
        var scroll = card.querySelector(SEL.cardScroll);
        if (scroll) {
          scroll.style.setProperty("height", px + "px", "important");
          scroll.style.setProperty("min-height", px + "px", "important");
          scroll.style.setProperty("max-height", px + "px", "important");
        } else {
          // 兜底：设到输入卡
          card.style.setProperty("height", px + "px", "important");
          card.style.setProperty("min-height", px + "px", "important");
        }
        if (persist) saveSetting(LS_H, px);
      }

      function setWidth(px, persist) {
        if (persist === void 0) persist = true;
        var root = document.querySelector(SEL.root);
        if (!root) return;
        root.style.setProperty("--dsh-chat-content-width", px + "px");
        root.style.setProperty("--dsh-composer-card-max-width", px + 32 + "px");
        // 同步写内置拖拽手柄使用的变量，避免两套宽度互相覆盖：
        // --dsh-chat-content-width 控制对话区列宽（.EvIC1a_column），
        // --dsh-chat-user-width    控制用户气泡宽度（.Sixlwa_userStack）。
        var target = root.parentElement || root;
        target.style.setProperty("--dsh-chat-user-width", px + "px");
        if (persist) {
          widthTouched = true;
          saveSetting(LS_W, px);
        }
      }

      function setTheme(idx, persist) {
        if (persist === void 0) persist = true;
        var frame = document.querySelector(SEL.frame);
        if (!frame) return;
        frame.setAttribute("data-dsh-theme", String(idx));
        if (persist) saveSetting(LS_T, idx);
      }

      function setBubbleAI(idx, persist) {
        if (persist === void 0) persist = true;
        var root = document.querySelector(SEL.root);
        if (!root) return;
        root.setAttribute("data-dsh-bubble-ai", String(idx));
        if (persist) saveSetting(LS_BA, idx);
      }

      function setBubbleUser(idx, persist) {
        if (persist === void 0) persist = true;
        var root = document.querySelector(SEL.root);
        if (!root) return;
        root.setAttribute("data-dsh-bubble-user", String(idx));
        if (persist) saveSetting(LS_BU, idx);
      }

      // ---- 调色盘 ----
      function installPalette(card, kind, currentIdx, setter, clsSuffix) {
        var cls = "dsh-bubble-palette-trigger--" + clsSuffix;
        if (card.querySelector("." + cls)) return;

        var trigger = document.createElement("div");
        trigger.className = "dsh-bubble-palette-trigger " + cls;
        trigger.style.background = ACCENTS[currentIdx].hex;
        if (kind === "theme") trigger.title = "主题色";
        else if (kind === "bubble-ai") trigger.title = "AI 气泡色";
        else trigger.title = "我的气泡色";
        card.appendChild(trigger);

        var panel = document.createElement("div");
        panel.className = "dsh-bubble-palette dsh-bubble-palette--" + clsSuffix;
        card.appendChild(panel);

        ACCENTS.forEach((a, i) => {
          var swatch = document.createElement("div");
          swatch.className =
            "dsh-bubble-palette-swatch" + (i === currentIdx ? " active" : "");
          swatch.style.background = a.hex;
          swatch.title = a.name;
          swatch.addEventListener("mousedown", (e) => {
            e.preventDefault();
            e.stopPropagation();
          });
          swatch.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setter(i);
            trigger.style.background = a.hex;
            panel
              .querySelectorAll(".dsh-bubble-palette-swatch")
              .forEach((s, j) => {
                s.classList.toggle("active", j === i);
              });
            panel.classList.remove("open");
          });
          panel.appendChild(swatch);
        });

        trigger.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // 关闭另一个面板
          card.querySelectorAll(".dsh-bubble-palette.open").forEach((p) => {
            if (p !== panel) p.classList.remove("open");
          });
          panel.classList.toggle("open");
        });
      }

      // ---- MutationObserver ----
      // 两个职责：
      //   1) 输入卡片（.uV2eYG_card）延迟渲染，出现后要把保存的宽度/高度/配色应用上，
      //      否则刷新后会一直停在默认值。
      //   2) 补齐调色盘按钮（installPalette 内部有存在性判断，是幂等的）。
      // 注意不能无条件反复 setWidth：用户正在用快捷键调整时会被打回，
      // 所以 applyAll 内部用 widthTouched 守卫，且只在元素刚出现时应用。
      var observedRoot = null;
      var observedCard = null;
      var observer = new MutationObserver(() => {
        var root = document.querySelector(SEL.root);
        var card = document.querySelector(SEL.card);
        // 元素首次出现（或重新挂载）时恢复一次保存值。
        if (root !== observedRoot || card !== observedCard) {
          observedRoot = root;
          observedCard = card;
          if (root || card) restoreSaved();
        }
        if (!card) return;
        installPalette(card, "theme", loadSaved(LS_T, 0), setTheme, "theme");
        installPalette(card, "bubble-ai", loadSaved(LS_BA, 0), setBubbleAI, "bubble-ai");
        installPalette(card, "bubble-user", loadSaved(LS_BU, 0), setBubbleUser, "bubble-user");
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // ---- 快捷键 ----
      // 新版输入框是 contenteditable 元素（DIV），不再只是 TEXTAREA/INPUT；
      // 用 isContentEditable 兜底判断，避免在 contenteditable 里快捷键失效。
      function isEditable(el) {
        if (!el) return false;
        if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") return true;
        if (el.isContentEditable === true) return true;
        // contenteditable 的焦点常落在内层节点上，向上找一层祖先。
        return typeof el.closest === "function"
          ? el.closest('[contenteditable="true"], [contenteditable=""], textarea, input') !== null
          : false;
      }
      // 焦点在输入框内、或在页面任意处（快捷键在两类区域都生效）。
      function inScope(el) {
        if (isEditable(el)) return true;
        // 焦点不在输入框时也允许：只要求当前不在终端里，避免抢终端按键。
        return !(el && typeof el.closest === "function" && el.closest(".xterm"));
      }
      function keyOf(e) {
        // ArrowLeft/Right/Up/Down 的 e.key 在个别输入法/浏览器下缺失，用 code 兜底。
        if (e.key) return e.key;
        switch (e.code) {
          case "ArrowLeft": return "ArrowLeft";
          case "ArrowRight": return "ArrowRight";
          case "ArrowUp": return "ArrowUp";
          case "ArrowDown": return "ArrowDown";
          default: return "";
        }
      }
      // 屏幕右下角的即时反馈，确认按键真的被插件接收。
      var toastTimer = null;
      function toast(text) {
        var el = document.getElementById("dsh-bubble-toast");
        if (!el) {
          el = document.createElement("div");
          el.id = "dsh-bubble-toast";
          el.style.cssText =
            "position:fixed;right:20px;bottom:20px;z-index:99999;" +
            "padding:6px 14px;border-radius:999px;font-size:13px;" +
            "background:rgba(0,0,0,.78);color:#fff;pointer-events:none;" +
            "transition:opacity .2s;font-family:system-ui,sans-serif";
          document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.opacity = "1";
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          el.style.opacity = "0";
        }, 900);
      }

      document.addEventListener("keydown", (e) => {
        // 官方快捷键通道已接管时，裸监听器完全让位，避免同一次按键触发两遍。
        if (officialShortcutsActive) return;
        if (!inScope(e.target)) return;
        var key = keyOf(e);
        // 兜底键位：Alt+Shift+方向键。
        // 官方通道默认用 Mod+Alt+方向键（macOS 的 Cmd / 其他平台的 Ctrl），
        // 这里同时接受两种组合，任何一条通道生效都不会漏掉按键。
        var isFallbackCombo = e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
        var isPrimaryAlt = e.altKey && (e.ctrlKey || e.metaKey) && !e.shiftKey;
        if (!isFallbackCombo && !isPrimaryAlt) return;
        if (key === "ArrowRight") {
          e.preventDefault();
          setWidth(Math.min(1400, getWidth() + 40));
          toast("对话区宽度 " + getWidth() + "px");
        } else if (key === "ArrowLeft") {
          e.preventDefault();
          setWidth(Math.max(500, getWidth() - 40));
          toast("对话区宽度 " + getWidth() + "px");
        } else if (key === "ArrowUp") {
          e.preventDefault();
          setHeight(Math.min(600, getHeight() + 40));
          toast("输入框高度 " + getHeight() + "px");
        } else if (key === "ArrowDown") {
          e.preventDefault();
          setHeight(Math.max(60, getHeight() - 40));
          toast("输入框高度 " + getHeight() + "px");
        }
      }, true);

      // 首屏：元素可能还没渲染完，先尝试一次；缺失的部分由 MutationObserver 补上。
      restoreSaved();
      var card = document.querySelector(SEL.card);
      if (card) {
        installPalette(card, "theme", loadSaved(LS_T, 0), setTheme, "theme");
        installPalette(card, "bubble-ai", loadSaved(LS_BA, 0), setBubbleAI, "bubble-ai");
        installPalette(card, "bubble-user", loadSaved(LS_BU, 0), setBubbleUser, "bubble-user");
      }

      // 暴露调整函数给官方快捷键注册使用（见下方 apply 的 ctx.shortcuts 部分）。
      return {
        adjustWidth: function (delta) {
          var next = Math.min(1400, Math.max(500, getWidth() + delta));
          setWidth(next);
          toast("对话区宽度 " + next + "px");
        },
        adjustHeight: function (delta) {
          var next = Math.min(600, Math.max(60, getHeight() + delta));
          setHeight(next);
          toast("输入框高度 " + next + "px");
        },
      };
    }

    /**
     * 官方快捷键注册（第二步重构）。
     *
     * 背景：原来只用一个裸的 document.addEventListener('keydown') 抢快捷键，
     * 会和 DSH 自己的快捷键服务在同一事件流里竞争，也无法出现在设置页里。
     *
     * 现在改为通过 ctx.shortcuts.register 注册为正式命令：
     *   - 走官方注册表，不再与内置快捷键抢事件；
     *   - 自动展开 primary（macOS 为 Cmd、其他平台为 Ctrl）；
     *   - 用户能在「设置 → 快捷键」里看到并改键；
     *   - 冲突由服务统一检测并提示。
     *
     * 原来的裸监听器保留作为兜底（例如 DSH 未提供 shortcuts 服务时），
     * 但注册成功后由官方通道接管，避免同一次按键触发两遍。
     */
    function apply(ctx) {
      // 服务不可用时静默跳过：裸监听器仍然保证快捷键可用。
      if (!ctx || !ctx.shortcuts || typeof ctx.shortcuts.register !== "function") return;
      // 必须在 ctx.effect 内注册：README 明确要求，卸载时才会自动清理。
      var register = function () {
        var disposers = [];
        try {
        // 输入框高度：Mod+Alt+↑ / ↓
        disposers.push(ctx.shortcuts.register({
          id: "chatBubble.height.increase",
          label: function () { return "增大输入框高度"; },
          aliases: ["chat bubble", "composer height", "输入框高度"],
          defaults: {
            "web:windows": { code: "ArrowUp", modifiers: ["primary", "alt"] },
            "web:macos": { code: "ArrowUp", modifiers: ["primary", "alt"] },
            "desktop:windows": { code: "ArrowUp", modifiers: ["primary", "alt"] },
            "desktop:macos": { code: "ArrowUp", modifiers: ["primary", "alt"] },
          },
          regions: ["page", "editable"],
          modals: [],
          resolve: function () {
            return {
              status: "handled",
              run: function () { if (api) api.adjustHeight(40); },
            };
          },
        }));
        disposers.push(ctx.shortcuts.register({
          id: "chatBubble.height.decrease",
          label: function () { return "减小输入框高度"; },
          aliases: ["chat bubble", "composer height", "输入框高度"],
          defaults: {
            "web:windows": { code: "ArrowDown", modifiers: ["primary", "alt"] },
            "web:macos": { code: "ArrowDown", modifiers: ["primary", "alt"] },
            "desktop:windows": { code: "ArrowDown", modifiers: ["primary", "alt"] },
            "desktop:macos": { code: "ArrowDown", modifiers: ["primary", "alt"] },
          },
          regions: ["page", "editable"],
          modals: [],
          resolve: function () {
            return {
              status: "handled",
              run: function () { if (api) api.adjustHeight(-40); },
            };
          },
        }));
        // 对话区宽度：Mod+Alt+← / →
        disposers.push(ctx.shortcuts.register({
          id: "chatBubble.width.increase",
          label: function () { return "加宽对话区"; },
          aliases: ["chat bubble", "conversation width", "对话区宽度"],
          defaults: {
            "web:windows": { code: "ArrowRight", modifiers: ["primary", "alt"] },
            "web:macos": { code: "ArrowRight", modifiers: ["primary", "alt"] },
            "desktop:windows": { code: "ArrowRight", modifiers: ["primary", "alt"] },
            "desktop:macos": { code: "ArrowRight", modifiers: ["primary", "alt"] },
          },
          regions: ["page", "editable"],
          modals: [],
          resolve: function () {
            return {
              status: "handled",
              run: function () { if (api) api.adjustWidth(40); },
            };
          },
        }));
        disposers.push(ctx.shortcuts.register({
          id: "chatBubble.width.decrease",
          label: function () { return "收窄对话区"; },
          aliases: ["chat bubble", "conversation width", "对话区宽度"],
          defaults: {
            "web:windows": { code: "ArrowLeft", modifiers: ["primary", "alt"] },
            "web:macos": { code: "ArrowLeft", modifiers: ["primary", "alt"] },
            "desktop:windows": { code: "ArrowLeft", modifiers: ["primary", "alt"] },
            "desktop:macos": { code: "ArrowLeft", modifiers: ["primary", "alt"] },
          },
          regions: ["page", "editable"],
          modals: [],
          resolve: function () {
            return {
              status: "handled",
              run: function () { if (api) api.adjustWidth(-40); },
            };
          },
        }));
          // 全部注册成功后才让裸监听器让位，避免同一次按键触发两遍。
          officialShortcutsActive = true;
        } catch (e) {
          // 任何一条注册抛错（如平台保留键校验）都不能冒泡——那会让 Cordis 判定插件
          // 激活失败，把整个 DSH 启动拦成错误页。回滚已注册的命令，保留裸监听兜底。
          console.warn("[dsh-chat-bubble] 官方快捷键注册失败，回退内置监听:", e && e.message);
          officialShortcutsActive = false;
          for (var k = 0; k < disposers.length; k++) {
            try { disposers[k](); } catch (_) {}
          }
          return function () {};
        }
        return function () {
          // 卸载后恢复裸监听器兜底，保证插件被禁用时行为可预期。
          officialShortcutsActive = false;
          for (var i = 0; i < disposers.length; i++) {
            try { disposers[i](); } catch (_) {}
          }
        };
      };
      if (typeof ctx.effect === "function") ctx.effect(register, "chat-bubble: shortcuts");
      else register();
    }

    var moduleExports = {};
    moduleExports.apply = apply;
    // 声明本插件依赖的服务：shortcuts 不可用时 Cordis 会等待而非报错。
    moduleExports.inject = ["shortcuts"];
    return moduleExports;
  },
});
