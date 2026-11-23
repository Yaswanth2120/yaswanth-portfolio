// The drawing machine: a wall-mounted pen plotter that sketches each project's
// system diagram live, stroke by stroke, then brings it to life with data
// flowing along the arrows it drew. Canvas is 1024 × 490 (the board).
import { content } from "@/data/content";
import { ink, line, mono, pad, paper, serif, text } from "./screens";

export const BOARD_W = 1024;
export const BOARD_H = 490;
/** Seconds the finished sheet takes to roll up before the next drawing starts. */
export const FEED = 0.9;
const DRAW_SPEED = 980; // px/s with the pen down
const TRAVEL_SPEED = 2400; // px/s pen up, between shapes
const WRITE_SPEED = 560; // px/s of text written
export const PARK = { x: BOARD_W / 2, y: 30 };

// ---------- diagram primitives → pen items ----------
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];

function boxItem(x, y, w, h, label, size = 16) {
  return [
    { kind: "stroke", pts: rect(x, y, w, h) },
    { kind: "text", x: x + w / 2, y: y + h / 2 + 6, str: label, size, align: "center" },
  ];
}

function arrowItem(x1, y1, x2, y2, flow = true, via = null) {
  const pts = via ? [[x1, y1], ...via, [x2, y2]] : [[x1, y1], [x2, y2]];
  const [px, py] = pts[pts.length - 2];
  const a = Math.atan2(y2 - py, x2 - px);
  const head = [
    [x2 - 11 * Math.cos(a - 0.45), y2 - 11 * Math.sin(a - 0.45)],
    [x2, y2],
    [x2 - 11 * Math.cos(a + 0.45), y2 - 11 * Math.sin(a + 0.45)],
  ];
  return [{ kind: "stroke", pts, flow }, { kind: "stroke", pts: head }];
}

const textItem = (x, y, str, size = 15, align = "left", font = "mono") => ({ kind: "text", x, y, str, size, align, font });

// ---------- the four diagrams ----------
const DIAGRAMS = [
  // Feather AI: quantize → benchmark → quality gate → recommend only what was tested
  () => [
    ...boxItem(40, 120, 150, 60, "F16 source"),
    textItem(115, 204, "1590 MiB", 13, "center"),
    ...arrowItem(190, 150, 250, 150),
    ...boxItem(250, 120, 150, 60, "quantize"),
    ...arrowItem(400, 140, 470, 100),
    ...arrowItem(400, 160, 470, 210),
    ...boxItem(470, 72, 150, 52, "Q8_0"),
    ...boxItem(470, 186, 150, 52, "Q4_K_M"),
    textItem(545, 146, "×1.47 · 899 MiB", 13, "center"),
    textItem(545, 260, "×1.77 · 721 MiB", 13, "center"),
    ...arrowItem(620, 98, 690, 140),
    ...arrowItem(620, 212, 690, 168),
    ...boxItem(690, 124, 140, 60, "benchmark"),
    ...arrowItem(830, 154, 870, 154),
    ...boxItem(870, 124, 120, 60, "quality", 15),
    textItem(930, 208, "±10 pp margin", 12, "center"),
    ...arrowItem(930, 222, 780, 340, true, [[930, 360]]),
    ...boxItem(250, 318, 530, 56, "recommend only what was tested"),
    textItem(515, 410, "Fig. — quantized variants, measured before they're trusted", 21, "center", "serif"),
  ],
  // Intelligent API Gateway: clients → gateway checks → services
  () => [
    ...boxItem(40, 96, 130, 46, "web"),
    ...boxItem(40, 176, 130, 46, "mobile"),
    ...boxItem(40, 256, 130, 46, "cli"),
    ...arrowItem(170, 119, 360, 170),
    ...arrowItem(170, 199, 360, 199),
    ...arrowItem(170, 279, 360, 228),
    ...boxItem(360, 104, 250, 190, "gateway", 18),
    textItem(380, 150, "· verify JWT", 14),
    textItem(380, 250, "· rate limit (Redis)", 14),
    textItem(380, 276, "· circuit breaker", 14),
    ...arrowItem(610, 170, 800, 119),
    ...arrowItem(610, 199, 800, 199),
    ...arrowItem(610, 228, 800, 279),
    ...boxItem(800, 96, 150, 46, "users"),
    ...boxItem(800, 176, 150, 46, "orders"),
    ...boxItem(800, 256, 150, 46, "search"),
    textItem(485, 340, "429 over the limit · 503 when a service trips its breaker", 14, "center"),
    textItem(512, 410, "Fig. — every request checked, limited and routed", 21, "center", "serif"),
  ],
  // DocuIntel AI: documents → chunks → embeddings → retrieve → grounded answer
  () => [
    ...boxItem(40, 110, 130, 70, "contract.pdf", 14),
    ...arrowItem(170, 145, 220, 145),
    ...boxItem(220, 118, 120, 54, "chunk"),
    ...arrowItem(340, 145, 390, 145),
    ...boxItem(390, 118, 120, 54, "embed"),
    ...arrowItem(510, 145, 560, 145),
    ...boxItem(560, 104, 150, 82, "vector store", 15),
    ...boxItem(560, 270, 150, 50, "query", 15),
    ...arrowItem(635, 270, 635, 186),
    ...arrowItem(710, 145, 760, 145),
    ...boxItem(760, 118, 100, 54, "LLM"),
    ...arrowItem(860, 145, 890, 145),
    ...boxItem(890, 104, 100, 82, "answer", 15),
    textItem(940, 212, "[1] [2]", 14, "center"),
    textItem(200, 300, "tenant A ┃ tenant B — isolated", 14),
    textItem(512, 410, "Fig. — answers grounded in your documents, with citations", 21, "center", "serif"),
  ],
  // DeployGuard AI: compare releases → detect regression → risk → decision
  () => [
    ...boxItem(40, 96, 160, 50, "release v2.3"),
    ...boxItem(40, 236, 160, 50, "release v2.4"),
    ...arrowItem(200, 121, 290, 170),
    ...arrowItem(200, 261, 290, 200),
    ...boxItem(290, 156, 140, 60, "compare"),
    ...arrowItem(430, 186, 490, 186),
    ...boxItem(490, 150, 200, 72, "regression check", 15),
    ...arrowItem(690, 186, 750, 186),
    ...boxItem(750, 156, 120, 60, "risk 82"),
    ...arrowItem(810, 216, 810, 286),
    ...boxItem(735, 286, 150, 52, "hold rollout", 15),
    // a hand-drawn latency trace with the regression spike
    { kind: "stroke", pts: Array.from({ length: 41 }, (_, i) => [300 + i * 9, 330 - Math.sin(i * 0.6) * 6 - (i > 20 && i < 32 ? Math.sin(((i - 20) / 12) * Math.PI) * 52 : 0)]) },
    textItem(300, 362, "p95 latency · v2.4", 13),
    textItem(512, 420, "Fig. — catching the regression before users do", 21, "center", "serif"),
  ],
];

// ---------- compile each diagram into a timed pen path ----------
const fontFor = (it) => (it.font === "serif" ? `italic 400 ${it.size}px "Cormorant Garamond", Georgia, serif` : mono(it.size));
let measurer = null;
function measureText(it) {
  measurer ??= document.createElement("canvas").getContext("2d");
  measurer.font = fontFor(it);
  return measurer.measureText(it.str).width;
}
const polyLen = (pts) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

function compile(items) {
  let t = 0;
  let pen = { ...PARK };
  const timed = items.map((item) => {
    let start;
    let end;
    let len;
    if (item.kind === "stroke") {
      start = { x: item.pts[0][0], y: item.pts[0][1] };
      len = polyLen(item.pts);
      end = { x: item.pts[item.pts.length - 1][0], y: item.pts[item.pts.length - 1][1] };
    } else {
      const width = measureText(item);
      const x0 = item.align === "center" ? item.x - width / 2 : item.x;
      start = { x: x0, y: item.y };
      end = { x: x0 + width, y: item.y };
      len = width;
    }
    const travel = Math.hypot(start.x - pen.x, start.y - pen.y) / TRAVEL_SPEED;
    const draw = len / (item.kind === "text" ? WRITE_SPEED : DRAW_SPEED);
    const out = { ...item, t0: t + travel, t1: t + travel + draw, travel, start, end, from: pen };
    t = out.t1;
    pen = end;
    return out;
  });
  return { items: timed, duration: t + 0.4 };
}

const compiled = [];
const program = (index) => (compiled[index] ??= compile(DIAGRAMS[index]()));
/** Seconds the machine takes to finish drawing project `index`. */
export const drawDuration = (index) => program(index).duration;

function pointAlong(pts, f) {
  const total = polyLen(pts);
  let remaining = total * f;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (remaining <= seg || i === pts.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, remaining / seg);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
    }
    remaining -= seg;
  }
  return pts[pts.length - 1];
}

/** Where the pen is (canvas px) `elapsed` seconds into drawing project `index`. */
export function penAt(index, elapsed) {
  const { items } = program(index);
  for (const it of items) {
    if (elapsed < it.t0) {
      // travelling (pen up) toward this item
      const f = it.travel > 0 ? Math.max(0, 1 - (it.t0 - elapsed) / it.travel) : 1;
      return { x: it.from.x + (it.start.x - it.from.x) * f, y: it.from.y + (it.start.y - it.from.y) * f, down: false };
    }
    if (elapsed < it.t1) {
      const f = (elapsed - it.t0) / (it.t1 - it.t0);
      if (it.kind === "stroke") {
        const [x, y] = pointAlong(it.pts, f);
        return { x, y, down: true };
      }
      return { x: it.start.x + (it.end.x - it.start.x) * f, y: it.start.y - 6, down: true };
    }
  }
  return { ...PARK, down: false }; // done: back to rest
}

// ---------- drawing ----------
function strokeTo(ctx, pts, f) {
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (f >= 1) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  } else {
    const total = polyLen(pts);
    let remaining = total * f;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && remaining > 0; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const k = Math.min(1, remaining / seg);
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k);
      remaining -= seg;
    }
  }
  ctx.stroke();
}

function writeText(ctx, it, f) {
  const font = fontFor(it);
  ctx.save();
  if (f < 1) {
    ctx.beginPath();
    ctx.rect(it.start.x - 2, it.y - it.size - 6, (it.end.x - it.start.x) * f + 4, it.size + 14);
    ctx.clip();
  }
  ctx.font = font;
  ctx.fillStyle = ink(it.font === "serif" ? 0.8 : 1);
  ctx.textAlign = it.align === "center" ? "center" : "left";
  ctx.fillText(it.str, it.x, it.y);
  ctx.restore();
}

function header(ctx, w, index) {
  const items = content.projects.items;
  text(ctx, `PROJECT ${pad(index + 1)} / ${pad(items.length)}`, 40, 46, mono(15), 0.55);
  text(ctx, items[index].name, w - 40, 50, serif(32, 500), 1, "right");
  line(ctx, 40, 66, w - 40, 66, 0.12, 1.5);
}

/** The sheet for project `index`, `elapsed` seconds after the machine started on it. */
function drawSheet(ctx, w, h, index, elapsed) {
  paper(ctx, w, h, false);
  header(ctx, w, index);
  const { items, duration } = program(index);
  for (const it of items) {
    if (elapsed <= it.t0) break;
    const f = Math.min(1, (elapsed - it.t0) / (it.t1 - it.t0));
    if (it.kind === "stroke") strokeTo(ctx, it.pts, f);
    else writeText(ctx, it, f);
  }
  // Finished: data flows along every arrow it drew.
  if (elapsed > duration) {
    const live = elapsed - duration;
    items.forEach((it, n) => {
      if (!it.flow) return;
      for (let k = 0; k < 2; k++) {
        const f = (live * 0.55 + n * 0.13 + k * 0.5) % 1;
        const [x, y] = pointAlong(it.pts, f);
        ctx.fillStyle = ink(1);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

/**
 * The board: during a change, the previous (finished) sheet rolls up and away;
 * then the machine draws the current project. `elapsed` counts from the change.
 */
export function drawPlotterBoard(ctx, w, h, current, previous, elapsed) {
  if (previous >= 0 && elapsed < FEED) {
    const f = elapsed / FEED;
    const lift = h * f * f * (3 - 2 * f);
    paper(ctx, w, h, false);
    ctx.save();
    ctx.translate(0, -lift);
    drawSheet(ctx, w, h, previous, 999);
    ctx.restore();
    // the edge of the fresh sheet coming in
    line(ctx, 0, h - lift, w, h - lift, 0.35, 2);
  } else {
    drawSheet(ctx, w, h, current, previous >= 0 ? elapsed - FEED : elapsed);
  }
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
}

/** Pen position for the 3D gondola at the same moment as drawPlotterBoard. */
export function plotterPen(current, previous, elapsed) {
  if (previous >= 0 && elapsed < FEED) return { ...PARK, down: false };
  return penAt(current, previous >= 0 ? elapsed - FEED : elapsed);
}

