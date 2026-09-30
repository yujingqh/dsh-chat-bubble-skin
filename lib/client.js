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
 * 兼容两套运行时（2026-09-30）：
 *   - Web CLI 0.1.7-rc.2   —— DSH_HOME/profiles/node_modules 那份客户端包
 *   - 桌面版 0.2.0-rc.2     —— 打包在 app.asar 内的运行时，CSS Modules 哈希全换
 * 两者的类名一一对应但完全不同，因此下方 SEL 给出【两套候选】，
 * 启动时按 DOM 里真实存在的那个自动选用（见 resolveSelectors）：
 *   - 元素类名（哈希）只能硬编码，换版本要改 SEL；
 *   - data-* 锚点（data-chat-flow-kind / data-code-block-banner /
 *     data-conversation-scroll / data-composer-card）是 DSH 主动提供的
 *     稳定锚点，优先使用，跨版本不易失效。
 *
 * 维护提示：
 *   - DSH 依赖的选择器集中在 SEL。CSS 在 resolveSelectors() 之后才拼接，
 *     所以必须在 SEL 定稿后再注入。
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
     * 动画类名锚点：同样的语义角色，两套运行时各有一份哈希。
     *
     * 已实测对照（0.1.7-rc.2 -> 0.2.0-rc.2）：
     *   AppFrame.frame        pI_x6G_frame  -> BynINW_frame
     *   ConversationRoot.root wSkVaW_root   -> Dc7zOa_root
     *   ConversationRoot.body wSkVaW_body   -> Dc7zOa_body
     *   InputBar.card         uV2eYG_card   -> RlGAzG_card
     *   InputBar.scroll       uV2eYG_scroll -> RlGAzG_scroll
     *   ChatView.column       EvIC1a_column -> xz4KEq_column
     *   MessageItem.bubble    Sixlwa_bubble -> cJsG2q_bubble
     *   MessageItem.userStack Sixlwa_userStack -> cJsG2q_userStack
     *   AssistantMarkdown     hWmORq_root/body -> v5IAXa_root/body
     *
     * 定位新类名的方法：DevTools 选中元素 → 取 class 里形如 xxxx_NNN_1 的那个
     * （CSS Modules 产物）→ 更新对应项。
     */
    var SEL = null;

    /** 两套候选：按顺序探测，第一个命中 DOM 的即为当前运行时。 */
    var SEL_CANDIDATES = [
      {
        id: "0.1.7",
        frame: ".pI_x6G_frame",
        root: ".wSkVaW_root",
        body: ".wSkVaW_body",
        card: ".uV2eYG_card",
        cardScroll: ".uV2eYG_scroll",
        bubbleAI: ".hWmORq_root",
        bubbleAIBody: ".hWmORq_body",
        bubbleUser: ".Sixlwa_bubble",
        bubbleUserStack: ".Sixlwa_userStack",
        column: ".EvIC1a_column",
      },
      {
        id: "0.2.0",
        frame: ".BynINW_frame",
        root: ".Dc7zOa_root",
        body: ".Dc7zOa_body",
        card: ".RlGAzG_card",
        cardScroll: ".RlGAzG_scroll",
        bubbleAI: ".v5IAXa_root",
        bubbleAIBody: ".v5IAXa_body",
        bubbleUser: ".cJsG2q_bubble",
        bubbleUserStack: ".cJsG2q_userStack",
        column: ".xz4KEq_column",
      },
    ];

    /**
     * 稳定锚点（DSH 主动写在 DOM 上的 data-* 属性，跨版本保留）。
     * 优先用它们定位，避免每次升级都要改哈希。
     *
     * 2026-09-30 按运行中桌面版回传的真实 DOM 校正过：
     *   - assistant-step **仍然存在**（此前误判为已移除）；
     *   - 对话列 xz4KEq_column 在 xz4KEq_frame/root/scroll 之下，
     *     与 ConversationRoot(.Dc7zOa_*) **不是**祖先关系，
     *     所以插件属性必须挂在更外层（见 attrHost）。
     */
    var ANCHOR = {
      /** 一条对话流节点。 */
      flowItem: "[data-chat-flow-kind]",
      /** 用户消息（两套运行时都有）。 */
      flowUser: '[data-chat-flow-kind="user"]',
      /** AI 消息节点（实测 0.1.7 与 0.2.0 都在）。 */
      flowAssistant: '[data-chat-flow-kind="assistant-step"]',
      /** 0.2.0 的 turn-process 节点（含最终回答时带此属性）。 */
      flowTurnProcess: '[data-chat-flow-kind="turn-process"]',
      turnAnswer: "[data-turn-process-answer]",
      /** DSH 公开插槽锚点（slots 服务渲染，display:contents 不产生盒子）。 */
      chatNodeSlot: '[data-slot="conversation.chat.node"]',
      /** 代码块顶栏。 */
      codeBanner: "[data-code-block-banner]",
      /** 代码块容器（0.2.0 仍是这个类名，0.1.7 同样存在）。 */
      codeBlock: ".md-code-block",
      /** 对话滚动容器。 */
      conversationScroll: "[data-conversation-scroll]",
      /** 会话区容器（0.2.0 带此属性；宽度变量写在这里）。 */
      conversationContent: "[data-conversation-content]",
      /** 对话区列（0.2.0 带 data-chat-flow）。 */
      chatFlow: "[data-chat-flow]",
      /** 0.2.0 输入卡片。 */
      composerCard: "[data-composer-card]",
      /** 0.2.0 输入区滚动容器。 */
      composerScroll: "[data-input-scroll]",
    };

    /**
     * 【主路径】零哈希选择器表 —— 全部只用 DSH 主动暴露的 data-* 锚点。
     *
     * 可行性依据（2026-09-30 读运行时源码 + 真实 DOM 双重确认）：
     *
     * 1. 气泡要上色就得有一个「盒子」。AI 消息的真实结构是：
     *      div[data-chat-flow-kind="assistant-step"]
     *        └─ div[data-slot="conversation.chat.node"]   style="display:contents"（无盒子！）
     *           └─ .v5IAXa_root                            ← AssistantMarkdown
     *    插槽那层是 display:contents，**不参与布局**；
     *    而注册到该插槽的 AssistantNodeView 只渲染一个 AssistantMarkdown
     *    （源码：return jsx(AssistantMarkdown, {...})，没有别的子节点）。
     *    => assistant-step 流节点的内容盒 **就等于** AssistantMarkdown 的盒子，
     *       所以直接给流节点上色，几何尺寸与给 .v5IAXa_root 上色完全一致。
     *
     * 2. 用户气泡同理：流节点 > slot(contents) > MessageItem 的 userRow/bubble。
     *
     * 3. 主题/气泡色走 CSS 变量继承，不需要类名。
     */
    var SAFE = {
      /** AI 气泡载体：assistant-step 流节点（= AssistantMarkdown 的盒子）。 */
      bubbleAI: '[data-chat-flow-kind="assistant-step"]',
      /** AI 正文（染色用）：同一个流节点内部。 */
      bubbleAIBody: '[data-chat-flow-kind="assistant-step"]',
      /** 用户气泡载体：user 流节点。 */
      bubbleUser: '[data-chat-flow-kind="user"]',
      /** 用户气泡内层（宽度控制用；缺失时退回流节点本身）。 */
      bubbleUserStack: '[data-chat-flow-kind="user"]',
      /** 输入卡片：优先 data-composer-card，退回哈希。 */
      card: "[data-composer-card]",
      /** 输入滚动容器：优先 data-input-scroll，退回哈希。 */
      cardScroll: "[data-input-scroll]",
      /** 会话区容器（宽度变量）：优先 data-conversation-content。 */
      body: "[data-conversation-content]",
      /** 对话区列：优先 data-chat-flow。 */
      column: "[data-chat-flow]",
    };

    /**
     * 「只有锚点、没有哈希」时的候选：DSH 换了构建导致哈希全变，
     * 但 data-* 契约仍在。此时每个角色直接用锚点，插件照常工作。
     * 这是方案 C 的核心韧性来源。
     */
    var ANCHOR_ONLY = {
      id: "anchors-only",
      frame: null, // 主题靠变量继承，挂 body
      root: null, // 属性挂 body
      body: "[data-conversation-content]",
      card: "[data-composer-card]",
      cardScroll: "[data-input-scroll]",
      bubbleAI: '[data-chat-flow-kind="assistant-step"]',
      bubbleAIBody: '[data-chat-flow-kind="assistant-step"]',
      bubbleUser: '[data-chat-flow-kind="user"]',
      bubbleUserStack: '[data-chat-flow-kind="user"]',
      column: "[data-chat-flow]",
    };

    /**
     * 插件 data-dsh-* 属性的挂载点。
     *
     * 必须挂在「包含整个对话列」的祖先上：
     *   桌面版 0.2.0 的对话列在 xz4KEq_frame 之下，而 .Dc7zOa_root
     *   （ConversationRoot）与它是并列子树，**不是**祖先 ——
     *   把属性挂在 .Dc7zOa_root 上，AI/用户气泡的选择器永远匹配不到
     *   （这正是 2026-09-30 首版桌面版失效的原因）。
     * body 是两套运行时都成立的祖先，因此挂在 body 上。
     */
    function attrHost() {
      return document.body || document.documentElement;
    }

    /**
     * 选定当前运行时的选择器表。
     * 用「多信号打分」而不是只看第一个：刷新时 DOM 分批出现，
     * 若只探测一个类名，可能因为探测时机太早而误判成另一套。
     * @returns {boolean} 是否探测到了确定的运行时（否则下次再试）。
     */
    function resolveSelectors() {
      // 测试钩子：scripts/test-client.mjs 用它指定候选表，其余情况走真实探测。
      var candidates =
        typeof window !== "undefined" && window.__DSH_BUBBLE_TEST_SEL__
          ? window.__DSH_BUBBLE_TEST_SEL__
          : SEL_CANDIDATES;
      var best = null;
      var bestScore = 0;
      for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        var score = 0;
        for (var key in candidate) {
          if (key === "id") continue;
          try {
            if (document.querySelector(candidate[key])) score++;
          } catch (_) {}
        }
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      // 一套哈希都没命中，但稳定锚点在 —— 这是方案 C 要支持的场景：
      // DSH 换了构建、哈希全变，而 data-* 契约仍在。
      // 此时不能判定为「DOM 未就绪」，否则插件永远不会激活。
      if (best === null || bestScore === 0) {
        if (countAnchors() > 0) {
          SEL = ANCHOR_ONLY;
          return true;
        }
        // 连锚点都没有：DOM 还没渲染，保持 null 等下次重试。
        return false;
      }
      SEL = best;
      return true;
    }

    /** DOM 里已经出现了几个稳定锚点（用于判断「锚点可用但哈希未知」）。 */
    function countAnchors() {
      var n = 0;
      for (var key in SAFE) {
        try {
          if (document.querySelector(SAFE[key])) n++;
        } catch (_) {}
      }
      return n;
    }

    /**
     * 【主路径选择器】在运行时已确认存在的前提下，逐项优先取稳定锚点，
     * 取不到才退回哈希类名。返回的是「最终写进 CSS 的那一组选择器」。
     *
     * 为什么这样分层：稳定锚点失效的概率远低于哈希（哈希每次构建都可能变），
     * 但锚点也不是 DSH 的永久承诺。两层叠加后：
     *   - 正常升级：锚点仍在 -> 样式照常，无需改代码；
     *   - DSH 改了锚点但类名没变 -> 哈希兜底，仍能工作；
     *   - 两者都变 -> 才需要更新 SEL_CANDIDATES。
     *
     * 注意：本函数**只返回选择器字符串**（因为结果要拼进 CSS）。
     * 需要真实元素的地方请用 pick()。
     * @returns 每个角色最终采用的选择器串。
     */
    function effective() {
      if (SEL === null) resolveSelectors();
      var src = SEL || SEL_CANDIDATES[0];
      function pickSel(anchor, fallback) {
        try {
          if (anchor && document.querySelector(anchor)) return anchor;
        } catch (_) {}
        return fallback;
      }
      return {
        /** AI 气泡：锚点优先；退回哈希正文容器。 */
        bubbleAI: pickSel(SAFE.bubbleAI, src.bubbleAI),
        /** AI 正文染色范围：锚点优先；退回哈希正文容器。 */
        bubbleAIBody: pickSel(SAFE.bubbleAIBody, src.bubbleAIBody),
        /** 用户气泡。 */
        bubbleUser: pickSel(SAFE.bubbleUser, src.bubbleUser),
        /** 用户气泡内层（宽度用）。 */
        bubbleUserStack: pickSel(SAFE.bubbleUserStack, src.bubbleUserStack),
        /** 输入卡片。 */
        card: pickSel(SAFE.card, src.card),
        /** 输入滚动容器。 */
        cardScroll: pickSel(SAFE.cardScroll, src.cardScroll),
        /** 会话区容器（宽度变量）。 */
        body: pickSel(SAFE.body, src.body),
        /** 对话区列。 */
        column: pickSel(SAFE.column, src.column),
        /** 三列框架（主题变量）：哈希取不到时用 body —— 变量靠继承，一样生效。 */
        frame: pickSel(null, src.frame) || "body",
        /** 属性挂载点：始终 body（见 attrHost 注释），用选择器表达。 */
        root: "body",
      };
    }

    // ================================================================
    // CSS
    // ================================================================
    /** 主题色（全局背景 + 导航栏）。 */
    function buildThemeCss() {
      var out = "";
      var frame = effective().frame;
      ACCENTS.forEach(function (a, i) {
        if (!a.bg) return; // 默认主题不生成 CSS
        out +=
          frame +
          '[data-dsh-theme="' +
          i +
          '"] {' +
          "  --dsw-alias-bg-base: " + a.bg + ";" +
          "  --dsw-specific-input-major: " + a.bg + ";" +
          "  --dsw-alias-interactive-bg-hover: " + a.light + ";" +
          "  --dsw-specific-sidebar-fill: " + a.bg + ";" +
          "}";
      });
      return out;
    }

    /**
     * 把一组「基选择器」各自接上同一个后代后缀，返回逗号分隔的选择器列表。
     *
     * 为什么需要它：基选择器本身是逗号列表（如 assistant-step 与
     * turn-process 两条分支），若直接 `list + " " + suffix`，
     * 后缀只会接到【最后一条】分支上，前面的分支就丢了后缀 ——
     * 规则会静默变成「只匹配流节点本身」，气泡样式整片失效。
     * 这正是 2026-09-30 桌面版 AI 气泡不生效的真正原因。
     *
     * @param bases 基选择器数组。
     * @param suffix 追加到每条基选择器后面的后代选择器（可为空）。
     * @returns 逗号分隔的选择器列表。
     */
    function descendants(bases, suffix) {
      var tail = suffix ? " " + suffix : "";
      return bases
        .map(function (base) {
          return base + tail;
        })
        .join(", ");
    }

    /** 气泡色：AI 气泡色 + 我的气泡色，分别用 data-dsh-bubble-ai / data-dsh-bubble-user 控制。 */
    function buildBubbleCss() {
      var out = "";
      var eff = effective();
      ACCENTS.forEach(function (a, i) {
        if (!a.hex) return; // 默认主题不生成 CSS
        var aiScope = '[data-dsh-bubble-ai="' + i + '"]';
        var userScope = '[data-dsh-bubble-user="' + i + '"]';
        // AI 消息命中范围（零哈希主路径）：
        //   assistant-step 流节点的盒子 = AssistantMarkdown 的盒子（见 SAFE 注释），
        //   因此直接把气泡画在流节点上，既不需要哈希、几何也完全一致。
        //   另附 turn-process(answer) 分支，覆盖「回答节点」这条渲染路径。
        var aiBases = [
          aiScope + " " + ANCHOR.flowAssistant,
          aiScope + " " + ANCHOR.flowTurnProcess + ANCHOR.turnAnswer,
        ];
        // 若锚点不可用（极端情况）则退回哈希正文容器，保证仍能工作。
        var aiInner = eff.bubbleAI === SAFE.bubbleAI ? "" : " " + eff.bubbleAI;
        out +=
          "/* ===== AI 气泡色 ===== */" +
          descendants(aiBases, aiInner.replace(/^ /, "")) + " {" +
          "  background: " + a.hex + ";" +
          "  color: #fff !important;" +
          "}" +
          /* AI 彩色气泡里的文字统一白色。
             不再用通配符刷白整棵子树 —— 那会把代码块内部 svg 图标
             （stroke=currentColor）也染成白色，白图标配浅色顶栏底就完全看不见。
             改为【白名单式】精确列出需要变白的元素，代码块整块不在其中。
             用 :where() 让这些规则保持 0 特异性，便于后续覆盖。
             注意：本段是 JS 模板字符串的一部分，注释里绝对不能出现反引号。 */
          descendants(aiBases, aiInner.replace(/^ /, "")) + ", " +
          descendants(aiBases, (aiInner.replace(/^ /, "") + " :where(p, li, ul, ol, h1, h2, h3, h4, h5, h6, strong, em, b, i, del, s, blockquote, td, th, caption, dt, dd, figcaption, summary)").trim()) + " {" +
          "  color: #fff !important;" +
          "}" +
          /* 行内小代码块：半透明深色背景 + 白字。
             代码块内部由下面 .md-code-block 规则用更高特异性覆盖回来。 */
          descendants(aiBases, "CODE") + " {" +
          "  background: rgba(0, 0, 0, 0.15) !important;" +
          "  color: #fff !important;" +
          "  border-radius: 4px;" +
          "  padding: 2px 6px;" +
          "}" +
          /* 大代码块：跟随主题 —— 浅色背景(bg) + 深色文字(dark)，既配色又清晰可读。
             覆盖 .shiki(有语法高亮) 与 PRE._plain(无高亮/流式) 两种渲染路径。 */
          descendants(aiBases, ANCHOR.codeBlock + " PRE") + ", " +
          descendants(aiBases, ANCHOR.codeBlock + " PRE CODE") + ", " +
          descendants(aiBases, ANCHOR.codeBlock + " PRE SPAN") + ", " +
          descendants(aiBases, ANCHOR.codeBlock + ' PRE SPAN[style]') + ", " +
          descendants(aiBases, ANCHOR.codeBlock + " .shiki") + " {" +
          "  background: " + a.bg + " !important;" +
          "  color: " + a.dark + " !important;" +
          "}" +
          /* 注释色偏灰；[style*="token"] 兜底 shiki 内联写死的颜色。 */
          descendants(aiBases, ANCHOR.codeBlock + ' PRE SPAN[style*="comment"]') + ", " +
          descendants(aiBases, ANCHOR.codeBlock + ' PRE SPAN[style*="token"]') + " {" +
          "  color: #868e96 !important;" +
          "}" +
          /* 代码块内的 CODE 还原行内代码样式：去掉 padding/圆角/灰底，
             否则整块代码会被套上一层灰水笔底色。 */
          descendants(aiBases, ANCHOR.codeBlock + " PRE CODE") + ", " +
          descendants(aiBases, ANCHOR.codeBlock + " CODE") + " {" +
          "  background: transparent !important;" +
          "  border-radius: 0 !important;" +
          "  padding: 0 !important;" +
          "}" +
          aiScope + " " + eff.root + " {" +
          "  --dsw-alias-state-business-primary: " + a.hex + ";" +
          "}" +
          "/* ===== 我的气泡色 ===== */" +
          descendants([userScope + " " + ANCHOR.flowUser], eff.bubbleUser === SAFE.bubbleUser ? "" : eff.bubbleUser) + " {" +
          "  background: " + a.hex + ";" +
          "  color: #fff;" +
          "}" +
          userScope + " " + eff.root + " {" +
          "  --dsw-specific-bubble: " + a.hex + ";" +
          "}";
      });
      return out;
    }

    /** 代码块顶栏：让图标保持 DSH 原生外观（跟随语义色，深浅色模式自适应）。 */
    function buildCodeBarCss() {
      return (
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button, " +
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button svg, " +
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button svg *, " +
        ANCHOR.codeBlock + " [class*=\"action\"] svg, " +
        ANCHOR.codeBlock + " [class*=\"action\"] svg * {" +
        "  color: var(--dsw-alias-label-secondary, #61666b);" +
        "  stroke: currentColor;" +
        "}" +
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button:hover, " +
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button:hover svg, " +
        ANCHOR.codeBlock + " " + ANCHOR.codeBanner + " button:hover svg * {" +
        "  color: var(--dsw-alias-label-primary, #0f1115);" +
        "}" +
        /* 语言标签（灰字）保持隐藏：顶栏只留操作图标，视觉更干净。 */
        "[data-dsh-bubble-ai] " + ANCHOR.codeBlock + " [class*=\"infostring\"] {" +
        "  display: none !important;" +
        "}"
      );
    }

    /** 三个调色盘的按钮 / 面板样式。 */
    function buildPaletteCss() {
      var eff = effective();
      return (
        ".dsh-bubble-palette-trigger {" +
        "  position: absolute;" +
        "  top: 6px;" +
        "  width: 18px;" +
        "  height: 18px;" +
        "  border-radius: 50%;" +
        "  border: 2px solid rgba(255,255,255,0.8);" +
        "  box-shadow: 0 0 0 1px var(--dsw-alias-border-l1, #ccc);" +
        "  cursor: pointer;" +
        "  z-index: 10;" +
        "  opacity: 0;" +
        "  transition: opacity 0.15s;" +
        "}" +
        eff.card + ":hover .dsh-bubble-palette-trigger { opacity: 1; }" +
        ".dsh-bubble-palette-trigger--theme { right: 60px; }" +
        ".dsh-bubble-palette-trigger--bubble-ai { right: 36px; }" +
        ".dsh-bubble-palette-trigger--bubble-user { right: 12px; }" +
        ".dsh-bubble-palette {" +
        "  position: absolute;" +
        "  top: 30px;" +
        "  display: flex;" +
        "  gap: 4px;" +
        "  padding: 6px 8px;" +
        "  background: var(--dsw-specific-menu, #fff);" +
        "  border: 1px solid var(--dsw-alias-border-l1, #ddd);" +
        "  border-radius: 10px;" +
        "  box-shadow: var(--dsw-shadow-lv3, 0 4px 16px rgba(0,0,0,0.12));" +
        "  z-index: 20;" +
        "  opacity: 0;" +
        "  pointer-events: none;" +
        "  transform: translateY(-4px);" +
        "  transition: opacity 0.15s, transform 0.15s;" +
        "}" +
        ".dsh-bubble-palette--theme { right: 54px; }" +
        ".dsh-bubble-palette--bubble-ai { right: 30px; }" +
        ".dsh-bubble-palette--bubble-user { right: 6px; }" +
        ".dsh-bubble-palette.open {" +
        "  opacity: 1;" +
        "  pointer-events: auto;" +
        "  transform: translateY(0);" +
        "}" +
        ".dsh-bubble-palette-swatch {" +
        "  width: 22px;" +
        "  height: 22px;" +
        "  border-radius: 50%;" +
        "  cursor: pointer;" +
        "  border: 2px solid transparent;" +
        "  transition: border-color 0.1s, transform 0.1s;" +
        "}" +
        ".dsh-bubble-palette-swatch:hover {" +
        "  border-color: var(--dsw-alias-label-primary, #333);" +
        "  transform: scale(1.15);" +
        "}" +
        ".dsh-bubble-palette-swatch.active {" +
        "  border-color: var(--dsw-alias-label-primary, #333);" +
        "  box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--dsw-alias-label-primary, #333);" +
        "}"
      );
    }

    /** 气泡布局本体。 */
    function buildLayoutCss() {
      var eff = effective();
      var userNode = ANCHOR.flowUser;
      // AI 节点：锚点即气泡载体时不再需要内层后缀（见 SAFE 注释）；
      // 走哈希兜底时才补上内层类名。
      var aiNode = descendants(
        [ANCHOR.flowAssistant, ANCHOR.flowTurnProcess + ANCHOR.turnAnswer],
        eff.bubbleAI === SAFE.bubbleAI ? "" : eff.bubbleAI,
      );
      // 用户气泡：同理，锚点优先。
      var userBubble = userNode + (eff.bubbleUser === SAFE.bubbleUser ? "" : " " + eff.bubbleUser);
      var userStack = userNode + (eff.bubbleUserStack === SAFE.bubbleUserStack ? "" : " " + eff.bubbleUserStack);
      return (
        eff.root + " {" +
        "  --dsh-chat-content-width: 900px;" +
        "  --dsh-composer-card-max-width: calc(900px + 32px);" +
        "}" +
        /* 宽度变量在 0.2.0 由会话区容器定义，直接写在同一元素上最稳。 */
        eff.body + " {" +
        "  --dsh-chat-content-width: 900px;" +
        "  --dsh-composer-card-max-width: calc(900px + 32px);" +
        "}" +
        aiNode + " {" +
        "  display: flex;" +
        "  justify-content: flex-start;" +
        "  max-width: 100%;" +
        "  border-radius: 18px 18px 18px 6px;" +
        "  padding: 12px 18px;" +
        "  margin-bottom: 2px;" +
        "  font-size: 15px;" +
        "  line-height: 26px;" +
        "}" +
        /* 锚点模式下，气泡内边距加在流节点上，内层正文需清掉自身外边距，
           避免叠加后比原来更松（保持与哈希模式一致的视觉）。 */
        aiNode + " > " + ANCHOR.chatNodeSlot + " {" +
        "  min-width: 0;" +
        "  flex: 1 1 auto;" +
        "}" +
        userStack + " { max-width: 100%; }" +
        userBubble + " {" +
        "  border-radius: 18px 18px 6px 18px;" +
        "  padding: 12px 18px;" +
        "  font-size: 15px;" +
        "  line-height: 26px;" +
        "  box-shadow: 0 1px 3px rgba(0,0,0,0.08);" +
        "}" +
        "[data-chat-flow-kind=\"assistant-step\"] + [data-chat-flow-kind=\"user\"], " +
        "[data-chat-flow-kind=\"user\"] + [data-chat-flow-kind=\"assistant-step\"], " +
        ANCHOR.flowTurnProcess + ANCHOR.turnAnswer + " + " + userNode + ", " +
        userNode + " + " + ANCHOR.flowTurnProcess + ANCHOR.turnAnswer + " { margin-top: 8px; }" +
        "@media (max-width: 768px) {" +
        "  " + eff.root + ", " + eff.body + " { --dsh-chat-content-width: 100%; }" +
        "  " + aiNode + ", " + userStack + " { max-width: 88%; }" +
        "}"
      );
    }

    function buildCss() {
      return buildThemeCss() + buildBubbleCss() + buildCodeBarCss() + buildPaletteCss() + buildLayoutCss();
    }

    var cssInjected = false;

    function injectCss() {
      if (typeof document === "undefined") return;
      if (cssInjected) return;
      if (document.querySelector('style[data-plugin="dsh-chat-bubble"]')) {
        cssInjected = true;
        return;
      }
      var style = document.createElement("style");
      style.setAttribute("data-plugin", "dsh-chat-bubble");
      style.textContent = buildCss();
      // head 在某些启动时序下可能还不存在，退到 documentElement，保证一定挂上。
      var host = document.head || document.documentElement;
      if (!host) return;
      host.appendChild(style);
      cssInjected = true;
    }

    function ensureCss() {
      if (cssInjected) return;
      injectCss();
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

      /**
       * 统一的取元素入口：**先锚点、后哈希**。
       * 这样 JS 侧也不必直接碰 SEL，升级时只改 effective() 一处。
       * @param role effective() 里的角色名。
       * @returns 元素或 null。
       */
      function pick(role) {
        var sel = effective()[role];
        if (!sel) return null;
        try {
          return document.querySelector(sel);
        } catch (_) {
          return null;
        }
      }

      function getHeight() {
        // 读取输入区滚动容器的实际高度（新版高度自适应，取 scroll 的 offsetHeight）
        var scroll = pick("cardScroll");
        if (scroll) return scroll.offsetHeight || 120;
        var card = pick("card");
        if (!card) return 120;
        return card.offsetHeight || 120;
      }
      // 用户是否已用快捷键手工调过宽度：调过之后 observer 不再用 localStorage 覆盖。
      var widthTouched = false;

      function getWidth() {
        var root = pick("body") || pick("root");
        if (!root) return 900;
        // 先读行内样式（快捷键写入的地方），再退回计算样式。
        var w = root.style.getPropertyValue("--dsh-chat-content-width").trim();
        if (!w) {
          w = getComputedStyle(root).getPropertyValue("--dsh-chat-content-width").trim();
        }
        var px = parseFloat(w);
        return isNaN(px) ? 900 : Math.round(px);
      }

      function applyAll() {
        var root = pick("root");
        var card = pick("card");
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
        var card = pick("card");
        if (!card) return;
        // 直接强制输入区滚动容器高度，不依赖 max-height 变量继承。
        // 锚点层（data-input-scroll）与哈希层都在卡片内部，优先用锚点。
        var eff = effective();
        var scroll = card.querySelector(eff.cardScroll) || card.querySelector(ANCHOR.composerScroll);
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
        // --dsh-chat-content-width 由会话区容器定义，写在同一元素最稳；
        // body 与容器各写一份，兼容两套运行时。
        var targets = [pick("body"), pick("root")];
        for (var i = 0; i < targets.length; i++) {
          var target = targets[i];
          if (!target) continue;
          target.style.setProperty("--dsh-chat-content-width", px + "px");
          target.style.setProperty("--dsh-composer-card-max-width", px + 32 + "px");
        }
        // 同步写内置拖拽手柄使用的变量，避免两套宽度互相覆盖：
        // --dsh-chat-content-width 控制对话区列宽，
        // --dsh-chat-user-width    控制用户气泡宽度。
        var holder = pick("root");
        if (holder && holder.parentElement) holder = holder.parentElement;
        if (holder) holder.style.setProperty("--dsh-chat-user-width", px + "px");
        if (persist) {
          widthTouched = true;
          saveSetting(LS_W, px);
        }
      }

      function setTheme(idx, persist) {
        if (persist === void 0) persist = true;
        // 主题变量靠继承下发，挂在最外层框架上最省事；框架取不到就退到 body。
        var frame = pick("frame") || attrHost();
        if (!frame) return;
        frame.setAttribute("data-dsh-theme", String(idx));
        if (persist) saveSetting(LS_T, idx);
      }

      function setBubbleAI(idx, persist) {
        if (persist === void 0) persist = true;
        // 属性必须挂在整个对话列的祖先上（见 attrHost 注释），否则气泡规则匹配不到。
        var host = attrHost();
        if (host) host.setAttribute("data-dsh-bubble-ai", String(idx));
        if (persist) saveSetting(LS_BA, idx);
      }

      function setBubbleUser(idx, persist) {
        if (persist === void 0) persist = true;
        var host = attrHost();
        if (host) host.setAttribute("data-dsh-bubble-user", String(idx));
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
          swatch.className = "dsh-bubble-palette-swatch" + (i === currentIdx ? " active" : "");
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
      // 三个职责：
      //   1) 运行时尚未判定时继续探测（SEL 定稿后才能注入 CSS）；
      //   2) 输入卡片延迟渲染，出现后把保存的宽度/高度/配色应用上；
      //   3) 补齐调色盘按钮（installPalette 内部有存在性判断，是幂等的）。
      // 注意不能无条件反复 setWidth：用户正在用快捷键调整时会被打回，
      // 所以 applyAll 内部用 widthTouched 守卫，且只在元素刚出现时应用。
      var observedRoot = null;
      var observedCard = null;
      var observer = new MutationObserver(() => {
        if (SEL === null) {
          if (!resolveSelectors()) return;
          ensureCss();
        }
        // 无条件确保样式已注入：首屏时序不确定，任何一次回调都可以补上。
        ensureCss();
        var root = pick("root");
        var card = pick("card");
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

      // 首屏：探测运行时 → 注入 CSS → 恢复保存值并挂上调色盘。
      // 元素可能还没渲染完，缺失的部分由 MutationObserver 补上。
      if (resolveSelectors()) {
        ensureCss();
        restoreSaved();
        var card = pick("card");
        if (card) {
          installPalette(card, "theme", loadSaved(LS_T, 0), setTheme, "theme");
          installPalette(card, "bubble-ai", loadSaved(LS_BA, 0), setBubbleAI, "bubble-ai");
          installPalette(card, "bubble-user", loadSaved(LS_BU, 0), setBubbleUser, "bubble-user");
        }
      }
      // 首屏可能还没渲染好：无论如何都排一次延迟兜底，保证 CSS 一定注入。
      setTimeout(function () {
        if (SEL === null) {
          if (!resolveSelectors()) return;
        }
        ensureCss();
        restoreSaved();
      }, 1200);

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
