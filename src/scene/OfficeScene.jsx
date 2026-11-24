// The scroll-driven office: 2D pictogram people working at their desks, who
// build each project as a working model on the floor, then merge into one
// figure. Click a person on the home screen to see what they're working on.
// Everything is porcelain fill + oxblood edge lines, in same-colour fog.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { scroll } from "@/lib/scroll";
import {
  AGENTS, BOOK, CONTACT_CAMERA, DESKS, HERO, MERGED, YOU, LEAVES, STOPS, ZONES, ZONE_SCREEN, leavesTurned, smootherstep, zoneSlot, zoneToWorld,
  cameraAt, clamp01, damp, heroOpacity, mix, projectIndex, smoothRange,
  fanIn, peopleOpacity, personTarget, worldOpacity,
} from "./choreography";
import { ICON_WORLD_H, ICON_WORLD_W, createPictogramTextures } from "./pictogram";
import { PAGE_H, PAGE_W, blankPage, bookPage, isLivePage } from "./book";
import { FUTURE_SCREENS, agentCardHeight, drawAgentCard, drawLiveScreen, liveProjectAt } from "./demos";
import {
  MODEL_FLOOR, RISE, STAGGER, SINK, SYSTEMS, nodeSize, packetAt, pathLength, pointAt, tagHeight, trackPoints,
} from "./systems";
import {
  DESK_SCREENS, OXBLOOD, PORCELAIN, drawServerRack, drawSketchBoard, ink, mono, paper, text,
} from "./screens";

// ---------- materials & geometry helpers ----------
const fillMaterial = () =>
  new THREE.MeshBasicMaterial({
    color: PORCELAIN,
    transparent: true,
    polygonOffset: true, // keeps edge lines from z-fighting with the faces
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
const lineMaterial = () => new THREE.LineBasicMaterial({ color: OXBLOOD, transparent: true });

const edgesCache = new WeakMap();
function edgesOf(geometry) {
  let edges = edgesCache.get(geometry);
  if (!edges) {
    edges = new THREE.EdgesGeometry(geometry, 24);
    edgesCache.set(geometry, edges);
  }
  return edges;
}

function boxGeo(w, h, d, x = 0, y = 0, z = 0, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}
function cylGeo(rTop, rBottom, h, segments, x = 0, y = 0, z = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
  g.translate(x, y, z);
  return g;
}
function merge(geometries) {
  const flat = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  flat.forEach((g) => {
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
  });
  const merged = mergeGeometries(flat, false);
  if (!merged) throw new Error("mergeGeometries failed");
  return merged;
}

/** Mesh + its outline. */
function Outlined({ geo, fill, line, ...props }) {
  return (
    <group {...props}>
      <mesh geometry={geo} material={fill} />
      <lineSegments geometry={edgesOf(geo)} material={line} />
    </group>
  );
}

// ---------- canvas-textured surfaces ----------
// Every surface registers here so the updater can fade and redraw them together.
const surfaces = new Set();

function useSurface(width, height, draw, animated, kind = null) {
  const surface = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    draw(ctx, width, height, 0);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    return { ctx, tex, mat, w: width, h: height, draw, animated, kind };
  }, [width, height, draw, animated, kind]);

  useEffect(() => {
    surfaces.add(surface);
    return () => {
      surfaces.delete(surface);
      surface.tex.dispose();
      surface.mat.dispose();
    };
  }, [surface]);
  return surface;
}

// ---------- people (2D pictogram billboards) ----------
// World-space head positions, written by each Person and read by the labels.
const heads = Array.from({ length: AGENTS }, () => ({ x: 0, y: 0, z: 0 }));
// Desk monitor styles, cycled across the agents' desks (and reused for the final fan).
const SCREEN_TYPES = Object.keys(DESK_SCREENS);

const currentStop = () => (scroll.reduced ? Math.round(scroll.s) : scroll.s);

let iconPlane = null;
const getIconPlane = () => {
  if (!iconPlane) {
    iconPlane = new THREE.PlaneGeometry(ICON_WORLD_W, ICON_WORLD_H);
    iconPlane.translate(0, ICON_WORLD_H / 2, 0); // feet on the floor
  }
  return iconPlane;
};
const iconMaterial = (map) =>
  new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide });

/** Turn a group about Y so its plane faces the camera (stays upright). */
function faceCamera(obj, camera, x, z) {
  obj.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z);
}

function Person({ index, icons, selected, onSelect }) {
  const group = useRef(null);
  const flip = useRef(null);
  const material = useMemo(() => iconMaterial(icons.outline.typeA), [icons]);
  const hovered = useRef(false);
  const state = useRef({ x: 0, y: 0, z: 0, sit: 1, walk: 0, phase: index * 1.3, speed: 0, dir: 1, init: false });
  const right = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((three, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const reduced = scroll.reduced;
    const s = currentStop();
    const target = personTarget(index, s);
    const p = state.current;
    const time = reduced ? index * 0.7 : three.clock.elapsedTime;
    // Some jobs walk back and forth (e.g. carrying boxes to the table).
    if (target.move && !reduced) {
      const u = (1 - Math.cos((time / target.move.period + index * 0.17) * Math.PI * 2)) / 2;
      target.x += target.move.dx * u;
      target.z += target.move.dz * u;
    }
    const camera = three.camera;

    let vx = 0;
    let vz = 0;
    if (!p.init || reduced || dt <= 0) {
      p.x = target.x;
      p.y = target.y ?? 0;
      p.z = target.z;
      p.sit = target.sit;
      p.walk = 0;
      p.speed = 0;
      p.init = true;
    } else {
      const nx = damp(p.x, target.x, 5, dt);
      const nz = damp(p.z, target.z, 5, dt);
      vx = (nx - p.x) / dt;
      vz = (nz - p.z) / dt;
      p.speed = damp(p.speed, Math.hypot(vx, vz), 8, dt);
      p.x = nx;
      p.z = nz;
      p.sit = damp(p.sit, target.sit, 6, dt);
      p.walk = damp(p.walk, clamp01((p.speed - 0.12) / 0.8) * (1 - p.sit), 6, dt);
      p.phase += Math.min(p.speed, 3) * dt * 3.4;
    }

    // Which way are they walking on screen? Flip the side-view walk frames to match.
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    const screenDir = vx * right.x + vz * right.z;
    if (Math.abs(screenDir) > 0.05) p.dir = screenDir >= 0 ? 1 : -1;

    const beat = Math.floor(time * 1.4 + index * 0.53) % 2 ? "B" : "A"; // slow two-frame loop
    let pose;
    if (p.sit > 0.5) pose = Math.floor(time * 2.6 + index * 0.37) % 2 ? "typeB" : "typeA";
    else if (p.walk > 0.35) {
      const step = Math.floor(p.phase / Math.PI) % 2 ? "B" : "A";
      pose = target.act === "carry" ? `carryWalk${step}` : `walk${step}`;
    }
    else if (target.act === "point") pose = "point";
    else if (target.act === "laptop") pose = `laptop${beat}`;
    else if (target.act === "carry") pose = `carry${beat}`;
    else if (target.act === "talk") pose = `talk${beat}`;
    else pose = "stand";

    // Highlight only on the home screen, where people can be clicked.
    const solid = (selected || hovered.current) && s < 0.45;
    const map = icons[solid ? "solid" : "outline"][pose];
    if (material.map !== map) material.map = map;
    material.opacity = peopleOpacity(s);

    const size = (0.96 + ((index * 37) % 9) / 100) * mix(1, 0.85, target.merge);
    if (!reduced) p.y = damp(p.y, target.y ?? 0, 3, dt); // e.g. riding the scaffold up
    const bob = Math.abs(Math.sin(p.phase)) * 0.05 * p.walk;
    g.position.set(p.x, p.y + bob, p.z);
    g.scale.setScalar(size);
    faceCamera(g, camera, p.x, p.z);
    if (flip.current) flip.current.scale.x = pose.startsWith("walk") ? p.dir : 1;

    heads[index].x = p.x;
    heads[index].z = p.z;
    heads[index].y = (p.sit > 0.5 ? 1.45 : 2.05) * size;
  });

  // People can only be clicked on the home screen, while they're at their desks.
  const clickable = () => currentStop() < 0.45;
  return (
    <group ref={group}>
      <group ref={flip}>
        <mesh
          geometry={getIconPlane()}
          material={material}
          onClick={(e) => {
            e.stopPropagation();
            if (clickable()) onSelect(index);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            if (!clickable()) return;
            hovered.current = true;
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            hovered.current = false;
            document.body.style.cursor = "";
          }}
        />
      </group>
    </group>
  );
}

// The final figure (and his desk) are drawn larger than the team.
const HERO_SCALE = 1.6;
const HERO_DESK_SCALE = 1.45;

/** The single figure everyone merges into, now working at one desk with headphones on. */
function Hero({ icons, onSelect }) {
  const group = useRef(null);
  const material = useMemo(() => iconMaterial(icons.hero.typeA), [icons]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((three) => {
    const g = group.current;
    if (!g) return;
    const s = currentStop();
    const time = scroll.reduced ? 0 : three.clock.elapsedTime;
    const appear = heroOpacity(s);
    g.visible = appear > 0.001;
    g.scale.setScalar(mix(1.25, HERO_SCALE, appear));
    material.map = icons.hero[Math.floor(time * 2.6) % 2 ? "typeB" : "typeA"];
    material.opacity = heroOpacity(s);
    faceCamera(g, three.camera, HERO.x, HERO.z);
  });
  // Click yourself at the end to see what you're building right now.
  const clickable = () => currentStop() > MERGED - 0.1;
  return (
    <group ref={group} position={[HERO.x, 0, HERO.z]}>
      <mesh
        geometry={getIconPlane()}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          if (clickable()) onSelect(YOU);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (clickable()) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "")}
      />
    </group>
  );
}

// ---------- office furniture ----------
function deskGeometry(role) {
  const parts = [
    boxGeo(1.6, 0.05, 0.8, 0, 0.74, 0), // desktop
    boxGeo(0.05, 0.715, 0.72, -0.76, 0.3575, 0), // legs
    boxGeo(0.05, 0.715, 0.72, 0.76, 0.3575, 0),
    boxGeo(1.47, 0.3, 0.02, 0, 0.55, 0.36), // modesty panel
    boxGeo(0.74, 0.46, 0.035, 0, 1.1, 0.2), // monitor
    boxGeo(0.05, 0.2, 0.05, 0, 0.865, 0.24), // monitor stand
    boxGeo(0.24, 0.015, 0.16, 0, 0.772, 0.24),
    boxGeo(0.46, 0.02, 0.14, 0, 0.775, -0.15), // keyboard
    boxGeo(0.46, 0.06, 0.44, 0, 0.43, -0.85), // chair seat
    boxGeo(0.44, 0.48, 0.05, 0, 0.76, -1.08), // chair back
    boxGeo(0.05, 0.38, 0.05, 0, 0.21, -0.85),
    boxGeo(0.52, 0.03, 0.05, 0, 0.03, -0.85),
    boxGeo(0.05, 0.03, 0.52, 0, 0.03, -0.85),
  ];
  if (role === "devops") parts.push(boxGeo(0.62, 1.75, 0.62, -1.35, 0.875, 0.1)); // server rack
  if (role === "designer") {
    // easel
    parts.push(boxGeo(0.04, 1.5, 0.04, -1.55, 0.72, -0.2));
    parts.push(boxGeo(0.04, 1.5, 0.04, -0.95, 0.72, -0.2));
    parts.push(boxGeo(0.04, 1.4, 0.04, -1.25, 0.68, 0.25));
    parts.push(boxGeo(0.75, 0.04, 0.08, -1.25, 0.5, -0.24));
  }
  if (role === "backend" || role === "ml") parts.push(cylGeo(0.045, 0.04, 0.1, 7, 0.55, 0.815, -0.1)); // mug
  if (role === "qa") parts.push(boxGeo(0.22, 0.01, 0.3, -0.5, 0.77, -0.05, 0.2)); // clipboard
  return merge(parts);
}

/** The hero's desk: like the office desks, but with a laptop so he stays visible. */
function heroDeskGeometry() {
  return merge([
    boxGeo(1.8, 0.05, 0.8, 0, 0.74, 0),
    boxGeo(0.05, 0.715, 0.72, -0.86, 0.3575, 0),
    boxGeo(0.05, 0.715, 0.72, 0.86, 0.3575, 0),
    boxGeo(1.67, 0.3, 0.02, 0, 0.55, 0.36),
    boxGeo(0.4, 0.015, 0.28, 0, 0.772, -0.1), // laptop base
    boxGeo(0.4, 0.26, 0.015, 0, 0.9, 0.05), // laptop lid
    cylGeo(0.045, 0.04, 0.1, 7, 0.6, 0.815, -0.1), // mug
    boxGeo(0.44, 0.48, 0.05, 0, 0.76, -1.08), // chair back
    boxGeo(0.2, 0.03, 0.16, -0.68, 0.78, 0.12), // desk lamp: base
    boxGeo(0.03, 0.5, 0.03, -0.68, 1.03, 0.12), //   stem
    boxGeo(0.3, 0.03, 0.03, -0.55, 1.28, 0.12), //   arm
    boxGeo(0.16, 0.1, 0.14, -0.42, 1.22, 0.12), //   shade
    boxGeo(0.12, 0.09, 0.12, 0.66, 0.79, 0.12), // small plant pot
  ]);
}

function HeroDesk({ fill, line }) {
  const geo = useMemo(() => heroDeskGeometry(), []);
  return (
    <Outlined
      geo={geo}
      fill={fill}
      line={line}
      position={[HERO.x, 0, HERO.z + 0.85 * HERO_DESK_SCALE]}
      scale={HERO_DESK_SCALE}
    />
  );
}

// The seven role screens fan out above the hero at the end: one engineer, every job.
// Five larger screens fan out above him, each a short animation of where AI is heading.
const FAN_Y = [1.75, 2.5, 3.1, 2.5, 1.75];
function FinaleScreen({ index }) {
  const surface = useSurface(512, 314, FUTURE_SCREENS[index], true, "finale");
  const plane = useMemo(() => new THREE.PlaneGeometry(1.5, 0.92), []);
  const group = useRef(null);
  const angle = mix(-1.0, 1.0, index / (FUTURE_SCREENS.length - 1));
  const x = HERO.x + Math.sin(angle) * 2.9;
  const z = HERO.z - 0.6 - Math.cos(angle) * 1.3;

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = fanIn(index, currentStop());
    surface.mat.opacity = t;
    g.visible = t > 0.001;
    g.position.set(x, FAN_Y[index] - (1 - t) * 0.5, z);
    g.rotation.y = Math.atan2(CONTACT_CAMERA[0] - x, CONTACT_CAMERA[2] - z); // face the closing camera
  });

  return (
    <group ref={group}>
      <mesh geometry={plane} material={surface.mat} />
    </group>
  );
}

function FinaleScreens() {
  return FUTURE_SCREENS.map((_, i) => <FinaleScreen key={i} index={i} />);
}

function Desk({ index, fill, line }) {
  const role = SCREEN_TYPES[index % SCREEN_TYPES.length];
  const spot = DESKS[index];
  const geo = useMemo(() => deskGeometry(role), [role]);
  const screen = useSurface(384, 236, DESK_SCREENS[role], true);
  const plane = useMemo(() => new THREE.PlaneGeometry(0.7, 0.43), []);
  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, spot.rot, 0]}>
      <Outlined geo={geo} fill={fill} line={line} />
      <mesh geometry={plane} material={screen.mat} position={[0, 1.1, 0.18]} rotation={[0, Math.PI, 0]} />
      {role === "devops" && <ServerRackFace />}
      {role === "designer" && <SketchBoardFace />}
    </group>
  );
}

function ServerRackFace() {
  const surface = useSurface(128, 360, drawServerRack, true);
  const plane = useMemo(() => new THREE.PlaneGeometry(0.56, 1.6), []);
  return <mesh geometry={plane} material={surface.mat} position={[-1.35, 0.875, -0.215]} rotation={[0, Math.PI, 0]} />;
}

function SketchBoardFace() {
  const surface = useSurface(300, 300, drawSketchBoard, false);
  const plane = useMemo(() => new THREE.PlaneGeometry(0.72, 0.72), []);
  return <mesh geometry={plane} material={surface.mat} position={[-1.25, 0.95, -0.27]} rotation={[0.08, Math.PI, 0]} />;
}

/** A wall screen above each office zone; the three live projects rotate across them. */
// The wall screens are motorised: during the projects they lower into a
// cabinet so the view to the model floor is clear, then rise again after.
const CABINET_H = 0.9;
const screenClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(CABINET_H + 0.02)); // keeps y > cabinet top
const screenLift = (s) => smoothRange(0.12, 0.7, s) * (1 - smoothRange(STOPS.experienceStart - 0.9, STOPS.experienceStart - 0.3, s));

function ZoneScreen({ index, fill, line }) {
  const draw = useMemo(() => (ctx, w, h, t) => drawLiveScreen(ctx, w, h, index, t), [index]);
  const surface = useSurface(1024, 490, draw, true, "zone");
  const { y, z, width, height } = ZONE_SCREEN;
  const top = y + height / 2;
  const geo = useMemo(
    () =>
      merge([
        boxGeo(width + 0.12, height + 0.12, 0.06, 0, y, -0.04),
        boxGeo(0.06, top, 0.06, -width / 2 + 0.3, top / 2, -0.1),
        boxGeo(0.06, top, 0.06, width / 2 - 0.3, top / 2, -0.1),
      ]),
    [y, width, height, top]
  );
  const cabinet = useMemo(() => boxGeo(width + 0.4, CABINET_H, 0.5, 0, CABINET_H / 2, -0.08), [width]);
  const plane = useMemo(() => new THREE.PlaneGeometry(width, height * 0.98), [width, height]);
  const screenPos = zoneToWorld(ZONES[index], 0, z);
  // Own materials, clipped at the cabinet top so the screen disappears into it.
  const mats = useMemo(() => {
    const m = { fill: fill.clone(), line: line.clone() };
    m.fill.clippingPlanes = [screenClip];
    m.line.clippingPlanes = [screenClip];
    return m;
  }, [fill, line]);
  useEffect(() => {
    surface.mat.clippingPlanes = [screenClip];
    return () => {
      mats.fill.dispose();
      mats.line.dispose();
    };
  }, [surface, mats]);
  const lift = useRef(null);
  useFrame(() => {
    const s = currentStop();
    const o = worldOpacity(s);
    mats.fill.opacity = o;
    mats.line.opacity = o;
    if (lift.current) lift.current.position.y = -screenLift(s) * (top - CABINET_H + 0.1);
  });
  return (
    <group position={[screenPos.x, 0, screenPos.z]} rotation={[0, ZONES[index].rot, 0]}>
      <Outlined geo={cabinet} fill={fill} line={line} />
      <group ref={lift}>
        <Outlined geo={geo} fill={mats.fill} line={mats.line} />
        <mesh geometry={plane} material={surface.mat} position={[0, y, 0.01]} />
      </group>
    </group>
  );
}

function Plants({ fill, line }) {
  const geo = useMemo(() => {
    // Between and beside the curved zones, plus a couple deeper in the room.
    const local = [
      [-6.2, 1.9, 1], [6.2, 1.9, 1], [-6.2, -5.6, 1], [6.2, -5.6, 1], [-6.2, 1.9, 0], [6.2, 1.9, 2],
      [-6.2, -5.6, 0], [6.2, -5.6, 2], [-5.2, 6.2, 0], [5.2, 6.2, 2],
    ];
    const spots = [
      ...local.map(([dx, dz, zi]) => zoneToWorld(ZONES[zi], dx, dz)).map(({ x, z }) => [x, z]),
    ];
    const parts = [];
    spots.forEach(([x, z], i) => {
      parts.push(cylGeo(0.22, 0.17, 0.42, 7, x, 0.21, z));
      const leaves = new THREE.IcosahedronGeometry(0.42 + (i % 3) * 0.06, 0);
      leaves.scale(1, 1.35, 1);
      leaves.translate(x, 0.95, z);
      parts.push(leaves);
    });
    return merge(parts);
  }, []);
  return <Outlined geo={geo} fill={fill} line={line} />;
}

// ---------- the model floor (projects) ----------
// Each project builds itself as a working miniature on the floor: components
// rise one by one, tracks are laid between them, then packets run through.
// Moving on sinks the current system back into the floor and builds the next.
const build = { current: 0, previous: -1, changedAt: 0, started: false, now: 0 };
const easeOutBack = (p) => 1 + 2.3 * (p - 1) ** 3 + 1.3 * (p - 1) ** 2;

function nodeGeometry(node) {
  const [w, h, d] = nodeSize(node);
  switch (node.kind) {
    case "tall":
      return merge([
        boxGeo(w, h, d, 0, h / 2, 0),
        ...[0.3, 0.5, 0.7].map((f) => boxGeo(0.04, 0.05, d * 0.7, w / 2 + 0.02, h * f, 0)), // vents
      ]);
    case "store":
      return merge([
        cylGeo(w / 2, w / 2, h, 24, 0, h / 2, 0),
        cylGeo(w / 2 + 0.02, w / 2 + 0.02, 0.03, 24, 0, h * 0.36, 0),
        cylGeo(w / 2 + 0.02, w / 2 + 0.02, 0.03, 24, 0, h * 0.68, 0),
      ]);
    case "file":
      return merge([
        boxGeo(w, h, d, 0, h / 2 + 0.06, 0),
        boxGeo(w * 0.7, 0.06, 0.3, 0, 0.03, 0), // stand
        ...[0.55, 0.66, 0.77].map((f) => boxGeo(w * 0.62, 0.025, 0.02, 0, h * f, d / 2 + 0.01)), // lines of text
      ]);
    case "model":
      return merge([cylGeo(0.22, 0.3, 0.32, 16, 0, 0.16, 0), cylGeo(0.04, 0.04, 0.4, 8, 0, 0.5, 0)]);
    case "gate":
      // An archway across the track (the track runs along x through it).
      return merge([
        boxGeo(0.14, h, 0.14, 0, h / 2, -w / 2),
        boxGeo(0.14, h, 0.14, 0, h / 2, w / 2),
        boxGeo(0.2, 0.16, w + 0.2, 0, h, 0),
        boxGeo(0.36, 0.04, 0.3, 0, 0.02, -w / 2),
        boxGeo(0.36, 0.04, 0.3, 0, 0.02, w / 2),
      ]);
    case "meter":
      return merge([
        boxGeo(w, h, d, 0, h / 2, 0),
        ...[0.2, 0.4, 0.6, 0.8].map((f) => boxGeo(0.1, 0.02, 0.02, w / 2 + 0.05, h * f, d / 2)), // scale ticks
      ]);
    default:
      return merge([boxGeo(w, h, d, 0, h / 2, 0), boxGeo(w * 0.55, 0.05, 0.02, 0, h * 0.62, d / 2 + 0.01)]);
  }
}

const TAG_PX = 64; // canvas px per tag height
const TAG_H = 0.24; // world height of a tag
function NodeTag({ node, tagRef }) {
  const width = Math.ceil(node.label.length * 19.2 + 44);
  const draw = useMemo(
    () => (ctx, w, h) => {
      paper(ctx, w, h, false);
      ctx.strokeStyle = ink(1);
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      text(ctx, node.label, w / 2, h / 2 + 11, mono(32), 1, "center");
    },
    [node.label]
  );
  const surface = useSurface(width, TAG_PX, draw, false, "tag");
  const plane = useMemo(() => new THREE.PlaneGeometry((width / TAG_PX) * TAG_H, TAG_H), [width]);
  useEffect(() => {
    surface.mat.opacity = 0;
    tagRef.current = surface.mat;
  }, [surface, tagRef]);
  return <mesh userData={{ tag: true }} geometry={plane} material={surface.mat} position={[node.x, tagHeight(node), node.z]} />;
}

/** Two rails either side of a track, as polylines (so they can be laid progressively). */
function railGeometries(pts) {
  const rails = [-0.07, 0.07].map((off) =>
    pts.map((p, i) => {
      // Mitred offset at each corner (tracks only turn at right angles).
      const prev = pts[Math.max(0, i - 1)];
      const next = pts[Math.min(pts.length - 1, i + 1)];
      const dir = (a, b) => {
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      };
      const d1 = i > 0 ? dir(prev, p) : dir(p, next);
      const d2 = i < pts.length - 1 ? dir(p, next) : d1;
      const nx = -(d1[1] + d2[1]);
      const nz = d1[0] + d2[0];
      const nl = Math.hypot(nx, nz) || 1;
      const miter = 1 / Math.max(0.5, (nx / nl) * -d1[1] + (nz / nl) * d1[0]);
      return [p[0] + (nx / nl) * off * miter, p[1] + (nz / nl) * off * miter];
    })
  );
  // Resample every 5 cm so the draw range can grow smoothly.
  return rails.map((rail) => {
    const len = pathLength(rail);
    const count = Math.max(2, Math.ceil(len / 0.05));
    const positions = [];
    for (let k = 0; k <= count; k++) {
      const [x, z] = pointAt(rail, k / count);
      positions.push(x, 0.075, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return g;
  });
}

const PACKETS_PER_LINK = 3;
const packetGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

function SystemModel({ index, fill, line }) {
  const system = SYSTEMS[index];
  const group = useRef(null);
  const nodeRefs = useRef([]);
  const tagRefs = useMemo(() => system.nodes.map(() => ({ current: null })), [system]);
  const spinner = useRef([]);
  const geos = useMemo(() => system.nodes.map(nodeGeometry), [system]);
  const ico = useMemo(() => new THREE.IcosahedronGeometry(0.42, 0), []);
  const tracks = useMemo(
    () =>
      system.links.map((link) => {
        const pts = trackPoints(system, link);
        const rails = railGeometries(pts).map((g) => new THREE.Line(g, line));
        const from = system.nodes.findIndex((node) => node.id === link.from);
        const to = system.nodes.findIndex((node) => node.id === link.to);
        return { link, pts, len: pathLength(pts), rails, after: Math.max(from, to) };
      }),
    [system, line]
  );
  const packetMat = useMemo(() => new THREE.MeshBasicMaterial({ color: OXBLOOD, transparent: true }), []);
  const packets = useMemo(() => {
    const mesh = new THREE.InstancedMesh(packetGeo, packetMat, tracks.length * PACKETS_PER_LINK);
    mesh.frustumCulled = false;
    return mesh;
  }, [tracks, packetMat]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => packetMat.dispose(), [packetMat]);

  // Time each node starts rising, and when the whole system is up.
  const nodeStart = (i) => 0.25 + i * STAGGER;
  const builtAt = nodeStart(system.nodes.length - 1) + RISE + 0.35;

  useFrame(({ camera }) => {
    const g = group.current;
    if (!g) return;
    const reduced = scroll.reduced;
    const elapsed = reduced ? 999 : build.now - build.changedAt;
    let up; // 0 → 1: how built this system is, per node
    if (index === build.current) up = (i) => clamp01((elapsed - nodeStart(i)) / RISE);
    else if (index === build.previous && !reduced) up = () => 1 - clamp01(elapsed / SINK);
    else up = () => 0;
    const sinking = index !== build.current;
    const dim = worldOpacity(currentStop()); // dims with the office at the end
    packetMat.opacity = dim;
    g.visible = up(system.nodes.length - 1) > 0 || up(0) > 0;
    if (!g.visible) return;

    system.nodes.forEach((node, i) => {
      const p = up(i);
      const obj = nodeRefs.current[i];
      if (obj) {
        obj.visible = p > 0.001;
        obj.scale.set(1, Math.max(0.001, sinking ? p : easeOutBack(p)), 1);
      }
      const tag = tagRefs[i].current;
      if (tag) tag.opacity = clamp01((p - 0.6) / 0.4) * dim;
      const spin = spinner.current[i];
      if (spin) {
        spin.visible = p > 0.001;
        spin.position.y = 1.05 * (sinking ? p : easeOutBack(p));
        if (!reduced) spin.rotation.set(0.4, build.now * 0.6, 0.2);
      }
    });
    g.children.forEach((child) => {
      if (child.userData.tag) child.quaternion.copy(camera.quaternion);
    });

    // Lay each track once both its ends are up; take it up when sinking.
    tracks.forEach((track) => {
      const p = sinking ? up(0) : clamp01((elapsed - nodeStart(track.after) - RISE * 0.6) / 0.45);
      track.rails.forEach((rail) => {
        const count = rail.geometry.attributes.position.count;
        rail.geometry.setDrawRange(0, Math.floor(p * count));
      });
    });

    // Packets run once the whole system is built.
    const flow = sinking ? 0 : clamp01((elapsed - builtAt) / 0.4);
    const t = reduced ? 1.3 : build.now;
    tracks.forEach((track, li) => {
      for (let k = 0; k < PACKETS_PER_LINK; k++) {
        const f = packetAt(track.link, track.len, k, PACKETS_PER_LINK, t);
        const [x, z] = pointAt(track.pts, f);
        pos.set(x, 0.14, z);
        const size = flow * (f < 0.04 || f > 0.96 ? 0.4 : 1); // shrink into the boxes at either end
        scl.setScalar(Math.max(0.0001, size));
        m4.compose(pos, q, scl);
        packets.setMatrixAt(li * PACKETS_PER_LINK + k, m4);
      }
    });
    packets.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group} visible={false}>
      {system.nodes.map((node, i) => (
        <group key={node.id} ref={(el) => (nodeRefs.current[i] = el)} position={[node.x, 0.06, node.z]}>
          <Outlined geo={geos[i]} fill={fill} line={line} />
          {node.kind === "meter" && (
            <mesh material={packetMat} position={[0, nodeSize(node)[1] * 0.82, 0]}>
              <boxGeometry args={[nodeSize(node)[0] + 0.1, 0.06, nodeSize(node)[2] + 0.1]} />
            </mesh>
          )}
        </group>
      ))}
      {system.nodes.map((node, i) =>
        node.kind === "model" ? (
          <group key={`spin-${node.id}`} ref={(el) => (spinner.current[i] = el)} position={[node.x, 1.05, node.z]}>
            <Outlined geo={ico} fill={fill} line={line} />
          </group>
        ) : null
      )}
      {tracks.map((track, i) => track.rails.map((rail, r) => <primitive key={`${i}-${r}`} object={rail} />))}
      <primitive object={packets} />
      {system.nodes.map((node, i) => (
        <NodeTag key={`tag-${node.id}`} node={node} tagRef={tagRefs[i]} />
      ))}
    </group>
  );
}

function ModelFloor({ fill, line }) {
  const { x, z, w, d } = MODEL_FLOOR;
  // A low plinth with corner marks, like a model-maker's base board.
  const geo = useMemo(() => {
    const parts = [boxGeo(w, 0.06, d, 0, 0.03, 0)];
    [-1, 1].forEach((sx) =>
      [-1, 1].forEach((sz) => {
        parts.push(boxGeo(0.5, 0.03, 0.05, sx * (w / 2 - 0.45), 0.075, sz * (d / 2 - 0.2)));
        parts.push(boxGeo(0.05, 0.03, 0.5, sx * (w / 2 - 0.2), 0.075, sz * (d / 2 - 0.45)));
      })
    );
    return merge(parts);
  }, [w, d]);
  const group = useRef(null);

  // Always standing in the office: the first project before you reach it,
  // the last one after you've moved on to the book.
  useFrame((three) => {
    const s = currentStop();
    build.now = three.clock.elapsedTime;
    const index = projectIndex(s);
    if (!build.started) {
      build.started = true;
      build.current = index;
      build.previous = -1;
      build.changedAt = build.now;
    } else if (index !== build.current) {
      build.previous = build.current;
      build.current = index;
      build.changedAt = build.now;
    }
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <Outlined geo={geo} fill={fill} line={line} />
      {SYSTEMS.map((_, i) => (
        <SystemModel key={i} index={i} fill={fill} line={line} />
      ))}
    </group>
  );
}

// ---------- server room behind the model floor ----------
const RACK_ROWS = [
  { from: -13.4, to: -6.2, z: -21.8 },
  { from: 6.2, to: 13.4, z: -21.8 },
];
function ServerRoom({ fill, line }) {
  const leds = useSurface(128, 360, drawServerRack, true); // one animated texture, shared by every rack
  const racks = useMemo(() => {
    const out = [];
    RACK_ROWS.forEach(({ from, to, z }) => {
      for (let x = from; x <= to + 0.01; x += 0.9) out.push({ x, z });
    });
    return out;
  }, []);
  const geo = useMemo(() => {
    const parts = [];
    racks.forEach(({ x, z }) => parts.push(boxGeo(0.78, 2.3, 0.95, x, 1.15, z)));
    RACK_ROWS.forEach(({ from, to, z }) => {
      const len = to - from + 0.9;
      const cx = (from + to) / 2;
      parts.push(boxGeo(len, 0.08, 0.42, cx, 2.62, z)); // cable tray
      for (let x = from; x <= to + 0.01; x += 1.8) parts.push(boxGeo(0.05, 0.3, 0.05, x, 2.45, z)); // tray drops
      parts.push(boxGeo(len + 0.6, 0.04, 2.4, cx, 0.02, z + 0.3)); // raised floor
    });
    return merge(parts);
  }, [racks]);
  const face = useMemo(() => new THREE.PlaneGeometry(0.62, 1.74), []);
  return (
    <group>
      <Outlined geo={geo} fill={fill} line={line} />
      {racks.map(({ x, z }, i) => (
        <mesh key={i} geometry={face} material={leds.mat} position={[x, 1.2, z + 0.48]} />
      ))}
    </group>
  );
}

// ---------- experience: the book ----------
const E = STOPS.experienceStart;
const BOOK_TOP = BOOK.table + 0.03 + 0.05; // table top + back board + page block
const SEGMENTS = 18; // across the page width, for the curl as it turns

/** A page plane lying flat (facing +y, top toward -z), spanning x = 0 … W from the spine. */
function leafGeometry(w, h, back) {
  const g = new THREE.PlaneGeometry(w, h, SEGMENTS, 1);
  g.rotateX(-Math.PI / 2);
  if (back) g.rotateZ(Math.PI); // the other side of the sheet: faces -y, reads correctly once turned
  g.translate(w / 2, back ? -0.0012 : 0.0012, 0);
  g.userData.base = Float32Array.from(g.attributes.position.array);
  return g;
}

/** Bend a leaf upward toward its outer edge while it turns (0 = flat). */
function curl(g, w, bend) {
  const pos = g.attributes.position;
  const base = g.userData.base;
  for (let v = 0; v < pos.count; v++) {
    const x = base[v * 3];
    pos.setY(v, base[v * 3 + 1] + bend * (x / w) ** 2);
  }
  pos.needsUpdate = true;
}

function usePage(n) {
  const draw = bookPage(n) ?? blankPage;
  const live = isLivePage(n);
  return useSurface(PAGE_W, PAGE_H, draw, live, live ? "book" : null);
}

/** One sheet: front page (2i) seen on the right, back page (2i + 1) on the left once turned. */
function Leaf({ index }) {
  const isCover = index === 0;
  const w = BOOK.pageW + (isCover ? 0.05 : 0);
  const h = BOOK.pageH + (isCover ? 0.08 : 0);
  const front = usePage(2 * index);
  const back = usePage(2 * index + 1);
  const frontGeo = useMemo(() => leafGeometry(w, h, false), [w, h]);
  const backGeo = useMemo(() => leafGeometry(w, h, true), [w, h]);
  const pivot = useRef(null);
  const last = useRef(-1);

  useFrame(() => {
    const g = pivot.current;
    if (!g) return;
    const turn = smootherstep(pages.turned - index);
    // Stack order: unturned leaves on the right (first on top), turned ones on the left (latest on top).
    const yRight = BOOK_TOP + (LEAVES - index) * 0.004;
    const yLeft = BOOK_TOP + index * 0.004;
    g.position.set(BOOK.x, mix(yRight, yLeft, turn), BOOK.z);
    g.rotation.z = turn * Math.PI;
    if (turn !== last.current) {
      last.current = turn;
      const bend = isCover ? 0 : Math.sin(turn * Math.PI) * 0.32;
      curl(frontGeo, w, bend);
      curl(backGeo, w, bend);
    }
  });

  return (
    <group ref={pivot}>
      <mesh geometry={frontGeo} material={front.mat} />
      <mesh geometry={backGeo} material={back.mat} />
    </group>
  );
}

/** The writing table, the book's boards and page blocks, a ribbon, a pen and an inkwell. */
function BookSet({ fill, line }) {
  const { x, z, table, pageW, pageH } = BOOK;
  const geo = useMemo(() => {
    const parts = [
      boxGeo(4.6, 0.06, 3.1, x + 0.2, table - 0.03, z), // table top
      boxGeo(2 * pageW + 0.14, 0.03, pageH + 0.12, x, table + 0.015, z), // back board
      boxGeo(pageW, 0.05, pageH - 0.02, x - pageW / 2, table + 0.055, z), // left page block
      boxGeo(pageW, 0.05, pageH - 0.02, x + pageW / 2, table + 0.055, z), // right page block
    ];
    for (const [lx, lz] of [[-2.05, -1.4], [2.45, -1.4], [-2.05, 1.4], [2.45, 1.4]]) {
      parts.push(boxGeo(0.07, table - 0.06, 0.07, x + lx, (table - 0.06) / 2, z + lz));
    }
    // fountain pen, lying at an angle beside the book
    const pen = new THREE.CylinderGeometry(0.03, 0.022, 0.95, 10);
    pen.rotateZ(Math.PI / 2);
    pen.rotateY(0.45);
    pen.translate(x + 2.05, table + 0.03, z + 0.35);
    parts.push(pen);
    const nib = new THREE.ConeGeometry(0.022, 0.12, 8);
    nib.rotateZ(Math.PI / 2);
    nib.rotateY(0.45);
    nib.translate(x + 2.05 - Math.cos(0.45) * 0.53, table + 0.03, z + 0.35 + Math.sin(0.45) * 0.53);
    parts.push(nib);
    parts.push(cylGeo(0.13, 0.15, 0.16, 12, x + 2.1, table + 0.08, z - 0.8)); // inkwell
    parts.push(cylGeo(0.06, 0.06, 0.05, 10, x + 2.1, table + 0.185, z - 0.8));
    return merge(parts);
  }, [x, z, table, pageW, pageH]);

  // A ribbon bookmark: lies across the right page and hangs over the bottom edge.
  const ribbon = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const y0 = BOOK_TOP + 0.03;
    const rx = x + 0.07;
    const z0 = z + pageH * 0.2;
    const z1 = z + pageH / 2 + 0.02;
    const w2 = 0.018;
    const pts = [
      [rx - w2, y0, z0], [rx + w2, y0, z0], [rx + w2, y0, z1],
      [rx - w2, y0, z0], [rx + w2, y0, z1], [rx - w2, y0, z1],
      [rx - w2, y0, z1], [rx + w2, y0, z1], [rx + w2 + 0.04, table + 0.0, z1 + 0.18],
      [rx - w2, y0, z1], [rx + w2 + 0.04, table + 0.0, z1 + 0.18], [rx - w2 + 0.04, table + 0.0, z1 + 0.18],
    ].flat();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [x, z, table, pageH]);
  const ribbonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: OXBLOOD, transparent: true, side: THREE.DoubleSide }), []);
  useEffect(() => () => ribbonMat.dispose(), [ribbonMat]);
  useFrame(() => {
    ribbonMat.opacity = fill.opacity;
  });

  return (
    <>
      <Outlined geo={geo} fill={fill} line={line} />
      <mesh geometry={ribbon} material={ribbonMat} />
    </>
  );
}

// How many leaves are turned right now (fractional while one is turning). It
// moves toward leavesTurned(s) at about a second per leaf, so each turn plays
// in full once you've arrived; a long jump (e.g. from the nav) goes faster.
const pages = { turned: 0 };
const SECONDS_PER_LEAF = 1.05;

/** The experience book: always on its table at the back of the office. */
function TheBook({ fill, line }) {
  useFrame((_, delta) => {
    const target = leavesTurned(currentStop(), scroll.mobile);
    if (scroll.reduced) {
      pages.turned = target;
      return;
    }
    const diff = target - pages.turned;
    const step = (Math.max(1, Math.abs(diff) * 0.6) / SECONDS_PER_LEAF) * Math.min(delta, 0.05);
    pages.turned = Math.abs(diff) <= step ? target : pages.turned + Math.sign(diff) * step;
  });
  return (
    <group>
      <BookSet fill={fill} line={line} />
      {Array.from({ length: LEAVES }, (_, i) => (
        <Leaf key={i} index={i} />
      ))}
    </group>
  );
}

function FloorGrid({ mobile }) {
  const ref = useRef(null);
  useEffect(() => {
    const mat = ref.current?.material;
    if (mat) {
      mat.transparent = true;
      mat.opacity = 0.15;
      mat.depthWrite = false;
    }
  }, []);
  return <gridHelper ref={ref} args={[110, mobile ? 55 : 110, OXBLOOD, OXBLOOD]} position={[0, 0, -6]} />;
}

// ---------- per-frame controllers ----------
function CameraRig({ mobile }) {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const smooth = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3(), offset: 0, init: false });
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const key = cameraAt(currentStop());
    look.set(...key.look);
    pos.set(...key.pos);
    if (!scroll.reduced) {
      const time = performance.now() / 1000;
      pos.x += Math.sin(time * 0.17) * 0.35;
      pos.y += Math.sin(time * 0.13) * 0.12;
    }
    if (mobile) pos.sub(look).multiplyScalar(key.mobileZoom).add(look); // reframe for narrow screens

    const c = smooth.current;
    if (!c.init || scroll.reduced) {
      c.pos.copy(pos);
      c.look.copy(look);
      c.offset = mobile ? key.mobileOffset : key.offset;
      c.init = true;
    } else {
      const k = 1 - Math.exp(-2.4 * dt);
      c.pos.lerp(pos, k);
      c.look.lerp(look, k);
      c.offset += ((mobile ? key.mobileOffset : key.offset) - c.offset) * k;
    }
    camera.position.copy(c.pos);
    camera.lookAt(c.look);

    // Shift the subject beside the text panel (desktop) or above it (mobile).
    const { width, height } = size;
    if (mobile) camera.setViewOffset(width, height, 0, height * 0.18 * c.offset, width, height);
    else camera.setViewOffset(width, height, -width * 0.21 * c.offset, 0, width, height);
  });
  return null;
}

function SurfaceUpdater({ mats, mobile, world }) {
  const track = useRef({ redraw: 0, zoneDraw: 0 });
  const invalidate = useThree((st) => st.invalidate);

  useEffect(() => {
    let alive = true;
    // Redraw once webfonts are ready so canvas text uses the right faces.
    document.fonts?.ready.then(() => {
      if (!alive) return;
      surfaces.forEach((sf) => {
        sf.draw(sf.ctx, sf.w, sf.h, 0);
        sf.tex.needsUpdate = true;
      });
      invalidate();
    });
    // With reduced motion the canvas only renders on demand: re-render when the stop changes.
    let lastStop = Math.round(scroll.s);
    const onScroll = () => {
      const stop = Math.round(scroll.s);
      if (scroll.reduced && stop !== lastStop) {
        lastStop = stop;
        invalidate();
      }
    };
    scroll.listeners.add(onScroll);
    return () => {
      alive = false;
      scroll.listeners.delete(onScroll);
    };
  }, [invalidate]);

  useFrame((three) => {
    const s = currentStop();
    const w = worldOpacity(s);
    mats.worldFill.opacity = w;
    mats.worldLine.opacity = w;
    surfaces.forEach((sf) => {
      if (sf.kind === null || sf.kind === "board" || sf.kind === "zone") sf.mat.opacity = w;
    });
    if (world.current) world.current.visible = w > 0.005;
    const h = heroOpacity(s);
    mats.heroFill.opacity = h;
    mats.heroLine.opacity = h;

    const t = track.current;
    const now = three.clock.elapsedTime;

    // Smooth playback for what's in view. The wall screens keep running all the
    // way through (the office never stops), the book's figures once it's open,
    // and the final fan at the end.
    const finale = s > STOPS.end - 0.5;
    const playing = new Set(finale ? ["finale"] : s > E - 0.6 ? ["zone", "book"] : ["zone"]);
    if (!scroll.reduced && now - t.zoneDraw > (mobile ? 0.2 : 0.1)) {
      t.zoneDraw = now;
      surfaces.forEach((sf) => {
        if (!playing.has(sf.kind)) return;
        sf.draw(sf.ctx, sf.w, sf.h, now);
        sf.tex.needsUpdate = true;
      });
    }

    // Animate the desk screens a few times a second (desktop, full motion, while visible).
    if (!mobile && !scroll.reduced && now - t.redraw > 0.4) {
      t.redraw = now;
      surfaces.forEach((sf) => {
        if (!sf.animated || sf.kind === "zone" || sf.kind === "finale" || sf.mat.opacity < 0.005) return;
        sf.draw(sf.ctx, sf.w, sf.h, now);
        sf.tex.needsUpdate = true;
      });
    }
  });
  return null;
}

/**
 * Card over the clicked agent's desk: the feature it's working on. Each click on
 * the same agent shows its next feature. Click the card (or anywhere else) to close.
 */
function DeskCard({ index, clicks, mobile, onClose, onNext }) {
  // The agent works on whatever project its zone's screen is showing right now.
  const clock = useThree((st) => st.clock);
  const you = index === YOU;
  // You work across all three projects: each click is the next thing being built,
  // rotating through the projects.
  const info = useMemo(
    () =>
      you
        ? { you, project: clicks % 3, feature: Math.floor(clicks / 3) }
        : { agent: index, project: liveProjectAt(DESKS[index].zone, clock.elapsedTime), feature: zoneSlot(index) + clicks },
    [you, index, clicks, clock]
  );
  const draw = useMemo(() => (ctx, w, h) => drawAgentCard(ctx, w, h, info), [info]);
  const cardH = useMemo(() => agentCardHeight(880, info), [info]);
  const surface = useSurface(880, cardH, draw, false, "card");
  const planeH = (2.2 * cardH) / 880;
  const plane = useMemo(() => new THREE.PlaneGeometry(2.2, planeH), [planeH]);
  const mesh = useRef(null);
  const openedAt = useRef(null);
  const desk = DESKS[index];
  const forward = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    surface.mat.depthTest = false; // always readable on top of the office
    surface.mat.opacity = 0;
  }, [surface]);
  useFrame(({ camera, clock, size }) => {
    const m = mesh.current;
    if (!m) return;
    openedAt.current ??= clock.elapsedTime;
    m.quaternion.copy(camera.quaternion);
    if (mobile || you) {
      // Phones (too narrow to float the card by the desk) and your own card:
      // held in front of the camera, in the upper part of the screen.
      const dist = 6;
      const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * (size.width / size.height);
      camera.getWorldDirection(forward);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      m.position.copy(camera.position).addScaledVector(forward, dist).addScaledVector(up, visH * (you ? (mobile ? 0.12 : 0.29) : 0.2));
      m.scale.setScalar((visW * (mobile ? 0.9 : 0.34)) / 2.2);
    } else {
      m.position.set(desk.x, 1.8 + (planeH / 2) * 2, desk.z - 0.4);
      m.scale.setScalar(2);
    }
    surface.mat.opacity = scroll.reduced ? 1 : Math.min(1, (clock.elapsedTime - openedAt.current) / 0.35);
  });

  return (
    <mesh
      ref={mesh}
      geometry={plane}
      material={surface.mat}
      renderOrder={20}
      onClick={(e) => {
        e.stopPropagation();
        // Your card sits over the figure, so clicking it shows the next message.
        if (you) onNext();
        else onClose();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    />
  );
}

/** The selected agent's desk card. */
function SceneLabels({ selected, mobile, onClose, onNext }) {
  return (
    <>
      {selected && (
        <DeskCard
          key={`${selected.index}-${selected.clicks}`}
          index={selected.index}
          clicks={selected.clicks}
          mobile={mobile}
          onClose={onClose}
          onNext={onNext}
        />
      )}
    </>
  );
}

// ---------- scene root ----------
function World({ mobile, selected, onSelect }) {
  const mats = useMemo(
    () => ({ worldFill: fillMaterial(), worldLine: lineMaterial(), heroFill: fillMaterial(), heroLine: lineMaterial() }),
    []
  );
  const icons = useMemo(() => createPictogramTextures(), []);
  useEffect(() => () => icons.dispose(), [icons]);
  const world = useRef(null);

  return (
    <>
      <color attach="background" args={[PORCELAIN]} />
      <fog attach="fog" args={[PORCELAIN, 16, mobile ? 70 : 82]} />
      <FloorGrid mobile={mobile} />
      <group ref={world}>
        {DESKS.map((_, i) => (
          <Desk key={i} index={i} fill={mats.worldFill} line={mats.worldLine} />
        ))}
        <ModelFloor fill={mats.worldFill} line={mats.worldLine} />
        {ZONES.map((_, i) => (
          <ZoneScreen key={i} index={i} fill={mats.worldFill} line={mats.worldLine} />
        ))}
        <TheBook fill={mats.worldFill} line={mats.worldLine} />
        <ServerRoom fill={mats.worldFill} line={mats.worldLine} />
        {!mobile && <Plants fill={mats.worldFill} line={mats.worldLine} />}
      </group>
      {DESKS.map((_, i) => (
        <Person key={i} index={i} icons={icons} selected={selected?.index === i} onSelect={onSelect} />
      ))}
      <Hero icons={icons} onSelect={onSelect} />
      <HeroDesk fill={mats.heroFill} line={mats.heroLine} />
      <FinaleScreens />
      <SceneLabels selected={selected} mobile={mobile} onClose={() => onSelect(null)} onNext={() => onSelect(YOU)} />
      <CameraRig mobile={mobile} />
      <SurfaceUpdater mats={mats} mobile={mobile} world={world} />
    </>
  );
}

export default function OfficeScene({ mobile, reduced, selected, onSelect }) {
  return (
    <div className="fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        onPointerMissed={() => onSelect(null)}
        flat
        dpr={mobile ? [1, 1.25] : [1, 2]}
        frameloop={reduced ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true; // the wall screens lower into their cabinets
        }}
        camera={{ fov: mobile ? 52 : 36, near: 0.1, far: 120, position: [11.5, 8.6, 12.5] }}
        gl={{ antialias: true, powerPreference: mobile ? "low-power" : "high-performance" }}
      >
        <World mobile={mobile} selected={selected} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
