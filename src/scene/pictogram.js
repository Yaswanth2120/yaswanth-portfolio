// Flat 2D "pictogram" people, drawn once to canvases and used as billboard
// textures. Each pose comes in two styles:
//   outline: porcelain body with an oxblood border (the default, working look)
//   solid:   filled oxblood (hovered / selected / the final merged figure)
import * as THREE from "three";
import { OXBLOOD, PORCELAIN } from "./screens";

// Poses are authored on a 256 × 384 grid (y = 384 is the floor), with a little
// headroom on top for the raised-arm poses. ≈213 px per world unit.
const HEADROOM = 36;
export const ICON_W = 256;
export const ICON_H = 384 + HEADROOM;
export const ICON_WORLD_W = 1.2;
export const ICON_WORLD_H = (1.2 * ICON_H) / ICON_W;

const LIMB = 24;
const TORSO = 46;
const HEAD_R = 29;
const BORDER = 6;

// Each pose: head centre, torso segment, and limbs as polylines.
const POSES = {
  // Front view, seated behind the desk, hands on the keyboard.
  typeA: {
    head: [128, 112],
    torso: [[128, 158], [128, 262]],
    limbs: [
      [[104, 168], [92, 226], [116, 246]],
      [[152, 168], [164, 226], [140, 246]],
      [[114, 272], [108, 304], [108, 372]],
      [[142, 272], [148, 304], [148, 372]],
    ],
  },
  typeB: {
    head: [128, 114],
    torso: [[128, 160], [128, 262]],
    limbs: [
      [[104, 170], [92, 222], [118, 238]],
      [[152, 170], [164, 230], [138, 252]],
      [[114, 272], [108, 304], [108, 372]],
      [[142, 272], [148, 304], [148, 372]],
    ],
  },
  // Front view, standing.
  stand: {
    head: [128, 48],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [94, 160], [90, 212]],
      [[152, 104], [162, 160], [166, 212]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
  },
  // Front view, right arm raised toward the whiteboard.
  point: {
    head: [124, 48],
    torso: [[124, 96], [126, 206]],
    limbs: [
      [[100, 104], [90, 160], [88, 212]],
      [[148, 104], [192, 76], [228, 40]],
      [[114, 214], [110, 292], [108, 370]],
      [[138, 214], [142, 292], [144, 370]],
    ],
  },
  // Front view, holding an open laptop (we see the back of the lid).
  laptopA: {
    head: [128, 48],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [96, 150], [118, 170]],
      [[152, 104], [160, 150], [138, 170]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
    props: [[86, 116, 84, 54]],
  },
  laptopB: {
    head: [130, 50],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [96, 152], [118, 172]],
      [[152, 104], [160, 148], [136, 164]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
    props: [[86, 118, 84, 54]],
  },
  // Front view, carrying a box.
  carryA: {
    head: [128, 48],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [90, 150], [100, 178]],
      [[152, 104], [166, 150], [156, 178]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
    props: [[80, 128, 96, 70]],
  },
  carryB: {
    head: [128, 51],
    torso: [[128, 99], [128, 208]],
    limbs: [
      [[104, 107], [90, 153], [100, 181]],
      [[152, 107], [166, 153], [156, 181]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
    props: [[80, 131, 96, 70]],
  },
  // Front view, talking with one hand.
  talkA: {
    head: [128, 48],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [94, 160], [90, 212]],
      [[152, 104], [176, 146], [186, 108]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
  },
  talkB: {
    head: [126, 49],
    torso: [[128, 96], [128, 206]],
    limbs: [
      [[104, 104], [94, 160], [90, 212]],
      [[152, 104], [180, 150], [200, 128]],
      [[116, 214], [112, 292], [110, 370]],
      [[140, 214], [144, 292], [146, 370]],
    ],
  },
  // Side view, walking right with a box held out front.
  carryWalkA: {
    head: [134, 48],
    torso: [[130, 96], [124, 206]],
    limbs: [
      [[130, 108], [150, 150], [176, 156]],
      [[124, 214], [100, 292], [78, 364]],
      [[124, 214], [154, 288], [166, 368]],
    ],
    props: [[150, 112, 82, 66]],
  },
  carryWalkB: {
    head: [134, 50],
    torso: [[130, 98], [124, 208]],
    limbs: [
      [[130, 110], [150, 152], [176, 158]],
      [[124, 216], [138, 292], [140, 370]],
      [[124, 216], [114, 292], [100, 366]],
    ],
    props: [[150, 115, 82, 66]],
  },
  // Side view, walking to the right (mirrored for walking left).
  walkA: {
    head: [140, 48],
    torso: [[134, 96], [124, 206]],
    limbs: [
      [[132, 106], [104, 152], [92, 194]],
      [[124, 214], [100, 292], [78, 364]],
      [[124, 214], [154, 288], [166, 368]],
      [[132, 106], [156, 150], [170, 192]],
    ],
  },
  walkB: {
    head: [140, 50],
    torso: [[134, 98], [124, 208]],
    limbs: [
      [[132, 108], [150, 156], [156, 200]],
      [[124, 216], [138, 292], [140, 370]],
      [[124, 216], [114, 292], [100, 366]],
      [[132, 108], [118, 156], [112, 200]],
    ],
  },
};
export const POSE_NAMES = Object.keys(POSES);

function strokePath(ctx, points, width) {
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

function drawPose(ctx, pose, solid, headphones = false) {
  ctx.clearRect(0, 0, ICON_W, ICON_H);
  ctx.save();
  ctx.translate(0, HEADROOM);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Pass 1 draws everything thick in oxblood; pass 2 draws it thinner in
  // porcelain, which leaves a single clean outline around the merged silhouette.
  const passes = solid ? [[OXBLOOD, BORDER]] : [[OXBLOOD, BORDER], [PORCELAIN, 0]];
  for (const [color, extra] of passes) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    strokePath(ctx, pose.torso, TORSO + extra * 2);
    pose.limbs.forEach((limb) => strokePath(ctx, limb, LIMB + extra * 2));
    ctx.beginPath();
    ctx.arc(pose.head[0], pose.head[1], HEAD_R + extra, 0, Math.PI * 2);
    ctx.fill();
  }
  if (headphones) {
    // Over-ear headphones in porcelain, so they read against the solid figure.
    const [hx, hy] = pose.head;
    ctx.strokeStyle = PORCELAIN;
    ctx.fillStyle = PORCELAIN;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(hx, hy - 2, HEAD_R + 7, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(hx + side * (HEAD_R + 2) - 7, hy - 8, 14, 26, 6);
      ctx.fill();
    }
  }
  // Held objects (laptop, box) are drawn last, outlined, so they read in front
  // of the body in both styles.
  for (const [color, extra] of [[OXBLOOD, BORDER], [PORCELAIN, 0]]) {
    ctx.fillStyle = color;
    for (const [x, y, w, h] of pose.props ?? []) {
      ctx.beginPath();
      ctx.roundRect(x - extra, y - extra, w + extra * 2, h + extra * 2, 3 + extra);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * { outline, solid, hero: { [pose]: texture }, dispose() }
 * hero is the solid figure wearing headphones, for the final scene.
 */
// Canvas resolution as a multiple of the 256 × 420 drawing size. The final
// figure is seen large (it fills much of the screen at the end), so its two
// typing poses get 4×; the team, always smaller on screen, gets 1.5×.
const HERO_POSES = ["typeA", "typeB"];
export function createPictogramTextures({ mobile = false } = {}) {
  const sets = { outline: {}, solid: {}, hero: {} };
  for (const style of ["outline", "solid", "hero"]) {
    const names = style === "hero" ? HERO_POSES : POSE_NAMES;
    const k = style === "hero" ? (mobile ? 2.5 : 4) : mobile ? 1 : 1.5;
    for (const name of names) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(ICON_W * k);
      canvas.height = Math.round(ICON_H * k);
      const ctx = canvas.getContext("2d");
      ctx.scale(k, k);
      drawPose(ctx, POSES[name], style !== "outline", style === "hero");
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      sets[style][name] = tex;
    }
  }
  sets.dispose = () =>
    ["outline", "solid", "hero"].forEach((style) => Object.values(sets[style]).forEach((t) => t.dispose()));
  return sets;
}
