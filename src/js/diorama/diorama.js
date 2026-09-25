import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as T from "./textures.js";

/* ============================================================
   Materials
   ============================================================ */

const NO_OUTLINE = { visible: false };
let GRAD, GLOW, STREAK;

function gradientMap() {
  const data = new Uint8Array([74, 74, 74, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const toonCache = new Map();
function toon(color, e = 0) {
  const key = `${color}|${e}`;
  if (!toonCache.has(key)) {
    const c = new THREE.Color(color);
    toonCache.set(
      key,
      new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, emissive: c.clone().multiplyScalar(e) })
    );
  }
  return toonCache.get(key);
}

function flat(color, e = 0) {
  const c = new THREE.Color(color);
  return noOutline(new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD, emissive: c.clone().multiplyScalar(e) }));
}

function toonMap(map, color = "#ffffff", e = 0, outline = false) {
  const c = new THREE.Color(color);
  const m = new THREE.MeshToonMaterial({
    color: c,
    map,
    gradientMap: GRAD,
    emissive: e ? c.clone().multiplyScalar(e) : new THREE.Color(0),
    emissiveMap: e ? map : null,
  });
  return outline ? m : noOutline(m);
}

function basic(opts) {
  return new THREE.MeshBasicMaterial(opts);
}

function noOutline(m) {
  m.userData.outlineParameters = NO_OUTLINE;
  return m;
}

function additive(opts) {
  return noOutline(
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      ...opts,
    })
  );
}

/* ============================================================
   Geometry helpers (static geometry is merged per material)
   ============================================================ */

class Batch {
  constructor() {
    this.buckets = new Map();
  }
  add(geo, mat, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (matrix) g.applyMatrix4(matrix);
    for (const k of Object.keys(g.attributes)) {
      if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    }
    g.clearGroups();
    if (!this.buckets.has(mat)) this.buckets.set(mat, []);
    this.buckets.get(mat).push(g);
  }
  addObject(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      if (o.isMesh) this.add(o.geometry, o.material, o.matrixWorld);
    });
  }
  build(parent) {
    for (const [mat, list] of this.buckets) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
    }
  }
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function tm(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}

/** box whose bottom sits at y */
function box(B, mat, w, h, d, x, y, z, ry = 0) {
  B.add(BOX, mat, tm(x, y + h / 2, z, 0, ry, 0, w, h, d));
}

/** box centred at (x,y,z) with full rotation */
function boxC(B, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
  B.add(BOX, mat, tm(x, y, z, rx, ry, rz, w, h, d));
}

function cyl(B, mat, r, h, x, y, z, seg = 14, rTop = r) {
  B.add(new THREE.CylinderGeometry(rTop, r, h, seg), mat, tm(x, y + h / 2, z));
}

function rod(B, mat, r, a, b, seg = 8) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
  B.add(new THREE.CylinderGeometry(r, r, len, seg), mat, m);
}

function ground(B, mat, x0, x1, z0, z1, y, tile = 1) {
  const w = x1 - x0;
  const d = z1 - z0;
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
  B.add(g, mat, tm((x0 + x1) / 2, y, (z0 + z1) / 2));
}

function mesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  return m;
}

/* ============================================================
   Scene layout (base is 20 x 20, top surface at y = 0)
   store: x[-6, 2.5] z[-6, 1.8]   front sidewalk z[1.8, 5.5]
   front road z[5.5, 10]           right road x[5.5, 10]
   parking lot x[2.5, 5.5] z[-10, 1.8]
   alley x[-8.1, -6]               neighbour building x[-10, -8.1]
   ============================================================ */

function floorAt(x, z) {
  if (x > -6.15 && x < 2.7 && z > -6.15 && z < 1.98) return 4.15;
  if (x > -3.95 && x < 2.55 && z >= 1.98 && z < 3.08) return 2.95;
  if (x < -8.05 && z < 2.25) return 6.45;
  if (x < 5.5 && z > 1.8 && z < 5.5) return 0.15;
  if (x > -8.1 && x < -6 && z < 1.8) return 0.06;
  return 0.01;
}

function isOpenGround(x, z) {
  if (x > -6.3 && x < 2.8 && z > -6.3 && z < 3.2) return false;
  if (x < -7.9 && z < 2.4) return false;
  if (x > -6.2 && x < 2.6 && z < -6) return true;
  return Math.abs(x) < 9.7 && Math.abs(z) < 9.7;
}

/* ============================================================
   Builders
   ============================================================ */

function buildLights(ctx) {
  const { scene } = ctx;
  scene.add(new THREE.HemisphereLight("#7188c9", "#1d2030", 1.55));
  const moon = new THREE.DirectionalLight("#a9bbee", 1.25);
  moon.position.set(-8, 16, 10);
  scene.add(moon);
  const add = (color, intensity, x, y, z, distance = 0) => {
    const l = new THREE.PointLight(color, intensity, distance, 2);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };
  ctx.lights.inA = add("#ffe7c2", 13, -3.2, 3.3, -2.4, 12);
  ctx.lights.inB = add("#ffe7c2", 10, 0.6, 3.3, -0.6, 10);
  ctx.lights.door = add("#ffd9a4", 20, 0.3, 2.5, 3.8, 10);
  ctx.lights.lamp = add("#ffe2ad", 55, 6.35, 5.8, 6.35, 17);
  ctx.lights.vend = add("#d6ecff", 12, -4.95, 1.4, 3.7, 7);
  ctx.lights.sign = add("#e2fff8", 14, -1.8, 3.9, 3.8, 10);
}

function buildBase(ctx, M) {
  const { S, world } = ctx;
  box(S, M.plinth, 21, 1.05, 21, 0, -1.4, 0);
  box(S, M.rim, 21.08, 0.07, 21.08, 0, -0.42, 0);
  box(S, M.rim, 21.08, 0.05, 21.08, 0, -1.42, 0);
  box(S, M.terrain, 20, 0.35, 20, 0, -0.35, 0);
  const plaque = mesh(new THREE.PlaneGeometry(4.6, 0.58), basic({ map: T.plaqueTexture() }), 0, -0.88, 10.51);
  world.add(plaque);
}

function puddleGeo(rx, rz, seed) {
  const rnd = T.seeded(seed);
  const shape = new THREE.Shape();
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + rnd() * 0.3;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * rz * k;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

function buildGround(ctx, M) {
  const { S, fx } = ctx;
  ground(S, M.asphalt, -10, 10, 5.5, 10, 0.004, 4);
  ground(S, M.asphalt, 5.5, 10, -10, 5.5, 0.004, 4);
  ground(S, M.lot, 2.5, 5.5, -10, 1.8, 0.004, 4);

  // front sidewalk (raised)
  box(S, M.sideEdge, 15.5, 0.15, 3.7, -2.25, 0, 3.65);
  ground(S, M.sidewalk, -10, 5.5, 1.8, 5.5, 0.152, 1.3);
  box(S, M.curb, 15.62, 0.18, 0.16, -2.19, 0, 5.47);
  box(S, M.curb, 0.16, 0.18, 3.8, 5.47, 0, 3.65);
  // alley + back yard
  box(S, M.sideEdge, 2.1, 0.06, 11.8, -7.05, 0, -4.1);
  ground(S, M.concrete, -8.1, -6, -10, 1.8, 0.062, 1.6);
  box(S, M.sideEdge, 8.5, 0.06, 4, -1.75, 0, -8);
  ground(S, M.concrete, -6, 2.5, -10, -6, 0.062, 1.6);
  // store slab
  box(S, M.wallDark, 8.5, 0.2, 7.8, -1.75, 0, -2.1);

  // gutters
  ground(S, M.grate, -10, 5.4, 5.56, 5.82, 0.007, 0.26);
  ground(S, M.grate, 5.56, 5.82, -10, 2.8, 0.007, 0.26);

  // crosswalks (stripes run parallel to traffic)
  for (let i = 0; i < 6; i++) {
    const c = 5.95 + i * 0.7;
    ground(S, M.marking, 2.9, 4.9, c - 0.17, c + 0.17, 0.009);
    ground(S, M.marking, c - 0.17, c + 0.17, 2.9, 4.9, 0.009);
  }
  ground(S, M.marking, 5.65, 7.65, 2.3, 2.5, 0.009);
  ground(S, M.marking, 2.35, 2.55, 5.65, 7.65, 0.009);
  for (let x = -9.8; x < 1.8; x += 2) ground(S, M.marking, x, x + 1.2, 7.7, 7.8, 0.009);
  for (let z = -9.8; z < 1.6; z += 2) ground(S, M.marking, 7.7, 7.8, z, z + 1.2, 0.009);
  ground(S, M.marking, -10, 10, 9.7, 9.78, 0.009);

  const tomare = mesh(
    new THREE.PlaneGeometry(1.7, 0.85),
    noOutline(basic({ map: T.tomareTexture(), transparent: true, depthWrite: false, color: "#c9d0db" })),
    6.65,
    0.012,
    0.9,
    -Math.PI / 2,
    0,
    Math.PI
  );
  ctx.world.add(tomare);

  // parking lot lines + wheel stops
  for (const z of [-9.6, -7.0, -4.4, -1.8]) ground(S, M.marking, 2.9, 5.2, z - 0.05, z + 0.05, 0.009);
  ground(S, M.marking, 2.9, 3.0, -9.6, -1.8, 0.009);
  for (const z of [-8.3, -5.7, -3.1]) box(S, M.curb, 0.22, 0.12, 1.3, 3.35, 0.004, z);

  // puddles
  const puddles = [
    [1.4, 0.01, 6.5, 1.3, 0.55],
    [-5.4, 0.01, 8.5, 1.7, 0.7],
    [7.2, 0.01, -2.6, 0.8, 1.7],
    [8.4, 0.01, 7.0, 1.1, 0.7],
    [4.1, 0.01, -5.7, 0.9, 0.6],
    [4.4, 0.158, 4.4, 0.6, 0.38],
    [-1.9, 0.158, 4.95, 0.75, 0.3],
    [-7.05, 0.068, -1.4, 0.55, 1.2],
  ];
  puddles.forEach(([x, y, z, rx, rz], i) => {
    const m = mesh(puddleGeo(rx, rz, 40 + i), M.puddle, x, y, z);
    ctx.world.add(m);
    const sheen = mesh(puddleGeo(rx * 0.92, rz * 0.92, 40 + i), M.puddleSheen, x, y + 0.004, z);
    fx.add(sheen);
  });
  ctx.puddles = puddles;
}

function acUnit(B, M, x, y, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.add(mesh(new THREE.BoxGeometry(0.82, 0.62, 0.3), M.white, 0, 0.31, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), M.metalDark, -0.12, 0.31, 0.155, Math.PI / 2));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.03, 0.02), M.metal, -0.12, 0.31, 0.18));
  g.add(mesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), M.metal, -0.12, 0.31, 0.18));
  for (let i = 0; i < 4; i++) g.add(mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), M.metal, 0.26, 0.14 + i * 0.1, 0.16));
  B.addObject(g);
}

function buildStore(ctx, M) {
  const { S, world, fx } = ctx;
  const W = M.wall;

  // walls
  box(S, W, 8.5, 3.7, 0.15, -1.75, 0.2, -5.925);
  box(S, W, 0.15, 3.7, 7.8, -5.925, 0.2, -2.1);
  box(S, W, 2.2, 3.7, 0.15, -4.9, 0.2, 1.725);
  box(S, W, 6.3, 0.8, 0.15, -0.65, 3.1, 1.725);
  box(S, M.metalDark, 3.5, 0.15, 0.16, -2.05, 0.2, 1.725);
  box(S, M.metalDark, 0.85, 0.15, 0.16, 1.925, 0.2, 1.725);
  for (const x of [-3.76, -2.05, -0.34, 1.54]) box(S, M.metalDark, 0.08, 2.9, 0.12, x, 0.2, 1.74);
  box(S, M.metalDark, 1.8, 0.07, 0.12, 0.6, 2.66, 1.74);
  box(S, M.metalDark, 6.3, 0.06, 0.13, -0.65, 3.04, 1.74);
  box(S, W, 0.16, 3.7, 0.16, 2.42, 0.2, 1.72);
  // right facade
  box(S, W, 0.15, 3.7, 1.4, 2.425, 0.2, -5.3);
  box(S, W, 0.15, 0.8, 6.25, 2.425, 3.1, -1.475);
  box(S, M.metalDark, 0.16, 0.15, 6.25, 2.425, 0.2, -1.475);
  for (const z of [-4.56, -3.05, -1.5, 0.05]) box(S, M.metalDark, 0.12, 2.9, 0.08, 2.44, 0.2, z);
  box(S, M.metalDark, 0.13, 0.06, 6.25, 2.44, 3.04, -1.475);

  // glass (drawn in the fx pass so interior outlines get tinted too)
  const G = ctx.glass;
  fx.add(mesh(new THREE.PlaneGeometry(3.42, 2.75), G, -2.05, 1.725, 1.73));
  fx.add(mesh(new THREE.PlaneGeometry(0.8, 2.75), G, 1.94, 1.725, 1.73));
  fx.add(mesh(new THREE.PlaneGeometry(1.75, 0.38), G, 0.6, 2.87, 1.73));
  fx.add(mesh(new THREE.PlaneGeometry(6.2, 2.75), G, 2.43, 1.725, -1.475, 0, Math.PI / 2));

  // roof
  box(S, M.roof, 8.7, 0.2, 8.0, -1.75, 3.9, -2.1);
  box(S, M.wallDark, 8.7, 0.3, 0.12, -1.75, 4.1, 1.84);
  box(S, M.wallDark, 8.7, 0.3, 0.12, -1.75, 4.1, -6.04);
  box(S, M.wallDark, 0.12, 0.3, 8.0, -6.04, 4.1, -2.1);
  box(S, M.wallDark, 0.12, 0.3, 8.0, 2.54, 4.1, -2.1);
  for (const [x, z] of [[-4.6, -4.6], [-3.2, -4.6]]) {
    box(S, M.metal, 1.1, 0.7, 0.85, x, 4.1, z);
    cyl(S, M.metalDark, 0.3, 0.05, x, 4.8, z, 18);
  }
  cyl(S, M.metal, 0.12, 0.7, 0.5, 4.1, -4.8, 10);
  cyl(S, M.metal, 0.12, 0.5, 1.2, 4.1, -5.2, 10);
  box(S, M.metalDark, 1.6, 0.5, 0.5, -0.6, 4.1, -3.2);

  // awning over the entrance
  const tilt = 0.12;
  boxC(S, M.awning, 6.45, 0.07, 1.27, -0.725, 2.98, 2.43, tilt, 0, 0);
  boxC(S, M.teal, 6.45, 0.2, 0.05, -0.725, 2.8, 3.06);
  boxC(S, M.orange, 6.45, 0.04, 0.052, -0.725, 2.72, 3.062);
  for (const x of [-3.7, 2.3]) rod(S, M.metalDark, 0.025, new THREE.Vector3(x, 2.4, 1.82), new THREE.Vector3(x, 2.86, 2.95));
  for (const x of [-2.6, -0.8, 1.0]) {
    fx.add(mesh(new THREE.CircleGeometry(0.1, 16), ctx.fxMat.downlight, x, 2.9, 2.4, Math.PI / 2));
  }

  // alley-side wall: AC units, pipes, meter
  acUnit(S, M, -6.25, 0.06, -1.9, -Math.PI / 2);
  acUnit(S, M, -6.25, 0.06, -3.1, -Math.PI / 2);
  box(S, M.metalDark, 0.35, 0.06, 0.9, -6.2, 2.1, -4.6);
  acUnit(S, M, -6.25, 2.16, -4.6, -Math.PI / 2);
  rod(S, M.white, 0.035, new THREE.Vector3(-6.1, 0.5, -1.6), new THREE.Vector3(-6.1, 2.8, -1.6));
  rod(S, M.white, 0.035, new THREE.Vector3(-6.1, 0.5, -2.8), new THREE.Vector3(-6.1, 2.8, -2.8));
  rod(S, M.metal, 0.045, new THREE.Vector3(-6.06, 0.06, 0.8), new THREE.Vector3(-6.06, 3.95, 0.8));
  box(S, M.metal, 0.12, 0.45, 0.35, -6.06, 1.2, -0.4);

  // back yard: staff door, crates, dumpster
  box(S, M.metalDark, 0.9, 2.1, 0.05, -0.5, 0.06, -6.02);
  for (const [x, z, h] of [[1.3, -7.0, 0], [1.3, -7.0, 0.32], [0.7, -7.2, 0], [1.9, -7.4, 0]]) {
    box(S, M.blueCrate, 0.5, 0.3, 0.4, x, 0.06 + h, z);
  }
  box(S, M.green, 1.4, 1.0, 0.8, -3.8, 0.06, -7.2);
  box(S, M.greenDark, 1.45, 0.08, 0.85, -3.8, 1.06, -7.2);
  box(S, M.concreteWall, 13.4, 1.2, 0.18, -1.3, 0.06, -9.9);

  // sign bands (hotspot)
  const signTex = T.signTexture();
  ctx.signMat = basic({ map: signTex, color: "#ffffff" });
  const side = M.wallDark;
  const front = new THREE.Group();
  front.position.set(-1.75, 3.5, 1.89);
  front.add(mesh(new THREE.BoxGeometry(8.6, 0.72, 0.18), [side, side, side, side, ctx.signMat, side]));
  hotspot(ctx, "sign", front, new THREE.Vector3(0, 0.6, 0));
  const right = new THREE.Group();
  right.position.set(2.59, 3.5, -2.1);
  right.add(mesh(new THREE.BoxGeometry(0.18, 0.72, 8.0), [ctx.signMat, side, side, side, side, side]));
  hotspot(ctx, "sign", right, new THREE.Vector3(0, 0.6, 0));
  ctx.signGlows = [
    glow(ctx, -4.5, 3.5, 2.3, "#bff7ee", 3.2, 0.35),
    glow(ctx, -0.5, 3.5, 2.3, "#bff7ee", 3.2, 0.35),
    glow(ctx, 3.0, 3.5, -1.5, "#bff7ee", 3.0, 0.3),
  ];

  buildDoor(ctx, M);
}

function buildDoor(ctx, M) {
  const g = new THREE.Group();
  g.position.set(0.6, 0.2, 1.76);
  const panelMat = ctx.doorGlass;
  const panels = [];
  for (const side of [-1, 1]) {
    const p = new THREE.Group();
    p.add(mesh(new THREE.PlaneGeometry(0.84, 2.36), panelMat, 0, 1.2, 0));
    p.add(mesh(new THREE.BoxGeometry(0.05, 2.42, 0.05), M.metal, -0.43, 1.2, 0));
    p.add(mesh(new THREE.BoxGeometry(0.05, 2.42, 0.05), M.metal, 0.43, 1.2, 0));
    p.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), M.metal, 0, 0.02, 0));
    p.add(mesh(new THREE.BoxGeometry(0.9, 0.05, 0.05), M.metal, 0, 2.39, 0));
    p.add(mesh(new THREE.PlaneGeometry(0.28, 0.07), noOutline(basic({ color: "#1fa39a" })), 0, 1.25, 0.03));
    p.position.x = side * 0.45;
    p.userData.side = side;
    g.add(p);
    panels.push(p);
  }
  g.add(mesh(new THREE.BoxGeometry(1.8, 0.12, 0.2), M.metalDark, 0, 2.5, 0.05));
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.08, 0.1), M.black, 0, 2.4, 0.15));
  const led = mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), noOutline(basic({ color: "#ff4d4d" })), 0.06, 2.4, 0.2);
  g.add(led);
  hotspot(ctx, "door", g, new THREE.Vector3(0, 2.9, 0.3));
  ctx.door = { panels, open: 0, target: 0, next: 3.5, led };
}

function buildInterior(ctx, M) {
  const { S, world, fx } = ctx;
  const rnd = T.seeded(2026);
  const floorMat = toonMap(T.tileTexture("#e6dccb", "#c9bda6", 4, 6), "#ffffff", 0.22, false);
  ground(S, floorMat, -5.85, 2.35, -5.85, 1.65, 0.202, 1.2);
  // ceiling seen from low angles
  world.add(mesh(new THREE.PlaneGeometry(8.2, 7.5), noOutline(basic({ color: "#efe4cf", side: THREE.DoubleSide })), -1.75, 3.86, -2.1, Math.PI / 2));
  for (const x of [-4.1, -1.8, 0.7]) {
    fx.add(mesh(new THREE.BoxGeometry(0.25, 0.06, 5.6), ctx.fxMat.ceiling, x, 3.62, -2.3));
  }

  // back wall coolers
  box(S, M.inGray, 6.2, 2.3, 0.55, -2.7, 0.2, -5.58);
  world.add(mesh(new THREE.PlaneGeometry(6.1, 2.15), basic({ map: T.fridgeTexture() }), -2.7, 1.32, -5.295));
  world.add(mesh(new THREE.PlaneGeometry(6.2, 0.36), basic({ map: T.headerTexture("冷たいお飲み物", "COLD DRINKS") }), -2.7, 2.72, -5.84));
  box(S, M.inDark, 0.9, 2.1, 0.06, 1.45, 0.2, -5.85);
  world.add(mesh(new THREE.PlaneGeometry(0.5, 0.18), basic({ map: T.staffDoorTexture() }), 1.45, 1.8, -5.81));
  for (const [x, z, h] of [[0.75, -5.4, 0], [0.75, -5.4, 0.35], [1.0, -5.0, 0]]) box(S, M.inWood, 0.45, 0.35, 0.4, x, 0.2 + h, z);

  // left wall open chiller (bento / onigiri)
  box(S, M.inWhite, 0.75, 0.7, 3.6, -5.47, 0.2, -3.2);
  box(S, M.inWhite, 0.2, 2.1, 3.6, -5.75, 0.2, -3.2);
  const shelfGlow = ctx.fxMat.shelf;
  for (const [y, dx] of [[0.92, 0.0], [1.38, -0.1], [1.84, -0.2]]) {
    fx.add(mesh(new THREE.BoxGeometry(0.62 + dx, 0.03, 3.5), shelfGlow, -5.5 + dx / 2, y, -3.2));
  }
  world.add(mesh(new THREE.PlaneGeometry(3.6, 0.32), basic({ map: T.headerTexture("お弁当・おにぎり", "BENTO", "#ff8a3d") }), -5.63, 2.5, -3.2, 0, Math.PI / 2));

  const onigiri = [];
  const bento = [];
  for (const [y, xo] of [[0.94, -5.3], [1.4, -5.38], [1.86, -5.45]]) {
    for (let z = -4.85; z < -1.5; z += 0.2) {
      if (rnd() < 0.5) onigiri.push([xo, y + 0.075, z]);
      else bento.push([xo, y + 0.04, z]);
    }
  }
  const oniMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 3), noOutline(basic({ color: "#fbfaf4" })), onigiri.length);
  const tmp = new THREE.Object3D();
  onigiri.forEach(([x, y, z], i) => {
    tmp.position.set(x, y, z);
    tmp.rotation.set(0, 0, Math.PI / 2);
    tmp.rotation.x = Math.PI / 2;
    tmp.updateMatrix();
    oniMesh.setMatrixAt(i, tmp.matrix);
  });
  world.add(oniMesh);
  instancedBoxes(world, bento.map(([x, y, z]) => ({ p: [x, y, z], s: [0.26, 0.07, 0.17] })), ["#ff8a3d", "#ffd166", "#e5484d", "#83c5be"], rnd);

  // gondola islands
  for (const gx of [-3.85, -2.2]) gondola(ctx, M, gx, -2.35, 3.9, rnd);

  // magazine rack along the front window, covers facing out
  box(S, M.inShelf, 3.1, 0.35, 0.42, -2.1, 0.2, 1.36);
  boxC(S, M.inShelf, 3.1, 0.55, 0.05, -2.1, 0.8, 1.2, -0.35, 0, 0);
  const mags = [];
  for (let x = -3.5; x < -0.75; x += 0.25) {
    mags.push({ p: [x + 0.03, 0.83, 1.27], s: [0.21, 0.3, 0.018], r: [-0.35, 0, 0] });
    mags.push({ p: [x + 0.1, 0.62, 1.34], s: [0.21, 0.28, 0.018], r: [-0.35, 0, 0] });
  }
  instancedBoxes(world, mags, ["#ef476f", "#ffd166", "#06d6a0", "#2f9bd6", "#f78c6b", "#9b5de5", "#ffffff", "#ff6b6b"], rnd);

  // ATM + copier along the left wall
  box(S, M.inGray, 0.5, 1.55, 0.7, -5.6, 0.2, -0.6);
  world.add(mesh(new THREE.PlaneGeometry(0.4, 0.3), basic({ color: "#8fd3ff" }), -5.34, 1.25, -0.6, -0.4, Math.PI / 2, 0));
  box(S, M.inWhite, 0.7, 1.0, 1.1, -5.5, 0.2, 0.6);
  box(S, M.inGray, 0.72, 0.08, 1.12, -5.5, 1.2, 0.6);
  world.add(mesh(new THREE.PlaneGeometry(0.22, 0.14), basic({ color: "#7fe7da" }), -5.14, 1.1, 0.2, -0.5, Math.PI / 2, 0));

  // ice cream chest freezer
  box(S, M.inWhite, 1.0, 0.8, 1.6, -0.85, 0.2, -3.0);
  const ice = [];
  for (let x = -1.2; x < -0.5; x += 0.14) for (let z = -3.65; z < -2.35; z += 0.16) ice.push({ p: [x, 0.97, z], s: [0.1, 0.06, 0.12] });
  instancedBoxes(world, ice, ["#ffffff", "#ffb3c6", "#bde0fe", "#ffd166", "#caffbf"], rnd);
  fx.add(mesh(new THREE.PlaneGeometry(0.96, 1.56), ctx.fxMat.freezerLid, -0.85, 1.02, -3.0, -Math.PI / 2));

  // register counter
  box(S, M.inCounter, 0.75, 0.95, 4.3, 0.975, 0.2, -1.75);
  box(S, M.inTeal, 0.02, 0.12, 4.3, 0.59, 0.9, -1.75);
  box(S, M.inGray, 0.85, 0.05, 4.4, 0.975, 1.15, -1.75);
  for (const z of [-3.0, -1.5]) {
    box(S, M.inDark, 0.32, 0.18, 0.36, 1.05, 1.2, z);
    world.add(mesh(new THREE.PlaneGeometry(0.26, 0.16), basic({ color: "#7fe7da" }), 0.87, 1.5, z, 0, -Math.PI / 2 + 0.0, 0));
    box(S, M.inDark, 0.04, 0.26, 0.04, 1.05, 1.2, z + 0.1);
  }
  // hot snack warmer
  box(S, M.inGray, 0.45, 0.05, 0.5, 1.0, 1.2, 0.05);
  fx.add(mesh(new THREE.BoxGeometry(0.44, 0.34, 0.48), ctx.fxMat.warmer, 1.0, 1.42, 0.05));
  instancedBoxes(world, [0, 1, 2, 3, 4, 5].map((i) => ({ p: [0.92 + (i % 2) * 0.16, 1.3 + Math.floor(i / 4) * 0.13, -0.1 + (i % 3) * 0.14], s: [0.12, 0.07, 0.1] })), ["#e89a3c", "#c9772b", "#f2c14e"], rnd);
  // oden pot + steam
  box(S, M.inGray, 0.55, 0.16, 0.45, 1.0, 1.2, -0.65);
  world.add(mesh(new THREE.PlaneGeometry(0.5, 0.4), basic({ color: "#c98a4a" }), 1.0, 1.365, -0.65, -Math.PI / 2));
  for (let i = 0; i < 6; i++) {
    const b = mesh(new THREE.SphereGeometry(0.035, 8, 6), M.inWhite, 0.88 + (i % 3) * 0.12, 1.39, -0.78 + Math.floor(i / 3) * 0.24);
    world.add(b);
  }
  ctx.steam = [0, 1, 2].map((i) => {
    const s = glow(ctx, 1.0, 1.5, -0.65, "#ffffff", 0.35, 0.0);
    s.userData.phase = i / 3;
    return s;
  });
  // back counter + microwaves + menu board
  box(S, M.inWhite, 0.5, 0.95, 2.9, 2.1, 0.2, -2.4);
  for (const z of [-3.3, -2.5]) {
    box(S, M.inGray, 0.42, 0.28, 0.5, 2.1, 1.15, z);
    world.add(mesh(new THREE.PlaneGeometry(0.28, 0.18), basic({ color: "#27313b" }), 1.885, 1.29, z, 0, -Math.PI / 2, 0));
  }
  world.add(mesh(new THREE.PlaneGeometry(1.9, 0.56), basic({ map: T.menuBoardTexture() }), 0.62, 2.55, -1.75, 0, -Math.PI / 2, 0));
  rod(S, M.inDark, 0.01, new THREE.Vector3(0.62, 2.83, -2.5), new THREE.Vector3(0.62, 3.86, -2.5));
  rod(S, M.inDark, 0.01, new THREE.Vector3(0.62, 2.83, -1.0), new THREE.Vector3(0.62, 3.86, -1.0));

  // self-serve coffee machine by the corner window
  box(S, M.inDark, 0.7, 0.85, 0.5, 1.9, 0.2, 1.2);
  box(S, M.inBlack, 0.46, 0.62, 0.36, 1.9, 1.05, 1.22);
  world.add(mesh(new THREE.PlaneGeometry(0.2, 0.14), basic({ color: "#7fe7da" }), 1.9, 1.5, 1.405));
  cyl(S, M.inWhite, 0.045, 0.1, 1.9, 1.08, 1.33, 10);
  cyl(S, M.inWhite, 0.05, 0.3, 2.3, 1.05, 1.25, 10, 0.055);
  world.add(mesh(new THREE.PlaneGeometry(0.46, 0.14), basic({ map: T.headerTexture("COFFEE", "", "#23303a") }), 1.9, 1.8, 1.405));

  // floor guide arrows
  const arrow = noOutline(basic({ map: T.arrowDecalTexture(), transparent: true, depthWrite: false }));
  for (const z of [-0.2, 0.55]) world.add(mesh(new THREE.PlaneGeometry(0.32, 0.32), arrow, 0.25, 0.206, z, -Math.PI / 2, 0, 0));

  // window posters (inside the front glass)
  world.add(mesh(new THREE.PlaneGeometry(0.46, 0.64), basic({ map: T.windowPosterTexture("oden") }), -3.35, 2.55, 1.69));
  world.add(mesh(new THREE.PlaneGeometry(0.46, 0.64), basic({ map: T.windowPosterTexture("matcha") }), -2.75, 2.55, 1.69));

  // hanging sale flags
  const flagCols = ["#e5484d", "#ffd166", "#1fa39a", "#ff8a3d"];
  for (let i = 0; i < 7; i++) {
    world.add(mesh(new THREE.PlaneGeometry(0.3, 0.2), noOutline(basic({ color: flagCols[i % 4], side: THREE.DoubleSide })), -4.6 + i * 0.55, 3.25, -0.6, 0, 0.3, 0));
  }
}

function gondola(ctx, M, gx, gz, L, rnd) {
  const { S, world } = ctx;
  box(S, M.inShelf, 0.78, 0.22, L, gx, 0.2, gz);
  box(S, M.inWhite, 0.06, 1.45, L, gx, 0.2, gz);
  const items = [];
  for (const y of [0.42, 0.78, 1.12, 1.44]) {
    box(S, M.inShelf, 0.74, 0.03, L, gx, y, gz);
    if (y > 1.4) continue;
    for (const side of [-1, 1]) {
      let z = gz - L / 2 + 0.08;
      while (z < gz + L / 2 - 0.1) {
        const w = 0.08 + rnd() * 0.06;
        const h = 0.12 + rnd() * 0.14;
        const d = 0.1 + rnd() * 0.12;
        items.push({ p: [gx + side * (0.08 + d / 2), y + 0.03 + h / 2, z + w / 2], s: [d, h, w] });
        z += w + 0.015;
      }
    }
  }
  // end cap facing the window
  for (const y of [0.42, 0.78, 1.12]) {
    for (let x = gx - 0.3; x < gx + 0.3; x += 0.13) items.push({ p: [x + 0.05, y + 0.1, gz + L / 2 + 0.06], s: [0.1, 0.16, 0.1] });
  }
  instancedBoxes(world, items, ["#ef476f", "#ffd166", "#06d6a0", "#2f9bd6", "#f78c6b", "#ffffff", "#9b5de5", "#ff6b6b", "#83c5be", "#b5e48c"], rnd);
  world.add(mesh(new THREE.PlaneGeometry(0.5, 0.26), noOutline(basic({ color: "#ffd166", side: THREE.DoubleSide })), gx, 1.8, gz + L / 2 - 0.1));
}

function instancedBoxes(parent, items, palette, rnd) {
  const mat = noOutline(new THREE.MeshBasicMaterial({ color: "#ffffff" }));
  const im = new THREE.InstancedMesh(BOX, mat, items.length);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  items.forEach((it, i) => {
    o.position.set(...it.p);
    o.rotation.set(...(it.r || [0, 0, 0]));
    o.scale.set(...it.s);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, c.set(palette[Math.floor(rnd() * palette.length)]).multiplyScalar(0.92));
  });
  parent.add(im);
  return im;
}

function buildNeighbor(ctx, M) {
  const { S, world } = ctx;
  box(S, M.neighbor, 1.9, 6.3, 12.2, -9.05, 0.15, -3.9);
  box(S, M.neighborTrim, 1.96, 0.14, 12.26, -9.05, 2.95, -3.9);
  box(S, M.neighborTrim, 2.0, 0.3, 12.3, -9.05, 6.45, -3.9);
  // upstairs front window + balcony
  world.add(mesh(new THREE.PlaneGeometry(1.2, 1.1), basic({ map: T.neighborWindowTexture(true) }), -9.05, 4.3, 2.21));
  box(S, M.neighborTrim, 1.4, 0.08, 0.5, -9.05, 3.55, 2.4);
  for (let x = -9.7; x <= -8.4; x += 0.2) rod(S, M.metal, 0.012, new THREE.Vector3(x, 3.63, 2.62), new THREE.Vector3(x, 4.05, 2.62));
  rod(S, M.metal, 0.02, new THREE.Vector3(-9.75, 4.05, 2.62), new THREE.Vector3(-8.35, 4.05, 2.62));
  // alley-side windows
  world.add(mesh(new THREE.PlaneGeometry(1.0, 1.0), basic({ map: T.neighborWindowTexture(true) }), -8.09, 4.4, -1.2, 0, Math.PI / 2, 0));
  world.add(mesh(new THREE.PlaneGeometry(1.0, 1.0), basic({ map: T.neighborWindowTexture(false) }), -8.09, 4.4, -5.2, 0, Math.PI / 2, 0));
  world.add(mesh(new THREE.PlaneGeometry(0.8, 0.5), basic({ map: T.neighborWindowTexture(false) }), -8.09, 1.8, -3.2, 0, Math.PI / 2, 0));
  acUnit(S, M, -7.8, 0.06, -6.6, Math.PI / 2);
  box(S, M.metalDark, 0.4, 0.06, 0.95, -7.9, 3.1, -3.2);
  acUnit(S, M, -7.8, 3.16, -3.2, Math.PI / 2);
  rod(S, M.metal, 0.05, new THREE.Vector3(-8.03, 0.06, 1.9), new THREE.Vector3(-8.03, 6.45, 1.9));
  // wall lamp inside the alley
  box(S, M.metalDark, 0.12, 0.18, 0.18, -8.02, 2.4, -2.2);
  ctx.alleyLamp = glow(ctx, -7.85, 2.45, -2.2, "#ffcf8a", 1.4, 0.8);
  pool(ctx, -7.05, 0.075, -2.2, 1.6, 2.2, "#ffc27a", 0.35);
  // roof tank + antenna
  cyl(S, M.metal, 0.45, 0.9, -9.2, 6.75, -6.5, 16);
  rod(S, M.metalDark, 0.02, new THREE.Vector3(-9.3, 6.75, -1), new THREE.Vector3(-9.3, 8.1, -1));
  rod(S, M.metalDark, 0.015, new THREE.Vector3(-9.7, 7.8, -1), new THREE.Vector3(-8.9, 7.8, -1));
  rod(S, M.metalDark, 0.015, new THREE.Vector3(-9.6, 7.5, -1), new THREE.Vector3(-9.0, 7.5, -1));

  // protruding neon sign
  const neonMat = basic({ map: T.neonTexture() });
  const side = M.black;
  const neon = mesh(new THREE.BoxGeometry(0.1, 2.0, 0.66), [neonMat, neonMat, side, side, side, side], -8.3, 3.75, 2.62);
  world.add(neon);
  ctx.neon = { mat: neonMat, glow: glow(ctx, -8.1, 3.75, 2.62, "#ff6fc0", 2.6, 0.45) };
}

function buildStreet(ctx, M) {
  const { S, world } = ctx;
  const Y = 0.152;

  // door mat
  box(S, M.mat, 1.7, 0.02, 0.85, 0.6, Y, 2.3);
  // umbrella stand
  cyl(S, M.metal, 0.17, 0.5, -0.78, Y, 2.2, 14);
  [["#e8f3ff", 0.1, 0.05], ["#2c3f78", -0.07, -0.04], ["#d8343c", 0.02, -0.08]].forEach(([c, dx, dz], i) => {
    const mat = i === 0 ? M.vinyl : toon(c);
    rod(S, mat, 0.045, new THREE.Vector3(-0.78 + dx, Y + 0.1, 2.2 + dz), new THREE.Vector3(-0.78 + dx * 2.2, Y + 1.05, 2.2 + dz * 2.2));
    rod(S, M.black, 0.012, new THREE.Vector3(-0.78 + dx * 2.2, Y + 1.05, 2.2 + dz * 2.2), new THREE.Vector3(-0.78 + dx * 2.4, Y + 1.2, 2.2 + dz * 2.4));
  });
  // recycle bins
  for (const [x, c] of [[1.75, "#2f78c9"], [2.17, "#3d9a5a"]]) {
    box(S, toon(c), 0.38, 0.85, 0.45, x, Y, 2.15);
    box(S, M.metalDark, 0.4, 0.05, 0.47, x, Y + 0.85, 2.15);
    boxC(S, M.black, 0.16, 0.05, 0.02, x, Y + 0.65, 2.38);
  }
  // A-board sign
  const aTex = T.aBoardTexture();
  const aMat = basic({ map: aTex });
  const aBoard = new THREE.Group();
  aBoard.position.set(-1.4, Y, 3.25);
  aBoard.rotation.y = -0.35;
  aBoard.add(mesh(new THREE.BoxGeometry(0.5, 0.72, 0.03), M.wood, 0, 0.38, 0.12, -0.18));
  aBoard.add(mesh(new THREE.BoxGeometry(0.5, 0.72, 0.03), M.wood, 0, 0.38, -0.12, 0.18));
  S.addObject(aBoard);
  // the aBoard's textured face is a multi-material mesh; add that one directly
  const aFace = mesh(new THREE.PlaneGeometry(0.46, 0.66), aMat, 0, 0.38, 0.14, -0.18);
  aBoard.clear();
  aBoard.add(aFace);
  world.add(aBoard);

  // bicycles
  bike(S, M, -3.3, Y, 4.35, 0.08, "#2fb3a8");
  bike(S, M, -2.45, Y, 4.45, -0.12, "#e5484d");

  // guard pipes along the front curb
  const railSpans = [[-9.2, -7.4], [-6.4, 2.6]];
  for (const [x0, x1] of railSpans) {
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / 1.5))) {
      cyl(S, M.rail, 0.04, 0.95, x, Y, 5.25, 8);
    }
    rod(S, M.rail, 0.035, new THREE.Vector3(x0, Y + 0.6, 5.25), new THREE.Vector3(x1, Y + 0.6, 5.25));
    rod(S, M.rail, 0.035, new THREE.Vector3(x0, Y + 0.92, 5.25), new THREE.Vector3(x1, Y + 0.92, 5.25));
  }

  // post box
  box(S, M.red, 0.55, 0.05, 0.45, 4.1, Y, 4.55);
  cyl(S, M.red, 0.06, 0.55, 4.1, Y, 4.55, 8);
  box(S, M.red, 0.5, 0.75, 0.42, 4.1, Y + 0.55, 4.55);
  boxC(S, M.red, 0.54, 0.1, 0.46, 4.1, Y + 1.35, 4.55);
  boxC(S, M.black, 0.26, 0.04, 0.02, 4.1, Y + 1.12, 4.77);

  // planter at the corner window
  box(S, M.concreteWall, 0.9, 0.4, 0.5, 3.4, Y, 2.3);
  const shrub = new THREE.IcosahedronGeometry(0.42, 0);
  B_add(S, shrub, M.leaf, tm(3.25, Y + 0.72, 2.3, 0.3, 0.2, 0, 1, 0.8, 0.7));
  B_add(S, shrub, M.leafDark, tm(3.65, Y + 0.66, 2.35, 0.1, 0.9, 0.2, 0.8, 0.7, 0.6));

  buildVending(ctx, M);
  buildBoard(ctx, M);

  // light pools
  pool(ctx, -0.65, Y + 0.01, 2.9, 7.2, 2.6, "#ffd29a", 0.5);
  pool(ctx, 3.6, 0.02, -1.4, 2.6, 6.8, "#ffd29a", 0.38);
  pool(ctx, 6.4, 0.02, 6.4, 5.4, 5.4, "#ffe2ad", 0.55);
  pool(ctx, -4.95, Y + 0.01, 3.4, 2.6, 1.6, "#d6ecff", 0.5);
}

function B_add(B, geo, mat, m) {
  B.add(geo, mat, m);
}

function bike(S, M, x, y, z, ry, color) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  const frame = toon(color);
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.028, 8, 28);
  for (const wz of [-0.45, 0.45]) {
    g.add(mesh(wheelGeo, M.black, 0, 0.32, wz, 0, Math.PI / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), M.metal, 0, 0.32, wz, 0, 0, Math.PI / 2));
  }
  const pts = (a, b) => [new THREE.Vector3(...a), new THREE.Vector3(...b)];
  const tube = (a, b, r = 0.025, mat = frame) => {
    const [p, q] = pts(a, b);
    const dir = new THREE.Vector3().subVectors(q, p);
    const m = mesh(new THREE.CylinderGeometry(r, r, dir.length(), 8), mat);
    m.position.copy(p).add(q).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    g.add(m);
  };
  tube([0, 0.32, -0.45], [0, 0.34, -0.02]);
  tube([0, 0.34, -0.02], [0, 0.72, -0.1]);
  tube([0, 0.72, -0.1], [0, 0.66, 0.35]);
  tube([0, 0.34, -0.02], [0, 0.66, 0.35]);
  tube([0, 0.66, 0.35], [0, 0.32, 0.45]);
  tube([0, 0.66, 0.35], [0, 0.95, 0.3]);
  tube([-0.22, 0.95, 0.3], [0.22, 0.95, 0.3], 0.02, M.black);
  g.add(mesh(new THREE.BoxGeometry(0.12, 0.05, 0.24), M.black, 0, 0.77, -0.12));
  g.add(mesh(new THREE.BoxGeometry(0.28, 0.16, 0.22), M.metal, 0, 0.9, 0.47));
  tube([0, 0.34, -0.02], [0.12, 0.08, 0.02], 0.015, M.metal);
  S.addObject(g);
}

function buildVending(ctx, M) {
  const g = new THREE.Group();
  g.position.set(-4.95, 0.152, 2.25);
  const specs = [
    { x: -0.5, kind: "drinks", body: "#2f6fb3" },
    { x: 0.5, kind: "books", body: "#b8483e" },
  ];
  ctx.vendMats = [];
  for (const s of specs) {
    const body = toon(s.body);
    const face = basic({ map: T.vendingTexture(s.kind) });
    ctx.vendMats.push(face);
    g.add(mesh(new THREE.BoxGeometry(0.95, 1.9, 0.75), [body, body, body, body, face, body], s.x, 0.95 + 0.05, 0.375));
    g.add(mesh(new THREE.BoxGeometry(0.99, 0.08, 0.8), M.metalDark, s.x, 1.99, 0.39));
    g.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.72), M.black, s.x, 0.03, 0.37));
  }
  hotspot(ctx, "vending", g, new THREE.Vector3(0, 2.45, 0.4));
  ctx.vendGlow = glow(ctx, -4.95, 1.3, 3.25, "#d6ecff", 3.4, 0.4);
}

function buildBoard(ctx, M) {
  const g = new THREE.Group();
  g.position.set(-9.05, 0.152, 2.72);
  const wood = M.wood;
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), M.metalDark, -0.82, 1.2, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), M.metalDark, 0.82, 1.2, 0));
  g.add(mesh(new THREE.BoxGeometry(1.8, 1.28, 0.08), toon("#3b5c48"), 0, 1.55, 0));
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.07, 0.12), wood, 0, 2.22, 0.01));
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.07, 0.12), wood, 0, 0.9, 0.01));
  g.add(mesh(new THREE.BoxGeometry(2.05, 0.06, 0.42), M.roof, 0, 2.42, 0.08, 0.2));
  g.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.12), M.metalDark, 0, 2.33, 0.18));
  ctx.boardMats = [];
  const posters = [
    [T.posterMainTexture(), 0.62, 0.86, -0.3, 1.56],
    [T.posterSmallTexture("notice"), 0.36, 0.5, 0.2, 1.72],
    [T.posterSmallTexture("cat"), 0.34, 0.47, 0.6, 1.62],
    [T.posterSmallTexture("festival"), 0.38, 0.52, 0.34, 1.2],
  ];
  posters.forEach(([tex, w, h, x, y], i) => {
    const m = noOutline(basic({ map: tex, color: "#e9e6f0" }));
    ctx.boardMats.push(m);
    g.add(mesh(new THREE.PlaneGeometry(w, h), m, x, y, 0.045, 0, 0, (i - 1.5) * 0.03));
  });
  hotspot(ctx, "poster", g, new THREE.Vector3(0, 2.75, 0.2));
  ctx.boardGlow = glow(ctx, -9.05, 2.3, 3.0, "#ffd9a0", 1.6, 0.55);
  pool(ctx, -9.05, 0.165, 3.2, 2.0, 1.0, "#ffd9a0", 0.3);
}

function wire(S, mat, a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  S.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.016, 5, false), mat);
}

function pole(S, M, x, z, h, armAngle) {
  cyl(S, M.pole, 0.15, h, x, 0.15, z, 12, 0.12);
  for (let y = 2.2; y < h - 1; y += 0.42) {
    const a = armAngle + (Math.round(y / 0.42) % 2 ? Math.PI / 2 : -Math.PI / 2);
    rod(S, M.metalDark, 0.012, new THREE.Vector3(x, y, z), new THREE.Vector3(x + Math.cos(a) * 0.26, y, z + Math.sin(a) * 0.26));
  }
  const tops = [];
  for (const [yy, len] of [[h - 0.35, 1.4], [h - 0.95, 1.1]]) {
    boxC(S, M.metalDark, len, 0.08, 0.09, x, yy, z, 0, -armAngle, 0);
    for (const k of [-0.45, 0, 0.45]) {
      const px = x + Math.cos(armAngle) * k * (len / 1.4);
      const pz = z - Math.sin(-armAngle) * k * (len / 1.4) * 0 + Math.sin(armAngle) * k * (len / 1.4);
      cyl(S, M.white, 0.04, 0.12, px, yy + 0.04, pz, 8);
      tops.push(new THREE.Vector3(px, yy + 0.16, pz));
    }
  }
  return tops;
}

function buildPoles(ctx, M) {
  const { S, world } = ctx;
  // A: front-left, wires run along x -> crossarm along z
  const A = pole(S, M, -6.9, 5.12, 8.0, Math.PI / 2);
  // B: corner, wires go -x and -z -> diagonal crossarm
  const B = pole(S, M, 5.2, 5.2, 8.0, Math.PI / 4);
  // C: back-right, wires run along z -> crossarm along x
  const C = pole(S, M, 5.3, -9.6, 7.6, 0);
  for (let i = 0; i < 3; i++) {
    wire(S, M.wire, A[i], B[i], 0.45);
    wire(S, M.wire, B[i], C[i], 0.42);
    wire(S, M.wire, A[i], new THREE.Vector3(-9.98, A[i].y - 0.2, A[i].z), 0.12);
    wire(S, M.wire, C[i], new THREE.Vector3(C[i].x, C[i].y - 0.2, -9.98), 0.08);
  }
  for (let i = 3; i < 6; i++) wire(S, M.wire, A[i], B[i], 0.5);
  wire(S, M.wire, B[4], new THREE.Vector3(2.45, 3.95, 1.75), 0.3);
  wire(S, M.wire, A[4], new THREE.Vector3(-8.1, 5.2, 1.6), 0.2);
  // transformer on A
  cyl(S, M.metal, 0.26, 0.7, -6.9, 5.2, 4.8, 14);
  rod(S, M.metalDark, 0.03, new THREE.Vector3(-6.9, 5.5, 5.0), new THREE.Vector3(-6.9, 5.5, 5.12));
  // address plate on A
  world.add(mesh(new THREE.PlaneGeometry(0.2, 0.8), basic({ map: T.addressPlateTexture() }), -6.9, 2.0, 5.28));

  // street lamp arm on B
  const dir = new THREE.Vector3(1, 0, 1).normalize();
  const a0 = new THREE.Vector3(5.2, 6.2, 5.2);
  const a1 = a0.clone().addScaledVector(dir, 1.5).add(new THREE.Vector3(0, 0.15, 0));
  rod(S, M.pole, 0.05, a0, a1);
  boxC(S, M.metalDark, 0.55, 0.14, 0.3, a1.x, a1.y - 0.05, a1.z, 0, -Math.PI / 4, 0);
  ctx.fx.add(mesh(new THREE.PlaneGeometry(0.46, 0.22), ctx.fxMat.lampFace, a1.x, a1.y - 0.13, a1.z, Math.PI / 2, 0, Math.PI / 4));
  glow(ctx, a1.x, a1.y - 0.2, a1.z, "#ffe2ad", 2.4, 0.9);
  lightCone(ctx, a1.x, a1.y - 0.15, a1.z, 2.6, a1.y - 0.2, "#ffe7bd", 0.13);

  // traffic signal on C, arm over the right road, head faces +z
  const s0 = new THREE.Vector3(5.3, 5.3, -9.6);
  const s1 = new THREE.Vector3(7.9, 5.3, -9.6);
  rod(S, M.pole, 0.05, s0, s1);
  box(S, M.metalDark, 1.25, 0.4, 0.22, 7.65, 5.0, -9.6);
  const lamps = [];
  ["#3dffb0", "#ffd24a", "#ff4d4d"].forEach((col, i) => {
    const x = 7.25 + i * 0.4;
    box(S, M.metalDark, 0.3, 0.05, 0.15, x, 5.36, -9.43);
    const m = basic({ color: col });
    ctx.world.add(mesh(new THREE.CircleGeometry(0.13, 18), noOutline(m), x, 5.2, -9.485));
    lamps.push({ mat: m, color: new THREE.Color(col), glow: glow(ctx, x, 5.2, -9.35, col, 1.3, 0) });
  });
  ctx.signal = { lamps, streak: addStreak(ctx, 7.65, 0.02, -9.3, "#ffffff", 0.55, 7, 0.0) };

  // pylon sign at the lot entrance
  cyl(S, M.pole, 0.1, 4.3, 5.2, 0.01, -0.4, 10);
  const py = T.pylonTexture();
  const pyMat = basic({ map: py });
  const pSide = M.teal;
  world.add(mesh(new THREE.BoxGeometry(0.22, 1.15, 1.15), [pSide, pSide, pSide, pSide, pyMat, pyMat], 5.2, 4.85, -0.4, 0, Math.PI / 2, 0));
  ctx.pylonGlow = glow(ctx, 5.2, 4.85, -0.4, "#bff7ee", 3.0, 0.4);

  // stop sign + guide sign + curve mirror
  cyl(S, M.pole, 0.035, 2.3, 4.55, 0.152, 5.28, 8);
  ctx.fx.add(mesh(new THREE.PlaneGeometry(0.62, 0.62), noOutline(basic({ map: T.stopSignTexture(), transparent: true, alphaTest: 0.4 })), 4.55, 2.2, 5.32, 0, 0.5, 0));
  cyl(S, M.pole, 0.04, 2.9, -2.0, 0.152, 5.3, 8);
  world.add(mesh(new THREE.PlaneGeometry(1.2, 0.5), basic({ map: T.guideSignTexture() }), -2.0, 2.85, 5.34));
  box(S, M.metalDark, 1.24, 0.54, 0.04, -2.0, 2.58, 5.3);
  cyl(S, M.orange, 0.045, 2.5, -9.55, 0.152, 5.15, 8);
  const mirror = new THREE.Group();
  mirror.position.set(-9.55, 2.55, 5.15);
  mirror.rotation.y = Math.PI / 4;
  mirror.add(mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), M.orange));
  mirror.add(mesh(new THREE.CircleGeometry(0.39, 24), basic({ map: T.mirrorTexture() }), 0, 0, 0.01));
  world.add(mirror);
}

/* ---------- fx: glows, pools, streaks, cones ---------- */

function glow(ctx, x, y, z, color, size, opacity) {
  const m = new THREE.SpriteMaterial({
    map: GLOW,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const s = new THREE.Sprite(m);
  s.position.set(x, y, z);
  s.scale.set(size, size, 1);
  s.userData.base = opacity;
  ctx.fx.add(s);
  return s;
}

function pool(ctx, x, y, z, sx, sz, color, opacity) {
  const m = mesh(new THREE.PlaneGeometry(1, 1), additive({ map: GLOW, color, opacity }), x, y, z, -Math.PI / 2);
  m.scale.set(sx, sz, 1);
  ctx.fx.add(m);
  return m;
}

function addStreak(ctx, x, y, z, color, width, length, intensity) {
  const g = new THREE.PlaneGeometry(width, length);
  g.rotateX(-Math.PI / 2);
  const mat = additive({ map: STREAK, color, opacity: intensity });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = 3;
  ctx.fx.add(m);
  const s = { m, x, y, z, length, base: intensity, mat };
  ctx.streaks.push(s);
  return s;
}

function lightCone(ctx, x, y, z, radius, height, color, strength) {
  const g = new THREE.CylinderGeometry(0.15, radius, height, 28, 1, true);
  const mat = noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uStrength;
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          float edge = abs(dot(normalize(cameraPosition - vW), normalize(vN)));
          float a = pow(vUv.y, 1.4) * pow(edge, 1.6) * uStrength;
          gl_FragColor = vec4(uColor, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  );
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y - height / 2, z);
  ctx.fx.add(m);
  return m;
}

function makeGlass() {
  return noOutline(
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color("#cfe6ef") } },
      vertexShader: `
        varying vec3 vW; varying vec3 vN;
        void main(){
          vec4 w = modelMatrix * vec4(position, 1.0);
          vW = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uTint;
        varying vec3 vW; varying vec3 vN;
        float h1(float n){ return fract(sin(n) * 43758.5453); }
        float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          float u = vW.x + vW.z;
          float cols = 11.0;
          float col = floor(u * cols);
          float fx = (fract(u * cols) - 0.5) / cols;
          float r = h1(col * 1.37 + 3.1);
          float drop = 0.0, trail = 0.0;
          if (r > 0.42) {
            float speed = 0.18 + r * 0.45;
            float y = 0.35 + mod(r * 17.0 - uTime * speed, 3.1);
            float dy = vW.y - y;
            drop = smoothstep(0.034, 0.012, length(vec2(fx * 1.2, dy * 0.75)));
            if (dy > 0.0 && dy < 0.7) trail = smoothstep(0.008, 0.002, abs(fx)) * (1.0 - dy / 0.7);
          }
          vec2 p = vec2(u, vW.y) * 16.0;
          vec2 cell = floor(p);
          vec2 f = fract(p) - 0.5;
          float rr = h2(cell);
          float dots = 0.0;
          if (rr > 0.72) {
            vec2 o = (vec2(h2(cell + 1.3), h2(cell + 7.1)) - 0.5) * 0.5;
            dots = smoothstep(0.16, 0.06, length(f - o));
          }
          vec3 V = normalize(cameraPosition - vW);
          float fres = pow(1.0 - abs(dot(V, normalize(vN))), 3.0);
          float sheen = smoothstep(0.55, 1.0, sin(u * 0.9 + vW.y * 1.4) * 0.5 + 0.5) * 0.05;
          vec3 color = mix(uTint, vec3(1.0), clamp(drop + dots * 0.6, 0.0, 1.0));
          color = mix(color, vec3(0.62, 0.72, 0.9), fres * 0.6);
          float a = 0.05 + drop * 0.6 + trail * 0.28 + dots * 0.32 + fres * 0.3 + sheen;
          gl_FragColor = vec4(color, clamp(a, 0.0, 0.85));
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
}

function buildRain(ctx, count) {
  const quad = new THREE.PlaneGeometry(0.022, 0.42);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute("position", quad.getAttribute("position"));
  geo.setAttribute("uv", quad.getAttribute("uv"));
  const data = new Float32Array(count * 4);
  const rnd = T.seeded(99);
  for (let i = 0; i < count; i++) {
    const x = -9.9 + rnd() * 19.8;
    const z = -9.9 + rnd() * 19.8;
    data.set([x, z, rnd(), floorAt(x, z)], i * 4);
  }
  geo.setAttribute("aDrop", new THREE.InstancedBufferAttribute(data, 4));
  geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTop: { value: 11 }, uRight: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: `
      attribute vec4 aDrop;
      uniform float uTime; uniform float uTop; uniform vec3 uRight;
      varying float vA; varying float vV;
      void main(){
        float span = uTop - aDrop.w;
        float speed = 8.5 + fract(aDrop.z * 7.13) * 3.5;
        float y = aDrop.w + mod(aDrop.z * span * 7.0 - uTime * speed, span);
        vec3 c = vec3(aDrop.x + (y - aDrop.w) * 0.07, y, aDrop.y);
        vec3 p = c + uRight * position.x + vec3(position.y * 0.07, position.y + 0.25, 0.0);
        vA = smoothstep(uTop, uTop - 1.5, y) * smoothstep(aDrop.w, aDrop.w + 0.3, y);
        vV = uv.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying float vA; varying float vV;
      void main(){
        float a = vA * (1.0 - vV * 0.8) * 0.36;
        gl_FragColor = vec4(0.8, 0.88, 1.0, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, noOutline(mat));
  m.frustumCulled = false;
  ctx.fx.add(m);
  ctx.rain = mat;
}

function buildRipples(ctx, count) {
  const quad = new THREE.PlaneGeometry(0.8, 0.8);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute("position", quad.getAttribute("position"));
  geo.setAttribute("uv", quad.getAttribute("uv"));
  const data = [];
  const rnd = T.seeded(314);
  // denser on puddles
  ctx.puddles.forEach(([x, y, z, rx, rz]) => {
    const n = Math.round(rx * rz * 7) + 2;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const k = Math.sqrt(rnd()) * 0.65;
      data.push(x + Math.cos(a) * rx * k, z + Math.sin(a) * rz * k, y + 0.012, rnd());
    }
  });
  let guard = 0;
  while (data.length / 4 < count && guard++ < 5000) {
    const x = -9.6 + rnd() * 19.2;
    const z = -9.6 + rnd() * 19.2;
    if (!isOpenGround(x, z)) continue;
    data.push(x, z, floorAt(x, z) + 0.012, rnd());
  }
  geo.setAttribute("aRip", new THREE.InstancedBufferAttribute(new Float32Array(data), 4));
  geo.instanceCount = data.length / 4;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute vec4 aRip;
      uniform float uTime;
      varying vec2 vUv; varying float vT;
      void main(){
        float k = uTime * 0.8 + aRip.w * 7.0;
        float t = fract(k);
        float cyc = floor(k);
        vec2 j = vec2(fract(sin(cyc * 12.9 + aRip.w * 78.2) * 43758.5), fract(sin(cyc * 39.3 + aRip.w * 11.7) * 24634.6)) - 0.5;
        vec3 c = vec3(aRip.x + j.x * 0.5, aRip.z, aRip.y + j.y * 0.5);
        vec3 p = c + vec3(position.x, 0.0, -position.y);
        vUv = uv; vT = t;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vT;
      void main(){
        vec2 q = vUv * 2.0 - 1.0;
        float d = length(q);
        if (d > 1.0) discard;
        float r1 = smoothstep(0.07, 0.0, abs(d - vT));
        float r2 = smoothstep(0.06, 0.0, abs(d - vT * 0.6)) * 0.6;
        float a = (r1 + r2) * (1.0 - vT) * 0.55;
        gl_FragColor = vec4(0.82, 0.9, 1.0, a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, noOutline(mat));
  m.frustumCulled = false;
  ctx.fx.add(m);
  ctx.ripples = mat;
}

function buildDrips(ctx) {
  const drops = [];
  const dropGeo = new THREE.SphereGeometry(0.035, 8, 6);
  const ringGeo = new THREE.RingGeometry(0.05, 0.075, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const rnd = T.seeded(77);
  const sources = [
    ...[-3.5, -2.35, -1.2, 0.1, 1.1, 2.2].map((x) => [x, 2.78, 3.08, 0.152]),
    ...[-4.6, -2.8, -0.9].map((z) => [2.66, 3.92, z, 0.01]),
    [-4.95, 2.0, 3.0, 0.152],
    [-5.95, 3.92, 2.0, 0.152],
  ];
  for (const [x, y0, z, y1] of sources) {
    const dropMat = noOutline(basic({ color: "#dff1ff", transparent: true, opacity: 0.85 }));
    const ringMat = noOutline(basic({ color: "#dff1ff", transparent: true, opacity: 0, depthWrite: false }));
    const d = mesh(dropGeo, dropMat, x, y0, z);
    d.scale.set(1, 2.2, 1);
    const r = mesh(ringGeo, ringMat, x, y1 + 0.015, z);
    ctx.fx.add(d, r);
    drops.push({ d, r, ringMat, x, y0, y1, z, period: 1.1 + rnd() * 1.6, phase: rnd() * 3 });
  }
  ctx.drips = drops;
}

/* ============================================================
   Hotspots
   ============================================================ */

function hotspot(ctx, key, group, anchor) {
  const entry = { key, group, anchor, hover: 0, meshes: [] };
  group.traverse((o) => {
    if (o.isMesh) {
      o.userData.hs = entry;
      entry.meshes.push(o);
    }
  });
  ctx.world.add(group);
  ctx.hotspots.push(entry);
}

/* ============================================================
   Entry
   ============================================================ */

export function initDiorama(container, { getLabel, onNavigate }) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    canvas.remove();
    return null;
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  GRAD = gradientMap();
  GLOW = T.glowTexture();
  STREAK = T.streakTexture();

  const scene = new THREE.Scene();
  const fxScene = new THREE.Scene();
  scene.fog = fxScene.fog = new THREE.FogExp2("#141b30", 0.0055);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
  const effect = new OutlineEffect(renderer, {
    defaultThickness: 0.0034,
    defaultColor: [0.06, 0.05, 0.1],
    defaultAlpha: 1,
    defaultKeepAlive: true,
  });

  const world = new THREE.Group();
  const fx = new THREE.Group();
  scene.add(world);
  fxScene.add(fx);

  const ctx = {
    S: new Batch(),
    world,
    fx,
    scene,
    lights: {},
    hotspots: [],
    streaks: [],
    glass: makeGlass(),
    doorGlass: makeGlass(),
    fxMat: {
      downlight: additive({ color: "#ffe9c4", opacity: 0.9, side: THREE.DoubleSide }),
      ceiling: noOutline(basic({ color: "#fffaf0" })),
      shelf: noOutline(basic({ color: "#fff6e2" })),
      freezerLid: noOutline(basic({ color: "#cfeeff", transparent: true, opacity: 0.35, depthWrite: false })),
      warmer: noOutline(basic({ color: "#ffb45c", transparent: true, opacity: 0.45, depthWrite: false })),
      lampFace: noOutline(basic({ color: "#fff4d8", side: THREE.DoubleSide })),
    },
  };

  const M = {
    plinth: toon("#2b2231"),
    rim: toon("#caa66b", 0.3),
    terrain: toon("#363b4a"),
    curb: toon("#8d93a1"),
    sideEdge: toon("#5d6270"),
    wall: toon("#ebe6dc"),
    wallDark: toon("#c7c0b3"),
    roof: toon("#4b505e"),
    metal: toon("#a4acb6"),
    metalDark: toon("#3b404b"),
    black: toon("#1e1d25"),
    white: toon("#eeeeea"),
    teal: toon("#1f9e95", 0.25),
    orange: toon("#ff8a3d", 0.3),
    awning: toon("#2d6a70"),
    pole: toon("#aaa9a2"),
    wire: flat("#16151d"),
    neighbor: toon("#71667c"),
    neighborTrim: toon("#5a5166"),
    rail: toon("#eceff2"),
    red: toon("#d8343c", 0.1),
    blueCrate: toon("#3a78c9"),
    green: toon("#3d8a5a"),
    greenDark: toon("#2b6644"),
    wood: toon("#8a5a3c"),
    concreteWall: toon("#8a8c93"),
    leaf: toon("#3f8f5a"),
    leafDark: toon("#2f7349"),
    mat: toon("#2f5a4c"),
    vinyl: toon("#e6f2ff", 0.15),
    inWhite: toon("#efebe2", 0.24),
    inShelf: toon("#dcd6ca", 0.22),
    inGray: toon("#a9b0bb", 0.2),
    inDark: toon("#3c414b", 0.15),
    inBlack: toon("#22232a", 0.2),
    inTeal: toon("#2fb3a8", 0.35),
    inWood: toon("#caa47c", 0.2),
    inCounter: toon("#ece6da", 0.24),
    asphalt: toonMap(T.asphaltTexture("#2a2f3d")),
    lot: toonMap(T.asphaltTexture("#333848")),
    sidewalk: toonMap(T.tileTexture("#5f6575", "#474c59", 4, 12)),
    concrete: toonMap(T.tileTexture("#575c68", "#4b505b", 2, 8)),
    grate: toonMap(T.grateTexture()),
    marking: flat("#dfe5ee", 0.32),
    puddle: flat("#172440", 0.35),
    puddleSheen: noOutline(
      new THREE.MeshBasicMaterial({ color: "#3a5b99", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
    ),
  };

  buildLights(ctx);
  buildBase(ctx, M);
  buildGround(ctx, M);
  buildStore(ctx, M);
  buildInterior(ctx, M);
  buildNeighbor(ctx, M);
  buildStreet(ctx, M);
  buildPoles(ctx, M);
  buildRain(ctx, coarse ? 1100 : 2200);
  buildRipples(ctx, coarse ? 70 : 120);
  buildDrips(ctx);
  ctx.S.build(world);

  // reflections on the wet ground (turned toward the camera every frame)
  const refl = [
    addStreak(ctx, 6.35, 0.02, 6.35, "#ffe2ad", 1.0, 6, 0.55),
    addStreak(ctx, -1.75, 0.17, 3.3, "#dffcf6", 4.6, 5.5, 0.28),
    addStreak(ctx, -1.2, 0.17, 2.4, "#ffd49a", 3.8, 4.5, 0.4),
    addStreak(ctx, 3.0, 0.02, -1.5, "#ffd49a", 3.0, 4.5, 0.32),
    addStreak(ctx, -4.95, 0.17, 3.1, "#d6ecff", 1.6, 3.8, 0.45),
    addStreak(ctx, 5.2, 0.02, -0.4, "#bff7ee", 0.8, 4.5, 0.38),
    addStreak(ctx, -8.3, 0.17, 2.9, "#ff6fc0", 0.5, 3.2, 0.45),
    addStreak(ctx, -9.05, 0.17, 3.0, "#ffd9a0", 0.8, 2.2, 0.28),
  ];
  const signStreak = refl[1];

  /* ---------- label + a11y ---------- */
  const label = document.createElement("div");
  label.className = "diorama__label";
  label.setAttribute("aria-hidden", "true");
  label.innerHTML = `<strong></strong><span></span><em></em>`;
  container.appendChild(label);
  const [lMain, lSub, lHint] = label.children;

  const sr = document.createElement("nav");
  sr.className = "sr-only";
  sr.setAttribute("aria-label", "Diorama shortcuts");
  ["sign", "door", "vending", "poster"].forEach((key) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = getLabel(key).main;
    b.addEventListener("click", () => onNavigate(key));
    sr.appendChild(b);
  });
  container.appendChild(sr);

  /* ---------- camera + controls ---------- */
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.enableZoom = coarse;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.32;
  controls.maxPolarAngle = 1.42;
  controls.minDistance = 11;
  controls.target.set(-0.4, 1.0, 0.2);
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  canvas.style.touchAction = "pan-y";

  let fitDist = 40;
  let zoomDist = 40;
  let userZoomed = false;
  const dirInit = new THREE.Vector3().setFromSphericalCoords(1, 1.12, 0.4);
  const corners = [
    [-6.9, 8.2, 5.12],
    [5.2, 8.2, 5.2],
    [5.3, 7.8, -9.6],
    [-10, 7, -10],
    [-10, 7, 2.2],
    [-8.1, 7, -10],
  ].map((p) => new THREE.Vector3(...p));
  for (const x of [-10.55, 10.55]) for (const z of [-10.55, 10.55]) for (const y of [-1.45, 0.2]) corners.push(new THREE.Vector3(x, y, z));
  const probe = new THREE.PerspectiveCamera();
  const pv = new THREE.Vector3();

  let xLimit = 0.94;
  function fits(d) {
    probe.position.copy(controls.target).addScaledVector(dirInit, d);
    probe.lookAt(controls.target);
    probe.updateMatrixWorld();
    for (const c of corners) {
      pv.copy(c).project(probe);
      if (Math.abs(pv.x) > xLimit || pv.y > 0.84 || pv.y < -0.7) return false;
    }
    return true;
  }

  function fit() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.85 ? 40 : 30;
    camera.updateProjectionMatrix();
    probe.copy(camera);
    xLimit = camera.aspect < 0.85 ? 1.0 : 0.94;
    let lo = 12;
    let hi = 200;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fitDist = hi;
    controls.maxDistance = fitDist * 1.12;
    if (!userZoomed) zoomDist = fitDist;
  }
  fit();
  camera.position.copy(controls.target).addScaledVector(dirInit, fitDist);
  controls.update();
  new ResizeObserver(fit).observe(container);

  if (!coarse) {
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (window.scrollY > 4) return;
        const zoomIn = e.deltaY < 0;
        if (!zoomIn && zoomDist >= controls.maxDistance - 0.05) return;
        e.preventDefault();
        userZoomed = true;
        container.classList.add("is-touched");
        zoomDist = THREE.MathUtils.clamp(zoomDist * Math.exp(e.deltaY * 0.0011), controls.minDistance, controls.maxDistance);
      },
      { passive: false }
    );
  }

  /* ---------- picking ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pickables = ctx.hotspots.flatMap((h) => h.meshes);
  let pointerInside = false;
  let needsPick = false;
  let hovered = null;
  let down = null;

  function setNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  function pick() {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.hs : null;
  }
  function setHover(h) {
    if (hovered === h) return;
    hovered = h;
    container.classList.toggle("is-hot", !!h);
    if (h) {
      const l = getLabel(h.key);
      lMain.textContent = l.main;
      lSub.textContent = l.sub;
      lHint.textContent = l.hint || "";
      lHint.style.display = l.hint ? "" : "none";
      label.classList.add("is-on");
      if (h.key === "door") ctx.door.target = 1;
    } else {
      label.classList.remove("is-on");
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    setNdc(e);
    pointerInside = true;
    needsPick = true;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
  });
  canvas.addEventListener("pointerleave", () => {
    pointerInside = false;
    setHover(null);
  });
  canvas.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!down) return;
    const isTap = !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 600;
    down = null;
    if (!isTap) return;
    setNdc(e);
    const h = pick();
    if (e.pointerType === "touch") {
      if (h && h === hovered) onNavigate(h.key);
      else setHover(h);
    } else if (h) {
      onNavigate(h.key);
    }
  });
  controls.addEventListener("start", () => {
    container.classList.add("is-touched");
    if (coarse) setHover(null);
  });

  /* ---------- per-frame updates ---------- */
  const clock = new THREE.Timer();
  const camRight = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  let signFlick = 1;
  let nextFlicker = 4;
  let flickerUntil = 0;

  function updateStreaks() {
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (const s of ctx.streaks) {
      let dx = cx - s.x;
      let dz = cz - s.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      let L = s.length;
      if (dx) L = Math.min(L, ((dx > 0 ? 9.95 : -9.95) - s.x) / dx);
      if (dz) L = Math.min(L, ((dz > 0 ? 9.95 : -9.95) - s.z) / dz);
      L = Math.max(0.2, L);
      s.m.scale.z = L / s.length;
      s.m.position.set(s.x + (dx * L) / 2, s.y, s.z + (dz * L) / 2);
      s.m.rotation.y = Math.atan2(dx, dz);
    }
  }

  function tick() {
    clock.update();
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsed();
    const motion = reduceMotion ? 0.35 : 1;

    // zoom easing (desktop wheel)
    if (!coarse) {
      tmpV.subVectors(camera.position, controls.target);
      const d = tmpV.length();
      const nd = d + (zoomDist - d) * 0.12;
      camera.position.copy(controls.target).addScaledVector(tmpV.normalize(), nd);
    }
    controls.update();

    // shader clocks
    ctx.glass.uniforms.uTime.value = t * motion;
    ctx.doorGlass.uniforms.uTime.value = t * motion;
    ctx.rain.uniforms.uTime.value = t * motion;
    ctx.ripples.uniforms.uTime.value = t * motion;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    camRight.y = 0;
    camRight.normalize();
    ctx.rain.uniforms.uRight.value.copy(camRight);

    // sign flicker (suppressed while hovered)
    const signHover = ctx.hotspots.some((h) => h.key === "sign" && h === hovered);
    if (!reduceMotion && t > nextFlicker) {
      flickerUntil = t + 0.45;
      nextFlicker = t + 5 + Math.random() * 7;
    }
    let target = 1;
    if (t < flickerUntil && !signHover) target = Math.sin(t * 60) > 0.2 ? 1 : 0.35;
    if (signHover) target = 1.15;
    signFlick += (target - signFlick) * (t < flickerUntil ? 0.9 : 0.15);
    ctx.signMat.color.setScalar(Math.min(signFlick, 1));
    ctx.signGlows.forEach((g) => (g.material.opacity = g.userData.base * signFlick * (signHover ? 1.6 : 1)));
    signStreak.mat.opacity = signStreak.base * signFlick;
    ctx.lights.sign.intensity = 14 * signFlick;

    // neon: irregular buzz
    const nb = Math.sin(t * 23) + Math.sin(t * 7.3) > 1.55 ? 0.35 : 1;
    ctx.neon.mat.color.setScalar(reduceMotion ? 1 : nb);
    ctx.neon.glow.material.opacity = ctx.neon.glow.userData.base * (reduceMotion ? 1 : nb);

    // automatic door
    const door = ctx.door;
    if (!reduceMotion && t > door.next) {
      door.target = 1;
      door.next = t + 7 + Math.random() * 6;
      door.closeAt = t + 2.6;
    }
    if (door.closeAt && t > door.closeAt && !(hovered && hovered.key === "door")) {
      door.target = 0;
      door.closeAt = 0;
    }
    if (hovered && hovered.key === "door") door.closeAt = t + 1.2;
    door.open += (door.target - door.open) * Math.min(1, dt * 4);
    door.panels.forEach((p) => (p.position.x = p.userData.side * (0.45 + door.open * 0.82)));
    door.led.material.color.set(door.open > 0.05 ? "#4dff88" : "#ff4d4d");

    // traffic signal: green 7s, yellow 2s, red 7s
    const phase = (t * motion) % 16;
    const active = phase < 7 ? 0 : phase < 9 ? 1 : 2;
    ctx.signal.lamps.forEach((l, i) => {
      const on = i === active;
      l.mat.color.copy(l.color).multiplyScalar(on ? 1 : 0.18);
      l.glow.material.opacity = on ? 0.75 : 0;
    });
    ctx.signal.streak.mat.color.copy(ctx.signal.lamps[active].color);
    ctx.signal.streak.mat.opacity = 0.45;

    // oden steam
    ctx.steam.forEach((s) => {
      const k = (t * 0.35 + s.userData.phase) % 1;
      s.position.y = 1.45 + k * 0.7;
      s.position.x = 1.0 + Math.sin((k + s.userData.phase) * 6) * 0.05;
      s.material.opacity = Math.sin(k * Math.PI) * 0.35;
      s.scale.setScalar(0.25 + k * 0.4);
    });

    // eave drips
    for (const d of ctx.drips) {
      const fall = Math.sqrt((2 * (d.y0 - d.y1)) / 14);
      const k = ((t * motion + d.phase) % d.period) / d.period;
      const tt = k * d.period;
      if (tt < fall) {
        d.d.visible = true;
        d.d.position.y = d.y0 - 7 * tt * tt;
        d.ringMat.opacity = 0;
      } else {
        d.d.visible = false;
        const r = (tt - fall) / 0.6;
        if (r < 1) {
          d.r.scale.setScalar(1 + r * 4);
          d.ringMat.opacity = (1 - r) * 0.7;
        } else d.ringMat.opacity = 0;
      }
    }

    // hotspot hover easing
    for (const h of ctx.hotspots) {
      const target = h === hovered ? 1 : 0;
      h.hover += (target - h.hover) * Math.min(1, dt * 9);
      h.group.scale.setScalar(1 + 0.08 * h.hover);
    }
    const vend = ctx.hotspots.find((h) => h.key === "vending").hover;
    ctx.vendMats.forEach((m) => m.color.setScalar(1));
    ctx.vendGlow.material.opacity = ctx.vendGlow.userData.base * (1 + vend * 1.2);
    const board = ctx.hotspots.find((h) => h.key === "poster").hover;
    ctx.boardMats.forEach((m) => m.color.set("#e9e6f0").lerp(new THREE.Color("#ffffff"), board));
    ctx.boardGlow.material.opacity = ctx.boardGlow.userData.base * (1 + board * 1.2);

    updateStreaks();

    // pick + label
    if (needsPick && pointerInside && !(down && down.moved)) {
      setHover(pick());
      needsPick = false;
    }
    if (hovered) {
      tmpV.copy(hovered.anchor);
      hovered.group.localToWorld(tmpV);
      tmpV.project(camera);
      if (tmpV.z > 1) label.classList.remove("is-on");
      else {
        const w = container.clientWidth;
        const h = container.clientHeight;
        label.style.left = `${((tmpV.x + 1) / 2) * w}px`;
        label.style.top = `${((1 - tmpV.y) / 2) * h}px`;
      }
    }

    effect.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(fxScene, camera);
    renderer.autoClear = true;
  }

  let running = false;
  let visible = true;
  function loop() {
    if (!running) return;
    tick();
    requestAnimationFrame(loop);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) {
      clock.update();
      requestAnimationFrame(loop);
    }
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    setRunning(visible && !document.hidden);
  }).observe(container);
  document.addEventListener("visibilitychange", () => setRunning(visible && !document.hidden));
  setRunning(true);

  return {
    refreshLabels() {
      if (hovered) {
        const h = hovered;
        hovered = null;
        setHover(h);
      }
      [...sr.children].forEach((b, i) => (b.textContent = getLabel(["sign", "door", "vending", "poster"][i]).main));
    },
  };
}
