// The model floor: each project as a working miniature of its system, built on
// the office floor in front of the server room. Components rise out of the
// floor, tracks are laid between them, then data packets run through.
//
// Coordinates are metres, local to MODEL_FLOOR (x across, z toward the camera).
// Node kinds: box (a service), tall (a big component), store (data, a drum),
// file (a document slab), model (a floating, turning polyhedron), gate (an
// archway packets pass through), meter (a tall pillar).
// Link options: bounce (packets turn back part-way: rejected), hold (packets
// queue up before the end: held back).

export const MODEL_FLOOR = { x: 0, z: -17, w: 11.2, d: 6 };

/** Seconds: a system sinking away, one node rising, the gap between nodes. */
export const SINK = 0.5;
export const RISE = 0.55;
export const STAGGER = 0.16;
/** Packet speed along a track, m/s. */
export const PACKET_SPEED = 1.5;

const n = (id, x, z, kind, label, size) => ({ id, x, z, kind, label, size });
const l = (from, to, opts = {}) => ({ from, to, ...opts });

export const SYSTEMS = [
  // Feather AI: quantize, measure, and only recommend what passed.
  {
    nodes: [
      n("src", -4.5, 0, "file", "F16 · 1590 MiB"),
      n("quant", -2.7, 0, "box", "quantize"),
      n("q8", -0.8, -1.3, "box", "Q8_0 · ×1.47", [1.2, 0.55, 0.8]),
      n("q4", -0.8, 1.3, "box", "Q4_K_M · ×1.77", [1.2, 0.55, 0.8]),
      n("bench", 1.2, 0, "tall", "benchmark", [1.1, 1.0, 1.4]),
      n("gate", 2.9, 0, "gate", "quality ±10 pp"),
      n("rec", 4.4, 0, "store", "recommended"),
    ],
    links: [l("src", "quant"), l("quant", "q8"), l("quant", "q4"), l("q8", "bench"), l("q4", "bench"), l("bench", "gate"), l("gate", "rec")],
  },
  // Intelligent API Gateway: every request checked, limited and routed.
  {
    nodes: [
      n("web", -4.4, -1.7, "box", "web", [0.8, 0.45, 0.6]),
      n("mobile", -4.4, 0, "box", "mobile", [0.8, 0.45, 0.6]),
      n("cli", -4.4, 1.7, "box", "cli", [0.8, 0.45, 0.6]),
      n("gw", -1.3, 0, "tall", "gateway · JWT", [1.2, 1.5, 3.8]),
      n("redis", 0.6, 2.2, "store", "rate limit · redis"),
      n("users", 3.6, -1.7, "box", "users"),
      n("orders", 3.6, 0, "box", "orders"),
      n("search", 3.6, 1.7, "box", "search · 503"),
    ],
    links: [
      l("web", "gw"),
      l("mobile", "gw"),
      l("cli", "gw", { bounce: true }), // 429: over the limit
      l("gw", "redis"),
      l("gw", "users"),
      l("gw", "orders"),
      l("gw", "search", { bounce: true }), // breaker open
    ],
  },
  // DocuIntel AI: answers grounded in your documents, with citations.
  {
    nodes: [
      n("pdf", -4.5, -1.1, "file", "contract.pdf"),
      n("chunk", -2.8, -1.1, "box", "chunk"),
      n("embed", -1.0, -1.1, "box", "embed"),
      n("vec", 1.0, -1.1, "store", "vector store"),
      n("query", -1.0, 1.6, "box", "query", [0.8, 0.45, 0.6]),
      n("llm", 2.8, 0.5, "model", "LLM"),
      n("ans", 4.5, 0.5, "file", "answer [1] [2]"),
    ],
    links: [l("pdf", "chunk"), l("chunk", "embed"), l("embed", "vec"), l("query", "vec"), l("vec", "llm"), l("llm", "ans")],
  },
  // DeployGuard AI: catching the regression before users do.
  {
    nodes: [
      n("v23", -4.4, -1.3, "box", "release v2.3", [1.0, 0.5, 0.7]),
      n("v24", -4.4, 1.3, "box", "release v2.4", [1.0, 0.5, 0.7]),
      n("cmp", -2.4, 0, "box", "compare"),
      n("reg", -0.5, 0, "gate", "regression check"),
      n("risk", 1.3, 0, "meter", "risk 82"),
      n("hold", 2.9, 0, "gate", "hold rollout"),
      n("prod", 4.5, 0, "store", "production"),
    ],
    links: [l("v23", "cmp"), l("v24", "cmp"), l("cmp", "reg"), l("reg", "risk"), l("risk", "hold"), l("hold", "prod", { hold: true })],
  },
];

const DEFAULT_SIZE = {
  box: [1.1, 0.65, 0.8],
  tall: [1.1, 1.2, 1.2],
  store: [0.9, 0.7, 0.9],
  file: [0.62, 0.85, 0.1],
  model: [0.9, 1.6, 0.9],
  gate: [0.9, 1.15, 0.5],
  meter: [0.55, 1.7, 0.55],
};
export const nodeSize = (node) => node.size ?? DEFAULT_SIZE[node.kind];
/** Height of a node's label above the floor. */
export const tagHeight = (node) => nodeSize(node)[1] + 0.38;

/** A link's track: right-angled, turning halfway across, like a circuit trace. */
export function trackPoints(system, link) {
  const a = system.nodes.find((node) => node.id === link.from);
  const b = system.nodes.find((node) => node.id === link.to);
  if (Math.abs(a.z - b.z) < 0.01 || Math.abs(a.x - b.x) < 0.01) return [[a.x, a.z], [b.x, b.z]];
  // Fan-outs turn near the source, fan-ins near the target, so shared runs overlap neatly.
  const toward = system.links.filter((k) => k.to === link.to).length > 1;
  const mx = toward ? b.x - Math.min(0.9, (b.x - a.x) * 0.45) : a.x + Math.min(0.9, (b.x - a.x) * 0.45);
  return [[a.x, a.z], [mx, a.z], [mx, b.z], [b.x, b.z]];
}

export function pathLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return total;
}

/** Point at fraction t (0–1) along a track. */
export function pointAt(pts, t) {
  let remaining = Math.min(1, Math.max(0, t)) * pathLength(pts);
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (remaining <= len || i === pts.length - 1) {
      const f = len === 0 ? 1 : Math.min(1, remaining / len);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
    remaining -= len;
  }
  return pts[pts.length - 1];
}

/**
 * Where packet k (of `count`) on a link is at time t, as a fraction of the
 * track, or null when it's hidden. Rejected packets turn back two-thirds of the
 * way; held ones queue up before the gate.
 */
export function packetAt(link, len, k, count, t) {
  const cycle = (len / PACKET_SPEED) * (link.bounce ? 1.4 : 1);
  const u = (t / cycle + k / count) % 1;
  if (link.bounce) {
    const turn = 0.66;
    return u < 0.5 ? (u / 0.5) * turn : turn * (1 - (u - 0.5) / 0.5);
  }
  if (link.hold) return Math.max(0.05, 0.42 - k * (0.16 / Math.max(1, len)));
  return u;
}
