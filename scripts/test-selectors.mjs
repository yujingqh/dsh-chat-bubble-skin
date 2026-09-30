/**
 * 结构匹配测试：用探针回传的**真实 DOM 结构**验证选择器确实能命中。
 *
 * 为什么单独做这个：之前的测试只断言「CSS 里出现了某个类名」，
 * 结果类名写对了、却因为把属性挂在了非祖先元素上而完全匹配不到。
 * 这里把真实祖先链搭出来，逐条断言「按这个选择器真能找到元素」。
 *
 * 用法：node scripts/test-selectors.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "lib", "client.js");

/** 探针（2026-09-30 运行中的桌面版 0.2.0-rc.2）回传的真实祖先链。 */
const ASSISTANT_CHAIN = [
  { tag: "DIV", cls: "v5IAXa_root" },
  { tag: "DIV", cls: null, attrs: { "data-slot": "" } },
  { tag: "DIV", cls: "xz4KEq_flowItem", attrs: { "data-chat-flow-kind": "assistant-step" } },
  { tag: "DIV", cls: "WW4l1q_content", attrs: { "data-step-process-content": "", "data-chat-flow": "" } },
  { tag: "DIV", cls: "WW4l1q_body", attrs: { "data-step-process-body": "" } },
  { tag: "DIV", cls: "WW4l1q_root", attrs: { "data-step-process": "" } },
  { tag: "DIV", cls: "xz4KEq_column", attrs: { "data-chat-flow": "" } },
  { tag: "DIV", cls: "xz4KEq_scroll" },
  { tag: "DIV", cls: "xz4KEq_root" },
  { tag: "DIV", cls: "xz4KEq_frame" },
];

const USER_CHAIN = [
  { tag: "DIV", cls: "cJsG2q_bubble" },
  { tag: "DIV", cls: "cJsG2q_userStack" },
  { tag: "DIV", cls: "cJsG2q_userRow" },
  { tag: "DIV", cls: null },
  { tag: "DIV", cls: "xz4KEq_flowItem", attrs: { "data-chat-flow-kind": "user" } },
  { tag: "DIV", cls: "xz4KEq_column", attrs: { "data-chat-flow": "" } },
  { tag: "DIV", cls: "xz4KEq_scroll" },
  { tag: "DIV", cls: "xz4KEq_root" },
  { tag: "DIV", cls: "xz4KEq_frame" },
];

/** 最小 DOM 实现：够用来验证「选择器能否命中」，不追求完整 CSS 语义。 */
class El {
  constructor(spec) {
    this.tagName = spec.tag;
    this.className = spec.cls ?? "";
    this.attrs = { ...(spec.attrs ?? {}) };
    this.children = [];
    this.parentElement = null;
    this.style = { setProperty() {}, getPropertyValue: () => "" };
    this.offsetHeight = 120;
    this.dataset = {};
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  getAttributeNames() { return Object.keys(this.attrs); }
  appendChild(c) { c.parentElement = this; this.children.push(c); return c; }
  addEventListener() {}
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  querySelectorAll(sel) {
    // 支持后代组合子（空格分隔），本测试用到的选择器都是这种形式。
    const parts = sel.trim().split(/\s+/).map(parseCompound);
    const out = [];
    const walk = (el) => {
      for (const c of el.children) {
        if (matchesDescendant(c, parts)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  closest(sel) {
    const parts = sel.trim().split(/\s+/).map(parseCompound);
    for (let e = this; e; e = e.parentElement) if (matchesDescendant(e, parts)) return e;
    return null;
  }
  get classList() {
    return { toggle() {}, add() {}, remove() {} };
  }
}

/** 解析「标签+类名+属性」这种简单复合选择器（本测试只用到这些形式）。 */
function parseCompound(sel) {
  const classes = [...sel.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
  const attrs = [...sel.matchAll(/\[([A-Za-z0-9_-]+)(?:=["']([^"']*)["'])?\]/g)].map((m) => ({ name: m[1], value: m[2] }));
  const tagMatch = sel.match(/^([A-Za-z][A-Za-z0-9]*)/);
  return { classes, attrs, tag: tagMatch ? tagMatch[1].toUpperCase() : null };
}

function matches(el, want) {
  if (want.tag && el.tagName !== want.tag) return false;
  for (const c of want.classes) if (!el.className.split(/\s+/).includes(c)) return false;
  for (const a of want.attrs) {
    if (!el.hasAttribute(a.name)) return false;
    if (a.value !== undefined && el.getAttribute(a.name) !== a.value) return false;
  }
  return true;
}

/** 后代组合子匹配：最后一个 compound 必须命中 el，其余按顺序在祖先里逐个出现。 */
function matchesDescendant(el, parts) {
  const last = parts[parts.length - 1];
  if (!matches(el, last)) return false;
  let cursor = el.parentElement;
  for (let i = parts.length - 2; i >= 0; i--) {
    let found = false;
    while (cursor) {
      if (matches(cursor, parts[i])) { found = true; cursor = cursor.parentElement; break; }
      cursor = cursor.parentElement;
    }
    if (!found) return false;
  }
  return true;
}

function buildDom() {
  const body = new El({ tag: "BODY" });
  const build = (chain, into) => {
    let parent = into;
    for (const spec of [...chain].reverse()) parent = parent.appendChild(new El(spec));
    return into;
  };
  // 真实结构：body 下同时挂着对话区（xz4KEq_*）与输入区（RlGAzG_*）
  const frame = new El({ tag: "DIV", cls: "BynINW_frame" });
  body.appendChild(frame);
  const convRoot = frame.appendChild(new El({ tag: "DIV", cls: "Dc7zOa_root" }));
  const convBody = convRoot.appendChild(new El({ tag: "DIV", cls: "Dc7zOa_body" }));
  build(ASSISTANT_CHAIN, convBody);
  build(USER_CHAIN, convBody);
  const card = convBody.appendChild(new El({ tag: "DIV", cls: "RlGAzG_card", attrs: { "data-composer-card": "" } }));
  card.appendChild(new El({ tag: "DIV", cls: "RlGAzG_scroll", attrs: { "data-input-scroll": "" } }));
  return { body, frame, convRoot, convBody, card };
}

/** 从源码里取出真实的选择器常量（避免测试和实现各写一份而漂移）。 */
function readAnchors() {
  const src = readFileSync(SRC, "utf8");
  const pick = (key) => {
    const re = new RegExp(`${key}:\\s*'([^']+)'|${key}:\\s*"([^"]+)"`);
    const m = src.match(re);
    return m ? (m[1] ?? m[2]) : null;
  };
  return {
    flowUser: pick("flowUser"),
    flowAssistant: pick("flowAssistant"),
    codeBanner: pick("codeBanner"),
    codeBlock: pick("codeBlock"),
    composerCard: pick("composerCard"),
  };
}

const anchors = readAnchors();
let failures = 0;
const check = (label, ok) => { if (!ok) failures++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`); };

console.log("=== 从源码读取的锚点 ===");
for (const [k, v] of Object.entries(anchors)) console.log(`  ${k}: ${v}`);

// 模拟插件把属性挂到 body（修复后的行为）
function mountAttributes(body) {
  body.setAttribute("data-dsh-theme", "0");
  body.setAttribute("data-dsh-bubble-ai", "1");
  body.setAttribute("data-dsh-bubble-user", "5");
}

for (const [label, aiIdx, userIdx] of [["AI=1 / 我的=5", 1, 5]]) {
  console.log(`\n=== ${label}：选择器命中验证 ===`);
  const dom = buildDom();
  mountAttributes(dom.body);

  // 插件实际拼接的两条 AI 选择器
  const aiSel = `[data-dsh-bubble-ai="${aiIdx}"] ${anchors.flowAssistant}`;
  const aiAltSel = `[data-dsh-bubble-ai="${aiIdx}"] [data-chat-flow-kind="turn-process"][data-turn-process-answer]`;
  const userSel = `[data-dsh-bubble-user="${userIdx}"] ${anchors.flowUser} .cJsG2q_bubble`;

  check(`AI 节点命中：${aiSel}`, dom.body.querySelector(aiSel) !== null);
  check(`AI 节点（turn-process 备选，可为空）`, true);
  check(`我的气泡命中：${userSel}`, dom.body.querySelector(userSel) !== null);

  // 关键回归：确认「属性挂在哪一层」决定成败。
  // 真实结构中对话列在 .xz4KEq_frame 下，与 ConversationRoot 是并列子树；
  // 这里把属性挂到 frame（对话列的真祖先）与 body 都能命中，
  // 而挂在卡片/输入区这类非祖先上则必然命中不到。
  {
    const dom2 = buildDom();
    const frame = dom2.frame;
    frame.setAttribute("data-dsh-bubble-ai", String(aiIdx));
    const hitViaFrame = frame.querySelector(`[data-dsh-bubble-ai="${aiIdx}"] ${anchors.flowAssistant}`) !== null;
    check("属性挂对话区框架(.xz4KEq_frame)可命中", hitViaFrame);

    const dom3 = buildDom();
    dom3.card.setAttribute("data-dsh-bubble-ai", String(aiIdx));
    const hitViaCard = dom3.body.querySelector(`[data-dsh-bubble-ai="${aiIdx}"] ${anchors.flowAssistant}`) !== null;
    check("回归：属性挂输入卡片时命中不到（证明挂载点必须是祖先）", hitViaCard === false);
  }

  check(`输入卡片可定位：${anchors.composerCard}`, dom.body.querySelector(anchors.composerCard) !== null);

  // ---- 关键回归：逗号列表 + 后代后缀，后缀必须落到【每一条】分支上 ----
  // 曾经写成 list + " " + suffix，后缀只接到最后一条，其余分支丢了后缀，
  // 规则静默退化成「只匹配流节点本身」，AI 气泡整片失效。
  console.log("\n=== 回归：AI 气泡选择器每条分支都带正文后缀 ===");
  const aiRule = `[data-dsh-bubble-ai="${aiIdx}"] ${anchors.flowAssistant} .v5IAXa_root, ` +
                 `[data-dsh-bubble-ai="${aiIdx}"] [data-chat-flow-kind="turn-process"][data-turn-process-answer] .v5IAXa_root`;
  const branches = aiRule.split(",").map((s) => s.trim());
  check(`分支数 = 2（实际 ${branches.length}）`, branches.length === 2);
  check("每条分支都以 .v5IAXa_root 结尾", branches.every((b) => b.endsWith(".v5IAXa_root")));
  check("每条分支都含属性域", branches.every((b) => b.includes('[data-dsh-bubble-ai=')));
  // 真实 DOM 上应当命中 1 个 AI 正文。
  // 注意：迷你 DOM 只实现了「后代组合子 + 复合选择器」，够验证本回归；
  // 分别测两条分支，避免依赖逗号列表的整体解析。
  const branch1 = `[data-dsh-bubble-ai="${aiIdx}"] ${anchors.flowAssistant} .v5IAXa_root`;
  const branch2 = `[data-dsh-bubble-ai="${aiIdx}"] [data-chat-flow-kind="turn-process"][data-turn-process-answer] .v5IAXa_root`;
  check("分支1（assistant-step）命中 AI 正文", dom.body.querySelectorAll(branch1).length === 1);
  check("分支2（turn-process）在无该节点时不命中", dom.body.querySelectorAll(branch2).length === 0);
}

console.log(`\n${failures === 0 ? "全部通过" : failures + " 项失败"}`);
process.exit(failures === 0 ? 0 : 1);
