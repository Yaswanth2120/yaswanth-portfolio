// The scroll-driven office: seven 2D pictogram people working at their desks
// who gather at a whiteboard, work at sites along the milestone path, then
// merge into one figure. Click a person on the home screen to see their role.
// Everything is porcelain fill + oxblood edge lines, in same-colour fog.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { scroll } from "@/lib/scroll";
import {
  AGENTS, DESKS, HERO, JOBS, MONOLITH, PATH, PRESENTERS, STOPS, WHITEBOARD, ZONES, ZONE_SCREEN, monolithRise, walkerOpacity, walkerTarget, zoneSlot, zoneToWorld,
  boardIndex, cameraAt, clamp01, damp, heroOpacity, isPresenting, mix,
  fanIn, peopleOpacity, personTarget, smoothRange, worldOpacity,
} from "./choreography";
import { ICON_WORLD_H, ICON_WORLD_W, createPictogramTextures } from "./pictogram";
import { FUTURE_SCREENS, agentCardHeight, drawAgentCard, drawLiveScreen, drawProjectBoard, liveProjectAt } from "./demos";
import {
  DESK_SCREENS, OXBLOOD, PORCELAIN, drawMonolithFace, drawServerRack, drawSketchBoard,
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

    const presenting = isPresenting(s) && PRESENTERS[boardIndex(s)] === index;
    const beat = Math.floor(time * 1.4 + index * 0.53) % 2 ? "B" : "A"; // slow two-frame loop
    let pose;
    if (p.sit > 0.5) pose = Math.floor(time * 2.6 + index * 0.37) % 2 ? "typeB" : "typeA";
    else if (p.walk > 0.35) {
      const step = Math.floor(p.phase / Math.PI) % 2 ? "B" : "A";
      pose = target.act === "carry" ? `carryWalk${step}` : `walk${step}`;
    }
    else if (target.act === "point" || presenting) pose = "point";
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
function Hero({ icons }) {
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
  return (
    <group ref={group} position={[HERO.x, 0, HERO.z]}>
      <mesh geometry={getIconPlane()} material={material} />
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
    g.rotation.y = Math.atan2(0 - x, 8.6 - z); // face the closing camera
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
function ZoneScreen({ index, fill, line }) {
  const draw = useMemo(() => (ctx, w, h, t) => drawLiveScreen(ctx, w, h, index, t), [index]);
  const surface = useSurface(1024, 490, draw, true, "zone");
  const { y, z, width, height } = ZONE_SCREEN;
  const geo = useMemo(
    () =>
      merge([
        boxGeo(width + 0.12, height + 0.12, 0.06, 0, y, -0.04),
        boxGeo(0.06, y + height / 2, 0.06, -width / 2 + 0.3, (y + height / 2) / 2, -0.1),
        boxGeo(0.06, y + height / 2, 0.06, width / 2 - 0.3, (y + height / 2) / 2, -0.1),
      ]),
    [y, width, height]
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(width, height * 0.98), [width, height]);
  const screenPos = zoneToWorld(ZONES[index], 0, z);
  const group = useRef(null);
  // Only on the home screen; afterwards it would block the project whiteboard.
  useFrame(() => {
    if (group.current) group.current.visible = currentStop() < 0.5;
  });
  return (
    <group ref={group} position={[screenPos.x, 0, screenPos.z]} rotation={[0, ZONES[index].rot, 0]}>
      <Outlined geo={geo} fill={fill} line={line} />
      <mesh geometry={plane} material={surface.mat} position={[0, y, 0.01]} />
    </group>
  );
}

function Plants({ fill, line }) {
  const geo = useMemo(() => {
    // Between and beside the curved zones, plus a couple deeper in the room.
    const local = [[-5.3, 1.2, 1], [5.3, 1.2, 1], [-5.3, -4.6, 1], [5.3, -4.6, 1], [-5.3, 1.2, 0], [5.3, 1.2, 2]];
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

// The whiteboard plays a live demo of the project currently being presented.
// Between two project stops the next demo wipes in, driven by scroll.
const boardState = { from: 0, to: 0, progress: 0 };
const drawBoardAt = (ctx, w, h, t) =>
  drawProjectBoard(ctx, w, h, boardState.from, boardState.to, boardState.progress, t);

function Whiteboard({ fill, line }) {
  const surface = useSurface(1024, 490, drawBoardAt, false, "board");
  const { width, height } = WHITEBOARD;
  const geo = useMemo(
    () =>
      merge([
        boxGeo(width + 0.1, height + 0.1, 0.05, 0, WHITEBOARD.y, 0),
        boxGeo(0.05, WHITEBOARD.y + height / 2 + 0.2, 0.05, -width / 2 + 0.2, (WHITEBOARD.y + height / 2 + 0.2) / 2, -0.05),
        boxGeo(0.05, WHITEBOARD.y + height / 2 + 0.2, 0.05, width / 2 - 0.2, (WHITEBOARD.y + height / 2 + 0.2) / 2, -0.05),
        boxGeo(0.7, 0.04, 0.5, -width / 2 + 0.2, 0.02, -0.05),
        boxGeo(0.7, 0.04, 0.5, width / 2 - 0.2, 0.02, -0.05),
        boxGeo(1.2, 0.04, 0.12, 0, WHITEBOARD.y - height / 2 - 0.05, 0.05),
      ]),
    [width, height]
  );
  const plane = useMemo(() => new THREE.PlaneGeometry(width, height * 0.98), [width, height]);
  // Only during projects: hidden behind the home-screen office, and from the
  // tower's side (experience) we'd only see its blank back.
  const group = useRef(null);
  useFrame(() => {
    const s = currentStop();
    if (group.current) group.current.visible = s > 0.25 && s < STOPS.experienceStart - 0.35;
  });
  return (
    <group ref={group} position={[WHITEBOARD.x, 0, WHITEBOARD.z]}>
      <Outlined geo={geo} fill={fill} line={line} />
      <mesh geometry={plane} material={surface.mat} position={[0, WHITEBOARD.y, 0.03]} />
    </group>
  );
}

// ---------- server room behind the whiteboard ----------
const RACK_ROWS = [
  { from: -10.6, to: -5.2, z: -15.6 },
  { from: 5.2, to: 10.6, z: -15.6 },
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
  // Hidden during experience, where only the racks' blank backs would show.
  const group = useRef(null);
  useFrame(() => {
    if (group.current) group.current.visible = currentStop() < STOPS.experienceStart - 0.3;
  });
  return (
    <group ref={group}>
      <Outlined geo={geo} fill={fill} line={line} />
      {racks.map(({ x, z }, i) => (
        <mesh key={i} geometry={face} material={leds.mat} position={[x, 1.2, z + 0.48]} />
      ))}
    </group>
  );
}

// ---------- experience: the walk ----------
const E = STOPS.experienceStart;

/** Invisible porcelain ground under the plain, so monoliths can rise out of the floor. */
function Ground() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(40, 16);
    g.rotateX(-Math.PI / 2);
    g.translate(0, -0.004, PATH.z);
    return g;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: PORCELAIN }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return <mesh geometry={geo} material={mat} renderOrder={-1} />;
}

function Monolith({ index, fill, line }) {
  const draw = useMemo(() => (ctx, w, h) => drawMonolithFace(ctx, w, h, index), [index]);
  const surface = useSurface(360, 765, draw, false);
  const { w, h, d } = MONOLITH;
  const geo = useMemo(() => boxGeo(w, h, d, 0, h / 2, 0), [w, h, d]);
  const face = useMemo(() => new THREE.PlaneGeometry(w - 0.06, h - 0.06), [w, h]);
  const group = useRef(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const rise = monolithRise(index, currentStop());
    g.visible = rise > 0.001;
    g.position.set(PATH.xs[index], -h * (1 - rise), PATH.z); // rises out of the ground
  });
  return (
    <group ref={group}>
      <Outlined geo={geo} fill={fill} line={line} />
      <mesh geometry={face} material={surface.mat} position={[0, h / 2, d / 2 + 0.006]} />
    </group>
  );
}

/** The trail: faint road ahead, a solid line drawn behind the walker, ticks at each milestone. */
function Trail({ line }) {
  const faint = useMemo(() => new THREE.LineBasicMaterial({ color: OXBLOOD, transparent: true, opacity: 0.2 }), []);
  useEffect(() => () => faint.dispose(), [faint]);
  const z = PATH.z + 0.75; // the line the walker follows
  const road = useMemo(() => {
    const pts = [PATH.from, 0.01, z, PATH.to, 0.01, z];
    PATH.xs.forEach((x) => pts.push(x, 0.01, z - 0.25, x, 0.01, z + 0.25));
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [z]);
  const drawn = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([PATH.from, 0.012, z, PATH.from, 0.012, z], 3));
    return g;
  }, [z]);
  const head = useRef(null);
  const headGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.09, 20);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const headMat = useMemo(() => new THREE.MeshBasicMaterial({ color: OXBLOOD, transparent: true }), []);
  useEffect(() => () => headMat.dispose(), [headMat]);

  useFrame(() => {
    const s = currentStop();
    const w = walkerTarget(s);
    const x = w.x;
    const pos = drawn.attributes.position;
    pos.setX(1, x);
    pos.needsUpdate = true;
    if (head.current) head.current.position.set(x, 0.014, z);
    headMat.opacity = w.onPath ? line.opacity : 0;
  });

  return (
    <>
      <lineSegments geometry={road} material={faint} />
      <lineSegments geometry={drawn} material={line} />
      <mesh ref={head} geometry={headGeo} material={headMat} />
    </>
  );
}

/** Slow rings breathing out from the base of the current monolith. */
function Pulse() {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(0.97, 1, 72);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const mats = useMemo(
    () => [0, 1].map(() => new THREE.MeshBasicMaterial({ color: OXBLOOD, transparent: true, depthWrite: false })),
    []
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  const rings = useRef([]);
  useFrame((three) => {
    const s = currentStop();
    const k = Math.min(JOBS - 1, Math.max(0, Math.round(s - E)));
    const settled = monolithRise(k, s) >= 1 && s < E + JOBS - 0.6;
    const time = scroll.reduced ? 0.4 : three.clock.elapsedTime;
    rings.current.forEach((ring, n) => {
      if (!ring) return;
      const f = (time / 3.2 + n * 0.5) % 1;
      ring.position.set(PATH.xs[k], 0.008, PATH.z);
      ring.scale.setScalar(1.1 + f * 3.2);
      mats[n].opacity = settled ? (1 - f) * 0.45 : 0;
    });
  });
  return mats.map((m, n) => <mesh key={n} ref={(el) => void (rings.current[n] = el)} geometry={geo} material={m} />);
}

/** You, walking the path: walks between milestones, gestures to each when you arrive. */
function Walker({ icons }) {
  const group = useRef(null);
  const flip = useRef(null);
  const material = useMemo(() => iconMaterial(icons.solid.stand), [icons]);
  useEffect(() => () => material.dispose(), [material]);
  const state = useRef({ x: PATH.from, z: PATH.z + 0.75, speed: 0, walk: 0, phase: 0, dir: 1, init: false });
  const right = useMemo(() => new THREE.Vector3(), []);

  useFrame((three, delta) => {
    const g = group.current;
    if (!g) return;
    const s = currentStop();
    const op = walkerOpacity(s);
    material.opacity = op;
    g.visible = op > 0.001;
    if (!g.visible) return;
    const dt = Math.min(delta, 0.05);
    const target = walkerTarget(s);
    const p = state.current;
    let vx = 0;
    let vz = 0;
    if (!p.init || scroll.reduced || dt <= 0) {
      p.x = target.x;
      p.z = target.z;
      p.walk = 0;
      p.init = true;
    } else {
      const nx = damp(p.x, target.x, 4, dt);
      const nz = damp(p.z, target.z, 4, dt);
      vx = (nx - p.x) / dt;
      vz = (nz - p.z) / dt;
      p.speed = damp(p.speed, Math.hypot(vx, vz), 8, dt);
      p.x = nx;
      p.z = nz;
      p.walk = damp(p.walk, clamp01((p.speed - 0.12) / 0.6), 6, dt);
      p.phase += Math.min(p.speed, 3) * dt * 3.4;
    }
    right.setFromMatrixColumn(three.camera.matrixWorld, 0);
    const screenDir = vx * right.x + vz * right.z;
    if (Math.abs(screenDir) > 0.05) p.dir = screenDir >= 0 ? 1 : -1;

    let pose = "stand";
    if (p.walk > 0.35) pose = Math.floor(p.phase / Math.PI) % 2 ? "walkB" : "walkA";
    else if (target.onPath && target.atStop && s >= E - 0.05) pose = "point"; // gestures to his milestone
    material.map = icons.solid[pose];
    if (flip.current) flip.current.scale.x = pose.startsWith("walk") ? p.dir : 1;

    const bob = Math.abs(Math.sin(p.phase)) * 0.05 * p.walk;
    g.position.set(p.x, bob, p.z);
    g.scale.setScalar(0.9);
    faceCamera(g, three.camera, p.x, p.z);
  });

  return (
    <group ref={group}>
      <group ref={flip}>
        <mesh geometry={getIconPlane()} material={material} />
      </group>
    </group>
  );
}

/** The whole experience scene; only shown from the end of the projects onwards. */
function TheWalk({ fill, line }) {
  const group = useRef(null);
  useFrame(() => {
    if (group.current) group.current.visible = currentStop() > E - 1.2;
  });
  return (
    <group ref={group}>
      <Ground />
      {PATH.xs.map((_, k) => (
        <Monolith key={k} index={k} fill={fill} line={line} />
      ))}
      <Trail line={line} />
      <Pulse />
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
  return <gridHelper ref={ref} args={[80, mobile ? 40 : 80, OXBLOOD, OXBLOOD]} position={[0, 0, -6]} />;
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

// A moment late in each demo's loop, used as the still frame.
const BOARD_STILL_T = 8.8;

function SurfaceUpdater({ mats, mobile, world }) {
  const track = useRef({ redraw: 0, board: -1, boardDraw: 0, zoneDraw: 0 });
  const invalidate = useThree((st) => st.invalidate);

  useEffect(() => {
    let alive = true;
    // Redraw once webfonts are ready so canvas text uses the right faces.
    document.fonts?.ready.then(() => {
      if (!alive) return;
      surfaces.forEach((sf) => {
        sf.draw(sf.ctx, sf.w, sf.h, sf.kind === "board" ? BOARD_STILL_T : 0);
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

    // Whiteboard demo: smooth playback while the projects are on screen; a still
    // frame otherwise (and always, with reduced motion).
    const board = boardIndex(s);
    const live = !scroll.reduced && s > 0.3 && s < STOPS.experienceStart + 0.2;
    if (board !== t.board || (live && now - t.boardDraw > (mobile ? 0.15 : 1 / 14))) {
      t.board = board;
      t.boardDraw = now;
      const p = Math.min(3, Math.max(0, s - STOPS.projectsStart));
      boardState.from = Math.min(3, Math.floor(p));
      boardState.to = Math.min(3, boardState.from + 1);
      boardState.progress = scroll.reduced ? 0 : smoothRange(0.25, 0.75, p - boardState.from);
      if (scroll.reduced) boardState.from = board;
      surfaces.forEach((sf) => {
        if (sf.kind !== "board") return;
        sf.draw(sf.ctx, sf.w, sf.h, live ? now : BOARD_STILL_T);
        sf.tex.needsUpdate = true;
      });
    }

    // Wall screens (home) and the final fan: smooth playback while in view.
    const playing = s < 0.6 ? "zone" : s > STOPS.end - 0.5 ? "finale" : null;
    if (playing && !scroll.reduced && now - t.zoneDraw > (mobile ? 0.2 : 0.1)) {
      t.zoneDraw = now;
      surfaces.forEach((sf) => {
        if (sf.kind !== playing) return;
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
function DeskCard({ index, clicks, mobile, onClose }) {
  // The agent works on whatever project its zone's screen is showing right now.
  const clock = useThree((st) => st.clock);
  const info = useMemo(
    () => ({ agent: index, project: liveProjectAt(DESKS[index].zone, clock.elapsedTime), feature: zoneSlot(index) + clicks }),
    [index, clicks, clock]
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
    if (mobile) {
      // Phones: too narrow to float the card by the desk, so hold it centred in
      // front of the camera, in the upper half of the screen, at 90% width.
      const dist = 6;
      const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const visW = visH * (size.width / size.height);
      camera.getWorldDirection(forward);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      m.position.copy(camera.position).addScaledVector(forward, dist).addScaledVector(up, visH * 0.18);
      m.scale.setScalar((visW * 0.9) / 2.2);
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
        onClose();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    />
  );
}

/** The selected agent's desk card. */
function SceneLabels({ selected, mobile, onClose }) {
  return (
    <>
      {selected && (
        <DeskCard
          key={`${selected.index}-${selected.clicks}`}
          index={selected.index}
          clicks={selected.clicks}
          mobile={mobile}
          onClose={onClose}
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
      <fog attach="fog" args={[PORCELAIN, 14, mobile ? 55 : 64]} />
      <FloorGrid mobile={mobile} />
      <group ref={world}>
        {DESKS.map((_, i) => (
          <Desk key={i} index={i} fill={mats.worldFill} line={mats.worldLine} />
        ))}
        <Whiteboard fill={mats.worldFill} line={mats.worldLine} />
        {ZONES.map((_, i) => (
          <ZoneScreen key={i} index={i} fill={mats.worldFill} line={mats.worldLine} />
        ))}
        <TheWalk fill={mats.worldFill} line={mats.worldLine} />
        <ServerRoom fill={mats.worldFill} line={mats.worldLine} />
        {!mobile && <Plants fill={mats.worldFill} line={mats.worldLine} />}
      </group>
      {DESKS.map((_, i) => (
        <Person key={i} index={i} icons={icons} selected={selected?.index === i} onSelect={onSelect} />
      ))}
      <Walker icons={icons} />
      <Hero icons={icons} />
      <HeroDesk fill={mats.heroFill} line={mats.heroLine} />
      <FinaleScreens />
      <SceneLabels selected={selected} mobile={mobile} onClose={() => onSelect(null)} />
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
        camera={{ fov: mobile ? 52 : 36, near: 0.1, far: 120, position: [11.5, 8.6, 12.5] }}
        gl={{ antialias: true, powerPreference: mobile ? "low-power" : "high-performance" }}
      >
        <World mobile={mobile} selected={selected} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
