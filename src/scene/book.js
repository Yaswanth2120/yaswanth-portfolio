// Pages of the experience book (each 512 × 672 px, matching a 1.6 × 2.1 page).
//
// Reading order: 0 cover · 1 inside cover · 2 title · then for each job k:
// 3 + 2k chapter page (left: numeral, years, tools), 4 + 2k figure page
// (right: the work, animated). The text about each job lives in the page panel.
// Leaf i shows page 2i on its front and page 2i + 1 on its back.
import { content } from "@/data/content";
import { OXBLOOD, PORCELAIN, box, ink, line, mono, serif, sketchBox, text } from "./screens";

export const PAGE_W = 512;
export const PAGE_H = 672;

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];
const jobs = () => content.experience.items;
const years = (period) => period.replace(/[A-Za-z]+\s/g, "").replace(/\s+/g, " ").trim(); // "Jul 2022 — Nov 2023" → "2022 — 2023"

function paperPage(ctx, w, h) {
  ctx.fillStyle = PORCELAIN;
  ctx.fillRect(0, 0, w, h);
  // a faint gutter shadow line near the spine side is drawn by the caller
}

function folio(ctx, w, h, n) {
  text(ctx, String(n), w / 2, h - 34, mono(14), 0.45, "center");
}

// ---------- front matter ----------
function cover(ctx, w, h) {
  ctx.fillStyle = OXBLOOD;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PORCELAIN;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, w - 52, h - 52);
  ctx.strokeRect(34, 34, w - 68, h - 68);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PORCELAIN;
  ctx.textAlign = "center";
  ctx.font = `italic 400 88px "Cormorant Garamond", Georgia, serif`;
  ctx.fillText("Experience", w / 2, 300);
  ctx.font = mono(16);
  ctx.globalAlpha = 0.75;
  ctx.fillText(`IN ${jobs().length === 3 ? "THREE" : jobs().length} CHAPTERS`, w / 2, 352);
  ctx.fillRect(w / 2 - 30, 392, 60, 2);
  ctx.font = mono(16);
  ctx.fillText("Y · S · V", w / 2, h - 90);
  ctx.globalAlpha = 1;
}

function insideCover(ctx, w, h) {
  paperPage(ctx, w, h);
  // Marbled-endpaper feel: fine diagonal hatching.
  for (let x = -h; x < w; x += 14) line(ctx, x, h, x + h, 0, 0.06, 1);
  ctx.fillStyle = PORCELAIN;
  ctx.fillRect(w / 2 - 110, h / 2 - 70, 220, 140);
  box(ctx, w / 2 - 110, h / 2 - 70, 220, 140, 0.6);
  text(ctx, "EX LIBRIS", w / 2, h / 2 - 22, mono(15), 0.6, "center");
  text(ctx, "Y. S. V.", w / 2, h / 2 + 34, serif(40, 500), 1, "center");
}

function titlePage(ctx, w, h) {
  paperPage(ctx, w, h);
  text(ctx, "Experience", w / 2, 250, serif(78, 400), 1, "center");
  line(ctx, w / 2 - 40, 290, w / 2 + 40, 290, 0.6, 2);
  ctx.font = `italic 400 32px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = ink(0.8);
  ctx.textAlign = "center";
  ctx.fillText(`in ${jobs().length === 3 ? "three" : jobs().length} chapters`, w / 2, 340);
  const first = years(jobs()[0].period).split(" ")[0];
  text(ctx, `${first} — PRESENT`, w / 2, 410, mono(17), 0.6, "center");
}

// ---------- helpers for the animated figures ----------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (v) => v * v * (3 - 2 * v);
const lerp = (a, b, f) => a + (b - a) * f;

function dot(ctx, x, y, r = 5, alpha = 1) {
  ctx.fillStyle = ink(alpha);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function caption(ctx, w, h, label) {
  ctx.font = `italic 400 24px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = ink(0.75);
  ctx.textAlign = "center";
  ctx.fillText(label, w / 2, h - 74);
}

function stickFigure(ctx, x, y, stride, alpha = 0.85) {
  ctx.strokeStyle = ink(alpha);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, x, y + 11, x, y + 52, alpha, 2.5);
  line(ctx, x, y + 52, x - 10 * stride, y + 80, alpha, 2.5);
  line(ctx, x, y + 52, x + 10 * stride, y + 80, alpha, 2.5);
  line(ctx, x - 14, y + 28, x + 14, y + 28, alpha, 2.5);
}

function pipeline(ctx, x, y, w, steps, active) {
  const gap = (w - 24) / (steps.length - 1);
  steps.forEach((step, n) => {
    const cx = x + 12 + n * gap;
    if (n < steps.length - 1) line(ctx, cx + 11, y, cx + gap - 11, y, n < active - 1 ? 1 : 0.3, 2);
    ctx.strokeStyle = ink(1);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, y, 9, 0, Math.PI * 2);
    if (n < active) {
      ctx.fillStyle = ink(1);
      ctx.fill();
    }
    ctx.stroke();
    text(ctx, step, cx, y + 30, mono(13), n < active ? 1 : 0.4, "center");
  });
}

/** A labelled before/after bar: `after` grows in over time to show an improvement. */
function improvement(ctx, x, y, w, label, after, t, note) {
  text(ctx, label, x, y, mono(14), 0.6);
  text(ctx, "before", x, y + 30, mono(13), 0.5);
  box(ctx, x + 70, y + 18, w - 70, 16, 0.25);
  ctx.fillStyle = ink(0.3);
  ctx.fillRect(x + 70, y + 18, w - 70, 16);
  text(ctx, "after", x, y + 58, mono(13), 1);
  box(ctx, x + 70, y + 46, w - 70, 16, 0.25);
  ctx.fillStyle = ink(1);
  ctx.fillRect(x + 70, y + 46, (w - 70) * after * ease(t), 16);
  if (t >= 1) text(ctx, note, x + 70 + (w - 70) * after + 10, y + 59, mono(14), 1);
}

// ---------- the figures: each job, shown working (right-hand pages) ----------

// Chapter I · ITC: services, an event log, a delivery pipeline, faster queries.
function figServices(ctx, w, h, t) {
  const T = t % 8;
  text(ctx, "FIG. 1", 56, 84, mono(15), 0.5);
  const gx = w / 2;
  sketchBox(ctx, gx - 70, 104, 140, 40, 3, 1, 2.5);
  text(ctx, "gateway", gx, 130, mono(15), 1, "center");
  const svcs = ["orders", "billing", "stock"];
  const sx = (k) => 56 + k * 140;
  svcs.forEach((n, k) => {
    line(ctx, gx, 144, sx(k) + 60, 186, 0.25, 2);
    sketchBox(ctx, sx(k), 186, 120, 40, k * 7 + 5, 1, 2.5);
    text(ctx, n, sx(k) + 60, 212, mono(15), 1, "center");
    line(ctx, sx(k) + 60, 226, sx(k) + 60, 272, 0.25, 2);
  });
  // the event log
  sketchBox(ctx, 56, 272, w - 112, 40, 31, 1, 2.5);
  const cells = 12;
  const cw = (w - 112) / cells;
  const filled = Math.floor(t * 1.6) % (cells + 1);
  for (let c = 0; c < cells; c++) {
    if (c < filled) {
      ctx.fillStyle = ink(c === filled - 1 ? 0.9 : 0.18);
      ctx.fillRect(56 + c * cw + 3, 276, cw - 6, 32);
    }
  }
  text(ctx, "kafka · rabbitmq", w / 2, 334, mono(13), 0.55, "center");
  // requests: gateway → service → log
  for (let j = 0; j < 6; j++) {
    const id = Math.floor(t / 0.45) - j;
    const age = t - id * 0.45;
    if (age < 0 || age > 1.3) continue;
    const k = ((id % 3) + 3) % 3;
    if (age < 0.65) {
      const f = ease(age / 0.65);
      dot(ctx, lerp(gx, sx(k) + 60, f), lerp(144, 186, f));
    } else {
      const f = ease((age - 0.65) / 0.65);
      dot(ctx, sx(k) + 60, lerp(226, 272, f));
    }
  }
  // delivery pipeline
  text(ctx, "DELIVERY", 56, 380, mono(13), 0.5);
  pipeline(ctx, 56, 410, w - 112, ["build", "test", "docker", "deploy"], Math.floor(T / 1.1) % 6);
  improvement(ctx, 56, 478, w - 112, "QUERY P95", 0.7, seg(T, 1, 3), "−30%");
  caption(ctx, w, h, "Fig. 1 — Orders flowing as events.");
}

// Chapter II · Auburn: real-time detection, edge to cloud, lower latency.
function figDetection(ctx, w, h, t) {
  const T = t % 9;
  text(ctx, "FIG. 2", 56, 84, mono(15), 0.5);
  const fx = 56;
  const fy = 104;
  const fw = w - 112;
  const fh = 230;
  sketchBox(ctx, fx, fy, fw, fh, 5, 1, 2.5);
  text(ctx, "● 30 FPS", fx + fw - 12, fy + 24, mono(12), Math.floor(t * 2) % 2 ? 1 : 0.4, "right");
  line(ctx, fx + 10, fy + fh - 34, fx + fw - 10, fy + fh - 34, 0.2, 1.5); // the ground
  // a person walking right, a car driving left
  const px = fx + 30 + ((t * 38) % (fw - 60));
  const stride = Math.sin(t * 7);
  stickFigure(ctx, px, fy + fh - 116, stride);
  const cx = fx + fw - 30 - ((t * 55) % (fw - 140));
  sketchBox(ctx, cx - 100, fy + fh - 72, 100, 30, 17, 0.85, 2.5);
  line(ctx, cx - 82, fy + fh - 72, cx - 66, fy + fh - 92, 0.85, 2.5);
  line(ctx, cx - 66, fy + fh - 92, cx - 30, fy + fh - 92, 0.85, 2.5);
  line(ctx, cx - 30, fy + fh - 92, cx - 18, fy + fh - 72, 0.85, 2.5);
  // detection boxes that track them
  const conf = (seed) => (0.86 + Math.abs(Math.sin(t * 1.7 + seed)) * 0.12).toFixed(2).slice(1);
  ctx.setLineDash([6, 5]);
  box(ctx, px - 24, fy + fh - 136, 48, 104, 1);
  box(ctx, cx - 108, fy + fh - 102, 116, 66, 1);
  ctx.setLineDash([]);
  for (const [lx, ly, label] of [[px - 24, fy + fh - 156, `person ${conf(1)}`], [cx - 108, fy + fh - 122, `car ${conf(3)}`]]) {
    ctx.font = mono(12);
    const lw = ctx.measureText(label).width + 10;
    ctx.fillStyle = ink(1);
    ctx.fillRect(lx, ly, lw, 18);
    ctx.fillStyle = PORCELAIN;
    ctx.textAlign = "left";
    ctx.fillText(label, lx + 5, ly + 13);
  }
  // edge ⇄ cloud
  text(ctx, "EDGE", 56, 382, mono(13), 0.6);
  text(ctx, "CLOUD", w - 56, 382, mono(13), 0.6, "right");
  line(ctx, 104, 378, w - 116, 378, 0.25, 2);
  for (let m = 0; m < 3; m++) {
    const f = (t * 0.5 + m / 3) % 1;
    dot(ctx, lerp(104, w - 116, f), 378, 4);
  }
  improvement(ctx, 56, 430, w - 112, "INFERENCE LATENCY", 0.65, seg(T, 1, 3), "−35%");
  caption(ctx, w, h, "Fig. 2 — Detection in real time.");
}

// Chapter III · Agile: an agent product, model to interface — still being written.
function figAgents(ctx, w, h, t) {
  text(ctx, "FIG. 3", 56, 84, mono(15), 0.5);
  const cx = w / 2;
  const cy = 200;
  const around = [["tools", -150, -62], ["memory", 150, -62], ["evals", -150, 62], ["users", 150, 62]];
  around.forEach(([n, dx, dy], i) => {
    line(ctx, cx, cy, cx + dx, cy + dy, 0.25, 2);
    sketchBox(ctx, cx + dx - 46, cy + dy - 17, 92, 34, i * 7 + 5, 1, 2.2);
    text(ctx, n, cx + dx, cy + dy + 6, mono(14), 1, "center");
    // a call goes out and comes back, one satellite at a time
    const phase = (t * 0.7 - i * 0.25) % 1;
    const f = phase < 0.5 ? ease(phase * 2) : ease((1 - phase) * 2);
    dot(ctx, lerp(cx, cx + dx, f), lerp(cy, cy + dy, f), 4.5);
  });
  const pulse = (t * 0.8) % 1;
  ctx.strokeStyle = ink(0.5 * (1 - pulse));
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 30 + pulse * 26, 0, Math.PI * 2);
  ctx.stroke();
  dot(ctx, cx, cy, 30);
  ctx.font = mono(14);
  ctx.fillStyle = PORCELAIN;
  ctx.textAlign = "center";
  ctx.fillText("agent", cx, cy + 5);

  // model → api → interface, the interface sketching itself in
  const row = 326;
  const labels = ["model", "api", "interface"];
  labels.forEach((n, k) => {
    const bx = 56 + k * 140;
    sketchBox(ctx, bx, row, 120, 82, k * 9 + 21, k === 2 ? 1 : 0.8, 2.2);
    text(ctx, n, bx + 60, row + 104, mono(13), 0.6, "center");
    if (k < 2) line(ctx, bx + 124, row + 41, bx + 136, row + 41, 0.6, 2);
  });
  const ui = (t * 0.3) % 1;
  const ux = 56 + 280;
  if (ui > 0.1) box(ctx, ux + 10, row + 10, 100 * ease(seg(ui, 0.1, 0.3)), 12, 0.5);
  if (ui > 0.3) box(ctx, ux + 10, row + 30, 60 * ease(seg(ui, 0.3, 0.5)), 30, 0.5);
  if (ui > 0.5) box(ctx, ux + 76, row + 30, 34 * ease(seg(ui, 0.5, 0.7)), 30, 0.5, 0.15);
  if (ui > 0.7) box(ctx, ux + 10, row + 66, 100 * ease(seg(ui, 0.7, 0.9)), 6, 0.5);
  const mx = 56 + 60;
  for (let k = 0; k < 4; k++) line(ctx, mx - 36, row + 20 + k * 14, mx - 36 + 72 * (0.5 + 0.5 * Math.abs(Math.sin(t + k))), row + 20 + k * 14, 0.5, 2);

  // still being written
  ctx.font = `italic 400 24px "Cormorant Garamond", Georgia, serif`;
  ctx.fillStyle = ink(0.85);
  ctx.textAlign = "left";
  ctx.fillText("This chapter is still being written.", 56, 486);
  const progress = (t * 0.22) % 1;
  const x0 = 56;
  const x1 = x0 + (w - 150) * progress;
  const ly = 528;
  ctx.strokeStyle = ink(0.85);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 4) {
    const yy = ly + Math.sin(x * 0.09) * 5 + Math.sin(x * 0.023) * 4;
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  const ny = ly + Math.sin(x1 * 0.09) * 5 + Math.sin(x1 * 0.023) * 4;
  ctx.fillStyle = ink(1);
  ctx.beginPath();
  ctx.moveTo(x1, ny);
  ctx.lineTo(x1 + 10, ny - 26);
  ctx.lineTo(x1 + 18, ny - 22);
  ctx.closePath();
  ctx.fill();
  caption(ctx, w, h, "Fig. 3 — An agent product, end to end.");
}

const FIGURES = [figServices, figDetection, figAgents];

// ---------- chapter pages (left): numeral, years, and what's in the chapter ----------
function chapterPage(k) {
  return (ctx, w, h) => {
    paperPage(ctx, w, h);
    const job = jobs()[k];
    text(ctx, "CHAPTER", 56, 92, mono(17), 0.55);
    text(ctx, ROMAN[k] ?? String(k + 1), 50, 250, serif(170, 400), 1);
    line(ctx, 56, 290, 150, 290, 0.6, 2);
    text(ctx, years(job.period).toUpperCase(), 56, 330, mono(18), 0.75);

    // "In this chapter", set like a table of contents with dotted leaders.
    text(ctx, "IN THIS CHAPTER", 56, 400, mono(14), 0.5);
    const tools = job.tools ?? [];
    tools.slice(0, 7).forEach((tool, n) => {
      const y = 440 + n * 30;
      ctx.font = serif(24, 400);
      const tw = ctx.measureText(tool).width;
      text(ctx, tool, 56, y, serif(24, 400), 0.9);
      ctx.fillStyle = ink(0.35);
      for (let x = 56 + tw + 10; x < w - 90; x += 9) ctx.fillRect(x, y - 3, 2, 2);
      text(ctx, String(n + 1).padStart(2, "0"), w - 56, y, mono(13), 0.5, "right");
    });
    folio(ctx, w, h, 2 * k + 1);
  };
}

// ---------- figure pages (right): the work, animated ----------
function detailsPage(k) {
  return (ctx, w, h, t) => {
    paperPage(ctx, w, h);
    (FIGURES[k] ?? figAgents)(ctx, w, h, t);
    folio(ctx, w, h, 2 * k + 2);
  };
}

/** Draw function for page n in reading order, or null for a blank page. */
export function bookPage(n) {
  if (n === 0) return cover;
  if (n === 1) return insideCover;
  if (n === 2) return titlePage;
  const count = jobs().length;
  if (n % 2 === 1) {
    const k = (n - 3) / 2;
    return k < count ? chapterPage(k) : null;
  }
  const k = (n - 4) / 2;
  return k < count ? detailsPage(k) : null;
}

/** True for pages that animate: every job's figure page. */
export const isLivePage = (n) => n % 2 === 0 && n >= 4 && (n - 4) / 2 < jobs().length;

export const blankPage = (ctx, w, h) => paperPage(ctx, w, h);
