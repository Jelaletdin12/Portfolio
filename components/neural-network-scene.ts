import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  AUTO_INTERVAL,
  MANUAL_HOLD,
  type SceneState,
  type ThemeMode,
} from "../neural-network-config";

/* -------------------------------------------------------------------------- */
/*  Sabitler                                                                   */
/* -------------------------------------------------------------------------- */

// Şekil sırası: küre -> J_CH -> sarmal -> </> -> fraktal. Yazı şekilleri araya serpiştirildi.
type FormationKind = "sphere" | "text" | "helix" | "code" | "fractal";
const FORMATION_KINDS: FormationKind[] = ["sphere", "text", "helix", "code", "fractal"];
const FORMATION_COUNT = FORMATION_KINDS.length;
const PALETTE_COUNT = 4;
// Marka şekilleri (J_CH ve </>) otomatik döngüde hep altın paletle gösterilir.
const isBrandKind = (k: FormationKind) => k === "text" || k === "code";
const isPointShape = (k: FormationKind) => k === "text" || k === "code";
const SEGMENTS = 20; // her bağlantı için köşe sayısı
// false: orijinaldeki gibi kesikli çizgi (LineSegments çiftleri). true: kesintisiz çizgi.
const CONTINUOUS_LINES = false;

const SHRINK_TIME = 0.45; // morph: içe çökme
const GROW_TIME = 0.8; // morph: dışa büyüme
const COLOR_TIME = 1.0; // renk geçişi

// Şekil başına kamera uzaklığı (kare alana sığması için)
// (FORMATION_KINDS sırasıyla: küre, J_CH, sarmal, </>, fraktal)
// J_CH ve </> geniş/yassı olduğu için kamera daha yakın: küre, sarmal ve fraktalla benzer ekran boyutunda görünsün.
const CAMERA_DISTANCE = [54, 40, 44, 44, 46];

// Palet sırası config'deki PALETTE_SWATCHES ile aynı: Gold, Nebula, Fire, Ocean.
// Her paletin 5 rengi, merkezden dışa doğru seviyelere karşılık gelir.
const PALETTE_HEX: number[][] = [
  [0xfff1b8, 0xf5d77a, 0xd4af37, 0xc9972b, 0xb8860b],
  [0x667eea, 0x764ba2, 0xf093fb, 0x9d50bb, 0x6e48aa],
  [0xf857a6, 0xff5858, 0xfeca57, 0xff6348, 0xff9068],
  [0x4facfe, 0x00f2fe, 0x43e97b, 0x38f9d7, 0x4484ce],
];

// Renkleri dönüştürmeden (ham sRGB değerleri) saklıyoruz; renderer da dönüştürmeden yazıyor.
const PALETTES: THREE.Color[][] = PALETTE_HEX.map((row) =>
  row.map((hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace))
);

const HSL = { h: 0, s: 0, l: 0 };

/** Açık temada renkleri koyulaştırır (beyaz zeminde okunabilsin diye). */
function toneColor(src: THREE.Color, mode: ThemeMode, out: THREE.Color): THREE.Color {
  out.copy(src);
  if (mode === "light") {
    out.getHSL(HSL);
    out.setHSL(
      HSL.h,
      Math.min(1, HSL.s * 1.05 + 0.05),
      Math.min(0.46, Math.max(0.28, HSL.l * 0.62))
    );
  }
  return out;
}

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/* -------------------------------------------------------------------------- */
/*  Ağ üretimi (animation.txt'teki üç formasyonun portu)                       */
/* -------------------------------------------------------------------------- */

class GNode {
  connections: { node: GNode; strength: number }[] = [];
  distanceFromRoot = 0;
  helixT = 0;
  size: number;

  constructor(
    public position: THREE.Vector3,
    public level = 0,
    public type = 0
  ) {
    this.size =
      type === 0
        ? THREE.MathUtils.randFloat(0.8, 1.4)
        : THREE.MathUtils.randFloat(0.5, 1.0);
  }

  addConnection(node: GNode, strength = 1.0) {
    if (!this.isConnectedTo(node)) {
      this.connections.push({ node, strength });
      node.connections.push({ node: this, strength });
    }
  }

  isConnectedTo(node: GNode) {
    return this.connections.some((c) => c.node === node);
  }
}

interface Network {
  nodes: GNode[];
  maxDist: number;
}

/* ---- Nokta şekilleri: bir canvas'a çizilen şekil, noktalara çevrilir ---------- */

const WORLD_PER_PX = 0.09; // canvas pikseli -> dünya birimi
const MAX_SHAPE_WIDTH = 30; // şeklin dünya birimi cinsinden azami genişliği

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const paintText: Painter = (ctx, w, h) => {
  ctx.font = '800 130px Arial, Helvetica, "Segoe UI", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("J_CH", w / 2, h / 2);
};

// "</>" kod simgesi: yazı tipine bağlı kalmasın diye çizgilerle çiziliyor.
const paintCode: Painter = (ctx, w, h) => {
  const ox = (w - 400) / 2;
  const oy = (h - 240) / 2;
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(ox + 115, oy + 50); // <
  ctx.lineTo(ox + 45, oy + 120);
  ctx.lineTo(ox + 115, oy + 190);
  ctx.moveTo(ox + 225, oy + 35); // /
  ctx.lineTo(ox + 175, oy + 205);
  ctx.moveTo(ox + 285, oy + 50); // >
  ctx.lineTo(ox + 355, oy + 120);
  ctx.lineTo(ox + 285, oy + 190);
  ctx.stroke();
};

/** Şekli canvas'a çizip dolu pikselleri (hafif jitter'lı ızgara) noktalara çevirir. */
function pointShapeNetwork(
  paint: Painter,
  canvasW: number,
  canvasH: number,
  densityFactor: number
): Network | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  paint(ctx, canvasW, canvasH);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, canvasW, canvasH).data;
  } catch {
    return null;
  }

  // Yoğunluk düşükse (mobil) ızgara aralığı büyür.
  const step = Math.max(4, Math.round(5 / Math.sqrt(densityFactor)));
  const raw: { x: number; y: number }[] = [];
  for (let y = step / 2; y < canvasH; y += step) {
    for (let x = step / 2; x < canvasW; x += step) {
      const alpha = data[(Math.floor(y) * canvasW + Math.floor(x)) * 4 + 3];
      if (alpha > 140) {
        raw.push({
          x: x + (Math.random() - 0.5) * step * 0.6,
          y: y + (Math.random() - 0.5) * step * 0.6,
        });
      }
    }
  }
  if (raw.length < 30) return null;

  // merkeze al ve sığacak şekilde ölçekle
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const p of raw) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const scale = Math.min(WORLD_PER_PX, MAX_SHAPE_WIDTH / Math.max(1, maxX - minX));

  const nodes: GNode[] = raw.map((p) => {
    const pos = new THREE.Vector3(
      (p.x - cx) * scale,
      -(p.y - cy) * scale,
      THREE.MathUtils.randFloatSpread(2.4) // hafif derinlik
    );
    // renk seviyesi soldan sağa (0..4)
    const level = Math.min(4, Math.floor(((p.x - minX) / Math.max(1, maxX - minX)) * 5));
    const node = new GNode(pos, level, Math.random() < 0.3 ? 1 : 0);
    node.size =
      node.type === 0
        ? THREE.MathUtils.randFloat(0.38, 0.62)
        : THREE.MathUtils.randFloat(0.3, 0.5);
    node.distanceFromRoot = pos.length(); // shader'da büyüme merkezden dışa doğru
    return node;
  });

  // her noktayı en yakın 3 komşusuna bağla
  const radius = step * scale * 1.9;
  for (const node of nodes) {
    const near = nodes
      .filter((n) => n !== node && n.position.distanceTo(node.position) < radius)
      .sort((a, b) => node.position.distanceTo(a.position) - node.position.distanceTo(b.position))
      .slice(0, 3);
    for (const n of near) {
      const d = node.position.distanceTo(n.position);
      node.addConnection(n, 0.45 + 0.4 * (1 - d / radius));
    }
  }

  let maxDist = 1;
  for (const n of nodes) maxDist = Math.max(maxDist, n.distanceFromRoot);
  return { nodes, maxDist };
}

export function generateNetwork(formationIndex: number, densityFactor: number): Network {
  const kind = FORMATION_KINDS[formationIndex % FORMATION_COUNT];

  if (isPointShape(kind)) {
    const net =
      kind === "text"
        ? pointShapeNetwork(paintText, 520, 220, densityFactor)
        : pointShapeNetwork(paintCode, 440, 280, densityFactor);
    if (net) return net;
    // canvas kullanılamazsa küreye düşer
  }

  let nodes: GNode[] = [];
  let rootNode: GNode;

  const byDistance = (from: THREE.Vector3) => (a: GNode, b: GNode) =>
    from.distanceTo(a.position) - from.distanceTo(b.position);

  function crystallineSphere() {
    rootNode = new GNode(new THREE.Vector3(0, 0, 0), 0, 0);
    rootNode.size = 2.0;
    nodes.push(rootNode);

    const layers = 5;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let layer = 1; layer <= layers; layer++) {
      const radius = layer * 4;
      const numPoints = Math.floor(layer * 12 * densityFactor);

      for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
        const theta = (2 * Math.PI * i) / goldenRatio;
        const pos = new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
        const isLeaf = layer === layers || Math.random() < 0.3;
        const node = new GNode(pos, layer, isLeaf ? 1 : 0);
        node.distanceFromRoot = radius;
        nodes.push(node);

        if (layer > 1) {
          const prev = nodes
            .filter((n) => n.level === layer - 1 && n !== rootNode)
            .sort(byDistance(pos));
          for (let j = 0; j < Math.min(3, prev.length); j++) {
            const dist = pos.distanceTo(prev[j].position);
            const strength = 1.0 - dist / (radius * 2);
            node.addConnection(prev[j], Math.max(0.3, strength));
          }
        } else {
          rootNode.addConnection(node, 0.9);
        }
      }

      const layerNodes = nodes.filter((n) => n.level === layer && n !== rootNode);
      for (const node of layerNodes) {
        const nearby = layerNodes
          .filter((n) => n !== node)
          .sort(byDistance(node.position))
          .slice(0, 5);
        for (const near of nearby) {
          const dist = node.position.distanceTo(near.position);
          if (dist < radius * 0.8 && !node.isConnectedTo(near)) {
            node.addConnection(near, 0.6);
          }
        }
      }
    }

    const outer = nodes.filter((n) => n.level >= 3);
    for (let i = 0; i < Math.min(20, outer.length); i++) {
      const n1 = outer[Math.floor(Math.random() * outer.length)];
      const n2 = outer[Math.floor(Math.random() * outer.length)];
      if (n1 !== n2 && !n1.isConnectedTo(n2) && Math.abs(n1.level - n2.level) > 1) {
        n1.addConnection(n2, 0.4);
      }
    }
  }

  function helixLattice() {
    rootNode = new GNode(new THREE.Vector3(0, 0, 0), 0, 0);
    rootNode.size = 1.8;
    nodes.push(rootNode);

    const numHelices = 4;
    const height = 30;
    const maxRadius = 12;
    const nodesPerHelix = Math.floor(50 * densityFactor);
    const helices: GNode[][] = [];

    for (let h = 0; h < numHelices; h++) {
      const phase = (h / numHelices) * Math.PI * 2;
      const helixNodes: GNode[] = [];

      for (let i = 0; i < nodesPerHelix; i++) {
        const t = i / (nodesPerHelix - 1);
        const y = (t - 0.5) * height;
        const radius = maxRadius * (Math.sin(t * Math.PI) * 0.7 + 0.3);
        const angle = phase + t * Math.PI * 6;
        const pos = new THREE.Vector3(
          radius * Math.cos(angle),
          y,
          radius * Math.sin(angle)
        );
        const level = Math.ceil(t * 5);
        const isLeaf = i > nodesPerHelix - 5 || Math.random() < 0.25;
        const node = new GNode(pos, level, isLeaf ? 1 : 0);
        node.distanceFromRoot = Math.sqrt(radius * radius + y * y);
        node.helixT = t;
        nodes.push(node);
        helixNodes.push(node);
      }

      helices.push(helixNodes);
      rootNode.addConnection(helixNodes[0], 1.0);
      for (let i = 0; i < helixNodes.length - 1; i++) {
        helixNodes[i].addConnection(helixNodes[i + 1], 0.85);
      }
    }

    for (let h = 0; h < numHelices; h++) {
      const current = helices[h];
      const next = helices[(h + 1) % numHelices];
      for (let i = 0; i < current.length; i += 5) {
        const idx = Math.round(current[i].helixT * (next.length - 1));
        if (idx < next.length) current[i].addConnection(next[idx], 0.7);
      }
    }

    for (const helix of helices) {
      for (let i = 0; i < helix.length; i += 8) {
        const node = helix[i];
        const inner = nodes.filter(
          (n) =>
            n !== node &&
            n !== rootNode &&
            n.distanceFromRoot < node.distanceFromRoot * 0.5
        );
        if (inner.length > 0) {
          node.addConnection(inner.sort(byDistance(node.position))[0], 0.5);
        }
      }
    }

    const all = nodes.filter((n) => n !== rootNode);
    for (let i = 0; i < Math.floor(30 * densityFactor); i++) {
      const n1 = all[Math.floor(Math.random() * all.length)];
      const nearby = all.filter((n) => {
        const d = n.position.distanceTo(n1.position);
        return n !== n1 && d < 8 && d > 3 && !n1.isConnectedTo(n);
      });
      if (nearby.length > 0) {
        n1.addConnection(nearby[Math.floor(Math.random() * nearby.length)], 0.45);
      }
    }
  }

  function fractalWeb() {
    rootNode = new GNode(new THREE.Vector3(0, 0, 0), 0, 0);
    rootNode.size = 1.6;
    nodes.push(rootNode);

    const branches = 6;
    const maxDepth = 4;

    function createBranch(
      start: GNode,
      direction: THREE.Vector3,
      depth: number,
      strength: number,
      scale: number
    ) {
      if (depth > maxDepth) return;

      const endPos = start.position
        .clone()
        .add(direction.clone().multiplyScalar(5 * scale));
      const isLeaf = depth === maxDepth || Math.random() < 0.3;
      const node = new GNode(endPos, depth, isLeaf ? 1 : 0);
      node.distanceFromRoot = rootNode.position.distanceTo(endPos);
      nodes.push(node);
      start.addConnection(node, strength);

      if (depth < maxDepth) {
        // Yön z eksenine paralelse orijinaldeki dik vektör sıfırlanıyordu; yedeği var.
        const p1 = new THREE.Vector3(-direction.y, direction.x, 0);
        if (p1.lengthSq() < 1e-4) p1.set(1, 0, 0);
        p1.normalize();
        const p2 = direction.clone().cross(p1).normalize();

        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2;
          const dir = direction
            .clone()
            .add(p1.clone().multiplyScalar(Math.cos(angle) * 0.7))
            .add(p2.clone().multiplyScalar(Math.sin(angle) * 0.7))
            .normalize();
          createBranch(node, dir, depth + 1, strength * 0.7, scale * 0.75);
        }
      }
    }

    for (let i = 0; i < branches; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / branches);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize();
      createBranch(rootNode, dir, 1, 0.9, 1.0);
    }

    const leaves = nodes.filter((n) => n.level >= 2);
    for (const node of leaves) {
      const nearby = leaves
        .filter((n) => {
          const d = n.position.distanceTo(node.position);
          return n !== node && d < 10 && !node.isConnectedTo(n);
        })
        .sort(byDistance(node.position))
        .slice(0, 3);
      for (const near of nearby) {
        if (Math.random() < 0.5 * densityFactor) node.addConnection(near, 0.5);
      }
    }

    for (const node of nodes.filter((n) => n.level >= 2 && n.level <= 3)) {
      if (Math.random() < 0.3) {
        const inner = nodes.filter(
          (n) => n !== node && n.distanceFromRoot < node.distanceFromRoot * 0.6
        );
        if (inner.length > 0) {
          const target = inner[Math.floor(Math.random() * inner.length)];
          if (!node.isConnectedTo(target)) node.addConnection(target, 0.4);
        }
      }
    }
  }

  switch (kind) {
    case "helix":
      helixLattice();
      break;
    case "fractal":
      fractalWeb();
      break;
    default:
      crystallineSphere();
      break;
  }

  if (densityFactor < 1.0) {
    const target = Math.ceil(nodes.length * Math.max(0.3, densityFactor));
    const keep = new Set<GNode>([rootNode!]);
    const sorted = nodes
      .filter((n) => n !== rootNode)
      .sort((a, b) => {
        const sa = a.connections.length * (1 / (a.distanceFromRoot + 1));
        const sb = b.connections.length * (1 / (b.distanceFromRoot + 1));
        return sb - sa;
      });
    for (let i = 0; i < Math.min(target - 1, sorted.length); i++) keep.add(sorted[i]);
    nodes = nodes.filter((n) => keep.has(n));
    nodes.forEach((n) => {
      n.connections = n.connections.filter((c) => keep.has(c.node));
    });
  }

  let maxDist = 1;
  for (const n of nodes) maxDist = Math.max(maxDist, n.distanceFromRoot);
  return { nodes, maxDist };
}

/* -------------------------------------------------------------------------- */
/*  Shader'lar                                                                 */
/* -------------------------------------------------------------------------- */

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

// Ortak: tıklama dalgası ve büyüme (reveal) fonksiyonları
const COMMON_VERTEX_GLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform vec3 uPulseColors[3];
uniform float uPulseSpeed;
uniform float uReveal;
uniform float uMaxDist;
uniform float uColorMix;

float pulseAt(vec3 worldPos, vec3 pulsePos, float pulseTime) {
  if (pulseTime < 0.0) return 0.0;
  float age = uTime - pulseTime;
  if (age < 0.0 || age > 4.0) return 0.0;
  float radius = age * uPulseSpeed;
  float prox = abs(distance(worldPos, pulsePos) - radius);
  return (1.0 - smoothstep(0.0, 3.0, prox)) * (1.0 - smoothstep(0.0, 4.0, age));
}

void allPulses(vec3 worldPos, out float intensity, out vec3 color) {
  float total = 0.0;
  vec3 weighted = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float p = pulseAt(worldPos, uPulsePositions[i], uPulseTimes[i]);
    total += p;
    weighted += uPulseColors[i] * p;
  }
  intensity = min(total, 1.0);
  color = total > 0.001 ? weighted / total : vec3(1.0);
}

float revealVis(float dist) {
  float r = uReveal * (uMaxDist + 4.0);
  return 1.0 - smoothstep(r - 4.0, r, dist);
}`;

const NODE_VERTEX = /* glsl */ `
${COMMON_VERTEX_GLSL}
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute vec3 nodeColorPrev;
attribute float distanceFromRoot;

uniform float uBaseNodeSize;
uniform float uPointScale;

varying vec3 vColor;
varying float vNodeType;
varying float vPulseIntensity;
varying vec3 vPulseColor;
varying float vDistanceFromRoot;
varying float vGlow;
varying float vCamDist;
varying float vVis;

void main() {
  vNodeType = nodeType;
  vColor = mix(nodeColorPrev, nodeColor, uColorMix);
  vDistanceFromRoot = distanceFromRoot;

  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  allPulses(worldPos, vPulseIntensity, vPulseColor);
  vVis = revealVis(distanceFromRoot);
  vCamDist = length(worldPos - cameraPosition);

  float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
  float size = nodeSize * breathe * vVis;
  size *= (1.0 + vPulseIntensity * 2.5);
  vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);

  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uBaseNodeSize * uPointScale * (1000.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const NODE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uLight;

varying vec3 vColor;
varying float vNodeType;
varying float vPulseIntensity;
varying vec3 vPulseColor;
varying float vDistanceFromRoot;
varying float vGlow;
varying float vCamDist;
varying float vVis;

void main() {
  vec2 c = 2.0 * gl_PointCoord - 1.0;
  float dist = length(c);
  if (dist > 1.0) discard;

  float glow1 = 1.0 - smoothstep(0.0, 0.5, dist);
  float glow2 = 1.0 - smoothstep(0.0, 1.0, dist);
  // Koyu temada bloom yok; geniş, yumuşak bir hale ile telafi ediliyor.
  float strength = pow(glow1, 1.2) + glow2 * 0.3 + pow(glow2, 2.0) * 0.35 * (1.0 - uLight);

  float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
  vec3 base = vColor * breatheColor;
  vec3 col = base;

  if (vPulseIntensity > 0.0) {
    vec3 target = mix(vec3(1.0), vPulseColor, mix(0.4, 0.85, uLight));
    col = mix(base, target, vPulseIntensity * 0.8);
    col *= 1.0 + vPulseIntensity * mix(1.2, 0.15, uLight);
    strength *= 1.0 + vPulseIntensity;
  }

  float core = smoothstep(0.4, 0.0, dist);
  col += vec3(1.0) * core * 0.3 * (1.0 - uLight);

  float alpha = strength * (0.95 - 0.3 * dist);
  float fade = 1.0 - smoothstep(25.0, 130.0, vCamDist);
  if (vNodeType > 0.5) { col *= 1.1; alpha *= 0.9; }
  col *= (1.0 + vGlow * 0.1);
  col *= mix(1.25, 1.0, uLight);

  gl_FragColor = vec4(min(col, vec3(1.0)), min(alpha * fade * vVis, 1.0));
}`;

const LINE_VERTEX = /* glsl */ `
${NOISE_GLSL}
${COMMON_VERTEX_GLSL}
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;
attribute vec3 connectionColorPrev;

varying vec3 vColor;
varying float vStrength;
varying float vPulseIntensity;
varying vec3 vPulseColor;
varying float vPathPosition;
varying float vCamDist;
varying float vVis;

void main() {
  float t = position.x;
  vPathPosition = t;

  vec3 dir = endPoint - startPoint;
  vec3 perp = cross(dir, vec3(0.0, 1.0, 0.0));
  float pl = length(perp);
  perp = pl > 0.0001 ? perp / pl : vec3(1.0, 0.0, 0.0);

  vec3 mid = mix(startPoint, endPoint, 0.5) + perp * (sin(t * 3.14159) * 0.15);
  vec3 p0 = mix(startPoint, mid, t);
  vec3 p1 = mix(mid, endPoint, t);
  vec3 finalPos = mix(p0, p1, t);
  finalPos += perp * snoise(vec3(pathIndex * 0.08, t * 0.6, uTime * 0.15)) * 0.12;

  vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
  allPulses(worldPos, vPulseIntensity, vPulseColor);
  vVis = revealVis(length(finalPos));

  vColor = mix(connectionColorPrev, connectionColor, uColorMix);
  vStrength = connectionStrength;
  vCamDist = length(worldPos - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}`;

const LINE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uLight;

varying vec3 vColor;
varying float vStrength;
varying float vPulseIntensity;
varying vec3 vPulseColor;
varying float vPathPosition;
varying float vCamDist;
varying float vVis;

void main() {
  float f1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
  float f2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
  float flow = (f1 + f2 * 0.5) / 1.5;

  vec3 base = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
  float flowI = 0.4 * flow * vStrength;
  vec3 col = base;

  if (vPulseIntensity > 0.0) {
    vec3 target = mix(vec3(1.0), vPulseColor, mix(0.3, 0.85, uLight));
    col = mix(base, target * mix(1.2, 1.0, uLight), vPulseIntensity * 0.7);
    flowI += vPulseIntensity * 0.8;
  }
  col *= (0.7 + flowI + vStrength * 0.5);

  float alpha = 0.7 * vStrength + flow * 0.3;
  alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);
  alpha *= mix(1.0, 0.75, uLight);
  float fade = 1.0 - smoothstep(25.0, 130.0, vCamDist);

  gl_FragColor = vec4(min(col, vec3(1.0)), min(alpha * fade * vVis, 1.0));
}`;

/* -------------------------------------------------------------------------- */
/*  Sahne                                                                      */
/* -------------------------------------------------------------------------- */

export interface SceneOptions {
  container: HTMLElement;
  mode: ThemeMode;
  reducedMotion: boolean;
  onStateChange?: (state: SceneState) => void;
}

type Phase = "idle" | "out" | "in";

export class NeuralNetworkScene {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  private readonly controls: OrbitControls;
  private readonly group = new THREE.Group();
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly nodeMaterial: THREE.ShaderMaterial;
  private readonly lineMaterial: THREE.ShaderMaterial;
  private readonly onStateChange?: (state: SceneState) => void;
  private readonly reducedMotion: boolean;
  private readonly density: number;
  private readonly pixelRatio: number;

  private nodesMesh: THREE.Points | null = null;
  private linesMesh: THREE.LineSegments | null = null;

  // ağ yapısı (yeniden renklendirme için saklanır)
  private nodeLevels: Uint8Array = new Uint8Array(0);
  private nodeJitter: Float32Array = new Float32Array(0);
  private edgeLevels: Uint8Array = new Uint8Array(0);
  private edgeJitter: Float32Array = new Float32Array(0);

  private mode: ThemeMode;
  private paletteIndex = 0;
  private formation = 0;
  private paused: boolean;
  private textMode = false; // J_CH ve </> şekilleri: okunabilir kalsın diye dönmek yerine sallanır
  private autoColorCursor = 0;

  private phase: Phase = "in";
  private phaseT = 0;
  private pendingFormation = 0;
  private reveal = 0;
  private distanceTarget = CAMERA_DISTANCE[0];

  private colorTweening = false;
  private colorT = 1;

  private sceneTime = 0;
  private autoClock = 0;
  private nextAutoAt = AUTO_INTERVAL + GROW_TIME;

  private running = false;
  private inView = true;
  private tabVisible = true;
  private raf = 0;
  private lastNow = 0;
  private disposed = false;

  private lastPulseIndex = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly plane = new THREE.Plane();
  private readonly hit = new THREE.Vector3();
  private readonly tmpColor = new THREE.Color();
  private down: { x: number; y: number; t: number } | null = null;

  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;

  constructor(opts: SceneOptions) {
    this.container = opts.container;
    this.onStateChange = opts.onStateChange;
    this.mode = opts.mode;
    this.reducedMotion = opts.reducedMotion;
    this.paused = opts.reducedMotion;

    const coarse =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;
    this.density = coarse ? 0.6 : 1;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);

    // WebGL yoksa burada hata fırlatır; çağıran taraf yakalayıp fallback gösterir.
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !coarse });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.canvas = this.renderer.domElement;
    Object.assign(this.canvas.style, {
      width: "100%",
      height: "100%",
      display: "block",
      cursor: "grab",
    });
    this.container.appendChild(this.canvas);

    this.uniforms = {
      uTime: { value: 0 },
      uPulsePositions: {
        value: [
          new THREE.Vector3(1e3, 1e3, 1e3),
          new THREE.Vector3(1e3, 1e3, 1e3),
          new THREE.Vector3(1e3, 1e3, 1e3),
        ],
      },
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: {
        value: [new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1)],
      },
      uPulseSpeed: { value: 18 },
      uBaseNodeSize: { value: 0.6 },
      uPointScale: { value: 1 },
      uReveal: { value: 0 },
      uMaxDist: { value: 20 },
      uColorMix: { value: 1 },
      uLight: { value: this.mode === "light" ? 1 : 0 },
    };

    this.nodeMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: NODE_VERTEX,
      fragmentShader: NODE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.lineMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: LINE_VERTEX,
      fragmentShader: LINE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    this.applyBlending();

    this.scene.add(this.group);

    // kamera + kontroller
    this.camera.position.copy(this.homePosition(this.distanceTarget));
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.6;
    this.controls.enableZoom = false; // fare tekerleği sayfa kaydırmasını çalmasın
    this.controls.enablePan = false;
    this.controls.autoRotate = !this.paused;
    this.controls.autoRotateSpeed = 0.35;
    // OrbitControls touch-action:none koyar; dikey kaydırma sayfaya kalsın.
    this.canvas.style.touchAction = "pan-y";
    this.controls.update();
    this.controls.saveState();

    // ilk ağ
    if (this.reducedMotion) {
      this.reveal = 1;
      this.phase = "idle";
    }
    this.buildNetwork(this.formation);
    this.uniforms.uReveal.value = this.reveal;

    // olaylar
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerCancel);
    this.canvas.addEventListener("webglcontextlost", this.onContextLost);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.inView = entries[entries.length - 1]?.isIntersecting ?? true;
        this.updateRunning();
      },
      { threshold: 0.01 }
    );
    this.intersectionObserver.observe(this.container);

    this.tabVisible = !document.hidden;
    this.resize();
    this.updateRunning();
  }

  /* ------------------------------ genel API ------------------------------ */

  getState(): SceneState {
    return {
      paletteIndex: this.paletteIndex,
      formationIndex: this.formation,
      paused: this.paused,
    };
  }

  /** Manuel: bir sonraki şekle geç. Geçiş sürerken gelen istek yok sayılır. */
  morph() {
    if (this.phase !== "idle") return;
    this.holdAuto();
    this.startMorph((this.formation + 1) % FORMATION_COUNT);
  }

  /** Manuel: palet seç. */
  selectPalette(index: number) {
    if (index < 0 || index >= PALETTE_COUNT) return;
    this.holdAuto();
    this.applyPalette(index);
  }

  togglePause() {
    this.paused = !this.paused;
    this.syncControls();
    this.emit();
  }

  resetCamera() {
    this.controls.reset();
    this.holdAuto();
  }

  setMode(mode: ThemeMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.uniforms.uLight.value = mode === "light" ? 1 : 0;
    this.applyBlending();
    this.applyPalette(this.paletteIndex);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerCancel);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.controls.dispose();
    this.disposeMeshes();
    this.nodeMaterial.dispose();
    this.lineMaterial.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  /* ------------------------------- iç işler ------------------------------ */

  private emit() {
    this.onStateChange?.(this.getState());
  }

  private homePosition(distance: number) {
    // orijinaldeki hafif yüksekten bakış açısı (~16°)
    return new THREE.Vector3(0, Math.sin(0.28) * distance, Math.cos(0.28) * distance);
  }

  private applyBlending() {
    for (const mat of [this.nodeMaterial, this.lineMaterial]) {
      if (this.mode === "dark") {
        // Alfa kanalı da toplanır: tuval "premultiplied" olarak geçerli kalır, glow koyu zeminde parlar.
        mat.blending = THREE.CustomBlending;
        mat.blendEquation = THREE.AddEquation;
        mat.blendSrc = THREE.SrcAlphaFactor;
        mat.blendDst = THREE.OneFactor;
        mat.blendEquationAlpha = THREE.AddEquation;
        mat.blendSrcAlpha = THREE.OneFactor;
        mat.blendDstAlpha = THREE.OneFactor;
      } else {
        mat.blending = THREE.NormalBlending;
      }
    }
  }

  /** Yazı şekillerinde otomatik dönüş kapanır ve bakış açısı sınırlanır (ters/yandan görünmesin). */
  private syncControls() {
    const c = this.controls;
    c.autoRotate = !this.paused && !this.reducedMotion && !this.textMode;
    c.minAzimuthAngle = this.textMode ? -0.7 : -Infinity;
    c.maxAzimuthAngle = this.textMode ? 0.7 : Infinity;
    c.minPolarAngle = this.textMode ? 1.1 : 0;
    c.maxPolarAngle = this.textMode ? 1.9 : Math.PI;
  }

  private holdAuto() {
    this.nextAutoAt = this.autoClock + MANUAL_HOLD;
  }

  private startMorph(next: number) {
    this.pendingFormation = next;
    this.phase = "out";
    this.phaseT = 0;
  }

  private autoAdvance() {
    const next = (this.formation + 1) % FORMATION_COUNT;
    // Marka şekilleri altınla; diğerlerinde altın dışındaki paletler sırayla döner.
    const palette = isBrandKind(FORMATION_KINDS[next])
      ? 0
      : 1 + (this.autoColorCursor++ % (PALETTE_COUNT - 1));
    this.startMorph(next);
    this.applyPalette(palette);
    this.nextAutoAt = this.autoClock + AUTO_INTERVAL;
  }

  private disposeMeshes() {
    if (this.nodesMesh) {
      this.group.remove(this.nodesMesh);
      this.nodesMesh.geometry.dispose();
      this.nodesMesh = null;
    }
    if (this.linesMesh) {
      this.group.remove(this.linesMesh);
      this.linesMesh.geometry.dispose();
      this.linesMesh = null;
    }
  }

  private computeColors(
    paletteIndex: number,
    mode: ThemeMode,
    outNodes: Float32Array,
    outEdges: Float32Array
  ) {
    const palette = PALETTES[paletteIndex];
    const toned = palette.map((c) => toneColor(c, mode, new THREE.Color()));
    const tmp = this.tmpColor;

    for (let i = 0; i < this.nodeLevels.length; i++) {
      tmp.copy(toned[Math.min(this.nodeLevels[i], toned.length - 1)]);
      tmp.offsetHSL(
        this.nodeJitter[i * 3],
        this.nodeJitter[i * 3 + 1],
        this.nodeJitter[i * 3 + 2]
      );
      outNodes[i * 3] = tmp.r;
      outNodes[i * 3 + 1] = tmp.g;
      outNodes[i * 3 + 2] = tmp.b;
    }

    for (let e = 0; e < this.edgeLevels.length; e++) {
      tmp.copy(toned[Math.min(this.edgeLevels[e], toned.length - 1)]);
      tmp.offsetHSL(
        this.edgeJitter[e * 3],
        this.edgeJitter[e * 3 + 1],
        this.edgeJitter[e * 3 + 2]
      );
      for (let s = 0; s < SEGMENTS; s++) {
        const v = (e * SEGMENTS + s) * 3;
        outEdges[v] = tmp.r;
        outEdges[v + 1] = tmp.g;
        outEdges[v + 2] = tmp.b;
      }
    }
  }

  private buildNetwork(formation: number) {
    this.disposeMeshes();
    const { nodes, maxDist } = generateNetwork(formation, this.density);
    this.uniforms.uMaxDist.value = maxDist;

    const index = new Map<GNode, number>();
    nodes.forEach((n, i) => index.set(n, i));
    const n = nodes.length;

    // --- düğümler
    const pos = new Float32Array(n * 3);
    const type = new Float32Array(n);
    const size = new Float32Array(n);
    const dist = new Float32Array(n);
    this.nodeLevels = new Uint8Array(n);
    this.nodeJitter = new Float32Array(n * 3);
    nodes.forEach((node, i) => {
      pos[i * 3] = node.position.x;
      pos[i * 3 + 1] = node.position.y;
      pos[i * 3 + 2] = node.position.z;
      type[i] = node.type;
      size[i] = node.size;
      dist[i] = node.distanceFromRoot;
      this.nodeLevels[i] = Math.min(node.level, 255);
      this.nodeJitter[i * 3] = THREE.MathUtils.randFloatSpread(0.03);
      this.nodeJitter[i * 3 + 1] = THREE.MathUtils.randFloatSpread(0.08);
      this.nodeJitter[i * 3 + 2] = THREE.MathUtils.randFloatSpread(0.08);
    });

    // --- bağlantılar (her çift bir kez)
    const seen = new Set<number>();
    const edges: { a: GNode; b: GNode; strength: number }[] = [];
    nodes.forEach((node, i) => {
      for (const c of node.connections) {
        const j = index.get(c.node);
        if (j === undefined) continue;
        const key = Math.min(i, j) * 65536 + Math.max(i, j);
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ a: node, b: c.node, strength: c.strength });
      }
    });

    const m = edges.length;
    const V = m * SEGMENTS;
    const ePos = new Float32Array(V * 3);
    const eStart = new Float32Array(V * 3);
    const eEnd = new Float32Array(V * 3);
    const eStrength = new Float32Array(V);
    const ePath = new Float32Array(V);
    this.edgeLevels = new Uint8Array(m);
    this.edgeJitter = new Float32Array(m * 3);

    edges.forEach((edge, e) => {
      this.edgeLevels[e] = Math.min(
        Math.floor((edge.a.level + edge.b.level) / 2),
        255
      );
      this.edgeJitter[e * 3] = THREE.MathUtils.randFloatSpread(0.03);
      this.edgeJitter[e * 3 + 1] = THREE.MathUtils.randFloatSpread(0.08);
      this.edgeJitter[e * 3 + 2] = THREE.MathUtils.randFloatSpread(0.08);
      for (let s = 0; s < SEGMENTS; s++) {
        const v = e * SEGMENTS + s;
        ePos[v * 3] = s / (SEGMENTS - 1);
        eStart[v * 3] = edge.a.position.x;
        eStart[v * 3 + 1] = edge.a.position.y;
        eStart[v * 3 + 2] = edge.a.position.z;
        eEnd[v * 3] = edge.b.position.x;
        eEnd[v * 3 + 1] = edge.b.position.y;
        eEnd[v * 3 + 2] = edge.b.position.z;
        eStrength[v] = edge.strength;
        ePath[v] = e;
      }
    });

    // indeks: kesikli (çiftler) ya da kesintisiz
    const perEdge = CONTINUOUS_LINES ? (SEGMENTS - 1) * 2 : SEGMENTS;
    const indices = new Uint32Array(m * perEdge);
    let w = 0;
    for (let e = 0; e < m; e++) {
      const base = e * SEGMENTS;
      if (CONTINUOUS_LINES) {
        for (let s = 0; s < SEGMENTS - 1; s++) {
          indices[w++] = base + s;
          indices[w++] = base + s + 1;
        }
      } else {
        for (let s = 0; s < SEGMENTS; s += 2) {
          indices[w++] = base + s;
          indices[w++] = base + s + 1;
        }
      }
    }

    // --- renkler (ilk kurulumda mevcut = önceki)
    const nodeColor = new Float32Array(n * 3);
    const edgeColor = new Float32Array(V * 3);
    this.computeColors(this.paletteIndex, this.mode, nodeColor, edgeColor);
    this.uniforms.uColorMix.value = 1;
    this.colorTweening = false;

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    nodeGeo.setAttribute("nodeType", new THREE.BufferAttribute(type, 1));
    nodeGeo.setAttribute("nodeSize", new THREE.BufferAttribute(size, 1));
    nodeGeo.setAttribute("distanceFromRoot", new THREE.BufferAttribute(dist, 1));
    nodeGeo.setAttribute("nodeColor", new THREE.BufferAttribute(nodeColor, 3));
    nodeGeo.setAttribute("nodeColorPrev", new THREE.BufferAttribute(nodeColor.slice(), 3));

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(ePos, 3));
    lineGeo.setAttribute("startPoint", new THREE.BufferAttribute(eStart, 3));
    lineGeo.setAttribute("endPoint", new THREE.BufferAttribute(eEnd, 3));
    lineGeo.setAttribute("connectionStrength", new THREE.BufferAttribute(eStrength, 1));
    lineGeo.setAttribute("pathIndex", new THREE.BufferAttribute(ePath, 1));
    lineGeo.setAttribute("connectionColor", new THREE.BufferAttribute(edgeColor, 3));
    lineGeo.setAttribute(
      "connectionColorPrev",
      new THREE.BufferAttribute(edgeColor.slice(), 3)
    );
    lineGeo.setIndex(new THREE.BufferAttribute(indices, 1));

    this.nodesMesh = new THREE.Points(nodeGeo, this.nodeMaterial);
    this.linesMesh = new THREE.LineSegments(lineGeo, this.lineMaterial);
    // `position` buffer'ı gerçek konum taşımadığı için sınır küresi anlamsız; kırpmayı kapat.
    this.nodesMesh.frustumCulled = false;
    this.linesMesh.frustumCulled = false;
    this.group.add(this.linesMesh, this.nodesMesh);

    this.formation = formation;
    this.textMode = isPointShape(FORMATION_KINDS[formation % FORMATION_COUNT]);
    this.syncControls();
    this.distanceTarget = CAMERA_DISTANCE[formation % CAMERA_DISTANCE.length];
    this.emit();
  }

  /** Palet/tema değişimi: eski renkleri "prev"e yazıp yeniye doğru yumuşak geçiş yapar. */
  private applyPalette(index: number) {
    this.paletteIndex = index;
    if (!this.nodesMesh || !this.linesMesh) {
      this.emit();
      return;
    }
    const nGeo = this.nodesMesh.geometry;
    const lGeo = this.linesMesh.geometry;
    const nCur = nGeo.getAttribute("nodeColor") as THREE.BufferAttribute;
    const nPrev = nGeo.getAttribute("nodeColorPrev") as THREE.BufferAttribute;
    const eCur = lGeo.getAttribute("connectionColor") as THREE.BufferAttribute;
    const ePrev = lGeo.getAttribute("connectionColorPrev") as THREE.BufferAttribute;

    const mix = this.uniforms.uColorMix.value as number;
    const bake = (cur: Float32Array, prev: Float32Array) => {
      for (let i = 0; i < cur.length; i++) prev[i] = prev[i] + (cur[i] - prev[i]) * mix;
    };
    bake(nCur.array as Float32Array, nPrev.array as Float32Array);
    bake(eCur.array as Float32Array, ePrev.array as Float32Array);

    this.computeColors(
      index,
      this.mode,
      nCur.array as Float32Array,
      eCur.array as Float32Array
    );
    nCur.needsUpdate = nPrev.needsUpdate = eCur.needsUpdate = ePrev.needsUpdate = true;

    this.uniforms.uColorMix.value = 0;
    this.colorT = 0;
    this.colorTweening = true;
    this.emit();
  }

  /* ----------------------------- döngü / boyut --------------------------- */

  private resize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Orijinal ~1080 px yüksekliğe göre ayarlıydı; nokta boyutu buna göre ölçeklenir.
    this.uniforms.uPointScale.value = (h * this.pixelRatio) / 1100;
  };

  private onVisibility = () => {
    this.tabVisible = !document.hidden;
    this.updateRunning();
  };

  private updateRunning() {
    const shouldRun = this.inView && this.tabVisible && !this.disposed;
    if (shouldRun && !this.running) {
      this.running = true;
      this.lastNow = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  private onContextLost = (e: Event) => {
    e.preventDefault(); // tarayıcının bağlamı geri yükleyebilmesi için
  };

  private frame = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min((now - this.lastNow) / 1000, 0.1);
    this.lastNow = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    // Donmuşken sahne zamanı ilerlemez (dalgalar, akış, nefes alma durur).
    if (!this.paused) this.sceneTime += dt;
    this.uniforms.uTime.value = this.sceneTime;
    if (this.textMode) {
      // yazı şekilleri: okunabilir kalacak şekilde hafif sağa-sola sallanma
      this.group.rotation.y = Math.sin(this.sceneTime * 0.5) * 0.28;
      this.group.rotation.x = Math.sin(this.sceneTime * 0.37) * 0.05;
    } else {
      this.group.rotation.y = Math.sin(this.sceneTime * 0.04) * 0.05;
      this.group.rotation.x = 0;
    }

    // otomatik döngü: yalnızca donmamışken, görünürken ve geçiş yokken
    if (!this.paused && !this.reducedMotion) {
      this.autoClock += dt;
      if (this.phase === "idle" && this.autoClock >= this.nextAutoAt) {
        this.autoAdvance();
      }
    }

    // morph geçişi (kullanıcı eylemi olduğu için donmuşken de oynar)
    if (this.phase === "out") {
      this.phaseT += dt / SHRINK_TIME;
      this.reveal = 1 - easeInOutCubic(Math.min(1, this.phaseT));
      if (this.phaseT >= 1) {
        this.reveal = 0;
        this.uniforms.uReveal.value = 0;
        this.buildNetwork(this.pendingFormation);
        this.phase = "in";
        this.phaseT = 0;
      }
    } else if (this.phase === "in") {
      this.phaseT += dt / GROW_TIME;
      this.reveal = easeInOutCubic(Math.min(1, this.phaseT));
      if (this.phaseT >= 1) {
        this.reveal = 1;
        this.phase = "idle";
      }
    }
    this.uniforms.uReveal.value = this.reveal;

    // renk geçişi
    if (this.colorTweening) {
      this.colorT += dt / COLOR_TIME;
      if (this.colorT >= 1) {
        this.colorT = 1;
        this.colorTweening = false;
      }
      this.uniforms.uColorMix.value = easeInOutCubic(this.colorT);
    }

    // şekle göre kamera uzaklığı (yumuşak)
    const len = this.camera.position.length();
    if (Math.abs(len - this.distanceTarget) > 0.01) {
      this.camera.position.setLength(
        len + (this.distanceTarget - len) * Math.min(1, dt * 3)
      );
    }

    this.controls.update();
  }

  /* -------------------------------- işaretçi ----------------------------- */

  private onPointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onPointerCancel = () => {
    this.down = null;
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d || this.paused) return;
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    // sürükleme (döndürme) bir dalga tetiklemesin
    if (moved > 6 || performance.now() - d.t > 500) return;
    this.pulseAt(e.clientX, e.clientY);
  };

  private pulseAt(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    // merkezden geçen, kameraya dik düzlem
    this.plane.setFromNormalAndCoplanarPoint(
      this.camera.position.clone().normalize(),
      new THREE.Vector3(0, 0, 0)
    );
    if (!this.raycaster.ray.intersectPlane(this.plane, this.hit)) return;

    this.lastPulseIndex = (this.lastPulseIndex + 1) % 3;
    const i = this.lastPulseIndex;
    (this.uniforms.uPulsePositions.value as THREE.Vector3[])[i].copy(this.hit);
    (this.uniforms.uPulseTimes.value as number[])[i] = this.sceneTime;
    const palette = PALETTES[this.paletteIndex];
    const pick = palette[Math.floor(Math.random() * palette.length)];
    (this.uniforms.uPulseColors.value as THREE.Color[])[i].copy(
      toneColor(pick, this.mode, this.tmpColor)
    );
  }
}