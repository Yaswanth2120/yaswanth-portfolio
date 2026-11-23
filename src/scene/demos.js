// Animated whiteboard demos: each project is shown working, not described.
// draw*(ctx, w, h, t) with t = seconds. Canvas is 1024 × 490.
import { content } from "@/data/content";
import { box, fitText, ink, line, mono, pad, paper, serif, sketchBox, sketchLine, text, wrap, PORCELAIN } from "./screens";

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (v) => v * v * (3 - 2 * v);
const typed = (str, t, a, b) => str.slice(0, Math.floor(str.length * seg(t, a, b)));
const lerp = (a, b, f) => a + (b - a) * f;
const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

function dot(ctx, x, y, r = 6, alpha = 1, filled = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (filled) {
    ctx.fillStyle = ink(alpha);
    ctx.fill();
  } else {
    ctx.strokeStyle = ink(alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function arrow(ctx, x1, y1, x2, y2, alpha = 0.7) {
  line(ctx, x1, y1, x2, y2, alpha, 2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.fillStyle = ink(alpha);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45));
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
}

/** A labelled block; `active` makes the border solid. */
function block(ctx, x, y, w, h, label, active) {
  box(ctx, x, y, w, h, active ? 1 : 0.35, active ? 0.04 : 0);
  text(ctx, label, x + 14, y + 26, mono(15), active ? 1 : 0.7);
}

function header(ctx, w, index, caption) {
  const items = content.projects.items;
  text(ctx, `PROJECT ${pad(index + 1)} / ${pad(items.length)} · ${caption}`, 40, 50, mono(17), 0.7);
  text(ctx, items[index].name, w - 40, 54, serif(34, 500), 1, "right");
  line(ctx, 40, 72, w - 40, 72, 0.15, 2);
}

// ---------- 01 Veya AI: voice → transcript → retrieval → local answer ----------
function veya(ctx, w, h, t) {
  const T = t % 10;
  header(ctx, w, 0, "LIVE · LOCAL VOICE ASSISTANT");

  // Microphone + voice activity detection
  const speaking = T < 3;
  block(ctx, 40, 110, 230, 230, "AUDIO · VAD", speaking);
  for (let i = 0; i < 22; i++) {
    const amp = speaking ? 0.2 + 0.8 * Math.abs(Math.sin(i * 0.7 + t * 7) * Math.sin(i * 1.3 + t * 3.1)) : 0.06;
    const bh = amp * 120;
    ctx.fillStyle = ink(speaking ? 1 : 0.35);
    ctx.fillRect(58 + i * 9, 225 - bh / 2, 5, bh);
  }
  text(ctx, speaking ? "● speech detected" : "○ silence", 56, 320, mono(14), speaking ? 1 : 0.35);

  // Whisper transcription
  arrow(ctx, 278, 225, 318, 225);
  if (T > 2.6 && T < 3.2) dot(ctx, lerp(278, 318, seg(T, 2.6, 3.2)), 225);
  const transcribing = T >= 3 && T < 5;
  block(ctx, 326, 110, 250, 230, "WHISPER", transcribing);
  ctx.font = mono(17);
  wrap(ctx, typed("“what's on my calendar tomorrow?”", T, 3.1, 4.6), 220).forEach((l, n) =>
    text(ctx, l, 342, 180 + n * 26, mono(17), 1)
  );

  // Retrieval
  arrow(ctx, 584, 225, 624, 225);
  if (T > 4.6 && T < 5.1) dot(ctx, lerp(584, 624, seg(T, 4.6, 5.1)), 225);
  const retrieving = T >= 5 && T < 6.2;
  block(ctx, 632, 110, 180, 230, "RAG · DOCS", retrieving);
  ["notes.md", "calendar.ics", "mail.txt"].forEach((name, k) => {
    const hit = k === 1 && T >= 5.3;
    box(ctx, 650, 150 + k * 58, 144, 42, hit ? 1 : 0.35, hit ? 0.1 : 0);
    text(ctx, name, 662, 177 + k * 58, mono(14), hit ? 1 : 0.5);
  });

  // Local LLM
  arrow(ctx, 820, 225, 856, 225);
  if (T > 6 && T < 6.4) dot(ctx, lerp(820, 856, seg(T, 6, 6.4)), 225);
  const thinking = T >= 6.2 && T < 6.8;
  block(ctx, 864, 110, 120, 230, "OLLAMA", T >= 6.2);
  if (thinking) for (let k = 0; k < 3; k++) dot(ctx, 900 + k * 20, 230, 5, Math.floor(t * 6 + k) % 3 === 0 ? 1 : 0.3);
  if (T >= 6.8) text(ctx, "llama3", 880, 230, mono(15), 0.7);

  // Answer
  box(ctx, 40, 370, 944, 86, 0.35, 0.04);
  text(ctx, "›", 58, 422, mono(24), 1);
  const answer = "Tomorrow: 10:00 stand-up and 14:00 design review — from calendar.ics";
  text(ctx, typed(answer, T, 6.8, 9.2), 86, 420, mono(18), 1);
  if (T < 6.8) text(ctx, "waiting for a question…", 86, 420, mono(18), 0.35);
}

// ---------- 02 API Gateway: auth, rate limits, routing, circuit breaker ----------
const CLIENTS = ["web", "mobile", "cli"];
const SERVICES = ["users", "orders", "search"];
function gateway(ctx, w, h, t) {
  header(ctx, w, 1, "LIVE · TRAFFIC");
  const rowY = (k) => 140 + k * 100;
  const GX = 400;
  const GW = 220;
  const breakerOpen = t % 12 > 8;

  CLIENTS.forEach((c, k) => {
    box(ctx, 40, rowY(k) - 28, 130, 56, 0.7);
    text(ctx, c, 105, rowY(k) + 6, mono(17), 1, "center");
    line(ctx, 170, rowY(k), GX, 240, 0.12, 2);
  });
  SERVICES.forEach((sv, k) => {
    const down = sv === "search" && breakerOpen;
    if (down) ctx.setLineDash([6, 6]);
    box(ctx, 834, rowY(k) - 28, 150, 56, down ? 0.5 : 0.7);
    ctx.setLineDash([]);
    text(ctx, sv, 909, rowY(k) + 6, mono(17), down ? 0.4 : 1, "center");
    if (down) text(ctx, "BREAKER OPEN", 909, rowY(k) + 46, mono(12), 1, "center");
    line(ctx, GX + GW, 240, 834, rowY(k), 0.12, 2);
  });

  box(ctx, GX, 110, GW, 260, 1, 0.04);
  text(ctx, "GATEWAY", GX + 16, 140, mono(16), 1);
  ["JWT verify", "rate 10 rps", "route", "breaker"].forEach((r, k) => {
    line(ctx, GX + 16, 168 + k * 50, GX + GW - 16, 168 + k * 50, 0.12, 1);
    text(ctx, r, GX + 16, 198 + k * 50, mono(15), 0.7);
    text(ctx, k === 3 && breakerOpen ? "open" : "ok", GX + GW - 16, 198 + k * 50, mono(15), 1, "right");
  });

  // Requests: deterministic stream of dots
  let blocked = 0;
  for (let j = 0; j < 12; j++) {
    const id = Math.floor(t / 0.28) - j;
    const age = t - id * 0.28;
    if (age < 0 || age > 2.4) continue;
    const c = id % 3;
    const sv = Math.floor(hash(id) * 3);
    const limited = id % 7 === 3;
    const unavailable = SERVICES[sv] === "search" && breakerOpen;
    let x;
    let y;
    if (age < 1) {
      const f = ease(age);
      x = lerp(170, GX, f);
      y = lerp(rowY(c), 240, f);
    } else if (limited || unavailable) {
      blocked++;
      const f = seg(age, 1, 2.4);
      text(ctx, limited ? "429" : "503", GX + GW / 2, 100 - f * 20, mono(16), 1 - f, "center");
      continue;
    } else if (age < 1.3) {
      x = lerp(GX, GX + GW, (age - 1) / 0.3);
      y = 240;
    } else {
      const f = ease(seg(age, 1.3, 2.3));
      x = lerp(GX + GW, 834, f);
      y = lerp(240, rowY(sv), f);
    }
    dot(ctx, x, y, 6, 1);
  }
  const rps = 34 + Math.round(Math.sin(t * 0.7) * 4);
  text(ctx, `${rps} req/s · ${blocked} rejected in flight · p95 18 ms`, 40, 460, mono(16), 0.7);
}

// ---------- 03 DocuIntel: chunk → embed → retrieve → grounded answer ----------
const POINTS = Array.from({ length: 26 }, (_, i) => ({ x: 404 + hash(i + 1) * 280, y: 150 + hash(i + 50) * 250 }));
const QUERY = { x: 560, y: 270 };
const NEAREST = POINTS.map((p, i) => [Math.hypot(p.x - QUERY.x, p.y - QUERY.y), i])
  .sort((a, b) => a[0] - b[0])
  .slice(0, 3)
  .map(([, i]) => i);
function docuintel(ctx, w, h, t) {
  const T = t % 11;
  header(ctx, w, 2, "LIVE · RETRIEVAL");

  // Document → chunks
  sketchBox(ctx, 40, 110, 130, 170, 7, 1, 2.5);
  for (let k = 0; k < 6; k++) line(ctx, 56, 150 + k * 20, 150 - (k % 3) * 18, 150 + k * 20, 0.35, 2);
  text(ctx, "contract.pdf", 40, 305, mono(14), 0.7);
  for (let k = 0; k < 5; k++) {
    const f = ease(seg(T, 0.3 + k * 0.25, 1.1 + k * 0.25));
    if (f <= 0) continue;
    box(ctx, lerp(60, 210, f), lerp(150 + k * 20, 120 + k * 52, f), 120, 36, 0.7 * f);
    text(ctx, `chunk ${k + 1}`, lerp(70, 222, f), lerp(173 + k * 20, 144 + k * 52, f), mono(13), 0.7 * f);
  }

  // Vector space
  arrow(ctx, 338, 260, 374, 260, seg(T, 1.5, 2));
  block(ctx, 380, 110, 330, 320, "VECTOR SPACE", T > 2 && T < 6);
  POINTS.forEach((p, i) => {
    const appear = seg(T, 1.8 + (i % 8) * 0.08, 2.4 + (i % 8) * 0.08);
    const near = NEAREST.includes(i) && T > 4.2;
    dot(ctx, p.x, p.y, near ? 8 : 5, appear * (near ? 1 : 0.45), near);
  });
  if (T > 3.2) {
    ctx.save();
    ctx.translate(QUERY.x, QUERY.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = ink(1);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
    text(ctx, "query", QUERY.x + 16, QUERY.y - 14, mono(14), 1);
    NEAREST.forEach((i, k) => {
      const f = seg(T, 3.6 + k * 0.2, 4.2 + k * 0.2);
      const p = POINTS[i];
      line(ctx, QUERY.x, QUERY.y, lerp(QUERY.x, p.x, f), lerp(QUERY.y, p.y, f), 1, 2);
    });
  }

  // Grounded answer with citations
  arrow(ctx, 716, 260, 748, 260, seg(T, 4.8, 5.2));
  block(ctx, 754, 110, 230, 320, "ANSWER", T > 5.2);
  ctx.font = mono(15);
  const answer = "Either party may exit with 60 days' notice [2]; renewal is automatic [1].";
  wrap(ctx, typed(answer, T, 5.4, 8.4), 196).forEach((l, n) => text(ctx, l, 770, 170 + n * 24, mono(15), 1));
  if (T > 8.6) {
    ["[1] p.3", "[2] p.7"].forEach((c, k) => {
      box(ctx, 770 + k * 100, 380, 88, 32, 1, 0.06);
      text(ctx, c, 814 + k * 100, 402, mono(14), 1, "center");
    });
  }
  text(ctx, "tenant: acme · isolated", 40, 460, mono(14), 0.5);
}

// ---------- 04 DeployGuard: compare releases → regression → risk ----------
const N = 60;
const baseline = (i) => 0.3 + 0.04 * Math.sin(i * 0.5) + (hash(i) - 0.5) * 0.04;
const candidate = (i) => baseline(i) + 0.02 + (i > 33 && i < 47 ? 0.3 * Math.sin(((i - 33) / 14) * Math.PI) : 0);
function deployguard(ctx, w, h, t) {
  const T = t % 10;
  header(ctx, w, 3, "LIVE · RELEASE COMPARISON");
  const X0 = 60;
  const X1 = 650;
  const Y0 = 420;
  const H = 300;
  text(ctx, "p95 latency", X0, 104, mono(14), 0.7);
  line(ctx, X0, Y0, X1, Y0, 0.7);
  line(ctx, X0, Y0, X0, Y0 - H, 0.7);
  for (let k = 1; k < 4; k++) line(ctx, X0, Y0 - (H * k) / 4, X1, Y0 - (H * k) / 4, 0.06, 1);

  const progress = seg(T, 0.2, 4);
  const count = Math.max(2, Math.floor(progress * N));
  const px = (i) => X0 + (i / (N - 1)) * (X1 - X0);
  const py = (v) => Y0 - v * H;

  // Regression window, once the candidate line reaches it
  if (count > 36) {
    const end = Math.min(count, 47);
    ctx.fillStyle = ink(0.07);
    ctx.fillRect(px(33), Y0 - H, px(end) - px(33), H);
    text(ctx, "+38% p95", px(40), Y0 - H + 22, mono(15), 1, "center");
  }
  const series = (fn, alpha, width, dash) => {
    ctx.setLineDash(dash);
    ctx.strokeStyle = ink(alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i < count; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(i), py(fn(i)));
    ctx.stroke();
    ctx.setLineDash([]);
  };
  series(baseline, 0.4, 2, [5, 6]);
  series(candidate, 1, 2.5, []);
  text(ctx, "- - v2.3 baseline", X1, 104, mono(13), 0.5, "right");
  text(ctx, "—— v2.4 candidate", X1 - 170, 104, mono(13), 1, "right");

  // Risk gauge
  block(ctx, 690, 90, 294, 340, "DEPLOYMENT RISK", T > 4);
  const cx = 837;
  const cy = 290;
  ctx.strokeStyle = ink(0.25);
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, 100, Math.PI, 0);
  ctx.stroke();
  const risk = 0.82 * ease(seg(T, 4, 6));
  ctx.strokeStyle = ink(1);
  ctx.beginPath();
  ctx.arc(cx, cy, 100, Math.PI, Math.PI + risk * Math.PI);
  ctx.stroke();
  const a = Math.PI + risk * Math.PI;
  line(ctx, cx, cy, cx + Math.cos(a) * 80, cy + Math.sin(a) * 80, 1, 3);
  dot(ctx, cx, cy, 7);
  text(ctx, String(Math.round(risk * 100)), cx, cy + 50, serif(44, 500), 1, "center");
  if (T > 6.2) {
    ctx.fillStyle = ink(1);
    ctx.fillRect(722, 370, 230, 40);
    ctx.font = mono(15);
    ctx.fillStyle = PORCELAIN;
    ctx.textAlign = "center";
    ctx.fillText("HOLD ROLLOUT", 837, 396);
  }
  text(ctx, "errors 2.1× · /checkout · 3 services", 40, 466, mono(14), seg(T, 6.4, 7));
}

const DEMOS = [veya, gateway, docuintel, deployguard];

function drawDemo(ctx, w, h, index, t) {
  paper(ctx, w, h, false);
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  (DEMOS[index] ?? DEMOS[0])(ctx, w, h, t);
}

/**
 * The whiteboard: demo `from`, with demo `to` wiping in from the left as
 * `progress` goes 0 → 1 (driven by scroll between two project stops).
 */
export function drawProjectBoard(ctx, w, h, from, to, progress, t) {
  drawDemo(ctx, w, h, from, t);
  if (progress <= 0 || to === from) return;
  const edge = w * progress;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, edge, h);
  ctx.clip();
  drawDemo(ctx, w, h, to, t);
  ctx.restore();
  if (progress < 1) line(ctx, edge, 0, edge, h, 1, 4);
}

// ---------- agent card shown over a desk when an agent is clicked ----------
const sans = (size, weight = 400) => `${weight} ${size}px "Manrope", ui-sans-serif, system-ui, sans-serif`;

/** Height (px, at canvas width w) the card needs: lay it out once on a scratch canvas. */
export function agentCardHeight(w, info) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = 1000;
  return drawAgentCard(canvas.getContext("2d"), w, 1000, info);
}

/**
 * info = { agent, project, feature } (indices). Draws the card and returns the
 * height its content used.
 */
export function drawAgentCard(ctx, w, h, { agent, project, feature }) {
  const proj = content.liveProjects[project];
  const item = proj.features[feature % proj.features.length];
  paper(ctx, w, h, false);
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);

  text(ctx, `AGENT ${pad(agent + 1)} · ${proj.name.toUpperCase()}`, 36, 56, mono(20), 0.7);
  text(ctx, "CLICK AGAIN ↻", w - 36, 56, mono(18), 0.5, "right");
  text(ctx, "WORKING ON", 36, 104, mono(17), 0.5);
  fitText(ctx, item.title, 36, 170, (s) => serif(s, 500), 72, w - 72, 1);
  ctx.font = sans(26);
  const lines = wrap(ctx, item.detail, w - 72);
  lines.forEach((l, n) => text(ctx, l, 36, 222 + n * 36, sans(26), 0.7));

  let y = 222 + lines.length * 36 + 14;
  line(ctx, 36, y, w - 36, y, 0.15, 2);
  y += 24;
  let x = 36;
  ctx.font = mono(19);
  const chips = [proj.status.toUpperCase(), ...proj.tech.slice(0, 5).map((t) => t.toUpperCase())];
  chips.forEach((label, n) => {
    const cw = ctx.measureText(label).width + 30;
    if (x + cw > w - 36) {
      x = 36;
      y += 56;
    }
    box(ctx, x, y, cw, 44, n === 0 ? 1 : 0.35, n === 0 ? 1 : 0);
    if (n === 0) {
      ctx.font = mono(19);
      ctx.fillStyle = PORCELAIN;
      ctx.textAlign = "left";
      ctx.fillText(label, x + 15, y + 29);
    } else {
      text(ctx, label, x + 15, y + 29, mono(19), 1);
    }
    ctx.font = mono(19);
    x += cw + 12;
  });
  return y + 44 + 32;
}

// ---------- live-project wall screens in the office (1024 × 490) ----------
function liveHeader(ctx, w, index) {
  const p = content.liveProjects[index];
  text(ctx, `NOW BUILDING · ${p.area.toUpperCase()}`, 40, 50, mono(17), 0.7);
  text(ctx, p.name, w - 40, 56, serif(40, 500), 1, "right");
  line(ctx, 40, 74, w - 40, 74, 0.15, 2);
  box(ctx, 40, 434, 200, 36, 1, 1);
  ctx.font = mono(16);
  ctx.fillStyle = PORCELAIN;
  ctx.textAlign = "left";
  ctx.fillText(p.status.toUpperCase(), 56, 458);
}

// AgentReplay: a recorded trace replayed call by call; one call misses.
const TRACE = [
  ["llm", "plan(task)"],
  ["tool", "search_docs"],
  ["llm", "draft_answer"],
  ["tool", "run_tests"],
  ["llm", "fix_patch"],
  ["tool", "open_pr"],
];
function agentReplay(ctx, w, h, t) {
  const T = t % 9;
  text(ctx, "RECORDED", 60, 112, mono(15), 0.7);
  text(ctx, "REPLAYED", 560, 112, mono(15), 0.7);
  TRACE.forEach(([kind, name], k) => {
    const y = 132 + k * 47;
    box(ctx, 60, y, 400, 36, 0.7);
    text(ctx, `${kind.padEnd(4)} ${name}`, 76, y + 24, mono(16), 1);
    const shown = T > 0.6 + k * 0.9;
    if (!shown) return;
    const miss = k === 4;
    box(ctx, 560, y, 400, 36, miss ? 1 : 0.7, miss ? 0.1 : 0);
    text(ctx, `${kind.padEnd(4)} ${miss ? "fix_patch*" : name}`, 576, y + 24, mono(16), 1);
    text(ctx, miss ? "MISS" : "✓", 944, y + 24, mono(16), 1, "right");
    arrow(ctx, 468, y + 18, 552, y + 18, 0.35);
  });
  if (T > 5.4) text(ctx, "behaviour changed → CI fails", 560, 425, mono(16), 1);
}

// InferencePilot: configs benchmarked one by one; best *tested* one wins.
const CONFIGS = [
  ["fp16 · bs 32", 0.55],
  ["fp16 · prefix", 0.68],
  ["awq · bs 64", 0.82],
  ["fp8 · bs 64", 0.9],
  ["fp8 · prefix", 0.74],
];
function inferencePilot(ctx, w, h, t) {
  const T = t % 9;
  text(ctx, "TOKENS / S  (A100 · QWEN3-8B)", 60, 112, mono(15), 0.7);
  CONFIGS.forEach(([name, v], k) => {
    const y = 136 + k * 54;
    const grow = ease(seg(T, 0.4 + k * 0.9, 1.2 + k * 0.9));
    text(ctx, name, 60, y + 26, mono(16), 1);
    box(ctx, 240, y + 4, 560, 32, 0.25);
    const best = k === 2 && T > 6;
    ctx.fillStyle = ink(best ? 1 : 0.35);
    ctx.fillRect(240, y + 4, 560 * v * grow, 32);
    if (k === 3 && T > 4.4) text(ctx, "gsm8k ✗ quality gate", 820, y + 26, mono(14), 1);
    if (best) text(ctx, "← best tested", 820, y + 26, mono(15), 1);
  });
}

// KernelForge: three kernels measured against frozen targets.
const KERNELS = [
  ["fused softmax", 0.8, 0.86],
  ["layernorm", 0.8, 0.79],
  ["causal attn fwd", 0.5, 0.57],
];
function kernelForge(ctx, w, h, t) {
  const T = t % 9;
  text(ctx, "% OF TARGET BANDWIDTH · FROZEN CRITERIA", 60, 112, mono(15), 0.7);
  KERNELS.forEach(([name, target, got], k) => {
    const y = 150 + k * 90;
    text(ctx, name, 60, y + 30, mono(17), 1);
    box(ctx, 280, y + 8, 600, 34, 0.25);
    const run = ease(seg(T, 0.5 + k * 1.6, 2 + k * 1.6));
    ctx.fillStyle = ink(0.8);
    ctx.fillRect(280, y + 8, 600 * got * run, 34);
    const tx = 280 + 600 * target;
    line(ctx, tx, y, tx, y + 50, 1, 2);
    text(ctx, `target ${Math.round(target * 100)}%`, tx, y - 6, mono(13), 0.7, "center");
    if (run >= 1) text(ctx, got >= target ? "pass" : "retune", 900, y + 31, mono(16), 1);
  });
}

const LIVE = [agentReplay, inferencePilot, kernelForge];

function drawLive(ctx, w, h, index, t) {
  paper(ctx, w, h, false);
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  liveHeader(ctx, w, index);
  LIVE[index](ctx, w, h, t);
}

// The three projects take turns on the three wall screens, so each one gets
// time on the centre screen. They rotate one screen every ROTATE seconds.
const ROTATE = 10;
const WIPE = 1.2;
/** Which live project a zone's screen shows at time t (seconds). */
export const liveProjectAt = (zone, t) => (zone + Math.floor(t / ROTATE)) % LIVE.length;

/** A zone's wall screen at time t: the current project, wiping in over the previous one. */
export function drawLiveScreen(ctx, w, h, zone, t) {
  const turn = Math.floor(t / ROTATE);
  const phase = t - turn * ROTATE;
  const to = liveProjectAt(zone, t);
  const progress = turn > 0 ? ease(seg(phase, 0, WIPE)) : 1;
  if (progress >= 1) {
    drawLive(ctx, w, h, to, phase);
    return;
  }
  drawLive(ctx, w, h, (to + LIVE.length - 1) % LIVE.length, ROTATE);
  const edge = w * progress;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, edge, h);
  ctx.clip();
  drawLive(ctx, w, h, to, phase);
  ctx.restore();
  line(ctx, edge, 0, edge, h, 1, 4);
}

// ---------- the final fan: where AI is heading (512 × 314 each) ----------
function futureFrame(ctx, w, h, label) {
  paper(ctx, w, h, false);
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  text(ctx, "NEXT", 22, 34, mono(14), 0.5);
  text(ctx, label, w - 22, 36, serif(26, 500), 1, "right");
  line(ctx, 22, 50, w - 22, 50, 0.15, 2);
}

// Agents that notice their own mistakes and recover.
function selfHealing(ctx, w, h, t) {
  futureFrame(ctx, w, h, "Self-healing agents");
  const T = t % 8;
  const nodes = [["PLAN", 150, 110], ["ACT", 300, 110], ["OBSERVE", 300, 230], ["FIX", 150, 230]];
  const failed = T > 2.4 && T < 5.6;
  nodes.forEach(([name, x, y], k) => {
    const hot = Math.floor(T * 1.25) % 4 === k;
    box(ctx, x - 52, y - 22, 104, 44, hot ? 1 : 0.4, hot ? 1 : 0);
    ctx.font = mono(15);
    ctx.fillStyle = hot ? PORCELAIN : ink(k === 3 && !failed ? 0.4 : 1);
    ctx.textAlign = "center";
    ctx.fillText(name, x, y + 5);
  });
  arrow(ctx, 202, 110, 246, 110);
  arrow(ctx, 300, 132, 300, 206);
  arrow(ctx, 248, 230, 204, 230);
  arrow(ctx, 150, 206, 150, 134);
  text(ctx, failed ? "test failed → retry" : "all checks ✓", 380, 175, mono(15), 1);
  text(ctx, `attempt ${failed ? 2 : 1}`, 380, 200, mono(14), 0.5);
  text(ctx, "no human in the loop", 22, 292, mono(13), 0.5);
}

// Capable models running privately on a phone.
function onDevice(ctx, w, h, t) {
  futureFrame(ctx, w, h, "AI on every device");
  const T = t % 7;
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(40, 66, 130, 226, 18);
  ctx.stroke();
  line(ctx, 90, 280, 120, 280, 0.6, 3);
  box(ctx, 88, 84, 72, 26, 1, 0.08);
  text(ctx, "plan my", 96, 102, mono(12), 1);
  ctx.font = mono(12);
  wrap(ctx, typed("Leave at 8:10; the 8:25 train is quieter.", T, 0.8, 3.6), 100).forEach((l, n) => text(ctx, l, 52, 136 + n * 17, mono(12), 1));
  const stats = [["latency", "38 ms", 0.25], ["cloud calls", "0", 0.02], ["data shared", "none", 0.02]];
  stats.forEach(([k, v, f], n) => {
    const y = 104 + n * 62;
    text(ctx, k, 210, y, mono(14), 0.6);
    text(ctx, v, w - 30, y, mono(16), 1, "right");
    box(ctx, 210, y + 12, w - 240, 12, 0.25);
    ctx.fillStyle = ink(1);
    ctx.fillRect(210, y + 12, (w - 240) * Math.max(0.02, f) * ease(seg(T, 0.4, 1.4)), 12);
  });
}

// One model that sees, hears and answers.
function multimodal(ctx, w, h, t) {
  futureFrame(ctx, w, h, "Multimodal");
  const T = t % 8;
  sketchBox(ctx, 26, 70, 150, 100, 3, 1, 2.5);
  sketchLine(ctx, 36, 158, 86, 104, 11, 1, 2.5);
  sketchLine(ctx, 86, 104, 116, 136, 13, 1, 2.5);
  sketchLine(ctx, 104, 124, 136, 96, 17, 1, 2.5);
  sketchLine(ctx, 136, 96, 166, 158, 19, 1, 2.5);
  ctx.beginPath();
  ctx.arc(146, 86, 9, 0, Math.PI * 2);
  ctx.strokeStyle = ink(1);
  ctx.stroke();
  arrow(ctx, 186, 120, 222, 120);
  text(ctx, typed("“Sunrise over two peaks;", T, 0.5, 2.2), 232, 112, mono(15), 1);
  text(ctx, typed("best light in 20 min.”", T, 2.2, 3.4), 232, 134, mono(15), 1);
  for (let i = 0; i < 26; i++) {
    const a = 0.2 + Math.abs(Math.sin(i * 0.9 + t * 6)) * (T > 3.6 && T < 5.6 ? 1 : 0.15);
    ctx.fillStyle = ink(0.9);
    ctx.fillRect(30 + i * 5.6, 236 - a * 26, 3, a * 52);
  }
  arrow(ctx, 186, 236, 222, 236);
  text(ctx, typed("“dim the lights, play rain”", T, 4, 5.8), 232, 242, mono(15), 1);
  if (T > 6) text(ctx, "✓ done", 232, 270, mono(14), 0.6);
}

// Models proposing, testing and ranking candidates in the lab.
function forScience(ctx, w, h, t) {
  futureFrame(ctx, w, h, "AI for science");
  const T = t % 9;
  const cx = 130;
  const cy = 182;
  const atoms = Array.from({ length: 6 }, (_, k) => {
    const a = (k / 6) * Math.PI * 2 + t * 0.4;
    return [cx + Math.cos(a) * 62, cy + Math.sin(a) * 62 * 0.75];
  });
  atoms.forEach(([x, y], k) => {
    const [nx, ny] = atoms[(k + 1) % 6];
    line(ctx, x, y, nx, ny, 0.8, 2.5);
    if (k % 2 === 0) line(ctx, x, y, cx, cy, 0.3, 2);
  });
  atoms.forEach(([x, y], k) => dot(ctx, x, y, k % 3 === 0 ? 10 : 7, 1, k % 3 !== 1));
  text(ctx, "candidate #417", 60, 288, mono(13), 0.6);
  const bars = [0.42, 0.58, 0.36, 0.91, 0.5];
  bars.forEach((v, k) => {
    const y = 80 + k * 40;
    const grow = ease(seg(T, 0.5 + k * 0.5, 1.4 + k * 0.5));
    box(ctx, 270, y, 210, 22, 0.25);
    const best = k === 3 && T > 4.4;
    ctx.fillStyle = ink(best ? 1 : 0.35);
    ctx.fillRect(270, y, 210 * v * grow, 22);
    if (best) text(ctx, "← synthesise", 488, y + 17, mono(12), 1, "right");
  });
}

// Many small agents coordinating on one task.
function agentTeams(ctx, w, h, t) {
  futureFrame(ctx, w, h, "Agent teams");
  const T = t % 8;
  const pts = [[110, 120], [200, 90], [290, 120], [110, 230], [200, 260], [290, 230]];
  pts.forEach(([x, y], k) => {
    pts.forEach(([x2, y2], j) => {
      if (j > k && (j - k === 1 || j - k === 3)) line(ctx, x, y, x2, y2, 0.15, 2);
    });
  });
  for (let m = 0; m < 4; m++) {
    const f = (T * 0.6 + m * 0.25) % 1;
    const a = pts[m % 6];
    const b = pts[(m + 3) % 6];
    dot(ctx, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 5);
  }
  pts.forEach(([x, y], k) => {
    dot(ctx, x, y, 18, 1, false);
    text(ctx, String.fromCharCode(65 + k), x, y + 6, mono(16), 1, "center");
  });
  const tasks = ["research", "write code", "review", "ship"];
  tasks.forEach((task, k) => {
    const y = 100 + k * 44;
    const done = T > 1.5 + k * 1.4;
    box(ctx, 360, y - 16, 20, 20, 1, done ? 1 : 0);
    text(ctx, task, 392, y, mono(15), done ? 1 : 0.4);
  });
}

export const FUTURE_SCREENS = [selfHealing, onDevice, multimodal, forScience, agentTeams];
