/**
 * dsh-chat-bubble — 客户端 CSS + JS 注入
 *
 * 功能：
 *   1. 气泡式对话
 *   2. 快捷键调整输入框高度和对话区宽度
 *   3. 两个调色盘：主题色 + 气泡色，独立选择
 *   4. localStorage 持久化
 *
 * 快捷键（在输入框内）：
 *   Ctrl+↑ / Ctrl+↓     调整输入框高度（±40px）
 *   Ctrl+Shift+← / →    调整对话区宽度（±40px）
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

    var css = "";

    // 主题色（全局背景 + 导航栏）：bg 色（默认主题跳过）
    ACCENTS.forEach((a, i) => {
      if (!a.bg) return; // 默认主题不生成 CSS
      css +=
        `
        .pI_x6G_frame[data-dsh-theme="` +
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

    // 气泡色：独立控制 assistant/user 气泡（默认主题跳过）
    ACCENTS.forEach((a, i) => {
      if (!a.hex) return; // 默认主题不生成 CSS
      css +=
        `
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .Sxvs8a_root {
          background: ` +
        a.hex +
        `;
          color: #fff !important;
        }
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] ._markdown_1nba0_5,
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] ._markdown_1nba0_5 * {
          color: #fff !important;
        }
        /* 行内小代码块：半透明深色背景 + 主题色字 */
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] CODE {
          background: rgba(0, 0, 0, 0.15) !important;
          color: #fff !important;
          border-radius: 4px;
          padding: 2px 6px;
        }
        /* 大代码块：跟随主题 —— 浅色背景(bg) + 深色文字(dark)，既配色又清晰可读 */
        /* 覆盖两种路径：.shiki(有语法高亮) 与 PRE._plain(无高亮/流式)，统一用 PRE 命中 */
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE,
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block .shiki {
          background: ` +
        a.bg +
        ` !important;
        }
        /* 代码文字用主题深色档(dark)，压过 _markdown * 的白色；注释单独灰色 */
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE,
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE CODE,
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN,
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN[style] {
          color: ` +
        a.dark +
        ` !important;
        }
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="assistant-step"] .md-code-block PRE SPAN[style*="comment"] {
          color: #868e96 !important;
        }
        [data-dsh-bubble="` +
        i +
        `"] [data-chat-flow-kind="user"] .gdEzaW_bubble {
          background: ` +
        a.hex +
        `;
          color: #fff;
        }
        [data-dsh-bubble="` +
        i +
        `"] .wSkVaW_root {
          --dsw-specific-bubble: ` +
        a.hex +
        `;
          --dsw-alias-state-business-primary: ` +
        a.hex +
        `;
        }
      `;
    });

    // ---- 全局：修正彩色气泡下被误伤的大代码块，对全部主题生效 ----
    // 背景：气泡色规则里有两条会误伤 markdown 大代码块：
    //   a) `[data-dsh-bubble][data-chat-flow-kind] ._markdown_* { color:#fff !important }`
    //      把代码块顶部栏里的“复制”按钮文字染成白色（白字在浅色栏上不可见）。
    //      该规则特异性 =(0,3,0)。
    //   b) `[data-dsh-bubble][data-chat-flow-kind] CODE { background:rgba(0,0,0,.15) }`
    //      本意是给“行内小代码”加半透明灰底，但 CODE 选择器同时命中了代码块里
    //      shiki 高亮输出的 <code>，于是整个代码内容区被套上一层“灰色水笔”般的底色。
    // 修复：下面这组规则带同样的 [data-dsh-bubble][data-chat-flow-kind] 前缀把特异性
    // 提到 (0,4,0) 以上，才能压过上面的 !important；用 .md-code-block（稳定类名）+
    // 属性包含匹配，兼容 hash 后缀随 DSH 版本变化。
    css += `
      /* 隐藏顶部语言标签（灰字） */
      [data-dsh-bubble] [data-chat-flow-kind="assistant-step"] .md-code-block [class*="infostring"] {
        display: none !important;
      }
      /* 复制按钮及顶部栏恢复正文深色（不被 _markdown * 染白） */
      [data-dsh-bubble] [data-chat-flow-kind="assistant-step"] .md-code-block [class*="copyButton"] {
        color: var(--dsw-alias-label-primary) !important;
      }
      /* 去掉代码块内 <code> 被误加的半透明灰底（灰色水笔背景） */
      [data-dsh-bubble] [data-chat-flow-kind="assistant-step"] .md-code-block CODE,
      [data-dsh-bubble] [data-chat-flow-kind="assistant-step"] .md-code-block PRE CODE {
        background: transparent !important;
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
      .uV2eYG_card:hover .dsh-bubble-palette-trigger { opacity: 1; }

      .dsh-bubble-palette-trigger--theme { right: 36px; }
      .dsh-bubble-palette-trigger--bubble { right: 12px; }

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
      .dsh-bubble-palette--theme { right: 30px; }
      .dsh-bubble-palette--bubble { right: 6px; }
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
      .wSkVaW_root {
        --dsh-chat-content-width: 900px;
        --dsh-composer-card-max-width: calc(900px + 32px);
      }
      [data-chat-flow-kind="assistant-step"] { display: flex; justify-content: flex-start; }
      [data-chat-flow-kind="assistant-step"] .Sxvs8a_root {
        max-width: 100%; border-radius: 18px 18px 18px 6px;
        padding: 12px 18px; margin-bottom: 2px; font-size: 15px; line-height: 26px;
      }
      [data-chat-flow-kind="user"] .gdEzaW_userStack { max-width: 100%; }
      [data-chat-flow-kind="user"] .gdEzaW_bubble {
        border-radius: 18px 18px 6px 18px; padding: 12px 18px;
        font-size: 15px; line-height: 26px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      .Md3f7G_column { gap: 8px; }
      [data-chat-flow-kind="assistant-step"] + [data-chat-flow-kind="user"],
      [data-chat-flow-kind="user"] + [data-chat-flow-kind="assistant-step"] { margin-top: 8px; }
      .uV2eYG_mirror { min-height: 120px; }
      .uV2eYG_scroll { max-height: 400px; }
      .Md3f7G_scroll { padding-left: calc(var(--dsh-composer-side-clearance) + 16px); padding-right: calc(var(--dsh-composer-side-clearance) + 16px); }
      .Md3f7G_callRow { border-radius: 10px; margin-left: 38px; max-width: min(620px, 78%); }
      @media (max-width: 768px) {
        .wSkVaW_root { --dsh-chat-content-width: 100%; }
        [data-chat-flow-kind="assistant-step"] .Sxvs8a_root,
        [data-chat-flow-kind="user"] .gdEzaW_userStack { max-width: 88%; }
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
    if (typeof document !== "undefined" && !window.__DSH_BUBBLE_INSTALLED__) {
      window.__DSH_BUBBLE_INSTALLED__ = true;
      setup();
    }

    function setup() {
      var LS_H = "dsh-bubble-input-height";
      var LS_W = "dsh-bubble-chat-width";
      var LS_T = "dsh-bubble-theme";
      var LS_B = "dsh-bubble-accent";

      function loadSaved(key, fallback) {
        try {
          var v = localStorage.getItem(key);
          if (v !== null) return Number(v);
        } catch (_) {}
        return fallback;
      }
      function saveSetting(key, value) {
        try {
          localStorage.setItem(key, String(value));
        } catch (_) {}
      }

      function getHeight() {
        var card = document.querySelector(".uV2eYG_card");
        if (!card) return 120;
        var m = card.querySelector(".uV2eYG_mirror");
        return m ? m.offsetHeight : 120;
      }
      function getWidth() {
        var root = document.querySelector(".wSkVaW_root");
        if (!root) return 900;
        var w = getComputedStyle(root)
          .getPropertyValue("--dsh-chat-content-width")
          .trim();
        var px = parseInt(w, 10);
        return isNaN(px) ? 900 : px;
      }

      function applyAll() {
        var root = document.querySelector(".wSkVaW_root");
        var card = document.querySelector(".uV2eYG_card");
        if (!root || !card) return;
        setWidth(loadSaved(LS_W, 900), false);
        setHeight(loadSaved(LS_H, 120), false);
        setTheme(loadSaved(LS_T, 0), false);
        setBubble(loadSaved(LS_B, 0), false);
      }

      function setHeight(px, persist) {
        if (persist === void 0) persist = true;
        var card = document.querySelector(".uV2eYG_card");
        if (!card) return;
        var mirror = card.querySelector(".uV2eYG_mirror");
        var scroll = card.querySelector(".uV2eYG_scroll");
        if (mirror)
          mirror.style.setProperty("min-height", px + "px", "important");
        if (scroll)
          scroll.style.setProperty("max-height", px + 280 + "px", "important");
        if (persist) saveSetting(LS_H, px);
      }

      function setWidth(px, persist) {
        if (persist === void 0) persist = true;
        var root = document.querySelector(".wSkVaW_root");
        if (!root) return;
        root.style.setProperty("--dsh-chat-content-width", px + "px");
        root.style.setProperty("--dsh-composer-card-max-width", px + 32 + "px");
        if (persist) saveSetting(LS_W, px);
      }

      function setTheme(idx, persist) {
        if (persist === void 0) persist = true;
        var frame = document.querySelector(".pI_x6G_frame");
        if (!frame) return;
        frame.setAttribute("data-dsh-theme", String(idx));
        if (persist) saveSetting(LS_T, idx);
      }

      function setBubble(idx, persist) {
        if (persist === void 0) persist = true;
        var root = document.querySelector(".wSkVaW_root");
        if (!root) return;
        root.setAttribute("data-dsh-bubble", String(idx));
        if (persist) saveSetting(LS_B, idx);
      }

      // ---- 调色盘 ----
      function installPalette(card, kind, currentIdx, setter, clsSuffix) {
        var cls = "dsh-bubble-palette-trigger--" + clsSuffix;
        if (card.querySelector("." + cls)) return;

        var trigger = document.createElement("div");
        trigger.className = "dsh-bubble-palette-trigger " + cls;
        trigger.style.background = ACCENTS[currentIdx].hex;
        trigger.title = kind === "theme" ? "主题色" : "气泡色";
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
      var observer = new MutationObserver(() => {
        var root = document.querySelector(".wSkVaW_root");
        var card = document.querySelector(".uV2eYG_card");
        if (!root || !card) return;
        applyAll();
        installPalette(card, "theme", loadSaved(LS_T, 0), setTheme, "theme");
        installPalette(card, "bubble", loadSaved(LS_B, 0), setBubble, "bubble");
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // ---- 快捷键 ----
      document.addEventListener("keydown", (e) => {
        if (e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT")
          return;
        if (e.ctrlKey && e.shiftKey) {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            setWidth(Math.min(1400, getWidth() + 40));
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setWidth(Math.max(500, getWidth() - 40));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHeight(Math.min(600, getHeight() + 40));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHeight(Math.max(60, getHeight() - 40));
          }
          return;
        }
        if (e.ctrlKey) {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHeight(Math.min(600, getHeight() + 40));
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHeight(Math.max(60, getHeight() - 40));
          }
        }
      });

      var card = document.querySelector(".uV2eYG_card");
      if (card) {
        applyAll();
        installPalette(card, "theme", loadSaved(LS_T, 0), setTheme, "theme");
        installPalette(card, "bubble", loadSaved(LS_B, 0), setBubble, "bubble");
      }
    }

    var exports = {};
    exports.apply = function apply() {};
    return exports;
  },
});
