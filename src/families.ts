// Six parametric fixture families. Every named fixture in the catalog is a
// preset of one of these — adding "a new fixture" is usually just new numbers.
// Each builder emits Parts (geometry) + Surfaces (where merchandise can go).
import { Parts, type MatId, type Vec3, type Pattern } from "./model.ts";

const D2R = Math.PI / 180;

// ── Merchandising surfaces: what the planogram engine (and the dresser) fill ─
export interface Surface {
  kind: "shelf" | "rail" | "arm" | "peg" | "ring" | "bulk" | "tube";
  x: number; y: number; z: number;   // shelf/bulk: back-left corner of the top face; rail/arm/peg: start point
  w: number; d: number; h: number;   // footprint + vertical clearance (rail/arm: w = length)
  slope?: number;                    // radians, front edge lower
  dir?: Vec3;                        // arm/peg direction (unit)
  radius?: number;                   // ring
  tint?: string;
}
export class Build extends Parts { surfaces: Surface[] = []; }

export type Finish = "board" | "wood" | "metal" | "cardboard" | "glass" | "body" | "marble";
const finishMat = (f: Finish): MatId => (f === "board" ? "board" : f);

// ═══ 1. SHELVING — gondola, wall bay, endcap, cube unit, cabinet, chiller, FSDU, bookcase…
export interface Shelf {
  y: number; depth: number; type: "board" | "glass" | "wire" | "acrylic";
  dividers: number; fence: number; slope: number; lip: number; light: boolean;
}
export interface Column { shelves: Shelf[] }
export interface ShelvingSpec {
  family: "shelving";
  width: number; height: number; depth: number;
  sided: "single" | "double";
  frame: "uprights" | "panels" | "cabinet";
  finish: Finish;
  back: "none" | "plain" | "pegboard" | "slatwall" | "glass" | "mirror" | "perforated";
  base: number; header: number; headerText: string; topCap: boolean; canopy: number;
  doors: "none" | "glass" | "solid"; casters: boolean; slotPitch: number;
  columns: Column[];
  pegRows: PegRow[];               // hook rows on a pegboard/slatwall back, repeated in every column
}
export interface PegRow { y: number; count: number; length: number }

export const shelf = (y: number, o: Partial<Shelf> = {}): Shelf =>
  ({ y, depth: 0, type: "board", dividers: 0, fence: 0, slope: 0, lip: 0, light: false, ...o });
export const evenShelves = (n: number, from: number, to: number, o: Partial<Shelf> = {}) =>
  Array.from({ length: n }, (_, i) => shelf(Math.round(from + ((to - from) * (i + 1)) / (n + 1)), o));

const BACK_MAT: Record<string, MatId> = { plain: "panel", pegboard: "pegboard", slatwall: "slatwall", glass: "glass", mirror: "mirror", perforated: "perforated" };
const BACK_PAT: Record<string, Pattern | undefined> = {
  pegboard: { kind: "peg", pitch: 2.54 }, slatwall: { kind: "slat", pitch: 7.62 }, perforated: { kind: "perf", pitch: 1.5 },
};

function buildShelving(s: ShelvingSpec): Build {
  const b = new Build();
  const { width: W, height: H, depth: D } = s;
  const fm = finishMat(s.finish);
  const t = s.frame === "uprights" ? 3 : s.frame === "panels" ? 1.8 : 5;
  const n = Math.max(1, s.columns.length);
  const pt = s.frame === "uprights" ? 3 : t;
  const colW = (W - 2 * t - (n - 1) * pt) / n;
  const colX = (i: number) => t + i * (colW + pt);
  const dbl = s.sided === "double";
  const backT = s.back === "none" ? 0 : 1.5;
  const backZ0 = dbl ? D / 2 - backT / 2 : 0;
  const lift = s.casters ? 8 : 0;
  const top = H - (s.frame === "cabinet" ? Math.max(s.canopy, 10) : s.canopy);

  // feet / casters / plinth
  if (s.casters) for (const x of [6, W - 6]) for (const z of [6, D - 6]) {
    b.cyl("metalDark", [x, 3, z], 3, 2.4, "x"); b.box("metal", x - 1, 5, z - 1, 2, 3, 2);
  }
  if (s.base > 0) {
    b.box(s.frame === "cabinet" ? "body" : "kick", 0, lift, 1.5, W, s.base, D - 3, s.frame === "cabinet" ? { pattern: { kind: "perf", pitch: 1.2 } } : {});
  }
  // frame
  const xs = [0, W - t, ...Array.from({ length: n - 1 }, (_, i) => colX(i) + colW)];
  xs.forEach((x, k) => {
    const outer = k < 2;
    if (s.frame === "uprights") {
      const z = dbl ? D / 2 - 2 : 0;
      b.box("metal", x, lift, z, k < 2 ? t : pt, H - lift, 4, { pattern: { kind: "slot", pitch: s.slotPitch }, tag: { role: "upright" } });
    } else {
      // inner partitions stop under the canopy so they never cut through its sign
      b.box(s.frame === "cabinet" && outer ? "body" : fm, x, lift, 0, outer ? t : pt, (outer ? H : top) - lift, D, { tag: { role: outer ? "side panel" : "partition" } });
    }
  });
  if (s.frame !== "uprights" || s.topCap) b.box(s.frame === "cabinet" ? "body" : fm, 0, H - 2, 0, W, 2, D, { tag: { role: "top" } });
  if (s.frame === "cabinet" || s.canopy > 0) {
    const c = H - top;
    b.box(s.frame === "cabinet" ? "body" : fm, 0, top, 0, W, c, D, { tag: { role: "canopy", label: s.headerText || undefined } });
    b.box("light", t, top - 0.6, D - 6, W - 2 * t, 0.6, 3);
  }
  // back panel(s)
  if (s.back !== "none") {
    const y0 = lift + s.base;
    for (let i = 0; i < n; i++) b.box(BACK_MAT[s.back], colX(i), y0, backZ0, colW, top - y0, backT, { pattern: BACK_PAT[s.back], tag: { role: "back" } });
  }
  // header (above the unit)
  if (s.header > 0) b.box("header", 0, H, dbl ? D / 2 - 2 : 0, W, s.header, 4, { tag: { role: "header", label: s.headerText } });

  // shelves, per column, per side
  const zones: { z0: number; dir: 1 | -1; deep: number }[] = dbl
    ? [{ z0: D / 2 + backT / 2, dir: 1, deep: D / 2 - backT / 2 }, { z0: D / 2 - backT / 2, dir: -1, deep: D / 2 - backT / 2 }]
    : [{ z0: backT, dir: 1, deep: D - backT - (s.doors !== "none" ? 3 : 0) }];
  const deckY = lift + s.base;

  s.columns.forEach((col, ci) => {
    const x = colX(ci);
    const sorted = col.shelves.map((sh, si) => ({ sh, si })).sort((a, c) => a.sh.y - c.sh.y);
    for (const zone of zones) {
      // base deck counts as the bottom merchandising surface
      if (s.base > 0) {
        const firstY = sorted.length ? sorted[0].sh.y - 3 : top;
        const zf = zone.dir > 0 ? zone.z0 : zone.z0 - zone.deep;
        b.box(fm === "glass" ? "board" : fm, x, deckY - 2, zf, colW, 2, zone.deep, { tag: { role: "base deck" } });
        b.surfaces.push({ kind: "shelf", x, y: deckY, z: zf, w: colW, d: zone.deep, h: firstY - deckY });
      }
      sorted.forEach(({ sh, si }, k) => {
        const th = sh.type === "board" ? 2.5 : sh.type === "wire" ? 1.6 : 1;
        const sd = Math.min(sh.depth || zone.deep - 1, zone.deep);
        const zBack = zone.z0, zFront = zone.z0 + zone.dir * sd;
        const zMin = Math.min(zBack, zFront);
        const ang = sh.slope * D2R * (zone.dir > 0 ? 1 : -1);
        const rot = ang ? { axis: "x" as const, angle: ang, pivot: [x, sh.y, zBack] as Vec3 } : undefined;
        const mat: MatId = sh.type === "board" ? (fm === "glass" ? "glass" : fm) : sh.type === "wire" ? "wire" : sh.type;
        const path = `columns.${ci}.shelves.${si}`;
        b.box(mat, x, sh.y - th, zMin, colW, th, sd, {
          rot, pattern: sh.type === "wire" ? { kind: "mesh", pitch: 2.5 } : undefined,
          tag: { role: "shelf", path, drag: "y", snap: s.slotPitch },
        });
        const fy = sh.y - Math.sin(Math.abs(sh.slope * D2R)) * sd, fz = zBack + zone.dir * Math.cos(sh.slope * D2R) * sd;
        if (sh.lip > 0) b.box(sh.type === "board" ? fm : "acrylic", x, fy - 0.5, zone.dir > 0 ? fz - 1 : fz, colW, sh.lip + 0.5, 1, { tag: { role: "lip", path } });
        if (sh.fence > 0) {
          b.wire("wire", [[x + 1, fy + sh.fence, fz - zone.dir * 0.6], [x + colW - 1, fy + sh.fence, fz - zone.dir * 0.6]], 0.3, { tag: { role: "fence", path } });
          for (let px = x + 4; px < x + colW - 2; px += 12) b.wire("wire", [[px, fy, fz - zone.dir * 0.6], [px, fy + sh.fence, fz - zone.dir * 0.6]], 0.22);
        }
        for (let k2 = 1; k2 <= sh.dividers; k2++) {
          const dx = x + (colW * k2) / (sh.dividers + 1) - 0.3;
          b.box("acrylic", dx, sh.y, zMin, 0.6, Math.min(14, sh.y > 0 ? 14 : 14), sd, { rot, tag: { role: "divider", path } });
        }
        if (sh.light) b.box("light", x + 1, sh.y - th - 0.5, zone.dir > 0 ? fz - 4 : fz + 2.5, colW - 2, 0.5, 1.5);
        const next = sorted[k + 1]?.sh.y ?? top;
        b.surfaces.push({ kind: "shelf", x, y: sh.y, z: zMin, w: colW, d: sd, h: next - sh.y - 3, slope: Math.abs(sh.slope * D2R) });
      });
    }
    // peg-hook rows on the back panel
    if (s.back === "pegboard" || s.back === "slatwall" || s.back === "perforated") (s.pegRows ?? []).forEach((r, ri) => {
      for (const zone of zones) for (let k = 0; k < r.count; k++) {
        const hx = x + (colW * (k + 0.5)) / r.count, z0 = zone.z0, z1 = zone.z0 + zone.dir * r.length;
        const tag = { role: "peg row", path: `pegRows.${ri}`, drag: "y" as const, snap: s.back === "pegboard" ? 2.54 : 7.62 };
        b.wire("metal", [[hx, r.y, z0], [hx, r.y - 1, z1], [hx, r.y + 0.8, z1 + zone.dir * 0.4]], 0.35, { tag });
        b.surfaces.push({ kind: "peg", x: hx, y: r.y, z: z0, w: r.length, d: 0, h: 20, dir: [0, 0, zone.dir] });
      }
    });
    // doors (front side)
    if (s.doors !== "none") {
      const y0 = deckY, y1 = top - 1;
      b.box(s.doors === "glass" ? "glass" : fm, x + 0.3, y0, D - 1.6, colW - 0.6, y1 - y0, 1, { tag: { role: "door" } });
      if (s.doors === "glass") {
        for (const [x1, x2] of [[x + 0.3, x + 2.3], [x + colW - 2.3, x + colW - 0.3]]) b.box("metalDark", x1, y0, D - 1.8, x2 - x1, y1 - y0, 1.4);
        b.box("metalDark", x + 0.3, y1 - 2, D - 1.8, colW - 0.6, 2, 1.4); b.box("metalDark", x + 0.3, y0, D - 1.8, colW - 0.6, 3, 1.4);
      }
      b.cyl("metal", [x + colW - 4, (y0 + y1) / 2, D + 1.2], 0.9, Math.min(60, (y1 - y0) * 0.5), "y", { tag: { role: "handle" } });
    }
  });
  return b;
}

// ═══ 2. RACK — T-stand, 2-way, 4-way, waterfall tower, rounder, H-rack, Z-rack, spinner, eyewear tower…
export interface Arm { pole: number; angle: number; y: number; length: number; type: "straight" | "waterfall" | "peg" | "shelf"; studs: number; slope: number }
export interface Rail { y: number }
export interface RackSpec {
  family: "rack";
  base: "cross" | "h" | "round" | "casters" | "plate";
  poles: number; width: number; depth: number; height: number;
  arms: Arm[]; rails: Rail[];
  ring: number; ringY: number;
  topShelf: boolean; header: number; headerText: string;
}
export const arm = (angle: number, y: number, o: Partial<Arm> = {}): Arm =>
  ({ pole: 0, angle, y, length: 40, type: "straight", studs: 6, slope: 18, ...o });

function buildRack(s: RackSpec): Build {
  const b = new Build();
  const poles = s.poles >= 2 ? [0, s.width] : [0];
  const H = s.height;
  for (const px of poles) {
    b.cyl("metal", [px, H / 2 + 1, 0], 1.7, H - 2, "y", { tag: { role: "pole" } });
    b.sphere("metal", [px, H, 0], 2.1);
    const fd = s.depth / 2;
    if (s.base === "h" || s.base === "casters") {
      b.box("metalDark", px - 2, 0.4, -fd, 4, 3, s.depth, { tag: { role: "foot" } });
      if (s.base === "casters") for (const z of [-fd + 3, fd - 3]) b.cyl("plastic", [px, 2.4, z], 2.4, 2, "x");
    }
  }
  const cx = poles.length === 2 ? s.width / 2 : 0;
  if (s.base === "cross") { b.box("metalDark", -28, 0.4, -2, 56, 3, 4); b.box("metalDark", -2, 0.4, -28, 4, 3, 56); }
  if (s.base === "round") b.cyl("metalDark", [cx, 1.2, 0], Math.max(22, s.depth / 2), 2.4, "y");
  if (s.base === "plate") b.box("metalDark", cx - 22, 0, -22, 44, 1.6, 44);
  if (poles.length === 2 && (s.base === "h" || s.base === "casters")) b.wire("metalDark", [[0, 6, 0], [s.width, 6, 0]], 1.2);

  s.rails.forEach((r, i) => {
    if (poles.length < 2) return;
    b.wire("metal", [[0, r.y, 0], [s.width, r.y, 0]], 1.35, { tag: { role: "rail", path: `rails.${i}`, drag: "y", snap: 2.5 } });
    const below = s.rails.filter((o) => o.y < r.y).reduce((m, o) => Math.max(m, o.y), 0);
    b.surfaces.push({ kind: "rail", x: 2, y: r.y, z: 0, w: s.width - 4, d: 0, h: r.y - Math.max(below, 0) - 4 });
  });
  s.arms.forEach((a, i) => {
    const px = poles[Math.min(a.pole, poles.length - 1)];
    const dir: Vec3 = [Math.cos(a.angle * D2R), 0, Math.sin(a.angle * D2R)];
    const st: Vec3 = [px + dir[0] * 1.7, a.y, dir[2] * 1.7];
    const tag = { role: "arm", path: `arms.${i}`, drag: "y" as const, snap: 2.5 };
    const drop = a.type === "waterfall" ? Math.sin(a.slope * D2R) * a.length : a.type === "peg" ? -1 : 1;
    const en: Vec3 = [st[0] + dir[0] * a.length, a.y - drop, st[2] + dir[2] * a.length];
    b.wire("metal", [st, en], a.type === "peg" ? 0.4 : 1.15, { tag });
    if (a.type === "waterfall") for (let k = 1; k <= a.studs; k++) {
      const u = (k - 0.4) / a.studs;
      b.sphere("metal", [st[0] + (en[0] - st[0]) * u, st[1] + (en[1] - st[1]) * u + 1.3, st[2] + (en[2] - st[2]) * u], 0.75);
    }
    if (a.type === "shelf") {
      b.box("acrylic", en[0] - 8, en[1], en[2] - 8, 16, 0.8, 16, { tag });
      b.surfaces.push({ kind: "shelf", x: en[0] - 8, y: en[1] + 0.8, z: en[2] - 8, w: 16, d: 16, h: 14 });
    } else {
      b.sphere("metal", en, a.type === "peg" ? 0.6 : 1.6);
      b.surfaces.push({ kind: a.type === "peg" ? "peg" : "arm", x: st[0], y: a.y, z: st[2], w: a.length, d: 0, h: a.y - 6, dir, slope: a.type === "waterfall" ? a.slope * D2R : 0 });
    }
  });
  if (s.ring > 0) {
    b.ring("metal", [cx, s.ringY, 0], s.ring / 2, 1.25, { tag: { role: "ring" } });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      b.wire("metal", [[cx, s.ringY - 6, 0], [cx + Math.cos(a) * s.ring / 2, s.ringY, Math.sin(a) * s.ring / 2]], 0.8);
    }
    b.surfaces.push({ kind: "ring", x: cx, y: s.ringY, z: 0, w: 0, d: 0, h: s.ringY - 6, radius: s.ring / 2 });
  }
  if (s.topShelf && poles.length === 2) {
    b.box("wood", -5, H + 0.2, -18, s.width + 10, 2.5, 36, { tag: { role: "top shelf" } });
    b.surfaces.push({ kind: "shelf", x: -5, y: H + 2.7, z: -18, w: s.width + 10, d: 36, h: 30 });
  }
  if (s.header > 0) b.box("header", cx - 25, H + 3, -1.5, 50, s.header, 3, { tag: { role: "header", label: s.headerText } });
  return b;
}

// ═══ 3. TABLE / COUNTER — display & nesting tables, podium, vitrine, chest freezer, produce, checkout…
export interface TableSpec {
  family: "table";
  shape: "rect" | "round";
  width: number; depth: number; height: number;
  tiers: number; tierStep: number; tierInset: number;
  base: "legs" | "pedestal" | "solid" | "slab";
  finish: Finish;
  top: "flat" | "glass_case" | "glass_lid" | "crates" | "checkout";
  caseHeight: number; caseShelves: number; drawers: number; shelfBelow: boolean; light: boolean;
}

function buildTable(s: TableSpec): Build {
  const b = new Build();
  const { width: W, depth: D, height: H } = s;
  const fm = finishMat(s.finish), tt = 4, round = s.shape === "round";
  const base = s.top === "glass_lid" || s.top === "checkout" ? "solid" : s.base;
  const topSlab = (x: number, y: number, z: number, w: number, d: number, tag?: any) =>
    round ? b.cyl(fm, [x + w / 2, y + tt / 2, z + d / 2], w / 2, tt, "y", { tag }) : b.box(fm, x, y, z, w, tt, d, { tag });

  // base
  if (base === "legs") for (const x of [4, W - 9]) for (const z of [4, D - 9]) b.box(s.finish === "metal" ? "metal" : "woodDark", x, 0, z, 5, H - tt, 5);
  if (base === "pedestal") { b.cyl("metalDark", [W / 2, (H - tt) / 2, D / 2], 5, H - tt, "y"); b.cyl("metalDark", [W / 2, 1.2, D / 2], Math.min(W, D) * 0.28, 2.4, "y"); }
  if (base === "slab") for (const x of [3, W - 7]) b.box(fm, x, 0, 3, 4, H - tt, D - 6);
  if (base === "solid") {
    const body: MatId = s.top === "glass_lid" ? "body" : fm;
    if (round) b.cyl(body, [W / 2, (H - tt) / 2, D / 2], W / 2 - 3, H - tt, "y");
    else b.box(body, 3, 0, 3, W - 6, H - tt, D - 6, { tag: { role: "body" } });
    if (!round) b.box("kick", 5, 0, 2.5, W - 10, 8, D - 5);
  }
  if (s.drawers > 0 && !round) {
    const dw = (W - 10) / s.drawers;
    for (let i = 0; i < s.drawers; i++) {
      b.box(fm, 5 + i * dw + 0.4, H - tt - 20, D - 3, dw - 0.8, 16, 1.2, { tag: { role: "drawer" } });
      b.box("metal", 5 + i * dw + dw / 2 - 5, H - tt - 9, D - 1.8, 10, 1, 1.2);
    }
  }
  if (s.shelfBelow && base !== "solid") {
    b.box(fm, 6, 14, 6, W - 12, 2.5, D - 12, { tag: { role: "lower shelf" } });
    b.surfaces.push({ kind: "shelf", x: 6, y: 16.5, z: 6, w: W - 12, d: D - 12, h: H - tt - 20 });
  }

  if (s.top === "glass_lid") {          // chest / island freezer: open tub + sliding glass lids
    const inner = H - 32;
    b.box("body", 3, inner - 2, 3, W - 6, 2, D - 6);
    for (const [x, z, w, d] of [[0, 0, W, 4], [0, D - 4, W, 4], [0, 0, 4, D], [W - 4, 0, 4, D]]) b.box("body", x, inner, z, w, H - inner, d);
    b.box("glass", 4, H - 1.5, 4, (W - 8) / 2 + 2, 1, D - 8); b.box("glass", W / 2 - 2, H - 0.5, 4, (W - 8) / 2 + 2, 1, D - 8);
    b.box("light", 6, H - 4, 4.2, W - 12, 0.8, 0.6);
    b.surfaces.push({ kind: "bulk", x: 5, y: inner, z: 5, w: W - 10, d: D - 10, h: 26 });
    return b;
  }
  topSlab(0, H - tt, 0, W, D, { role: "top" });

  if (s.top === "checkout") {
    b.box("plastic", 0, H, 8, W * 0.62, 1.5, D * 0.55, { tag: { role: "conveyor" } });
    for (let x = 4; x < W * 0.62; x += 6) b.box("kick", x, H + 1.5, 8, 0.6, 0.1, D * 0.55);
    b.box("glass", W * 0.66, H, 6, 22, 2, 22); b.box("plastic", W * 0.66 + 3, H + 2, 8, 16, 18, 4, { tag: { role: "scanner" } });
    b.box("plastic", W - 34, H, D - 30, 26, 2, 20); b.box("plastic", W - 23, H + 2, D - 22, 4, 20, 4);
    b.box("screen", W - 32, H + 20, D - 22, 22, 15, 2, { tag: { role: "POS screen" } });
    b.surfaces.push({ kind: "shelf", x: 4, y: H + 1.5, z: 10, w: W * 0.5, d: D * 0.45, h: 20 });
    return b;
  }

  // tiers (nesting / tiered)
  let lastY = H;
  for (let i = 1; i < s.tiers; i++) {
    const k = 1 - i * s.tierInset, w = W * k, d = D * k, x = (W - w) / 2, z = (D - d) / 2, y = H + i * s.tierStep;
    if (round) b.cyl("woodDark", [W / 2, y - s.tierStep / 2, D / 2], 3, s.tierStep - tt, "y");
    else for (const lx of [x + 4, x + w - 8]) for (const lz of [z + 4, z + d - 8]) b.box("woodDark", lx, y - s.tierStep, lz, 4, s.tierStep - tt, 4);
    topSlab(x, y - tt, z, w, d, { role: "tier", path: "tierStep" });
    lastY = y;
  }
  if (s.top === "crates") {
    const cols = Math.max(1, Math.floor(W / 44)), cw = W / cols - 3;
    for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
      const x = c * (cw + 3) + 1.5, z = r * (D / 2) + 2, y = H + (1 - r) * 12, d = D / 2 - 4;
      const rot = { axis: "x" as const, angle: 0.22, pivot: [x, y, z] as Vec3 };
      b.box("wood", x, y, z, cw, 12, d, { rot, pattern: { kind: "woodslat", pitch: 4 }, tag: { role: "crate" } });
      b.surfaces.push({ kind: "bulk", x: x + 1, y: y + 2, z: z + 1, w: cw - 2, d: d - 2, h: 12, slope: 0.22 });
    }
    return b;
  }
  if (s.top === "glass_case") {        // vitrine / jewellery counter / pastry case
    const ch = s.caseHeight, y0 = H;
    const g = (x: number, y: number, z: number, w: number, h: number, d: number) => b.box("glass", x, y, z, w, h, d, { tag: { role: "glass case" } });
    g(1, y0, D - 2, W - 2, ch, 0.8); g(1, y0, 1, W - 2, ch, 0.8); g(1, y0, 1, 0.8, ch, D - 2); g(W - 1.8, y0, 1, 0.8, ch, D - 2); g(1, y0 + ch, 1, W - 2, 0.8, D - 2);
    for (const x of [1, W - 2]) for (const z of [1, D - 2]) b.box("metalDark", x, y0, z, 1, ch, 1);
    if (s.light) b.box("light", 4, y0 + ch - 1.5, D / 2, W - 8, 0.6, 2);
    b.surfaces.push({ kind: "shelf", x: 3, y: y0, z: 3, w: W - 6, d: D - 6, h: ch / (s.caseShelves + 1) - 2 });
    for (let i = 1; i <= s.caseShelves; i++) {
      const y = y0 + (ch * i) / (s.caseShelves + 1);
      b.box("glass", 3, y - 0.8, 3, W - 6, 0.8, D - 6, { tag: { role: "glass shelf" } });
      b.surfaces.push({ kind: "shelf", x: 3, y, z: 3, w: W - 6, d: D - 6, h: ch / (s.caseShelves + 1) - 3 });
    }
    return b;
  }
  // flat: every tier is a surface
  for (let i = 0; i < s.tiers; i++) {
    const k = 1 - i * s.tierInset, w = W * k, d = D * k;
    b.surfaces.push({ kind: "shelf", x: (W - w) / 2 + 3, y: H + i * s.tierStep, z: (D - d) / 2 + 3, w: w - 6, d: d - 6, h: i < s.tiers - 1 ? s.tierStep - tt - 2 : 40 });
  }
  void lastY;
  return b;
}

// ═══ 4. WALL — slatwall/pegboard/gridwall/standards bays with attachable hardware
export interface Attachment {
  type: "faceout_arm" | "waterfall_arm" | "shelf" | "glass_shelf" | "hang_rail" | "hooks" | "basket" | "tv" | "mirror" | "light";
  x: number; y: number; length: number; width: number; count: number;
}
export interface WallSpec {
  family: "wall";
  width: number; height: number;
  type: "slatwall" | "pegboard" | "gridwall" | "plain" | "perforated" | "woodslat" | "mirror" | "standards";
  pitch: number; base: number; header: number; headerText: string;
  attachments: Attachment[];
}
export const att = (type: Attachment["type"], x: number, y: number, o: Partial<Attachment> = {}): Attachment =>
  ({ type, x, y, length: 30, width: 60, count: 1, ...o });

const WALL_MAT: Record<string, MatId> = { slatwall: "slatwall", pegboard: "pegboard", gridwall: "gridwall", plain: "panel", perforated: "perforated", woodslat: "woodslat", mirror: "mirror", standards: "panel" };
const WALL_PAT: Record<string, PatternKind | undefined> = { slatwall: "slat", pegboard: "peg", gridwall: "grid", perforated: "perf", woodslat: "woodslat" };
type PatternKind = Pattern["kind"];

function buildWall(s: WallSpec): Build {
  const b = new Build();
  const { width: W, height: H } = s;
  const pk = WALL_PAT[s.type];
  if (s.base > 0) b.box("kick", 0, 0, 0, W, s.base, 6);
  b.box(WALL_MAT[s.type], 0, s.base, 0, W, H - s.base, 2, { pattern: pk ? { kind: pk, pitch: s.pitch } : undefined, tag: { role: "wall panel" } });
  const snapY = s.type === "standards" ? 2.5 : pk && pk !== "woodslat" ? s.pitch : 1;
  if (s.type === "standards") for (let x = 4; x < W; x += s.pitch) b.box("metal", x - 1.2, s.base, 2, 2.4, H - s.base, 1.2, { pattern: { kind: "slot", pitch: 2.5 } });
  if (s.header > 0) b.box("header", 0, H, 0, W, s.header, 5, { tag: { role: "header", label: s.headerText } });
  const z0 = s.type === "standards" ? 3.2 : 2;

  s.attachments.forEach((a, i) => {
    const tag = { role: "attachment", path: `attachments.${i}`, drag: "xy" as const, snap: snapY };
    const { x, y, length: L } = a;
    switch (a.type) {
      case "faceout_arm":
      case "waterfall_arm": {
        const wf = a.type === "waterfall_arm", drop = wf ? Math.sin(18 * D2R) * L : 1.5;
        b.box("metalDark", x - 1.5, y - 3, z0, 3, 6, 1, { tag });
        b.wire("metal", [[x, y, z0 + 1], [x, y - drop, z0 + 1 + L]], 1.05, { tag });
        if (wf) for (let k = 1; k <= 6; k++) { const u = (k - 0.4) / 6; b.sphere("metal", [x, y - drop * u + 1.2, z0 + 1 + L * u], 0.7); }
        b.sphere("metal", [x, y - drop, z0 + 1 + L], 1.4);
        b.surfaces.push({ kind: "arm", x, y, z: z0 + 1, w: L, d: 0, h: y - s.base - 4, dir: [0, 0, 1], slope: wf ? 18 * D2R : 0 });
        break;
      }
      case "shelf":
      case "glass_shelf": {
        const th = a.type === "glass_shelf" ? 1 : 2.5;
        b.box(a.type === "glass_shelf" ? "glass" : "board", x, y - th, z0, a.width, th, L, { tag });
        for (const bx of [x + 4, x + a.width - 5]) b.wire("metal", [[bx, y - th, z0], [bx, y - th, z0 + L * 0.85], [bx, y - th - L * 0.45, z0]], 0.6, { tag });
        const above = s.attachments.filter((o) => o !== a && o.y > y && o.x < x + a.width && o.x + (o.width || 0) > x).reduce((m, o) => Math.min(m, o.y), H);
        b.surfaces.push({ kind: "shelf", x, y, z: z0, w: a.width, d: L, h: Math.min(above, H) - y - 4 });
        break;
      }
      case "hang_rail": {
        for (const bx of [x, x + a.width]) b.wire("metal", [[bx, y, z0], [bx, y, z0 + L]], 0.9, { tag });
        b.wire("metal", [[x, y, z0 + L], [x + a.width, y, z0 + L]], 1.3, { tag });
        b.surfaces.push({ kind: "rail", x: x + 2, y, z: z0 + L, w: a.width - 4, d: 0, h: y - s.base - 4 });
        break;
      }
      case "hooks": {
        for (let k = 0; k < a.count; k++) {
          const hx = x + k * (a.width / Math.max(1, a.count));
          b.wire("metal", [[hx, y, z0], [hx, y - 1, z0 + L], [hx, y + 1, z0 + L + 0.4]], 0.35, { tag });
          b.surfaces.push({ kind: "peg", x: hx, y, z: z0, w: L, d: 0, h: 20, dir: [0, 0, 1] });
        }
        break;
      }
      case "basket": {
        const h = 16;
        for (const [bx, bz, bw, bd] of [[x, z0, a.width, 0.6], [x, z0 + L - 0.6, a.width, 0.6], [x, z0, 0.6, L], [x + a.width - 0.6, z0, 0.6, L]])
          b.box("wire", bx, y - h, bz, bw, h, bd, { pattern: { kind: "mesh", pitch: 2.5 }, tag });
        b.box("wire", x, y - h, z0, a.width, 0.6, L, { pattern: { kind: "mesh", pitch: 2.5 }, tag });
        b.surfaces.push({ kind: "bulk", x: x + 1, y: y - h + 0.6, z: z0 + 1, w: a.width - 2, d: L - 2, h: h + 4 });
        break;
      }
      case "tv": {
        const h = (a.width * 9) / 16;
        b.box("plastic", x, y - h, z0 + 3, a.width, h, 3, { tag });
        b.box("screen", x + 1, y - h + 1, z0 + 6, a.width - 2, h - 2, 0.3, { tag });
        b.box("metalDark", x + a.width / 2 - 10, y - h / 2 - 8, z0, 20, 16, 3);
        break;
      }
      case "mirror": b.box("mirror", x, y - a.length, z0, a.width, a.length, 1, { tag }); break;
      case "light": b.box("light", x, y, z0, a.width, 1.2, 2, { tag }); break;
    }
  });
  return b;
}

// ═══ 5. BIN — dump bin, crate, gravity dispenser, pallet, basket
export interface BinSpec {
  family: "bin";
  style: "wire" | "solid" | "crate" | "gravity" | "pallet";
  shape: "rect" | "round";
  width: number; depth: number; height: number;
  legs: number; casters: boolean; dividers: number; count: number; finish: Finish;
}

function buildBin(s: BinSpec): Build {
  const b = new Build();
  const { width: W, depth: D, height: H, legs: L } = s;
  if (s.style === "pallet") {
    for (const z of [0, D / 2 - 5, D - 10]) b.box("woodDark", 0, 0, z, W, 9, 10);
    b.box("wood", 0, 9, 0, W, 3, D, { pattern: { kind: "woodslat", pitch: 12 }, tag: { role: "deck" } });
    b.surfaces.push({ kind: "shelf", x: 2, y: 12, z: 2, w: W - 4, d: D - 4, h: H - 12 });
    return b;
  }
  if (s.style === "gravity") {
    const n = Math.max(1, s.count), tw = W / n;
    b.box("metalDark", 0, 0, 0, W, 6, D); b.box("metalDark", 0, H - 4, 0, W, 4, D);
    for (const x of [0, W - 3]) b.box("metal", x, 0, 0, 3, H, 4);
    for (let i = 0; i < n; i++) {
      const cx = tw * i + tw / 2;
      b.cyl("acrylic", [cx, (H + 30) / 2, D / 2], tw * 0.42, H - 34, "y", { tag: { role: "tube" } });
      b.box("plastic", cx - 5, 18, D / 2 - 5, 10, 8, 14, { tag: { role: "dispenser" } });
      b.surfaces.push({ kind: "tube", x: cx, y: 30, z: D / 2, w: tw * 0.4, d: 0, h: H - 40 });
    }
    return b;
  }
  const mat: MatId = s.style === "wire" ? "wire" : s.style === "crate" ? "wood" : finishMat(s.finish);
  const pat: Pattern | undefined = s.style === "wire" ? { kind: "mesh", pitch: 4 } : s.style === "crate" ? { kind: "woodslat", pitch: 6 } : undefined;
  const y0 = s.casters ? 7 : L;
  if (s.casters) for (const x of [6, W - 6]) for (const z of [6, D - 6]) b.cyl("plastic", [x, 3, z], 3, 2.4, "x");
  else if (L > 0) for (const x of [2, W - 4]) for (const z of [2, D - 4]) b.box("metalDark", x, 0, z, 2, L, 2);
  if (s.shape === "round") {
    b.cyl(mat, [W / 2, y0 + (H - y0) / 2, D / 2], W / 2, H - y0, "y", { pattern: pat, tag: { role: "bin" } });
    b.ring("metal", [W / 2, H, D / 2], W / 2, 0.8);
  } else {
    const t = 1;
    for (const [x, z, w, d] of [[0, 0, W, t], [0, D - t, W, t], [0, 0, t, D], [W - t, 0, t, D]]) b.box(mat, x, y0, z, w, H - y0, d, { pattern: pat, tag: { role: "bin wall" } });
    b.box(mat, 0, y0, 0, W, 1, D, { pattern: pat });
    if (s.style === "wire") for (const z of [0, D]) b.wire("metal", [[0, H, z], [W, H, z]], 0.6);
    for (let k = 1; k <= s.dividers; k++) b.box(mat, (W * k) / (s.dividers + 1) - 0.5, y0, 0, 1, H - y0 - 2, D, { tag: { role: "divider" } });
  }
  b.surfaces.push({ kind: "bulk", x: 2, y: y0 + 1, z: 2, w: W - 4, d: D - 4, h: H - y0 - 2, radius: s.shape === "round" ? W / 2 - 3 : undefined });
  return b;
}

// ═══ 6. HARDWARE — hooks, arms, brackets, hangers, signage, risers, dividers…
export interface HardwareSpec {
  family: "hardware";
  kind: "single_hook" | "double_hook" | "j_hook" | "waterfall_hook" | "bin_hook" | "faceout_arm" | "waterfall_arm"
    | "shelf_bracket" | "hanger" | "sign_holder" | "riser" | "divider" | "fence" | "price_channel" | "connector_tips" | "shelf_talker";
  length: number; width: number; height: number; count: number;
  mount: "slatwall" | "pegboard" | "gridwall" | "standards";
  style: "standard" | "faceout" | "suit" | "clip" | "cascade" | "kids";
  orientation: "face" | "spine";
}

function hangerWire(b: Build, cx: number, railY: number, z: number, w: number, style: HardwareSpec["style"], spine: boolean) {
  const P = (x: number, y: number): Vec3 => (spine ? [cx, y, z + (x - cx)] : [x, y, z]);
  const neck = railY - 4, sh = neck - 1, half = w / 2, drop = style === "suit" ? 6 : 7;
  b.wire("metal", [P(cx + 2.6, railY - 0.6), P(cx + 2.6, railY + 1), P(cx + 1, railY + 2.4), P(cx - 1, railY + 1.8), P(cx, railY), P(cx, neck)], 0.25);
  const mat: MatId = style === "suit" ? "wood" : style === "kids" ? "acrylic" : "plastic";
  const r = style === "suit" ? 1.2 : 0.55;
  if (style === "clip") {
    b.wire(mat, [P(cx - half, sh), P(cx + half, sh)], 0.7);
    for (const s2 of [-1, 1]) { const q = P(cx + s2 * (half - 3), sh - 4); b.box("metal", q[0] - 1.5, q[1], q[2] - 1.5, 3, 3.8, 3); }
    return;
  }
  b.wire(mat, [P(cx - half, sh - drop), P(cx, sh), P(cx + half, sh - drop)], r, { color: style === "kids" ? "#7aa7d6" : undefined });
  b.wire(mat, [P(cx - half, sh - drop), P(cx + half, sh - drop)], r * 0.6, { color: style === "kids" ? "#7aa7d6" : undefined });
  if (style === "faceout") b.sphere("metal", P(cx, neck + 0.4), 0.9);
  if (style === "cascade") for (let i = 1; i <= 3; i++) {
    b.wire("metal", [P(cx, sh - drop), P(cx, sh - drop - i * 7)], 0.25);
    b.wire("metal", [P(cx, sh - drop - i * 7), P(cx + 2, sh - drop - i * 7 + 1.5)], 0.25);
  }
}

function buildHardware(s: HardwareSpec): Build {
  const b = new Build();
  const L = s.length;
  const mountMat: MatId = s.mount === "pegboard" ? "pegboard" : s.mount === "gridwall" ? "gridwall" : s.mount === "standards" ? "metal" : "slatwall";
  const mountPat: Pattern | undefined = s.mount === "pegboard" ? { kind: "peg", pitch: 2.54 } : s.mount === "gridwall" ? { kind: "grid", pitch: 7.62 } : s.mount === "slatwall" ? { kind: "slat", pitch: 7.62 } : { kind: "slot", pitch: 2.5 };
  const slice = (w = 16, h = 30) => b.box(mountMat, -w / 2, 0, 0, w, h, 2, { pattern: mountPat, tag: { role: "mount" } });
  const plate = (x: number, y: number) => b.box("metalDark", x - 1.5, y - 3, 2, 3, 6, 1);
  const shelfBoard = (w: number, d: number) => { b.box("board", 0, 0, 0, w, 2.5, d); b.surfaces.push({ kind: "shelf", x: 0, y: 2.5, z: 0, w, d, h: 30 }); };
  switch (s.kind) {
    case "single_hook": case "double_hook": {
      slice(); const xs = s.kind === "double_hook" ? [-2.5, 2.5] : [0];
      for (const x of xs) { plate(x, 20); b.wire("metal", [[x, 20, 3], [x, 19, 3 + L], [x, 20.6, 3.4 + L]], 0.35); b.surfaces.push({ kind: "peg", x, y: 20, z: 3, w: L, d: 0, h: 18, dir: [0, 0, 1] }); }
      break;
    }
    case "j_hook": { slice(16, 20); plate(0, 14); const r = s.width / 2 || 3; b.wire("metal", [[0, 14, 3], [0, 14, 3 + L * 0.5], [0, 14 - r, 3 + L * 0.5 + r], [0, 14 - 2 * r, 3 + L * 0.5], [0, 14 - 1.5 * r, 3 + L * 0.5 - r * 0.6]], 0.35); break; }
    case "waterfall_hook": {
      slice(); plate(0, 22); const drop = L * 0.35;
      b.wire("metal", [[0, 22, 3], [0, 22 - drop, 3 + L]], 0.4);
      for (let k = 1; k <= s.count; k++) { const u = (k - 0.3) / s.count; b.wire("metal", [[0, 22 - drop * u, 3 + L * u], [0, 23.3 - drop * u, 3 + L * u + 0.4]], 0.32); }
      break;
    }
    case "bin_hook": { slice(); plate(0, 22); b.wire("metal", [[0, 22, 3], [0, 22, 3 + 4]], 0.4); b.box("acrylic", -s.width / 2, 22 - 10, 5, s.width, 10, L); b.surfaces.push({ kind: "bulk", x: -s.width / 2 + 0.5, y: 13, z: 5.5, w: s.width - 1, d: L - 1, h: 9 }); break; }
    case "faceout_arm": case "waterfall_arm": {
      slice(16, 40); plate(0, 34); const wf = s.kind === "waterfall_arm", drop = wf ? L * 0.3 : 1.5;
      b.wire("metal", [[0, 34, 3], [0, 34 - drop, 3 + L]], 1.05); b.sphere("metal", [0, 34 - drop, 3 + L], 1.4);
      if (wf) for (let k = 1; k <= 6; k++) { const u = (k - 0.4) / 6; b.sphere("metal", [0, 34 - drop * u + 1.2, 3 + L * u], 0.7); }
      b.surfaces.push({ kind: "arm", x: 0, y: 34, z: 3, w: L, d: 0, h: 30, dir: [0, 0, 1], slope: wf ? Math.atan2(drop, L) : 0 });
      break;
    }
    case "shelf_bracket": {
      b.box(mountMat, -2, 0, 0, s.width + 4, 30, 2, { pattern: mountPat });
      for (const x of [3, s.width - 3]) b.wire("metal", [[x, 20, 2], [x, 20, 2 + L * 0.9], [x, 20 - L * 0.5, 2]], 0.7);
      b.box("board", 0, 20, 2, s.width, 2.5, L); b.surfaces.push({ kind: "shelf", x: 0, y: 22.5, z: 2, w: s.width, d: L, h: 25 });
      break;
    }
    case "hanger": {
      b.wire("metal", [[-s.width / 2 - 6, 40, 0], [s.width / 2 + 6, 40, 0]], 1.2, { tag: { role: "rail" } });
      hangerWire(b, 0, 40, 0, s.width, s.style, s.orientation === "spine");
      break;
    }
    case "sign_holder": {
      b.box("metalDark", -5, 0, -2, 10, 1.4, 4); b.wire("metal", [[0, 1.4, 0], [0, 9, 0]], 0.4);
      b.box("metal", -s.width / 2 - 0.6, 9, -0.6, s.width + 1.2, s.height + 1.2, 1.2);
      b.box("board", -s.width / 2, 9.6, 0.65, s.width, s.height, 0.2, { tag: { role: "sign", label: "₹ 999" } });
      break;
    }
    case "riser": {
      const steps = Math.max(1, s.count);
      for (let i = 0; i < steps; i++) { const h = (s.height * (i + 1)) / steps, d = L * (1 - i / (steps + 0.5)); b.box("acrylic", 0, 0, 0, s.width, h, d); b.surfaces.push({ kind: "shelf", x: 0, y: h, z: d - L / steps, w: s.width, d: L / steps, h: 20 }); }
      break;
    }
    case "divider": case "fence": case "price_channel": case "shelf_talker": {
      shelfBoard(s.width, L);
      if (s.kind === "divider") for (let k = 1; k <= s.count; k++) b.box("acrylic", (s.width * k) / (s.count + 1), 2.5, 0, 0.6, s.height, L);
      if (s.kind === "fence") { b.wire("wire", [[1, 2.5 + s.height, L - 0.6], [s.width - 1, 2.5 + s.height, L - 0.6]], 0.3); for (let x = 4; x < s.width; x += 12) b.wire("wire", [[x, 2.5, L - 0.6], [x, 2.5 + s.height, L - 0.6]], 0.22); }
      if (s.kind === "price_channel") { b.box("acrylic", 0, -1.5, L, s.width, 4, 1); for (let x = 3; x < s.width - 8; x += s.width / Math.max(1, s.count)) b.box("board", x, -1, L + 1, 7, 3, 0.2, { color: "#ffd84d" }); }
      if (s.kind === "shelf_talker") { b.box("acrylic", s.width / 2 - 0.3, -2, L, 0.6, 3, 2); b.box("board", s.width / 2 - 0.2, -12, L + 1, 0.4, 12, 9, { color: "#e4572e" }); }
      break;
    }
    case "connector_tips": {
      const mounts: [MatId, Pattern | undefined][] = [["slatwall", { kind: "slat", pitch: 7.62 }], ["pegboard", { kind: "peg", pitch: 2.54 }], ["gridwall", { kind: "grid", pitch: 7.62 }], ["metal", { kind: "slot", pitch: 2.5 }]];
      mounts.forEach(([m, p], i) => {
        const x = i * 14;
        b.box(m, x - 5, 0, 0, 10, 14, 2, { pattern: p });
        b.box("metalDark", x - 1.5, 4, 2, 3, 6, 1);
        b.wire("metal", [[x, 7, 3], [x, 7, 9]], 0.6);
      });
      break;
    }
  }
  return b;
}

// ═══ Dispatcher ═══════════════════════════════════════════════════════════════
export type FixtureSpec = ShelvingSpec | RackSpec | TableSpec | WallSpec | BinSpec | HardwareSpec;
export function buildFixture(s: FixtureSpec): Build {
  switch (s.family) {
    case "shelving": return buildShelving(s);
    case "rack": return buildRack(s);
    case "table": return buildTable(s);
    case "wall": return buildWall(s);
    case "bin": return buildBin(s);
    case "hardware": return buildHardware(s);
  }
}
