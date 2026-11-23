// Pages of the experience book (each 512 × 672 px, matching a 1.6 × 2.1 page).
//
// Reading order: 0 cover · 1 inside cover · 2 title · then for each job k:
// 3 + 2k chapter page (left), 4 + 2k details page (right).
// Leaf i shows page 2i on its front and page 2i + 1 on its back.
import { content } from "@/data/content";
import { OXBLOOD, PORCELAIN, box, fitText, ink, line, mono, serif, sketchBox, sketchLine, text, wrap } from "./screens";

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

// ---------- chapter illustrations (line art) ----------
function illoServices(ctx, x, y, w) {
  // Microservices over a message queue.
  const names = ["api", "orders", "billing"];
  const bw = (w - 40) / 3;
  names.forEach((n, i) => {
    const bx = x + i * (bw + 20);
    sketchBox(ctx, bx, y + 10, bw, 46, i * 7 + 3, 1, 2.5);
    text(ctx, n, bx + bw / 2, y + 40, mono(15), 1, "center");
    sketchLine(ctx, bx + bw / 2, y + 58, bx + bw / 2, y + 112, i * 5 + 11, 0.7, 2);
  });
  sketchBox(ctx, x, y + 114, w, 40, 31, 1, 2.5);
  for (let k = 0; k < 9; k++) line(ctx, x + 18 + k * ((w - 36) / 9), y + 122, x + 18 + k * ((w - 36) / 9), y + 146, 0.35, 2);
  text(ctx, "kafka · rabbitmq", x + w / 2, y + 184, mono(14), 0.6, "center");
}

function illoDetection(ctx, x, y, w, h) {
  // A camera frame with object-detection boxes.
  sketchBox(ctx, x, y, w, h - 30, 5, 1, 2.5);
  // a person
  ctx.strokeStyle = ink(0.8);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x + 90, y + 52, 14, 0, Math.PI * 2);
  ctx.stroke();
  sketchLine(ctx, x + 90, y + 66, x + 90, y + 118, 7, 0.8, 2.5);
  sketchLine(ctx, x + 90, y + 118, x + 76, y + 150, 9, 0.8, 2.5);
  sketchLine(ctx, x + 90, y + 118, x + 104, y + 150, 13, 0.8, 2.5);
  sketchLine(ctx, x + 70, y + 86, x + 110, y + 86, 15, 0.8, 2.5);
  // a car
  sketchBox(ctx, x + 200, y + 110, 150, 40, 17, 0.8, 2.5);
  sketchLine(ctx, x + 225, y + 110, x + 250, y + 84, 19, 0.8, 2.5);
  sketchLine(ctx, x + 250, y + 84, x + 310, y + 84, 21, 0.8, 2.5);
  sketchLine(ctx, x + 310, y + 84, x + 330, y + 110, 23, 0.8, 2.5);
  // detection boxes + labels
  ctx.setLineDash([6, 5]);
  box(ctx, x + 64, y + 30, 54, 128, 1);
  box(ctx, x + 192, y + 74, 166, 84, 1);
  ctx.setLineDash([]);
  ctx.fillStyle = ink(1);
  ctx.fillRect(x + 64, y + 10, 104, 20);
  ctx.fillRect(x + 192, y + 54, 84, 20);
  ctx.font = mono(13);
  ctx.fillStyle = PORCELAIN;
  ctx.textAlign = "left";
  ctx.fillText("person .92", x + 70, y + 25);
  ctx.fillText("car .88", x + 198, y + 69);
  text(ctx, "yolov5 · edge + cloud", x + w / 2, y + h - 4, mono(14), 0.6, "center");
}

function illoAgents(ctx, x, y, w, h) {
  // An agent at the centre of its tools.
  const cx = x + w / 2;
  const cy = y + 78;
  const around = [["tools", -150, -40], ["memory", 150, -40], ["evals", -130, 70], ["users", 130, 70]];
  around.forEach(([n, dx, dy], i) => {
    sketchLine(ctx, cx, cy, cx + dx, cy + dy, i * 9 + 3, 0.5, 2);
    sketchBox(ctx, cx + dx - 44, cy + dy - 17, 88, 34, i * 7 + 5, 1, 2.2);
    text(ctx, n, cx + dx, cy + dy + 6, mono(14), 1, "center");
  });
  ctx.fillStyle = ink(1);
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = mono(14);
  ctx.fillStyle = PORCELAIN;
  ctx.textAlign = "center";
  ctx.fillText("agent", cx, cy + 5);
  text(ctx, "ai products, end to end", cx, y + h - 4, mono(14), 0.6, "center");
}

const ILLUSTRATIONS = [illoServices, illoDetection, illoAgents];

// ---------- chapter pages ----------
function chapterPage(k) {
  return (ctx, w, h) => {
    paperPage(ctx, w, h);
    const job = jobs()[k];
    text(ctx, "CHAPTER", 56, 92, mono(17), 0.55);
    text(ctx, ROMAN[k] ?? String(k + 1), 50, 250, serif(170, 400), 1);
    line(ctx, 56, 290, 150, 290, 0.6, 2);
    text(ctx, years(job.period).toUpperCase(), 56, 330, mono(18), 0.75);
    (ILLUSTRATIONS[k] ?? illoAgents)(ctx, 56, 390, w - 112, 210);
    folio(ctx, w, h, 2 * k + 1);
  };
}

function detailsPage(k) {
  return (ctx, w, h, t) => {
    paperPage(ctx, w, h);
    const job = jobs()[k];
    ctx.font = serif(52, 500);
    const name = wrap(ctx, job.org, w - 112).slice(0, 2);
    name.forEach((l, n) => fitText(ctx, l, 56, 120 + n * 56, (sz) => serif(sz, 500), 52, w - 112, 1));
    let y = 120 + name.length * 56 + 8;
    fitText(ctx, job.role.toUpperCase(), 56, y, (sz) => mono(sz), 17, w - 112, 0.85);
    text(ctx, job.place.toUpperCase(), 56, y + 30, mono(14), 0.5);
    text(ctx, job.period, w - 56, y + 30, mono(14), 0.5, "right");
    y += 62;
    line(ctx, 56, y, w - 56, y, 0.2, 1.5);
    y += 54;

    if (job.summary) {
      ctx.font = serif(29, 400);
      wrap(ctx, job.summary, w - 112).forEach((l) => {
        text(ctx, l, 56, y, serif(29, 400), 0.9);
        y += 40;
      });
    } else {
      // The current job: the page is still being written.
      ctx.font = `italic 400 30px "Cormorant Garamond", Georgia, serif`;
      ctx.fillStyle = ink(0.9);
      ctx.textAlign = "left";
      ctx.fillText("This chapter is still", 56, y);
      ctx.fillText("being written.", 56, y + 40);
      const progress = (t * 0.22) % 1;
      const x0 = 56;
      const x1 = x0 + (w - 140) * progress;
      const ly = y + 100;
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
      // the nib
      const ny = ly + Math.sin(x1 * 0.09) * 5 + Math.sin(x1 * 0.023) * 4;
      ctx.fillStyle = ink(1);
      ctx.beginPath();
      ctx.moveTo(x1, ny);
      ctx.lineTo(x1 + 10, ny - 26);
      ctx.lineTo(x1 + 18, ny - 22);
      ctx.closePath();
      ctx.fill();
    }
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

/** True for the page that animates (the current job's "still being written" line). */
export const isLivePage = (n) => {
  const count = jobs().length;
  return n % 2 === 0 && n >= 4 && (n - 4) / 2 === count - 1 && !jobs()[count - 1].summary;
};

export const blankPage = (ctx, w, h) => paperPage(ctx, w, h);
