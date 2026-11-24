// Where everything is, and where everyone goes, at each scroll stop.
//
// Everything stands in one office the whole time; each stop moves the camera to
// a different part of it. Timeline (one stop per page section):
//   0       intro: a curved office, 18 people working across three live projects
//   1 – 4   the model floor: each project builds itself as a working miniature
//           in front of the server room. Half the team works on it; the rest
//           keep working at their desks
//   5 – 7   experience, "chapters": a book on a writing table in the open
//           plain. It opens as you arrive; each job is one spread, and the page
//           turns as you scroll to the next. The team is back at work.
//   8       contact. On the way there (7 → 8) the camera rises over the office and
//           comes down at the front: you sit at the desk, the team merges into
//           you, the screens fan out above, and the office dims behind.

import { MODEL_FLOOR } from "./systems";

// Number of jobs (one stop and one book spread each): keep in sync with content.experience.items.
export const JOBS = 3;
export const STOPS = { intro: 0, projectsStart: 1, experienceStart: 5, end: 5 + JOBS };
// Shorthand: B = projects start, M = last milestone. Transitions are placed relative to these.
const B = STOPS.projectsStart;
const M = STOPS.experienceStart + JOBS - 1;
/** Scroll position where the merged figure has fully appeared. */
export const MERGED = M + 0.8;

// The office: three project zones on an arc around the viewer, each turned to
// face the arc's centre. A zone has a wall screen and six desks (2 rows × 3).
const ARC = { cz: 26, r: 26 }; // circle centre (0, cz); the middle zone sits at z = 0
export const ZONES = [-30, 0, 30].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a) * ARC.r, z: ARC.cz - Math.cos(a) * ARC.r, rot: -a };
});
/** Zone-local (dx, dz) → world {x, z}, for a zone turned by rot about Y. */
export function zoneToWorld(zone, dx, dz) {
  const c = Math.cos(zone.rot);
  const sn = Math.sin(zone.rot);
  return { x: zone.x + dx * c + dz * sn, z: zone.z - dx * sn + dz * c };
}
// Canvas is 1024 × 490, so width / (height × 0.98) keeps that 2.09 aspect.
export const ZONE_SCREEN = { y: 3.4, z: -8.2, width: 6, height: 2.93 };
/** Desk rows and columns within a zone (zone-local dz, dx): 3 × 3 desks per zone. */
const ROWS = [3.8, 0, -3.8];
const COLS = [-3.6, 0, 3.6];
export const DESKS = ZONES.flatMap((zone, zi) =>
  ROWS.flatMap((dz) => COLS.map((dx) => ({ ...zoneToWorld(zone, dx, dz), rot: zone.rot, zone: zi })))
);
export const AGENTS = DESKS.length;
/** Which slot (0–8) an agent sits in within its zone. */
export const zoneSlot = (i) => i % (ROWS.length * COLS.length);
/** The aisle between the back row of desks and the wall screens. */
const AISLE_Z = -6.4;
const SEAT_OFFSET = 0.85;
// The experience book, open on a writing table. Pages are W × H; the spine runs
// along z at x = BOOK.x, and the page tops point away from the camera (-z).
export const BOOK = { x: 0, z: -26, table: 0.92, pageW: 1.6, pageH: 2.1 };
/**
 * Leaves in reading order. A leaf has a front (seen on the right before it turns)
 * and a back (seen on the left after). Pages: cover | inside cover · title |
 * chapter 1 · details 1 | chapter 2 · details 2 | … The final details page sits
 * on the last leaf's front and never turns.
 */
export const LEAVES = JOBS + 2;
// The final desk stands on the open floor at the front of the office, so the
// whole office is still there behind you at the end.
export const HERO = { x: 0, z: 10.5 };
/** Selection id for the final figure (agents are 0 … AGENTS - 1). */
export const YOU = -1;
/** Where the camera sits for the contact section (the final screens turn to face it). */
export const CONTACT_CAMERA = [0, 2.9, HERO.z + 11.6];

// ---------- math helpers ----------
export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smootherstep = (v) => {
  const t = clamp01(v);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
export const smoothRange = (a, b, v) => smootherstep((v - a) / (b - a));
/** Frame-rate independent exponential approach. */
export const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
export const dampAngle = (from, to, rate, dt) => {
  let delta = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * (1 - Math.exp(-rate * dt));
};
const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/** Point at fraction t along a polyline of {x, z} points, by distance. */
function alongPath(points, t) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return points[0];
  let remaining = clamp01(t) * total;
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i];
    if (remaining <= len || i === lengths.length - 1) {
      const f = len === 0 ? 1 : Math.min(1, remaining / len);
      return { x: mix(points[i].x, points[i + 1].x, f), z: mix(points[i].z, points[i + 1].z, f) };
    }
    remaining -= len;
  }
  return points[points.length - 1];
}

// ---------- where each person stands ----------
const E = STOPS.experienceStart;
function seat(i) {
  const d = DESKS[i];
  return { x: d.x - Math.sin(d.rot) * SEAT_OFFSET, z: d.z - Math.cos(d.rot) * SEAT_OFFSET };
}

// A third of the team builds each project on the model floor; the rest keep working.
const attends = (i) => i % 3 === 0;

// Where the builders work around the model (floor-local x, z), and what they do:
// behind it on laptops, along the sides carrying parts in, one checking it over.
const BUILD_SPOTS = [
  { x: -4.2, z: -3.6, act: "laptop" },
  { x: -1.4, z: -3.7, act: "talk" },
  { x: 1.4, z: -3.7, act: "laptop" },
  { x: 4.2, z: -3.6, act: "talk" },
  { x: -6.3, z: -1.4, act: "carry", move: { dx: 0, dz: 2.6, period: 7 } },
  { x: 6.3, z: -1.4, act: "carry", move: { dx: 0, dz: 2.6, period: 8 } },
  { x: -6.4, z: 1.9, act: "laptop" },
  { x: 6.4, z: 1.9, act: "point" },
  { x: -5.2, z: 3.6, act: "point" },
];
function buildSpot(i) {
  const spot = BUILD_SPOTS[i / 3];
  return { ...spot, x: MODEL_FLOOR.x + spot.x, z: MODEL_FLOOR.z + spot.z };
}
/**
 * Walk from a desk to a build spot: along the aisle, out past the end of the
 * wall screens, then down the side of the model rather than through it.
 */
function toBuildSpot(desk, spot) {
  const aisle = { x: desk.x, z: AISLE_Z };
  const lane = Math.sign(spot.x || 1) * (MODEL_FLOOR.w / 2 + 1.8);
  return [desk, aisle, { x: lane, z: AISLE_Z }, { x: lane, z: spot.z }, spot];
}

/** A spot on the ring around the hero, just before the merge. */
function ringSpot(i) {
  const angle = (i / AGENTS) * Math.PI * 2 + 0.3;
  const radius = 2.2 + (i % 2) * 0.6;
  return { x: HERO.x + Math.sin(angle) * radius, z: HERO.z + Math.cos(angle) * radius };
}

const seated = (spot) => ({ ...spot, sit: 1, face: 0, merge: 0 });

/**
 * Target for person i at scroll stop s.
 * sit: 1 = seated, 0 = standing. face: heading, or null to face the walking
 * direction. merge: 0 → 1 as they fold into the hero. Optional: act (pose),
 * move (walk back and forth), y (standing height).
 */
export function personTarget(i, s) {
  const desk = seat(i);
  const goesToBoard = attends(i);
  const spot = goesToBoard ? buildSpot(i) : null;
  const center = { x: MODEL_FLOOR.x, z: MODEL_FLOOR.z };

  if (s <= B - 0.45) return seated(desk);

  // Projects: builders walk out to the model floor; everyone else keeps working.
  if (s < E - 0.7) {
    if (!goesToBoard) return seated(desk);
    if (s < B + 0.1) {
      const sit = 1 - clamp01((s - (B - 0.45)) / 0.08);
      const t = smoothRange(B - 0.4, B + 0.1, s);
      const at = alongPath(toBuildSpot(desk, spot), t);
      return t >= 1
        ? { ...spot, sit, face: facing(spot, center), merge: 0 }
        : { ...at, sit, face: null, merge: 0 };
    }
    return { ...spot, sit: 0, face: facing(spot, center), merge: 0 };
  }

  // Into experience: builders go back to their desks; everyone works on.
  if (s < E) {
    if (!goesToBoard) return seated(desk);
    const t = smoothRange(E - 0.7, E, s);
    const path = toBuildSpot(desk, spot).reverse();
    return { ...alongPath(path, t), sit: t >= 1 ? 1 : 0, face: null, merge: 0 };
  }

  if (s <= M + 0.2) return seated(desk);

  // Finale: everyone walks to a ring around the hero, then merges into him.
  const ring = ringSpot(i);
  const towardHero = facing(ring, HERO);
  if (s < M + 0.5) {
    const t = smoothRange(M + 0.2, M + 0.5, s);
    return { ...alongPath([desk, ring], t), sit: 0, face: t >= 1 ? towardHero : null, merge: 0 };
  }

  const merge = smoothRange(M + 0.5, M + 0.72, s);
  return { x: mix(ring.x, HERO.x, merge), z: mix(ring.z, HERO.z, merge), sit: 0, face: towardHero, merge };
}

// ---------- fades ----------
// The office never leaves: at the end it only dims, so the final figure reads against it.
export const worldOpacity = (s) => 1 - 0.7 * smoothRange(M + 0.3, M + 0.6, s);
export const peopleOpacity = (s) => 1 - smoothRange(M + 0.66, M + 0.78, s);
export const heroOpacity = (s) => smoothRange(M + 0.64, MERGED, s);
/** 0 → 1 as screen i of the final fan flies in. */
export const fanIn = (i, s) => smoothRange(M + 0.62 + i * 0.025, M + 0.82 + i * 0.025, s);

// ---------- experience: the book ----------
/**
 * 0 → 1 as leaf i turns from the right side to the left. The cover and title
 * leaf turn as you arrive; then one leaf per job, between its stop and the next.
 */
export function leafTurn(i, s) {
  if (i === 0) return smoothRange(E - 0.8, E - 0.45, s); // cover opens
  if (i === 1) return smoothRange(E - 0.45, E - 0.08, s); // title page
  const k = i - 2; // turning from spread k to k + 1
  if (k >= JOBS - 1) return 0;
  return smoothRange(E + k + 0.3, E + k + 0.85, s);
}

/** Index of the project being built on the model floor. */
export const projectIndex = (s) => Math.min(3, Math.max(0, Math.round(s - STOPS.projectsStart)));

// ---------- camera ----------
// `offset` shifts the view sideways (or down on mobile) so the subject sits
// beside the text panel instead of behind it.
// Looking down over the model floor, like leaning over a model-maker's table.
const modelShot = (i) => {
  const drift = (i - 1.5) * 0.4;
  const { x, z } = MODEL_FLOOR;
  return { pos: [x + 2.8 + drift, 12.4, z + 13.8], look: [x + 0.9 + drift * 0.4, 0, z - 0.9], offset: 1, mobileZoom: 1.45, mobileOffset: 1.1 };
};
// Looking down at the open book over the reader's shoulder; drifts a little per chapter.
const bookShot = (k) => {
  const drift = (k - (JOBS - 1) / 2) * 0.35;
  const { x, z, table } = BOOK;
  return { pos: [x + 1.4 + drift, table + 4.0, z + 4.5], look: [x + 0.45 + drift * 0.3, table - 0.05, z - 0.2], offset: 1, mobileZoom: 1.75, mobileOffset: 1.25 };
};

const CAMERA_KEYS = [
  // mobileZoom: how far phones pull back (default 1.5×); the wide office needs less on a narrow screen.
  { pos: [3, 18.5, 31], look: [1, 0.2, -5.5], offset: 0, mobileZoom: 0.8 },
  ...[0, 1, 2, 3].map(modelShot),
  ...Array.from({ length: JOBS }, (_, k) => bookShot(k)),
  // On phones the contact panel covers the lower half, so lift the scene above it.
  // `lift` raises the camera mid-move: from the book it rises up over the whole
  // office and comes down in front of the final desk, rather than flying through it.
  { pos: CONTACT_CAMERA, look: [0, 1.6, HERO.z], offset: 0, mobileOffset: 0.9, lift: 10 },
];

export function cameraAt(s) {
  const last = CAMERA_KEYS.length - 1;
  const t = Math.min(last, Math.max(0, s));
  const i = Math.min(last - 1, Math.floor(t));
  const f = smootherstep(t - i);
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[i + 1];
  const lerp3 = (p, q) => [mix(p[0], q[0], f), mix(p[1], q[1], f), mix(p[2], q[2], f)];
  const mOff = (k) => k.mobileOffset ?? k.offset;
  const mZoom = (k) => k.mobileZoom ?? 1.5;
  const pos = lerp3(a.pos, b.pos);
  pos[1] += (b.lift ?? 0) * Math.sin(Math.PI * f);
  return {
    pos,
    look: lerp3(a.look, b.look),
    offset: mix(a.offset, b.offset, f),
    mobileOffset: mix(mOff(a), mOff(b), f),
    mobileZoom: mix(mZoom(a), mZoom(b), f),
  };
}
