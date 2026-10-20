import * as THREE from "three";

/* Framework-agnostic scene engine. Pinned to three@0.128.0: colours and light intensities are tuned for that release. */

export interface CityStopDef {
  place: string;
  cell: [number, number];
  pinY: number;
}

export interface CityState {
  /** stop the car is parked at, or -1 while driving */
  active: number;
  /** next stop in the travel direction */
  next: number;
  pct: number;
  dir: 1 | -1;
  turning: boolean;
  /** number of stops already passed */
  visited: number;
  /** timeline fill, 0..1 */
  fill: number;
  /** user has scrolled past the intro */
  started: boolean;
}

export interface CityOptions {
  /** the engine creates (and removes) its own <canvas> inside this element */
  host: HTMLElement;
  stage: HTMLElement;
  track: HTMLElement;
  panel: HTMLElement;
  pins: HTMLElement[];
  stops: CityStopDef[];
  onState: (s: CityState) => void;
}

export interface CityHandle {
  destroy: () => void;
  goTo: (stopIndex: number) => void;
}

interface RStop extends CityStopDef {
  pos: THREE.Vector3;
  t: number;
  face: number;
  sl: number;
  sr: number;
  s: number;
  group?: THREE.Group;
}

interface Beacon {
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  beam: THREE.Mesh;
  beamMat: THREE.MeshBasicMaterial;
  a: number;
}

interface Turn {
  k: number;
  P: THREE.Vector3;
  H: THREE.Vector3;
  R: THREE.Vector3;
}

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));
const sstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const NS = 1000;
const LANE = 1.5;
const UA = 3.2;
const VMAX = 0.17;
const GAIN = 3.5;
const TURN_EPS = 0.012;
const TURN_S = 1.3;

export function createCity(o: CityOptions): CityHandle | null {
  const root = document.documentElement;
  const N = o.stops.length;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* A fresh canvas per instance: a canvas whose context was force-lost can never be reused,
     and React Strict Mode mounts, unmounts and mounts again in development. */
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block", touchAction: "pan-y" });
  o.host.appendChild(canvas);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    canvas.remove();
    return null;
  }

  const tok = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
  const hslc = (n: string) => {
    const m = tok(n).match(/-?[\d.]+/g) || ["0", "0", "50"];
    return new THREE.Color().setHSL(+m[0] / 360, +m[1] / 100, +m[2] / 100);
  };
  const isDark = () => root.classList.contains("dark");

  const V = THREE.Vector3;
  const carPos = new V();
  const hd = new V(0, 0, 1);
  const prevPos = new V();
  const tmpP = new V();
  const tmpT = new V();
  const tmpR = new V();
  const camT = new V();
  const lookT = new V();
  const camPos = new V();
  const look = new V();
  const v3 = new V();
  const v4 = new V();

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 95, 260);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 420);
  let dprCap = 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  const phong = (sh: number) => new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: sh, specular: 0x333333 });
  const lambert = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
  const M = {
    ground: lambert(),
    road: lambert(),
    dash: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    tree: lambert(),
    bldg: lambert(),
    roof: lambert(),
    lm: lambert(),
    lmTrim: lambert(),
    plaza: lambert(),
    glass: phong(90),
    gold: phong(70),
    goldBasic: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    ribDim: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    ribDone: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
    body: phong(110),
    cglass: phong(140),
    trim: phong(120),
    dark: new THREE.MeshLambertMaterial({ color: 0x0a0b0d }),
    head: new THREE.MeshBasicMaterial({ color: 0xfff1cf }),
    tail: new THREE.MeshBasicMaterial({ color: 0x7a0d12 }),
    tailT: new THREE.MeshBasicMaterial({ color: 0xa3141b }),
  };

  /* Facade shader for the buildings: procedural window grid in world space, so one instanced mesh
     (any size, any height) gets floors and windows with no textures and no per-instance UVs.
     By day the windows are dark glass, at night about half of them are lit. */
  const winU = { uNight: { value: 0 }, uTint: { value: new THREE.Color(0x3a5068) }, uLit: { value: new THREE.Color(0xffd89a) } };
  (M.bldg as unknown as { extensions: { derivatives: boolean } }).extensions = { derivatives: true };
  M.bldg.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = winU.uNight;
    sh.uniforms.uTint = winU.uTint;
    sh.uniforms.uLit = winU.uLit;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying vec2 vSeed;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vSeed = vec2(instanceMatrix[3].x, instanceMatrix[3].z);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight; uniform vec3 uTint; uniform vec3 uLit;
        varying vec3 vWP; varying vec3 vWN; varying vec2 vSeed;
        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float wall = 1.0 - step(0.5, abs(vWN.y));
          float along = abs(vWN.x) > abs(vWN.z) ? vWP.z : vWP.x;
          vec2 g = vec2(along / 0.95, vWP.y / 1.05);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          vec2 fw = fwidth(g) * 0.7 + 0.0001;
          float aa = 1.0 - smoothstep(0.2, 0.55, max(fw.x, fw.y) / 0.7);
          float win = smoothstep(0.2 - fw.x, 0.2 + fw.x, f.x) * (1.0 - smoothstep(0.8 - fw.x, 0.8 + fw.x, f.x))
                    * smoothstep(0.3 - fw.y, 0.3 + fw.y, f.y) * (1.0 - smoothstep(0.78 - fw.y, 0.78 + fw.y, f.y))
                    * step(1.0, vWP.y);
          /* interpolated varyings carry tiny float errors; snap the seed so the hash cannot turn them into grain */
          float rr = h21(cell + floor(vSeed * 0.5 + 0.5) * 0.37);
          float m = wall * win * aa;
          diffuseColor.rgb *= 1.0 - 0.07 * wall * aa * (1.0 - step(0.3, f.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.75 + 0.5 * rr), m * 0.94);
          float lit = step(0.5, rr) * m * uNight;
          totalEmissiveRadiance += uLit * lit * (0.5 + 0.7 * h21(cell.yx + 3.1));
        }`,
      );
  };

  const hemi = new THREE.HemisphereLight(0xffffff, 0x999999, 0.9);
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(-50, 80, 35);
  scene.add(hemi, sun);

  const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    return b;
  };
  const cyl = (r1: number, r2: number, h: number, seg: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
    c.position.set(x, y, z);
    return c;
  };

  /* ---------- stops and route ---------- */
  const stops: RStop[] = o.stops.map((s) => ({ ...s, pos: new V(), t: 0, face: 0, sl: 0, sr: 0, s: 0 }));
  const P = 16;
  const g2w = (i: number, j: number) => new V(i * P, 0.2, j * P);
  const corners = ([[-4, 2], [-1, 2], [-1, 0], [2, 0], [2, -2], [5, -2], [5, 0], [7.5, 0]] as [number, number][]).map((c) => g2w(c[0], c[1]));
  const pts: THREE.Vector3[] = [corners[0].clone()];
  const fill = (a: THREE.Vector3, b: THREE.Vector3) => {
    const n = Math.floor(a.distanceTo(b) / 6);
    for (let k = 1; k <= n; k++) pts.push(a.clone().lerp(b, k / (n + 1)));
  };
  for (let i = 1; i < corners.length - 1; i++) {
    const a = corners[i - 1], b = corners[i], c = corners[i + 1];
    const din = b.clone().sub(a).normalize();
    const dout = c.clone().sub(b).normalize();
    const pIn = b.clone().addScaledVector(din, -5);
    const pOut = b.clone().addScaledVector(dout, 5);
    fill(pts[pts.length - 1], pIn);
    pts.push(pIn, pOut);
  }
  fill(pts[pts.length - 1], corners[corners.length - 1]);
  pts.push(corners[corners.length - 1].clone());
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  curve.arcLengthDivisions = 2000;
  curve.updateArcLengths();
  const samples: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i <= NS; i++) {
    const u = i / NS;
    samples.push(curve.getPointAt(u));
    const tg = curve.getTangentAt(u);
    tg.y = 0;
    tg.normalize();
    tangents.push(tg);
  }
  stops.forEach((st) => {
    st.pos.set(st.cell[0] * P, 0, st.cell[1] * P);
    let best = 0, bd = 1e9;
    samples.forEach((p, idx) => {
      const d = (p.x - st.pos.x) ** 2 + (p.z - st.pos.z) ** 2;
      if (d < bd) { bd = d; best = idx; }
    });
    st.t = best / NS;
    const rp = samples[best];
    st.face = Math.atan2(rp.x - st.pos.x, rp.z - st.pos.z);
  });

  /* scroll -> route mapping with a dwell at every stop */
  let keys: number[][] = [[0, 0]];
  {
    const d = 0.034, travel = 1 - 2 * d * N; /* d = half-width of the scroll dwell at each stop */
    stops.forEach((st, k) => {
      st.sl = st.t * travel + k * 2 * d;
      st.sr = Math.min(1, st.sl + 2 * d);
      st.s = (st.sl + st.sr) / 2;
      keys.push([st.sl, st.t], [st.sr, st.t]);
    });
  }
  const mapT = (s: number) => {
    for (let i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        return b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (s - a[0])) / (b[0] - a[0]);
      }
    }
    return keys[keys.length - 1][1];
  };
  const scrollInfo = () => {
    const r = o.track.getBoundingClientRect();
    const range = Math.max(1, r.height - window.innerHeight);
    return { top: window.pageYOffset + r.top, range, p: clamp(-r.top / range, 0, 1) };
  };

  /* ---------- world ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), M.ground);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const X0 = -8, X1 = 11, Z0 = -5, Z1 = 5, RW = 6;
  for (let ix = X0; ix <= X1; ix++) {
    const rm = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.1, (Z1 - Z0) * P + RW), M.road);
    rm.position.set(ix * P, 0.05, ((Z0 + Z1) / 2) * P);
    scene.add(rm);
  }
  for (let jz = Z0; jz <= Z1; jz++) {
    const rm = new THREE.Mesh(new THREE.BoxGeometry((X1 - X0) * P + RW, 0.1, RW), M.road);
    rm.position.set(((X0 + X1) / 2) * P, 0.05, jz * P);
    scene.add(rm);
  }
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.02, 1.6), M.dash, 3200);
  const dm = new THREE.Object3D();
  let dn = 0;
  const nearX = (v: number) => {
    const r = v / P;
    return Math.abs(r - Math.round(r)) * P < RW / 2 + 0.8;
  };
  for (let vx = X0; vx <= X1; vx++) {
    for (let z = Z0 * P; z <= Z1 * P; z += 4.2) {
      if (nearX(z)) continue;
      dm.position.set(vx * P, 0.11, z);
      dm.rotation.y = 0;
      dm.updateMatrix();
      dashes.setMatrixAt(dn++, dm.matrix);
    }
  }
  for (let hz = Z0; hz <= Z1; hz++) {
    for (let x = X0 * P; x <= X1 * P; x += 4.2) {
      if (nearX(x)) continue;
      dm.position.set(x, 0.11, hz * P);
      dm.rotation.y = Math.PI / 2;
      dm.updateMatrix();
      dashes.setMatrixAt(dn++, dm.matrix);
    }
  }
  dashes.count = dn;
  scene.add(dashes);

  const ribbon = (w: number, y: number, mat: THREE.Material) => {
    const pos = new Float32Array((NS + 1) * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i <= NS; i++) {
      const p = samples[i], t = tangents[i];
      const nx = -t.z, nz = t.x;
      pos.set([p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w], i * 6);
      if (i < NS) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2;
    scene.add(m);
    return m;
  };
  ribbon(0.22, 0.13, M.ribDim);
  const ribDone = ribbon(0.22, 0.15, M.ribDone);

  let seed = 11;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nearLm = (x: number, z: number) => stops.some((s) => (s.pos.x - x) ** 2 + (s.pos.z - z) ** 2 < 84);

  const hash2 = (a: number, b: number) => {
    const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  /* 0 slab, 1 stepped tower, 2 gabled low-rise, 3 podium + tower. Picked by a position hash, not rnd(), so the layout stays stable. */
  const pickKind = (x: number, z: number, h: number) => {
    const q = hash2(x, z);
    if (h < 2.5) return q < 0.6 ? 2 : 0;
    if (h > 4.4) return q < 0.55 ? 1 : 3;
    return q < 0.4 ? 3 : q < 0.5 ? 1 : 0;
  };
  interface Lot { x: number; z: number; w: number; d: number; h: number; sh: number; kind: number }
  const lots: Lot[] = [];
  const treeSpots: [number, number][] = [];
  for (let i2 = X0; i2 < X1; i2++) {
    for (let j2 = Z0; j2 < Z1; j2++) {
      const cx = (i2 + 0.5) * P, cz = (j2 + 0.5) * P;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const lx = cx + sx * 2.7, lz = cz + sz * 2.7;
          if (nearLm(lx, lz)) continue;
          if (rnd() < 0.14) { treeSpots.push([lx - 0.8, lz - 0.5], [lx + 0.9, lz + 0.7]); continue; }
          const dc = Math.hypot(lx - 60, lz);
          const h = 1.6 + rnd() * 2.4 + 5 * Math.exp(-(dc * dc) / (2 * 46 * 46)) * rnd();
          lots.push({ x: lx, z: lz, w: 3 + rnd() * 1.3, d: 3 + rnd() * 1.3, h, sh: rnd(), kind: pickKind(lx, lz, h) });
        }
      }
    }
  }
  interface BI { x: number; y: number; z: number; sx: number; sy: number; sz: number; c: number; ry?: number }
  const boxes: BI[] = [];
  const caps: BI[] = [];
  const gables: BI[] = [];
  lots.forEach((l) => {
    const { x, z, w, d, h, sh, kind } = l;
    const q = hash2(z, x);
    if (kind === 2) {
      boxes.push({ x, y: 0, z, sx: w, sy: h, sz: d, c: sh });
      const along = w > d;
      gables.push({ x, y: h, z, sx: (along ? d : w) + 0.3, sy: 0.55 + 0.35 * q, sz: (along ? w : d) + 0.3, c: 0, ry: along ? Math.PI / 2 : 0 });
    } else if (kind === 1) {
      const lower = h * 0.58;
      boxes.push({ x, y: 0, z, sx: w, sy: lower, sz: d, c: sh });
      boxes.push({ x, y: 0, z, sx: w * 0.7, sy: h, sz: d * 0.7, c: Math.min(1, sh + 0.12) });
      caps.push({ x, y: lower, z, sx: w + 0.14, sy: 0.14, sz: d + 0.14, c: 0 });
      caps.push({ x, y: h, z, sx: w * 0.7 + 0.14, sy: 0.16, sz: d * 0.7 + 0.14, c: 0 });
      if (h > 5.6) caps.push({ x, y: h + 0.16, z, sx: 0.12, sy: 1.4 + q * 1.2, sz: 0.12, c: 0 });
    } else if (kind === 3) {
      const ph = 1.3 + 0.5 * q;
      const tx = x + (q - 0.5) * 0.5;
      boxes.push({ x, y: 0, z, sx: w, sy: ph, sz: d, c: Math.max(0, sh - 0.1) });
      boxes.push({ x: tx, y: ph, z, sx: w * 0.62, sy: h - ph, sz: d * 0.62, c: Math.min(1, sh + 0.2) });
      caps.push({ x, y: ph, z, sx: w + 0.12, sy: 0.14, sz: d + 0.12, c: 0 });
      caps.push({ x: tx, y: h, z, sx: w * 0.62 + 0.12, sy: 0.14, sz: d * 0.62 + 0.12, c: 0 });
      if (h > 4) caps.push({ x: tx, y: h + 0.14, z, sx: w * 0.22, sy: 0.45, sz: d * 0.22, c: 0 });
    } else {
      boxes.push({ x, y: 0, z, sx: w, sy: h, sz: d, c: sh });
      caps.push({ x, y: h, z, sx: w + 0.12, sy: 0.14, sz: d + 0.12, c: 0 });
      if (h > 3) caps.push({ x: x + (q - 0.5) * w * 0.4, y: h + 0.14, z: z + (0.5 - q) * d * 0.3, sx: w * 0.3, sy: 0.5, sz: d * 0.28, c: 0 });
    }
  });

  const bgeo = new THREE.BoxGeometry(1, 1, 1);
  bgeo.translate(0, 0.5, 0);
  const gShape = new THREE.Shape();
  gShape.moveTo(-0.5, 0);
  gShape.lineTo(0.5, 0);
  gShape.lineTo(0, 1);
  gShape.lineTo(-0.5, 0);
  const ggeo = new THREE.ExtrudeGeometry(gShape, { depth: 1, bevelEnabled: false });
  ggeo.translate(0, 0, -0.5);

  const dummy = new THREE.Object3D();
  const instanced = (geo: THREE.BufferGeometry, mat: THREE.Material, list: BI[]) => {
    const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, b.ry || 0, 0);
      dummy.scale.set(b.sx, b.sy, b.sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.count = list.length;
    m.instanceMatrix.needsUpdate = true;
    scene.add(m);
    return m;
  };
  const bld = instanced(bgeo, M.bldg, boxes);
  instanced(bgeo, M.roof, caps);
  instanced(ggeo, M.roof, gables);
  dummy.rotation.set(0, 0, 0);

  const bcol = new THREE.Color();
  const tgeo = new THREE.ConeGeometry(0.95, 2.8, 6);
  tgeo.translate(0, 1.4, 0);
  const trees = new THREE.InstancedMesh(tgeo, M.tree, Math.max(1, treeSpots.length));
  treeSpots.forEach((t, i) => {
    const sc = 0.8 + rnd() * 0.7;
    dummy.position.set(t[0], 0, t[1]);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trees.setMatrixAt(i, dummy.matrix);
    trees.setColorAt(i, bcol.setScalar(0.78 + rnd() * 0.4)); /* slight green variation per tree */
  });
  trees.count = treeSpots.length;
  trees.instanceMatrix.needsUpdate = true;
  if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
  scene.add(trees);

  /* ---------- landmarks ---------- */
  const screenTexture = () => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0a0a0a"; g.fillRect(0, 0, 256, 128);
    const gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, "#d4af37"); gr.addColorStop(1, "#b8941f");
    g.fillStyle = gr; g.fillRect(14, 14, 70, 8);
    g.fillStyle = "#262626"; g.fillRect(150, 14, 92, 8);
    g.fillStyle = gr; g.fillRect(14, 36, 150, 26);
    g.fillStyle = "#f5f5f5"; g.fillRect(14, 70, 110, 6);
    g.fillStyle = "#8a8a8a"; g.fillRect(14, 82, 86, 5);
    [0, 1, 2].forEach((i) => {
      g.fillStyle = "#1a1a1a"; g.fillRect(14 + i * 78, 98, 70, 20);
      g.fillStyle = "rgba(212,175,55,.55)"; g.fillRect(20 + i * 78, 104, 30, 5);
    });
    g.fillStyle = "#1a1a1a"; g.fillRect(176, 36, 66, 56);
    g.fillStyle = "rgba(212,175,55,.35)"; g.fillRect(184, 46, 50, 36);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  };
  let screenTex: THREE.CanvasTexture | null = null;

  const builders: (() => THREE.Group)[] = [
    () => { /* storefront */
      const g = new THREE.Group();
      g.add(box(9, 3.2, 6, M.lm, 0, 1.6, 0), box(7.6, 1.7, 0.1, M.glass, 0, 1.25, 3.03));
      for (let i = 0; i < 6; i++) {
        const aw = box(1.5, 0.2, 2.1, i % 2 ? M.lmTrim : M.gold, -3.75 + i * 1.5, 3.05, 3.7);
        aw.rotation.x = 0.35;
        g.add(aw);
      }
      g.add(box(5.2, 1.1, 0.3, M.gold, 0, 4.1, 2.4));
      g.add(box(1, 1, 1, M.lmTrim, 4.6, 0.5, 4.3), box(1, 1, 1, M.gold, 4.6, 1.5, 4.3), box(1, 1, 1, M.lmTrim, 3.5, 0.5, 4.3));
      return g;
    },
    () => { /* car lot */
      const g = new THREE.Group();
      ([[-4, -1.7, M.gold], [-1.3, -1.7, M.glass], [1.4, -1.7, M.lm], [4.1, -1.7, M.gold], [-3.4, 1.7, M.lm], [-0.7, 1.7, M.gold], [2, 1.7, M.glass]] as [number, number, THREE.Material][]).forEach((c) => {
        const cr = new THREE.Group();
        cr.add(box(2.3, 0.7, 1.1, c[2], 0, 0.55, 0), box(1.2, 0.5, 0.95, M.lmTrim, -0.1, 1.12, 0), box(0.05, 0.3, 0.9, M.glass, 0.62, 1.12, 0));
        cr.position.set(c[0], 0.15, c[1]);
        g.add(cr);
      });
      g.add(box(2, 2.2, 2, M.lm, 4.2, 1.25, 3), box(2.4, 0.25, 2.4, M.gold, 4.2, 2.45, 3));
      g.add(cyl(0.08, 0.08, 3.4, 6, M.lmTrim, -4.8, 1.7, 3.2), box(1.8, 0.9, 0.15, M.gold, -4.8, 3.3, 3.2));
      return g;
    },
    () => { /* bank */
      const g = new THREE.Group();
      g.add(box(9.2, 0.3, 6.6, M.lm, 0, 0.29, 0), box(8, 4.6, 5.2, M.lm, 0, 2.6, -0.2));
      const ped = cyl(3.2, 3.2, 5.6, 3, M.gold, 0, 5.62, -0.2);
      ped.rotation.x = -Math.PI / 2;
      ped.scale.set(1.5, 1, 0.45);
      g.add(ped);
      [-3, -1, 1, 3].forEach((x) => g.add(cyl(0.28, 0.28, 4.2, 10, M.lmTrim, x, 2.4, 2.7)));
      g.add(box(1.6, 2.4, 0.12, M.glass, 0, 1.5, 2.42), box(8.2, 0.3, 0.6, M.lmTrim, 0, 4.75, 2.75));
      return g;
    },
    () => { /* billboard */
      const g = new THREE.Group();
      g.add(cyl(0.22, 0.22, 7, 8, M.lmTrim, -3.2, 3.5, 0), cyl(0.22, 0.22, 7, 8, M.lmTrim, 3.2, 3.5, 0));
      g.add(box(9.2, 5, 0.5, M.lmTrim, 0, 8, 0));
      screenTex = screenTexture();
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.3), new THREE.MeshBasicMaterial({ map: screenTex }));
      sc.position.set(0, 8, 0.27);
      g.add(sc, box(9.4, 0.18, 0.6, M.gold, 0, 10.6, 0));
      return g;
    },
    () => { /* signal tower compound */
      const g = new THREE.Group();
      g.add(box(3.4, 0.5, 3.4, M.lm, 0, 0.39, 0));
      g.add(cyl(0.7, 1.0, 6, 8, M.lm, 0, 3.6, 0), cyl(0.45, 0.7, 6, 8, M.lm, 0, 9.6, 0), cyl(0.25, 0.45, 5, 8, M.lm, 0, 15.1, 0));
      [6.6, 12.6].forEach((y) => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(y < 8 ? 0.85 : 0.58, 0.13, 6, 20), M.gold);
        r.rotation.x = Math.PI / 2;
        r.position.y = y;
        g.add(r);
      });
      [[0.62, 9.4, 0.4], [-0.5, 14.3, -0.4]].forEach((d, i) => {
        const dish = cyl(0.8, 0.12, 0.3, 16, M.gold, d[0] * 1.6, d[1], d[2] * 1.6);
        dish.rotation.z = i ? -Math.PI / 2.4 : Math.PI / 2.4;
        g.add(dish);
      });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), M.goldBasic);
      b.position.y = 18.2;
      g.add(b);
      g.userData.beacon = b;
      g.add(box(2.6, 1.6, 2.2, M.lm, -2.9, 0.94, -2.9), box(2.6, 0.12, 2.3, M.gold, -2.9, 1.82, -2.9));
      g.add(box(2.2, 1.3, 2, M.lm, 2.9, 0.79, -2.9), box(2.2, 0.12, 2.1, M.gold, 2.9, 1.5, -2.9));
      g.add(box(2, 1.2, 2, M.lm, 2.9, 0.74, 2.9), box(2, 0.12, 2.1, M.gold, 2.9, 1.4, 2.9));
      [-4.5, 4.5].forEach((v) => {
        g.add(box(9, 0.5, 0.08, M.lmTrim, 0, 0.39, v));
        g.add(box(0.08, 0.5, 9, M.lmTrim, v, 0.39, 0));
      });
      return g;
    },
    () => { /* post office */
      const g = new THREE.Group();
      g.add(box(6, 3.4, 4.6, M.lm, 0, 1.7, 0), box(5.2, 1.3, 0.1, M.glass, 0, 1.5, 2.33));
      const rg = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(4.25, 2.2, 4), M.gold);
      cone.rotation.y = Math.PI / 4;
      rg.add(cone);
      rg.scale.set(1, 1, 0.77);
      rg.position.y = 4.5;
      g.add(rg, cyl(0.07, 0.07, 1.6, 6, M.lmTrim, 3.4, 0.8, 3.5), box(0.9, 1.2, 0.7, M.gold, 3.4, 1.9, 3.5));
      return g;
    },
  ];

  const beacons: Beacon[] = [];
  stops.forEach((st, k) => {
    const g = (builders[k] || builders[0])();
    g.position.copy(st.pos);
    g.rotation.y = st.face;
    g.position.y = 0.14;
    scene.add(g);
    st.group = g;
    const pad = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.14, 9.8), M.plaza);
    pad.position.set(st.pos.x, 0.07, st.pos.z);
    scene.add(pad);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(6.4, 7, 56), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(st.pos.x, 0.16, st.pos.z);
    ring.renderOrder = 3;
    ring.visible = false;
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 30, 8, 1, true), beamMat);
    beam.position.set(st.pos.x, 15, st.pos.z);
    beam.visible = false;
    scene.add(ring, beam);
    beacons.push({ ring, ringMat, beam, beamMat, a: 0 });
  });

  /* ---------- cars: original luxury sedans. The hero car and the ambient traffic share one builder. ---------- */
  const wheels: THREE.Group[] = [];
  const profGeo = (pp: number[][], depth: number, bevel: number) => {
    const sp = new THREE.Shape();
    sp.moveTo(pp[0][0], pp[0][1]);
    for (let i = 1; i < pp.length; i++) {
      const q = pp[i];
      if (q.length === 4) sp.quadraticCurveTo(q[0], q[1], q[2], q[3]);
      else sp.lineTo(q[0], q[1]);
    }
    const geo = new THREE.ExtrudeGeometry(sp, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
    geo.rotateY(-Math.PI / 2);
    geo.translate(depth / 2, 0, 0);
    return geo;
  };
  const hullGeo = profGeo([[-2.3, 0.3], [2.2, 0.3], [2.34, 0.34, 2.34, 0.52], [2.32, 0.8], [2.2, 0.92, 1.9, 0.97], [0.95, 1.04], [-1.8, 1.06], [-2.28, 1.02, -2.34, 0.86], [-2.3, 0.3]], 1.7, 0.1);
  const cabGeo = profGeo([[0.95, 1.0], [0.3, 1.46], [-0.82, 1.46], [-1.7, 1.0]], 1.5, 0);

  const makeSedan = (bodyMat: THREE.Material, tailMat: THREE.Material, wheelOut: THREE.Group[], lite: boolean) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(hullGeo, bodyMat));
    g.add(new THREE.Mesh(cabGeo, M.cglass));
    g.add(box(1.62, 0.06, 1.16, bodyMat, 0, 1.48, -0.27));
    [-1, 1].forEach((sd) => {
      g.add(box(0.46, 0.1, 0.08, M.head, sd * 0.66, 0.74, 2.43));
      if (lite) return;
      g.add(box(0.03, 0.035, 3.9, M.trim, sd * 0.965, 0.6, -0.05));
      g.add(box(0.14, 0.1, 0.22, bodyMat, sd * 1.02, 1.08, 0.8));
      g.add(box(0.03, 0.04, 1.5, M.trim, sd * 0.8, 1.0, -0.45));
      [1.45, -1.45].forEach((zz) => {
        const arch = cyl(0.44, 0.44, 0.05, 20, M.dark, sd * 0.955, 0.38, zz);
        arch.rotation.z = Math.PI / 2;
        g.add(arch);
      });
    });
    if (!lite) g.add(box(0.95, 0.14, 0.06, M.dark, 0, 0.5, 2.43), box(1.3, 0.08, 0.06, M.dark, 0, 0.36, 2.4));
    const tailMesh = box(1.55, 0.1, 0.08, tailMat, 0, 0.84, -2.42);
    g.add(tailMesh);
    ([[-1, 1.45], [1, 1.45], [-1, -1.45], [1, -1.45]] as [number, number][]).forEach((w) => {
      const wg = new THREE.Group(), sp = new THREE.Group();
      const tire = cyl(0.37, 0.37, 0.28, lite ? 14 : 22, M.dark);
      tire.rotation.z = Math.PI / 2;
      const rim = cyl(0.26, 0.26, 0.3, lite ? 12 : 20, M.trim);
      rim.rotation.z = Math.PI / 2;
      sp.add(tire, rim);
      if (!lite) {
        for (let k = 0; k < 5; k++) {
          const spk = box(0.06, 0.04, 0.46, M.dark, w[0] * 0.15, 0, 0);
          spk.rotation.x = (k * Math.PI * 2) / 5;
          sp.add(spk);
        }
      }
      wg.add(sp);
      wg.position.set(w[0] * 0.86, 0.37, w[1]);
      g.add(wg);
      wheelOut.push(sp);
    });
    return g;
  };

  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = 64; c.height = 128;
    const cx = c.getContext("2d")!;
    cx.scale(1, 2);
    const rg = cx.createRadialGradient(32, 32, 2, 32, 32, 30);
    rg.addColorStop(0, "rgba(0,0,0,.55)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = rg;
    cx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const shadowGeo = new THREE.PlaneGeometry(3.4, 6.4);
  const makeShadow = () => {
    const sh = new THREE.Mesh(shadowGeo, shadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    sh.renderOrder = 1;
    return sh;
  };

  const car = new THREE.Group();
  const lamp = new THREE.PointLight(0xfff0c8, 0, 26, 1.5);
  car.add(makeSedan(M.body, M.tail, wheels, false), makeShadow());
  lamp.position.set(0, 1, 3.4);
  car.add(lamp);
  car.scale.setScalar(1.05);
  scene.add(car);

  /* ---------- ambient traffic: "coming soon" cars looping around blocks ---------- */
  interface Loop { x: number[]; z: number[]; cum: number[]; len: number }
  const makeLoop = (gi: number, gj: number, cw: boolean): Loop => {
    const cx = (gi + 0.5) * P, cz = (gj + 0.5) * P;
    /* right-hand traffic: clockwise loops use the inner lane, counter-clockwise the outer one */
    const half = P / 2 + (cw ? -LANE : LANE), r = cw ? 3.4 : 5.4;
    const centres: [number, number, number][] = [
      [cx + half - r, cz - half + r, -Math.PI / 2],
      [cx + half - r, cz + half - r, 0],
      [cx - half + r, cz + half - r, Math.PI / 2],
      [cx - half + r, cz - half + r, Math.PI],
    ];
    let xs: number[] = [], zs: number[] = [];
    centres.forEach(([ax, az, a0]) => {
      for (let k = 0; k <= 10; k++) {
        const a = a0 + (k / 10) * (Math.PI / 2);
        xs.push(ax + r * Math.cos(a));
        zs.push(az + r * Math.sin(a));
      }
    });
    if (!cw) { xs = xs.reverse(); zs = zs.reverse(); }
    xs.push(xs[0]); zs.push(zs[0]);
    const cum = [0];
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]));
    return { x: xs, z: zs, cum, len: cum[cum.length - 1] };
  };

  const signTex = (fg: string, lines: string[], w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const fs = Math.min((h / lines.length) * 0.78, w / (Math.max(...lines.map((t) => t.length)) * 0.68));
    g.font = `800 ${fs}px Inter, "Helvetica Neue", Arial, sans-serif`;
    lines.forEach((t, i) => g.fillText(t, w / 2, (h / lines.length) * (i + 0.5)));
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  };
  const decalMat = (tex: THREE.Texture) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });

  interface Traffic { g: THREE.Group; wheels: THREE.Group[]; loop: Loop; s: number; v: number; yaw: number; i: number }
  const traffic: Traffic[] = [];
  {
    const looks = [
      { body: 0x17181c, fg: "#d4af37" },
      { body: 0xf0ece2, fg: "#15161a" },
      { body: 0xd4af37, fg: "#15161a" },
    ];
    const decals = looks.map((l) => ({
      side: decalMat(signTex(l.fg, ["COMING SOON"], 1024, 186)),
      roof: decalMat(signTex(l.fg, ["COMING", "SOON"], 512, 360)),
      body: phong(110),
    }));
    decals.forEach((d, k) => d.body.color.setHex(looks[k].body));
    const sideGeo = new THREE.PlaneGeometry(2.3, 0.42);
    const roofGeo = new THREE.PlaneGeometry(1.5, 1.05);
    const defs: [number, number, boolean][] = [[0, 1, true], [3, 0, false], [-3, 0, true], [6, 1, false], [6, -3, true], [-2, 3, false], [2, 2, true]];
    const count = window.matchMedia("(max-width: 860px)").matches ? 4 : defs.length;
    defs.slice(0, count).forEach(([gi, gj, cw], k) => {
      const d = decals[k % decals.length];
      const wl: THREE.Group[] = [];
      const g = new THREE.Group();
      const sedan = makeSedan(d.body, M.tailT, wl, true);
      g.add(sedan, makeShadow());
      const left = new THREE.Mesh(sideGeo, d.side);
      left.position.set(0.975, 0.77, -0.1);
      left.rotation.y = Math.PI / 2;
      const right = new THREE.Mesh(sideGeo, d.side);
      right.position.set(-0.975, 0.77, -0.1);
      right.rotation.y = -Math.PI / 2;
      const top = new THREE.Mesh(roofGeo, d.roof);
      top.position.set(0, 1.515, -0.27);
      top.rotation.set(-Math.PI / 2, 0, Math.PI);
      g.add(left, right, top);
      g.scale.setScalar(0.98);
      scene.add(g);
      const loop = makeLoop(gi, gj, cw);
      traffic.push({ g, wheels: wl, loop, s: loop.len * ((k * 0.37) % 1), v: 7.5 + (k % 4) * 1.3, yaw: 1e9, i: 0 });
    });
  }
  const stepTraffic = (dt: number) => {
    traffic.forEach((c) => {
      const L = c.loop;
      c.s += c.v * dt;
      if (c.s >= L.len) { c.s -= L.len; c.i = 0; }
      while (c.i < L.cum.length - 2 && L.cum[c.i + 1] < c.s) c.i++;
      if (c.i > 0 && L.cum[c.i] > c.s) c.i = 0;
      const i = c.i, seg = L.cum[i + 1] - L.cum[i] || 1, u = (c.s - L.cum[i]) / seg;
      const x = L.x[i] + (L.x[i + 1] - L.x[i]) * u, z = L.z[i] + (L.z[i + 1] - L.z[i]) * u;
      const target = Math.atan2(L.x[i + 1] - L.x[i], L.z[i + 1] - L.z[i]);
      let dy = target - c.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.yaw = c.yaw === 1e9 ? target : c.yaw + dy * (1 - Math.exp(-14 * dt));
      c.g.position.set(x, 0.1, z);
      c.g.rotation.y = c.yaw;
      c.wheels.forEach((w) => { w.rotation.x += (c.v * dt) / 0.37; });
    });
  };

  /* ---------- theme (reads the site's CSS variables) ---------- */
  const applyTheme = () => {
    const dark = isDark();
    const bg = hslc("--background");
    scene.background = bg;
    (scene.fog as THREE.Fog).color.copy(bg);
    M.ground.color.copy(hslc("--scene-ground"));
    M.road.color.copy(hslc("--scene-road"));
    M.dash.color.copy(hslc("--scene-dash"));
    M.tree.color.copy(hslc("--scene-tree"));
    M.plaza.color.copy(hslc("--scene-plaza"));
    M.lm.color.copy(hslc("--scene-lm"));
    M.lmTrim.color.copy(hslc("--scene-lm-trim"));
    M.glass.color.copy(hslc("--scene-glass"));
    const gold = new THREE.Color(tok("--luxury-gold") || "#d4af37");
    [M.gold, M.goldBasic, M.ribDim, M.ribDone].forEach((m) => m.color.copy(gold));
    beacons.forEach((b) => {
      b.ringMat.color.copy(gold);
      b.beamMat.color.copy(gold);
      b.beamMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      b.beamMat.needsUpdate = true;
    });
    M.body.color.copy(hslc("--scene-car"));
    M.cglass.color.copy(hslc("--scene-glass"));
    M.trim.color.copy(hslc("--scene-trim"));
    M.body.specular.setScalar(dark ? 0.55 : 0.4);
    M.cglass.specular.setScalar(0.5);
    M.trim.specular.setScalar(0.6);
    M.ribDim.opacity = dark ? 0.22 : 0.3;
    winU.uNight.value = dark ? 1 : 0;
    winU.uTint.value.set(dark ? 0x080b11 : 0x3a5068);
    const a = hslc("--scene-bldg-a"), b = hslc("--scene-bldg-b"), col = new THREE.Color();
    M.roof.color.copy(b).multiplyScalar(dark ? 1.5 : 0.7);
    boxes.forEach((bx, i) => bld.setColorAt(i, col.copy(b).lerp(a, bx.c)));
    if (bld.instanceColor) bld.instanceColor.needsUpdate = true;
    if (dark) {
      hemi.color.setScalar(0.55); hemi.groundColor.setScalar(0.16); hemi.intensity = 1;
      sun.color.set(0xffe8b0); sun.intensity = 0.7; lamp.intensity = 1.4;
    } else {
      hemi.color.set(0xffffff); hemi.groundColor.copy(hslc("--scene-ground")).multiplyScalar(0.8); hemi.intensity = 0.78;
      sun.color.set(0xffffff); sun.intensity = 0.62; lamp.intensity = 0;
    }
    shadowMat.opacity = dark ? 0 : 0.9;
  };
  applyTheme();
  const mo = new MutationObserver(applyTheme);
  mo.observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });

  /* ---------- driving: a car that turns around instead of reversing ---------- */
  let tc = 0, dir: 1 | -1 = 1, vs = 0, spin = 0, inited = false;
  let turn: Turn | null = null;
  let held = -1; /* stop whose panel is open; has hysteresis so the panel does not flicker */
  let vtPrev = 0;
  const brakeOn = new THREE.Color(0xff2a35), brakeOff = new THREE.Color(0x6a0c12);

  const startTurn = () => {
    curve.getPointAt(tc, tmpP);
    curve.getTangentAt(tc, tmpT);
    tmpT.y = 0;
    tmpT.normalize().multiplyScalar(dir);
    turn = { k: 0, P: tmpP.clone(), H: tmpT.clone(), R: new V(-tmpT.z, 0, tmpT.x) };
  };
  const drive = (dt: number, target: number) => {
    const err = target - tc;
    if (turn) {
      turn.k = Math.min(1, turn.k + dt / (reduce ? 0.35 : TURN_S));
      const th = sstep(0, 1, turn.k) * Math.PI, s = Math.sin(th), c = Math.cos(th);
      carPos.copy(turn.P).addScaledVector(turn.R, LANE * c).addScaledVector(turn.H, UA * s);
      hd.set(0, 0, 0).addScaledVector(turn.R, -LANE * s).addScaledVector(turn.H, UA * c);
      hd.y = 0;
      hd.normalize();
      vs = damp(vs, 0, 8, dt);
      if (turn.k >= 1) { dir = dir > 0 ? -1 : 1; turn = null; }
      return;
    }
    const want = Math.abs(err) > TURN_EPS ? (err > 0 ? 1 : -1) : 0;
    let vt = clamp(err * GAIN, -VMAX, VMAX);
    if (vt !== 0 && (vt > 0 ? 1 : -1) !== dir) vt = 0;
    if (want !== 0 && want !== dir && Math.abs(vs) < 0.03) { startTurn(); return; }
    vs = damp(vs, vt, 5, dt);
    let nt = tc + vs * dt;
    if ((target - tc) * dir >= 0 && (target - nt) * dir < 0) { nt = target; vs = 0; }
    tc = clamp(nt, 0, 1);
    curve.getPointAt(tc, tmpP);
    curve.getTangentAt(tc, tmpT);
    tmpT.y = 0;
    tmpT.normalize().multiplyScalar(dir);
    tmpR.set(-tmpT.z, 0, tmpT.x);
    carPos.copy(tmpP).addScaledVector(tmpR, LANE);
    hd.lerp(tmpT, 1 - Math.exp(-12 * dt)).normalize();
  };

  /* ---------- layout ---------- */
  let W = 1, H = 1, offX = 0, offY = 0;
  const layout = () => {
    W = o.stage.clientWidth || 1;
    H = o.stage.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(W, H, false);
    const asp = W / H;
    camera.aspect = asp;
    let vf = 38;
    if (asp < 1.5) {
      const hf = 2 * Math.atan(Math.tan((vf * Math.PI) / 360) * 1.5);
      vf = clamp(((2 * Math.atan(Math.tan(hf / 2) / asp)) * 180) / Math.PI, 38, 78);
    }
    camera.fov = vf;
  };
  const targetOffset = (): [number, number] => {
    const pr = o.panel.getBoundingClientRect(), sr = o.stage.getBoundingClientRect();
    if (window.matchMedia("(min-width: 861px)").matches) return [Math.max(0, (W - (pr.left - sr.left)) / 2), 0];
    return [0, Math.max(0, ((H - (pr.top - sr.top)) / 2) * 0.9)];
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(o.stage);

  /* ---------- frame ---------- */
  let visible = true, lost = false, raf = 0, last = performance.now(), frames = 0, slow = 0, lastKey = "";
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; });
  io.observe(o.stage);
  const onLost = (e: Event) => { e.preventDefault(); lost = true; };
  const onRestored = () => { lost = false; };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  const update = (dt: number, time: number) => {
    const si = scrollInfo(), target = mapT(si.p);
    if (!inited) {
      tc = target;
      curve.getPointAt(tc, tmpP);
      curve.getTangentAt(tc, tmpT);
      tmpT.y = 0;
      tmpT.normalize();
      hd.copy(tmpT);
      tmpR.set(-tmpT.z, 0, tmpT.x);
      carPos.copy(tmpP).addScaledVector(tmpR, LANE);
      prevPos.copy(carPos);
    } else drive(dt, target);

    if (held >= 0 && (turn || Math.abs(tc - stops[held].t) > 0.03 || Math.abs(vs) > 0.12)) held = -1;
    if (held < 0) for (let i = 0; i < N; i++) if (!turn && Math.abs(tc - stops[i].t) < 0.014 && Math.abs(vs) < 0.06) { held = i; break; }
    const active = held;
    let next = -1;
    if (dir > 0) { for (let i = 0; i < N; i++) if (stops[i].t > tc + 0.014) { next = i; break; } }
    else { for (let i = N - 1; i >= 0; i--) if (stops[i].t < tc - 0.014) { next = i; break; } }
    if (next < 0) next = dir > 0 ? N - 1 : 0;
    let f = 0;
    if (tc >= stops[0].t) {
      f = N - 1;
      for (let i = 0; i < N - 1; i++) if (tc < stops[i + 1].t) { f = i + (tc - stops[i].t) / (stops[i + 1].t - stops[i].t); break; }
    }
    let visited = 0;
    for (let i = 0; i < N; i++) if (tc > stops[i].t + 0.014) visited++;
    const st: CityState = {
      active, next, pct: Math.round(tc * 100), dir, turning: !!turn, visited,
      fill: Math.round((f / (N - 1)) * 250) / 250, started: si.p > 0.025,
    };
    const key = `${st.active}|${st.next}|${st.pct}|${st.dir}|${st.turning}|${st.visited}|${st.fill}|${st.started}`;
    if (key !== lastKey) { lastKey = key; o.onState(st); }

    const bob = Math.sin(time * 11) * 0.012 * Math.min(1, Math.abs(vs) * 10);
    car.position.set(carPos.x, 0.1 + bob, carPos.z);
    car.rotation.y = Math.atan2(hd.x, hd.z);
    spin += carPos.distanceTo(prevPos) / 0.37;
    prevPos.copy(carPos);
    wheels.forEach((w) => { w.rotation.x = spin; });
    stepTraffic(dt);
    const braking = turn ? true : Math.abs(vs) < Math.abs(vtPrev) - 0.002;
    vtPrev = vs;
    M.tail.color.lerp(braking ? brakeOn : brakeOff, 1 - Math.exp(-18 * dt));

    let wMax = 0, wk = -1;
    for (let i = 0; i < N; i++) {
      const w = 1 - sstep(0.014, 0.08, Math.abs(tc - stops[i].t));
      if (w > wMax) { wMax = w; wk = i; }
    }
    camT.copy(carPos).addScaledVector(hd, -21);
    camT.y = 16;
    lookT.copy(carPos).addScaledVector(hd, 7);
    lookT.y = 0.6;
    if (wMax > 0.001) {
      const lm = stops[wk].pos;
      v3.set(lm.x - carPos.x, 0, lm.z - carPos.z);
      v3.divideScalar(v3.length() || 1);
      const k2 = wMax * 0.85;
      camT.x += (carPos.x - v3.x * 17 - hd.x * 9 - camT.x) * k2;
      camT.y += (18 - camT.y) * k2;
      camT.z += (carPos.z - v3.z * 17 - hd.z * 9 - camT.z) * k2;
      lookT.x += (carPos.x + (lm.x - carPos.x) * 0.55 - lookT.x) * wMax;
      lookT.y += (3 - lookT.y) * wMax;
      lookT.z += (carPos.z + (lm.z - carPos.z) * 0.55 - lookT.z) * wMax;
    }
    if (!inited) { camPos.copy(camT); look.copy(lookT); }
    else {
      const l1 = reduce ? 60 : 2.6, l2 = reduce ? 60 : 3.4;
      camPos.set(damp(camPos.x, camT.x, l1, dt), damp(camPos.y, camT.y, l1, dt), damp(camPos.z, camT.z, l1, dt));
      look.set(damp(look.x, lookT.x, l2, dt), damp(look.y, lookT.y, l2, dt), damp(look.z, lookT.z, l2, dt));
    }
    camera.position.copy(camPos);
    camera.lookAt(look);
    const to = targetOffset();
    offX = inited ? damp(offX, to[0], 5, dt) : to[0];
    offY = inited ? damp(offY, to[1], 5, dt) : to[1];
    camera.setViewOffset(W, H, offX, offY, W, H);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    inited = true;

    ribDone.geometry.setDrawRange(0, Math.max(0, Math.floor(tc * (NS - 1))) * 6);
    const dark = isDark();
    beacons.forEach((b, k) => {
      b.a = damp(b.a, k === active ? 1 : 0, 6, dt);
      b.ringMat.opacity = b.a * 0.9;
      b.beamMat.opacity = b.a * (dark ? 0.24 : 0.16);
      const s = 1 + 0.04 * Math.sin(time * 3 + k);
      b.ring.scale.set(s, s, s);
      b.ring.visible = b.beam.visible = b.a > 0.01;
    });
    stops.forEach((s) => {
      const bc = s.group?.userData.beacon as THREE.Object3D | undefined;
      if (bc) { const bs = 1 + 0.22 * Math.sin(time * 4); bc.scale.set(bs, bs, bs); }
    });

    for (let i = 0; i < N; i++) {
      const pin = o.pins[i];
      if (!pin) continue;
      const s2 = stops[i];
      v4.set(s2.pos.x, s2.pinY, s2.pos.z).project(camera);
      const d2 = camera.position.distanceTo(s2.pos);
      const vis = v4.z < 1 && d2 < 100 && Math.abs(v4.x) < 1.05 && Math.abs(v4.y) < 1.05;
      pin.style.transform = `translate3d(${((v4.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-v4.y * 0.5 + 0.5) * H).toFixed(1)}px,0) translate(-50%,-110%)`;
      pin.style.opacity = vis ? (i === active ? "1" : "0.85") : "0";
      pin.dataset.on = i === active ? "true" : "false";
    }
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || lost) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frames++;
    if (dt > 0.026) slow++;
    if (frames === 90) {
      if (slow > 45 && dprCap > 1) { dprCap = dprCap > 1.4 ? 1.25 : 1; layout(); }
      frames = 0; slow = 0;
    }
    update(dt, now / 1000);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  const goTo = (i: number) => {
    const si = scrollInfo();
    window.scrollTo({ top: si.top + stops[i].s * si.range, behavior: reduce ? "auto" : "smooth" });
  };

  const destroy = () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    mo.disconnect();
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as THREE.MeshBasicMaterial).map?.dispose();
        x.dispose();
      });
    });
    screenTex?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };

  return { destroy, goTo };
}