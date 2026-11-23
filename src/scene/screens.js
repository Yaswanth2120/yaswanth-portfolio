// 2D canvas drawings used as textures on the in-scene screens.
// Each draw function has the signature (ctx, width, height, t), where t is the
// elapsed time in seconds (or the item index for the whiteboard / signs).
import { content } from "@/data/content";

export const PORCELAIN = "#F3EFEB";
export const OXBLOOD = "#4B1724";
export const ink = (alpha = 1) => `rgba(75, 23, 36, ${alpha})`;

export const mono = (size, weight = 500) => `${weight} ${size}px "IBM Plex Mono", ui-monospace, monospace`;
export const serif = (size, weight = 500) => `${weight} ${size}px "Cormorant Garamond", Georgia, serif`;
export const pad = (n, len = 2) => String(n).padStart(len, "0");
const copy = content.scene;

// ---------- primitives ----------
export function paper(ctx, w, h, border = true) {
  ctx.fillStyle = PORCELAIN;
  ctx.fillRect(0, 0, w, h);
  if (border) {
    ctx.strokeStyle = ink(1);
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function box(ctx, x, y, w, h, alpha = 1, fillAlpha = 0) {
  if (fillAlpha) {
    ctx.fillStyle = ink(fillAlpha);
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = ink(alpha);
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

export function line(ctx, x1, y1, x2, y2, alpha = 1, width = 2) {
  ctx.strokeStyle = ink(alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function text(ctx, str, x, y, font, alpha = 1, align = "left") {
  ctx.font = font;
  ctx.fillStyle = ink(alpha);
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(str, x, y);
}

/** Like text(), but shrinks the font until the string fits in maxWidth. */
export function fitText(ctx, str, x, y, fontAt, size, maxWidth, alpha = 1, align = "left") {
  let s = size;
  ctx.font = fontAt(s);
  while (s > 8 && ctx.measureText(str).width > maxWidth) {
    s -= 1;
    ctx.font = fontAt(s);
  }
  text(ctx, str, x, y, fontAt(s), alpha, align);
}

export function wrap(ctx, str, maxWidth) {
  const lines = [];
  let current = "";
  for (const word of str.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Deterministic jitter so sketched lines wobble the same way every redraw.
const jitter = (seed) => Math.sin(seed * 12.9898) * 1.6;

export function sketchLine(ctx, x1, y1, x2, y2, seed, alpha = 1, width = 2.5) {
  ctx.strokeStyle = ink(alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1 + jitter(seed), y1 + jitter(seed + 1));
  const cx = (x1 + x2) / 2 + jitter(seed + 2) * 1.5;
  const cy = (y1 + y2) / 2 + jitter(seed + 3) * 1.5;
  ctx.quadraticCurveTo(cx, cy, x2 + jitter(seed + 4), y2 + jitter(seed + 5));
  ctx.stroke();
}

export function sketchBox(ctx, x, y, w, h, seed, alpha = 1, width = 2.5) {
  sketchLine(ctx, x, y, x + w, y, seed, alpha, width);
  sketchLine(ctx, x + w, y, x + w, y + h, seed + 7, alpha, width);
  sketchLine(ctx, x + w, y + h, x, y + h, seed + 13, alpha, width);
  sketchLine(ctx, x, y + h, x, y, seed + 19, alpha, width);
}

// ---------- desk monitors (one per role id) ----------
export const DESK_SCREENS = {
  frontend(ctx, w, h, t) {
    paper(ctx, w, h);
    line(ctx, 0, 26, w, 26, 0.35);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ink(0.7);
      ctx.beginPath();
      ctx.arc(16 + i * 14, 13, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    box(ctx, 70, 6, w - 90, 14, 0.35);
    text(ctx, copy.frontend.url, 78, 17, mono(9), 0.7);
    box(ctx, 18, 38, w - 36, 16, 0.35);
    box(ctx, 18, 64, w - 36, 70, 1);
    line(ctx, 18, 64, w - 18, 134, 0.15);
    line(ctx, w - 18, 64, 18, 134, 0.15);
    const colW = (w - 36 - 20) / 3;
    for (let i = 0; i < 3; i++) {
      const x = 18 + i * (colW + 10);
      box(ctx, x, 146, colW, 72, 0.7);
      line(ctx, x + 10, 196, x + colW - 20, 196, 0.35);
      line(ctx, x + 10, 206, x + colW - 40, 206, 0.35);
      box(ctx, x + 10, 156, colW - 20, 28, 0.15, 0.05);
    }
    // Mouse cursor drifting over the layout.
    const a = (t * 0.25) % 1;
    const cx = 60 + Math.sin(a * Math.PI * 2) * 120 + 130;
    const cy = 170 + Math.cos(a * Math.PI * 2) * 30;
    ctx.fillStyle = ink(1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy + 14);
    ctx.lineTo(cx + 4, cy + 10);
    ctx.lineTo(cx + 10, cy + 10);
    ctx.closePath();
    ctx.fill();
  },

  backend(ctx, w, h, t) {
    paper(ctx, w, h);
    const lines = copy.backend;
    const total = lines.reduce((sum, l) => sum + l.length + 4, 0);
    let typed = Math.floor((t * 22) % (total + 60));
    ctx.font = mono(11);
    let cursorX = 0;
    let cursorY = 0;
    lines.forEach((src, n) => {
      const y = 26 + n * 22;
      text(ctx, pad(n + 1), 14, y, mono(10), 0.35);
      const visible = src.slice(0, Math.max(0, typed));
      typed -= src.length + 4;
      text(ctx, visible, 42, y, mono(11), src.trim().startsWith("@") ? 1 : 0.7);
      const typing = visible.length < src.length || (typed > 0 && n === lines.length - 1);
      if (typing && cursorX === 0 && cursorY === 0) {
        ctx.font = mono(11);
        cursorX = 42 + ctx.measureText(visible).width + 2;
        cursorY = y;
      }
    });
    if (cursorY && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = ink(1);
      ctx.fillRect(cursorX, cursorY - 10, 7, 13);
    }
  },

  devops(ctx, w, h, t) {
    paper(ctx, w, h);
    const steps = copy.devops.steps;
    text(ctx, copy.devops.log, 18, 28, mono(11), 0.7);
    const active = Math.floor(t / 0.9) % (steps.length + 2);
    const gap = (w - 60) / (steps.length - 1);
    steps.forEach((step, n) => {
      const x = 30 + n * gap;
      if (n < steps.length - 1) line(ctx, x + 12, 100, x + gap - 12, 100, n < active - 1 ? 1 : 0.35, 2);
      ctx.strokeStyle = ink(1);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, 100, 11, 0, Math.PI * 2);
      if (n < active) {
        ctx.fillStyle = ink(1);
        ctx.fill();
      }
      ctx.stroke();
      text(ctx, step, x, 132, mono(10), n < active ? 1 : 0.35, "center");
    });
    for (let i = 0; i < 4; i++) {
      const done = i < active - 1;
      text(ctx, `${done ? "✓" : "·"} ${steps[i] ?? ""} ${done ? "ok" : "…"}`, 18, 168 + i * 16, mono(10), done ? 0.7 : 0.35);
    }
  },

  qa(ctx, w, h, t) {
    paper(ctx, w, h);
    const checks = copy.qa.checks;
    const done = Math.floor(t / 0.7) % (checks.length + 3);
    text(ctx, copy.qa.title, 18, 28, mono(11), 1);
    text(ctx, `${Math.min(done, checks.length)}/${checks.length} passed`, w - 18, 28, mono(10), 0.7, "right");
    line(ctx, 18, 38, w - 18, 38, 0.15);
    checks.forEach((check, n) => {
      const y = 60 + n * 28;
      box(ctx, 18, y - 12, 15, 15, 1);
      if (n < done) {
        ctx.strokeStyle = ink(1);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(21, y - 4);
        ctx.lineTo(25, y);
        ctx.lineTo(31, y - 10);
        ctx.stroke();
      }
      text(ctx, check, 44, y, mono(11), n < done ? 1 : 0.35);
      line(ctx, 44, y + 8, w - 18, y + 8, 0.05);
    });
  },

  ml(ctx, w, h, t) {
    paper(ctx, w, h);
    text(ctx, copy.ml.title, 18, 26, mono(11), 1);
    const progress = (t * 0.08) % 1;
    text(ctx, `${copy.ml.epoch} ${pad(Math.floor(progress * 100), 3)}`, w - 18, 26, mono(10), 0.7, "right");
    const baseY = h - 28;
    const plotW = w - 56;
    const plotH = h - 70;
    line(ctx, 34, baseY, 34 + plotW, baseY, 0.7);
    line(ctx, 34, baseY, 34, baseY - plotH, 0.7);
    for (let i = 1; i < 4; i++) line(ctx, 34, baseY - (plotH * i) / 4, 34 + plotW, baseY - (plotH * i) / 4, 0.05, 1);
    const count = Math.max(2, Math.floor(progress * 80));
    const plot = (value) => {
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const f = i / 80;
        const x = 34 + f * plotW;
        const y = baseY - value(f, i) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = ink(1);
    ctx.lineWidth = 2.5;
    plot((f, i) => Math.exp(-f * 3.6) * 0.85 + 0.08 + Math.sin(i * 1.7) * 0.015); // loss
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = ink(0.35);
    plot((f) => 0.9 - Math.exp(-f * 3) * 0.75); // accuracy
    ctx.setLineDash([]);
  },

  ai(ctx, w, h, t) {
    paper(ctx, w, h);
    const { user, bot, input } = copy.ai;
    ctx.font = mono(10);
    const bubbleW = ctx.measureText(user).width + 20;
    box(ctx, w - 18 - bubbleW, 16, bubbleW, 26, 1);
    text(ctx, user, w - 28, 33, mono(10), 1, "right");
    const typed = bot.slice(0, Math.floor((t * 14) % (bot.length + 40)));
    ctx.font = mono(10);
    const lines = wrap(ctx, bot, w - 90);
    box(ctx, 18, 56, w - 70, lines.length * 16 + 18, 0.35, 0.05);
    let remaining = typed.length;
    lines.forEach((l, n) => {
      text(ctx, l.slice(0, Math.max(0, remaining)), 28, 76 + n * 16, mono(10), 1);
      remaining -= l.length + 1;
    });
    box(ctx, 18, h - 40, w - 36, 24, 0.35);
    text(ctx, input, 28, h - 24, mono(10), 0.35);
  },

  designer(ctx, w, h, t) {
    paper(ctx, w, h);
    text(ctx, copy.designer.title, 18, 24, mono(10), 0.7);
    line(ctx, 0, 34, w, 34, 0.15);
    const selected = Math.floor(t / 1.6) % 3;
    for (let i = 0; i < 3; i++) {
      const x = 26 + i * 120;
      box(ctx, x, 50, 92, 168, 0.7);
      box(ctx, x + 10, 62, 72, 46, 0.15, 0.05);
      line(ctx, x + 10, 124, x + 70, 124, 0.35);
      line(ctx, x + 10, 136, x + 56, 136, 0.35);
      box(ctx, x + 10, 186, 72, 20, 1, i === selected ? 1 : 0);
      if (i === selected) {
        ctx.setLineDash([3, 3]);
        box(ctx, x - 5, 45, 102, 178, 1);
        ctx.setLineDash([]);
        for (const [hx, hy] of [[x - 5, 45], [x + 97, 45], [x - 5, 223], [x + 97, 223]]) {
          ctx.fillStyle = PORCELAIN;
          ctx.fillRect(hx - 3, hy - 3, 6, 6);
          ctx.strokeRect(hx - 3, hy - 3, 6, 6);
        }
      }
    }
  },
};

// ---------- props ----------
export function drawServerRack(ctx, w, h, t) {
  paper(ctx, w, h);
  const rowH = (h - 20) / 9;
  for (let n = 0; n < 9; n++) {
    const y = 10 + n * rowH;
    box(ctx, 10, y + 3, w - 20, rowH - 6, 0.7);
    for (let i = 0; i < 4; i++) {
      const on = Math.floor(t * 3 + n * 1.7 + i * 2.3) % 4 !== 0;
      const x = 20 + i * 14;
      ctx.fillStyle = on ? ink(1) : PORCELAIN;
      ctx.fillRect(x, y + rowH / 2 - 4, 8, 8);
      ctx.strokeStyle = ink(1);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y + rowH / 2 - 4, 8, 8);
    }
    line(ctx, w - 50, y + rowH / 2, w - 20, y + rowH / 2, 0.35);
  }
}

export function drawSketchBoard(ctx, w, h) {
  paper(ctx, w, h);
  sketchBox(ctx, 40, 40, 110, 210, 3, 1, 3);
  sketchBox(ctx, 54, 64, 82, 54, 11, 0.7);
  sketchLine(ctx, 54, 136, 130, 136, 21, 0.7);
  sketchLine(ctx, 54, 150, 112, 150, 27, 0.7);
  sketchBox(ctx, 54, 210, 82, 24, 31, 1);
  ctx.strokeStyle = ink(1);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(225, 90, 34, 0.2, Math.PI * 1.9);
  ctx.stroke();
  sketchLine(ctx, 160, 160, 210, 140, 41, 1);
  sketchLine(ctx, 210, 140, 200, 152, 43, 1);
  sketchLine(ctx, 210, 140, 196, 136, 47, 1);
  sketchBox(ctx, 180, 190, 90, 60, 53, 0.35);
  text(ctx, "v3", 225, 230, serif(30), 1, "center");
}

/**
 * Face of an experience monolith (360 × 765), set out like an engraved stone:
 * milestone number, then company, role, dates and place.
 */
export function drawMonolithFace(ctx, w, h, index) {
  const items = content.experience.items;
  const item = items[index] ?? items[0];
  ctx.fillStyle = PORCELAIN;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = ink(0.35);
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  text(ctx, "MILESTONE", 40, 76, mono(17), 0.5);
  text(ctx, pad(index + 1), 34, 230, serif(160, 400), 1);
  line(ctx, 40, 276, w - 40, 276, 0.6, 2);

  ctx.font = serif(46, 500);
  const name = wrap(ctx, item.org, w - 80).slice(0, 3);
  name.forEach((l, n) => fitText(ctx, l, 40, 344 + n * 50, (sz) => serif(sz, 500), 46, w - 80, 1));
  let y = 344 + name.length * 50 + 16;
  ctx.font = mono(19);
  wrap(ctx, item.role, w - 80).forEach((l) => {
    text(ctx, l, 40, y, mono(19), 0.85);
    y += 28;
  });

  line(ctx, 40, h - 150, 110, h - 150, 0.6, 2);
  text(ctx, item.period, 40, h - 108, mono(18), 1);
  text(ctx, item.place.toUpperCase(), 40, h - 70, mono(14), 0.5);
}
