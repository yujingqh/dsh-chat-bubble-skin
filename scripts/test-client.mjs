/**
 * dsh-chat-bubble 客户端冒烟测试（无需浏览器）
 *
 * 为什么需要它：CSS 是拼在 JS 模板字符串里的，注释里一个反引号就会提前终止
 * 模板，后续文本被当表达式求值，产生 NaN 并吞掉花括号 —— 整条规则被浏览器
 * 静默丢弃，而 `node --check` 查不出来（JS 语法本身合法）。
 *
 * 这个脚本用 DOM 桩执行真实的 factory，把生成的 CSS 拿来断言：
 *   - 无 NaN、花括号配平；
 *   - 两套运行时的类名都按预期出现，且不混入另一套；
 *   - 稳定锚点（data-*）确实被写进选择器。
 *
 * 用法：node scripts/test-client.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "lib", "client.js");

/** 两套运行时的真实类名（与 README 的对照表一致）。 */
const RUNTIMES = {
  "0.1.7": {
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
  "0.2.0": {
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
};

/** 稳定锚点（方案 C 主路径依赖的这些，DSH 主动暴露）。 */
const ANCHORS = [
  "[data-composer-card]", "[data-input-scroll]", "[data-conversation-content]",
  "[data-chat-flow]", '[data-chat-flow-kind="assistant-step"]', '[data-chat-flow-kind="user"]',
  '[data-chat-flow-kind="turn-process"]', "[data-turn-process-answer]",
];

/**
 * 在给定的「可见选择器集合」下执行一次 factory，返回生成的 CSS。
 *
 * @param runtimeName 哈希候选表的名字（对应 SEL_CANDIDATES 里的一套）。
 * @param mode "hashes" 只让哈希可见（模拟老运行时 / 锚点失效）；
 *             "anchors" 只让锚点可见（模拟 DSH 换构建、哈希全变）；
 *             "both" 两者都可见（真实桌面版）。
 */
function render(runtimeName, mode = "both") {
  const runtime = RUNTIMES[runtimeName];
  const captured = { css: null, attributes: [] };
  const visible = new Set(
    mode === "hashes" ? Object.values(runtime)
      : mode === "anchors" ? ANCHORS
        : [...Object.values(runtime), ...ANCHORS],
  );

  function makeEl(tag) {
    const el = {
      tagName: String(tag).toUpperCase(),
      children: [],
      dataset: {},
      style: { setProperty() {}, getPropertyValue: () => "" },
      attrs: {},
      setAttribute(k, v) { el.attrs[k] = v; captured.attributes.push([k, v]); },
      getAttribute(k) { return el.attrs[k]; },
      hasAttribute(k) { return k in el.attrs; },
      appendChild(child) { el.children.push(child); return child; },
      addEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      classList: { toggle() {}, add() {}, remove() {} },
      closest() { return null; },
      offsetHeight: 120,
    };
    return el;
  }

  const styleEl = makeEl("style");
  Object.defineProperty(styleEl, "textContent", {
    set(v) { captured.css = v; },
    get() { return captured.css; },
  });

  const head = makeEl("head");
  const documentStub = {
    head,
    body: makeEl("body"),
    documentElement: makeEl("html"),
    createElement: (tag) => (tag === "style" ? styleEl : makeEl(tag)),
    getElementById: () => null,
    querySelector: (sel) => {
      if (sel === 'style[data-plugin="dsh-chat-bubble"]') return null;
      // body/html 必须可查：插件把 data-dsh-* 属性挂在 body 上。
      if (sel === "body" || sel === "html") return documentStub.body;
      return visible.has(sel) ? makeEl("div") : null;
    },
    querySelectorAll: () => [],
    addEventListener() {},
  };

  let exports = null;
  const windowStub = {
    __DSH_BUBBLE_TEST_SEL__: [
      { id: runtimeName, ...runtime },
      // 故意放一套「全不命中」的假候选，确认打分逻辑不会误选它。
      { id: "bogus", frame: ".ZZZZZZ_frame", root: ".ZZZZZZ_root" },
    ],
    __ModuleLoader__: {
      load({ factory }) {
        exports = factory(() => ({}));
      },
    },
  };

  const source = readFileSync(SRC, "utf8");
  new Function(
    "window",
    "document",
    "localStorage",
    "MutationObserver",
    "getComputedStyle",
    "setTimeout",
    "clearTimeout",
    source,
  )(
    windowStub,
    documentStub,
    { getItem: () => null, setItem() {} },
    class { observe() {} disconnect() {} },
    () => ({ getPropertyValue: () => "" }),
    () => 0,
    () => {},
  );

  if (exports === null) throw new Error(`${runtimeName}/${mode}: factory 未执行`);
  if (captured.css === null) throw new Error(`${runtimeName}/${mode}: CSS 未注入（resolveSelectors 可能没命中）`);
  return { css: captured.css, exports, attributes: captured.attributes };
}

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
}

/** 通用健康检查（三种场景都要过）。 */
function checkBasics(label, { css, exports, attributes }) {
  check(`${label}: factory 导出 apply/inject`, typeof exports.apply === "function" && Array.isArray(exports.inject));
  check(`${label}: CSS 非空`, css.length > 5000);
  // 只检查非注释区：注释里出现 NaN 是允许的（那是在说明这个坑）。
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  check(`${label}: 非注释区无 NaN`, !noComments.includes("NaN"));
  check(`${label}: 花括号配平`, css.split("{").length === css.split("}").length);
  check(`${label}: 含稳定锚点 data-code-block-banner`, css.includes("[data-code-block-banner]"));
  check(`${label}: 含调色盘样式`, css.includes(".dsh-bubble-palette-trigger"));
  check(`${label}: AI 气泡命中 assistant-step`, css.includes('[data-chat-flow-kind="assistant-step"]'));
  check(`${label}: 三个 data-dsh-* 属性已写入`,
    ["data-dsh-theme", "data-dsh-bubble-ai", "data-dsh-bubble-user"].every((a) => attributes.some(([k]) => k === a)));
}

/** 取出某角色的背景规则头（用于检查选择器形状）。 */
function aiRuleHead(css) {
  const rules = css.split("}").map((r) => r.trim()).filter(Boolean);
  const rule = rules.find((r) => /data-dsh-bubble-ai="1"/.test(r) && /background:\s*#/.test(r));
  return rule ? rule.split("{")[0].trim().replace(/^\/\*[^*]*\*\/\s*/, "") : null;
}

console.log("############ 场景一：真实桌面版（锚点 + 哈希都在） ############");
for (const name of Object.keys(RUNTIMES)) {
  console.log(`\n=== ${name} ===`);
  const out = render(name, "both");
  checkBasics(`${name}/both`, out);
  // 关键：锚点可用时必须走锚点，AI 规则直接落在流节点上（零哈希）
  const head = aiRuleHead(out.css);
  check(`${name}/both: AI 规则走零哈希锚点`, head !== null && !head.includes(RUNTIMES[name].bubbleAI));
  check(`${name}/both: AI 规则每条分支都含 assistant-step 或 turn-process`,
    head !== null && head.split(",").every((b) => /assistant-step|turn-process/.test(b)));
}

console.log("\n\n############ 场景二：只认哈希（老运行时 / 锚点失效） ############");
for (const name of Object.keys(RUNTIMES)) {
  console.log(`\n=== ${name} ===`);
  const out = render(name, "hashes");
  checkBasics(`${name}/hashes`, out);
  const head = aiRuleHead(out.css);
  // 锚点不可用时退回哈希正文容器，且每条分支都要带后缀（历史回归点）
  check(`${name}/hashes: AI 规则退回哈希正文容器`, head !== null && head.includes(RUNTIMES[name].bubbleAI));
  check(`${name}/hashes: 每条分支都带正文后缀`,
    head !== null && head.split(",").map((s) => s.trim()).every((b) => b.endsWith(RUNTIMES[name].bubbleAI)));
}

console.log("\n\n############ 场景三：只认锚点（DSH 换构建、哈希全变） ############");
{
  const out = render("0.2.0", "anchors");
  checkBasics("anchors-only", out);
  const head = aiRuleHead(out.css);
  check("anchors-only: AI 气泡仍然生成（这正是方案 C 的目的）", head !== null);
  check("anchors-only: AI 规则零哈希依赖",
    head !== null && !/\.(v5IAXa|hWmORq|BynINW|Dc7zOa|RlGAzG|cJsG2q|Sixlwa|xz4KEq|EvIC1a|pI_x6G|wSkVaW|uV2eYG)_/.test(out.css));
  const userHead = out.css.split("}").map((r) => r.trim())
    .find((r) => /data-dsh-bubble-user="5"/.test(r) && /background:\s*#/.test(r));
  check("anchors-only: 我的气泡也零哈希", userHead !== undefined && !/\.(cJsG2q|Sixlwa)_/.test(userHead.split("{")[0]));
}

console.log(`\n${failures === 0 ? "全部通过" : failures + " 项失败"}`);
process.exit(failures === 0 ? 0 : 1);
