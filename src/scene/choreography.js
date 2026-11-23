// Where everything is, and where everyone goes, at each scroll stop.
//
// Timeline (one stop per page section):
//   0       intro: a curved office, 18 people working across three live projects
//   1 – 4   half the team presents at the whiteboard (server room behind);
//           the rest keep working at their desks
//   5 – 7   experience, "the walk": you walk a single path across an open
//           plain; one monolith per job rises from the ground as you reach it,
//           and the trail draws itself behind you. The team is back at work.
//   8       contact. On the way there (7 → 8) the walker fades, you sit at the desk, the
//           team merges into you, and the screens fan out above.

// Number of jobs (one stop and one monolith each): keep in sync with content.experience.items.
export const JOBS = 3;
export const STOPS = { intro: 0, projectsStart: 1, experienceStart: 5, end: 5 + JOBS };
// Shorthand: B = projects start, M = last milestone. Transitions are placed relative to these.
const B = STOPS.projectsStart;
const M = STOPS.experienceStart + JOBS - 1;
/** Scroll position where the merged figure has fully appeared. */
export const MERGED = M + 0.8;

// The office: three project zones on an arc around the viewer, each turned to
// face the arc's centre. A zone has a wall screen and six desks (2 rows × 3).
const ARC = { cz: 19, r: 19 }; // circle centre (0, cz); the middle zone sits at z = 0
export const ZONES = [-31, 0, 31].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: Math.sin(a) * ARC.r, z: ARC.cz - Math.cos(a) * ARC.r, rot: -a };
});
/** Zone-local (dx, dz) → world {x, z}, for a zone turned by rot about Y. */
export function zoneToWorld(zone, dx, dz) {
  const c = Math.cos(zone.rot);
  const sn = Math.sin(zone.rot);
  return { x: zone.x + dx * c + dz * sn, z: zone.z - dx * sn + dz * c };
}
export const ZONE_SCREEN = { y: 3.2, z: -6.6, width: 5.2, height: 2.49 };
export const DESKS = ZONES.flatMap((zone, zi) =>
  [0, -3.4].flatMap((dz) => [-3, 0, 3].map((dx) => ({ ...zoneToWorld(zone, dx, dz), rot: zone.rot, zone: zi })))
);
export const AGENTS = DESKS.length;
/** Which slot (0–5) an agent sits in within its zone. */
export const zoneSlot = (i) => i % 6;
const SEAT_OFFSET = 0.85;
// Board canvas is 1024 × 490, so width / (height × 0.98) keeps that 2.09 aspect.
export const WHITEBOARD = { x: 0, z: -12, y: 2.05, width: 6.2, height: 3.03 };
// The experience path: a straight line across the plain, one monolith per job.
export const PATH = { z: -20, from: -10, to: 10, xs: Array.from({ length: JOBS }, (_, k) => (k - (JOBS - 1) / 2) * 5.5) };
export const MONOLITH = { w: 1.6, h: 3.4, d: 0.36 };
export const HERO = { x: 0, z: -3 };

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

// Half the team presents each project; the other half keeps working.
const attends = (i) => i % 2 === 0;
/** Presenters' indices (all attendees) for each of the four projects. */
export const PRESENTERS = [8, 2, 12, 6];

/** A spot in the arc in front of the whiteboard, for attendees. */
function boardSpot(i) {
  const j = i / 2; // 0 … 8
  const angle = mix(-1.0, 1.0, j / 8);
  const radius = 3.5 + (j % 2) * 0.7;
  return { x: WHITEBOARD.x + Math.sin(angle) * radius, z: WHITEBOARD.z + Math.cos(angle) * radius };
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
  const board = boardSpot(i);
  const boardCenter = { x: WHITEBOARD.x, z: WHITEBOARD.z };
  const via = (x) => ({ x, z: -7.6 });

  if (s <= B - 0.45) return seated(desk);

  // Projects: attendees walk to the whiteboard; everyone else keeps working.
  if (s < E - 0.7) {
    if (!goesToBoard) return seated(desk);
    if (s < B + 0.1) {
      const sit = 1 - clamp01((s - (B - 0.45)) / 0.08);
      const t = smoothRange(B - 0.4, B + 0.1, s);
      return { ...alongPath([desk, via(desk.x), board], t), sit, face: t >= 1 ? facing(board, boardCenter) : null, merge: 0 };
    }
    return { ...board, sit: 0, face: facing(board, boardCenter), merge: 0 };
  }

  // Into experience: presenters go back to their desks; everyone works on.
  if (s < E) {
    if (!goesToBoard) return seated(desk);
    const t = smoothRange(E - 0.7, E, s);
    return { ...alongPath([board, via(desk.x), desk], t), sit: t >= 1 ? 1 : 0, face: null, merge: 0 };
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
export const worldOpacity = (s) => 1 - smoothRange(M + 0.3, M + 0.6, s);
export const peopleOpacity = (s) => 1 - smoothRange(M + 0.66, M + 0.78, s);
export const heroOpacity = (s) => smoothRange(M + 0.64, MERGED, s);
// ---------- experience: the walk ----------
/** 0 → 1 as monolith k (job k) rises out of the ground. */
export const monolithRise = (k, s) => smoothRange(E + k - 0.6, E + k - 0.05, s);
/** Where you stand at milestone k: just left of its monolith, a step in front of it. */
const walkSpot = (k) => ({ x: PATH.xs[k] - 1.15, z: PATH.z + 0.75 });

/**
 * The walker (you): onto the path, then monolith to monolith, resting at each
 * stop. After the last one he stays and fades with the plain while the seated
 * figure appears at the desk. Returns { x, z, onPath, atStop }.
 */
export function walkerTarget(s) {
  if (s < E) {
    const t = smoothRange(E - 0.6, E, s);
    return { x: mix(PATH.from, walkSpot(0).x, t), z: walkSpot(0).z, onPath: true, atStop: t >= 1 };
  }
  if (s <= M + 0.2) {
    const u = Math.min(JOBS - 1, s - E);
    const k = Math.min(JOBS - 2, Math.floor(u));
    const f = smoothRange(0.3, 0.95, u - k); // rest near each stop, walk in between
    const a = walkSpot(k);
    const b = walkSpot(k + 1);
    return { x: mix(a.x, b.x, f), z: a.z, onPath: true, atStop: f <= 0 || f >= 1 };
  }
  return { ...walkSpot(JOBS - 1), onPath: true, atStop: true };
}
/** The walker fades in onto the path and out with the plain at the end. */
export const walkerOpacity = (s) => smoothRange(E - 0.6, E - 0.35, s) * (1 - smoothRange(M + 0.25, M + 0.5, s));
/** 0 → 1 as screen i of the final fan flies in. */
export const fanIn = (i, s) => smoothRange(M + 0.62 + i * 0.025, M + 0.82 + i * 0.025, s);
/** Index of the project on the whiteboard, and whether the team is presenting it. */
export const isPresenting = (s) => s > B + 0.05 && s < STOPS.experienceStart - 0.7;
export const boardIndex = (s) => Math.min(3, Math.max(0, Math.round(s - STOPS.projectsStart)));

// ---------- camera ----------
// `offset` shifts the view sideways (or down on mobile) so the subject sits
// beside the text panel instead of behind it.
const boardShot = (i) => {
  const drift = (i - 1.5) * 0.35;
  return { pos: [2.6 + drift, 4.4, 1.8], look: [drift * 0.4, 1.9, WHITEBOARD.z], offset: 1 };
};
// A slow sideways tracking shot along the path, framed on the monolith just risen.
const pathShot = (k) => {
  const x = PATH.xs[k];
  return { pos: [x + 2.6, 2.4, PATH.z + 12], look: [x + 0.3, 1.7, PATH.z], offset: 1 };
};

const CAMERA_KEYS = [
  // mobileZoom: how far phones pull back (default 1.5×); the wide office needs less on a narrow screen.
  { pos: [2.5, 14.5, 23.5], look: [1, 0.2, -3.6], offset: 0, mobileZoom: 0.52 },
  ...[0, 1, 2, 3].map(boardShot),
  ...PATH.xs.map((_, k) => pathShot(k)),
  // On phones the contact panel covers the lower half, so lift the scene above it.
  { pos: [0, 2.9, 8.6], look: [0, 1.6, HERO.z], offset: 0, mobileOffset: 0.9 },
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
  return {
    pos: lerp3(a.pos, b.pos),
    look: lerp3(a.look, b.look),
    offset: mix(a.offset, b.offset, f),
    mobileOffset: mix(mOff(a), mOff(b), f),
    mobileZoom: mix(mZoom(a), mZoom(b), f),
  };
}
