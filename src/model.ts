// Geometry model shared by every view. A fixture spec is built into a flat list
// of Parts in centimetres; 2D (front/top/side), 2.5D (isometric) and 3D are all
// projections of this same list — so the views can never disagree.
//
// Axes: x → right, y → up (floor = 0), z → toward the viewer (back = 0).

export type Vec3 = [number, number, number];

export type MatId =
  | "metal" | "metalDark" | "board" | "boardEdge" | "panel" | "kick" | "header"
  | "glass" | "mirror" | "wood" | "woodDark" | "acrylic" | "wire" | "plastic"
  | "light" | "pegboard" | "slatwall" | "gridwall" | "perforated" | "woodslat" | "fabric"
  | "cardboard" | "body" | "screen" | "marble" | "product";

export type PatternKind = "peg" | "slat" | "grid" | "perf" | "woodslat" | "slot" | "mesh";
export interface Pattern { kind: PatternKind; pitch: number }

// What a part IS, and how it may be edited by dragging it in a view.
export interface Tag {
  role: string;              // "shelf" | "upright" | "arm" | "attachment" | "header" | ...
  path?: string;             // dotted path into the spec this part was built from
  drag?: "y" | "xy";         // which spec coords a drag edits (spec[path].x / .y)
  snap?: number;             // drag snaps to this pitch (slot / slat / peg spacing)
  label?: string;            // text printed on the part's front face (headers)
}

// `color` overrides the material colour (products, per-SKU tints).
interface Base { id: string; mat: MatId; tag?: Tag; pattern?: Pattern; color?: string }
export interface BoxPart extends Base {
  shape: "box"; min: Vec3; size: Vec3;
  rot?: { axis: "x" | "y" | "z"; angle: number; pivot: Vec3 }; // radians
}
export interface CylPart extends Base { shape: "cyl"; center: Vec3; radius: number; length: number; axis: "x" | "y" | "z" }
export interface SpherePart extends Base { shape: "sphere"; center: Vec3; radius: number }
export interface WirePart extends Base { shape: "wire"; points: Vec3[]; radius: number }
export interface RingPart extends Base { shape: "ring"; center: Vec3; radius: number; tube: number } // horizontal (xz plane)
export type Part = BoxPart | CylPart | SpherePart | WirePart | RingPart;

// ── Theme: material palette. Same geometry, different brand skin. ────────────
export interface MatStyle { color: string; metal?: number; rough?: number; opacity?: number; emissive?: string; patternColor?: string }
export type Theme = { name: string; mats: Record<MatId, MatStyle> };

const base: Record<MatId, MatStyle> = {
  metal: { color: "#b9bfc8", metal: 0.85, rough: 0.35 },
  metalDark: { color: "#5d636c", metal: 0.7, rough: 0.45 },
  board: { color: "#f2efe9", rough: 0.75 },
  boardEdge: { color: "#d8d2c6", rough: 0.8 },
  panel: { color: "#e9e4da", rough: 0.85 },
  kick: { color: "#33363b", rough: 0.6 },
  header: { color: "#2b2e33", rough: 0.5 },
  glass: { color: "#cfe6ee", opacity: 0.28, rough: 0.05 },
  mirror: { color: "#dfe7ec", metal: 1, rough: 0.05 },
  wood: { color: "#b98c5c", rough: 0.7 },
  woodDark: { color: "#8a6440", rough: 0.75 },
  acrylic: { color: "#e6f3f8", opacity: 0.45, rough: 0.1 },
  wire: { color: "#9aa1ab", metal: 0.8, rough: 0.4 },
  plastic: { color: "#2f3237", rough: 0.55 },
  light: { color: "#fff6e0", emissive: "#fff1c9" },
  pegboard: { color: "#d7c19c", rough: 0.9, patternColor: "#5c4a32" },
  slatwall: { color: "#ebe6dc", rough: 0.85, patternColor: "#6f675b" },
  gridwall: { color: "transparent", patternColor: "#5d636c" },
  perforated: { color: "#c9ced5", metal: 0.6, rough: 0.5, patternColor: "#4b5058" },
  woodslat: { color: "#c49a6c", rough: 0.75, patternColor: "#7a5634" },
  fabric: { color: "#8a8f98", rough: 0.95 },
  cardboard: { color: "#c9a57a", rough: 0.95 },
  body: { color: "#f4f5f6", metal: 0.15, rough: 0.35 },
  screen: { color: "#0f1720", metal: 0.2, rough: 0.08, emissive: "#1d3b5a" },
  marble: { color: "#efebe5", rough: 0.25 },
  product: { color: "#cccccc", rough: 0.55 },
};

export const THEMES: Record<string, Theme> = {
  standard: { name: "Standard", mats: base },
  nayasa: {
    name: "Nayasa (blush)",
    mats: {
      ...base,
      metal: { color: "#d6b36a", metal: 0.9, rough: 0.3 },
      metalDark: { color: "#a9853d", metal: 0.85, rough: 0.35 },
      board: { color: "#ffffff", rough: 0.6 },
      boardEdge: { color: "#f1e6e3", rough: 0.6 },
      panel: { color: "#f3d9d2", rough: 0.8 },
      kick: { color: "#e6c4bc", rough: 0.6 },
      header: { color: "#c98b8b", rough: 0.5 },
      slatwall: { color: "#f3d9d2", rough: 0.8, patternColor: "#c99c92" },
      pegboard: { color: "#f0d2cb", rough: 0.85, patternColor: "#b07f75" },
    },
  },
  noir: {
    name: "Noir (black + oak)",
    mats: {
      ...base,
      metal: { color: "#2c2e33", metal: 0.6, rough: 0.5 },
      metalDark: { color: "#16171a", metal: 0.6, rough: 0.5 },
      board: { color: "#c49a6c", rough: 0.7 },
      boardEdge: { color: "#a57c52", rough: 0.75 },
      panel: { color: "#3a3c41", rough: 0.85 },
      kick: { color: "#16171a" },
      wire: { color: "#2c2e33", metal: 0.6, rough: 0.5 },
      slatwall: { color: "#3a3c41", rough: 0.85, patternColor: "#16171a" },
    },
  },
};

// ── Builder helpers ──────────────────────────────────────────────────────────
export class Parts {
  list: Part[] = [];
  private n = 0;
  private uid(p: string) { return `${p}${++this.n}`; }

  box(mat: MatId, x: number, y: number, z: number, w: number, h: number, d: number, extra: Partial<BoxPart> = {}) {
    if (w <= 0 || h <= 0 || d <= 0) return;
    this.list.push({ id: this.uid("b"), shape: "box", mat, min: [x, y, z], size: [w, h, d], ...extra });
  }
  cyl(mat: MatId, center: Vec3, radius: number, length: number, axis: "x" | "y" | "z", extra: Partial<CylPart> = {}) {
    this.list.push({ id: this.uid("c"), shape: "cyl", mat, center, radius, length, axis, ...extra });
  }
  sphere(mat: MatId, center: Vec3, radius: number, extra: Partial<SpherePart> = {}) {
    this.list.push({ id: this.uid("s"), shape: "sphere", mat, center, radius, ...extra });
  }
  wire(mat: MatId, points: Vec3[], radius: number, extra: Partial<WirePart> = {}) {
    this.list.push({ id: this.uid("w"), shape: "wire", mat, points, radius, ...extra });
  }
  ring(mat: MatId, center: Vec3, radius: number, tube: number, extra: Partial<RingPart> = {}) {
    this.list.push({ id: this.uid("r"), shape: "ring", mat, center, radius, tube, ...extra });
  }
}

// ── Geometry utilities used by the projections ───────────────────────────────
function rotate(p: Vec3, axis: "x" | "y" | "z", a: number, pv: Vec3): Vec3 {
  const [x, y, z] = [p[0] - pv[0], p[1] - pv[1], p[2] - pv[2]];
  const c = Math.cos(a), s = Math.sin(a);
  let r: Vec3;
  if (axis === "x") r = [x, y * c - z * s, y * s + z * c];
  else if (axis === "y") r = [x * c + z * s, y, -x * s + z * c];
  else r = [x * c - y * s, x * s + y * c, z];
  return [r[0] + pv[0], r[1] + pv[1], r[2] + pv[2]];
}

export function boxCorners(b: BoxPart): Vec3[] {
  const [x, y, z] = b.min, [w, h, d] = b.size;
  const pts: Vec3[] = [];
  for (const dx of [0, w]) for (const dy of [0, h]) for (const dz of [0, d]) pts.push([x + dx, y + dy, z + dz]);
  return b.rot ? pts.map((p) => rotate(p, b.rot!.axis, b.rot!.angle, b.rot!.pivot)) : pts;
}

export function cylBounds(c: CylPart): [Vec3, Vec3] {
  const r = c.radius, hl = c.length / 2, [x, y, z] = c.center;
  const e: Vec3 = c.axis === "x" ? [hl, r, r] : c.axis === "y" ? [r, hl, r] : [r, r, hl];
  return [[x - e[0], y - e[1], z - e[2]], [x + e[0], y + e[1], z + e[2]]];
}

export function partBounds(p: Part): [Vec3, Vec3] {
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  const add = (q: Vec3, pad = 0) => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], q[i] - pad); hi[i] = Math.max(hi[i], q[i] + pad); } };
  if (p.shape === "box") boxCorners(p).forEach((q) => add(q));
  else if (p.shape === "cyl") { const [a, b] = cylBounds(p); add(a); add(b); }
  else if (p.shape === "sphere") add(p.center, p.radius);
  else if (p.shape === "wire") p.points.forEach((q) => add(q, p.radius));
  else { const [x, y, z] = p.center, R = p.radius + p.tube; add([x - R, y - p.tube, z - R]); add([x + R, y + p.tube, z + R]); }
  return [lo, hi];
}

export function bounds(parts: Part[]): { min: Vec3; max: Vec3; size: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const [a, b] = partBounds(p);
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], a[i]); max[i] = Math.max(max[i], b[i]); }
  }
  if (!parts.length) return { min: [0, 0, 0], max: [1, 1, 1], size: [1, 1, 1] };
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

export const snapTo = (v: number, pitch?: number) => (pitch ? Math.round(v / pitch) * pitch : v);

// Text colour that stays legible on a given background (headers, canopies).
export function inkOn(bg: string): string {
  if (!bg.startsWith("#")) return "#ffffff";
  const n = parseInt(bg.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#2b2e33" : "#ffffff";
}
