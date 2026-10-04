// Merchandise dresser: fills a fixture's surfaces with procedural sample product
// for a vertical, so every fixture reads instantly ("populated thumbnail").
// In the real planogram these slots are filled with the brand's own SKUs; the
// surfaces are the same ones the placement engine uses.
import { Parts, type Vec3 } from "./model.ts";
import type { Surface } from "./families.ts";

export type Vertical = "none" | "apparel" | "footwear" | "grocery" | "beauty" | "pharmacy" | "electronics"
  | "home" | "jewellery" | "eyewear" | "books" | "liquor" | "toys" | "bakery";
export const VERTICALS: Vertical[] = ["none", "apparel", "footwear", "grocery", "beauty", "pharmacy", "electronics", "home", "jewellery", "eyewear", "books", "liquor", "toys", "bakery"];

const PAL: Record<string, string[]> = {
  apparel: ["#1f2937", "#9f1239", "#c2410c", "#d6c6a8", "#3a5a40", "#588157", "#6b7280", "#e5e7eb", "#1e3a8a", "#b08968", "#f4a261", "#7f5539"],
  grocery: ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#264653", "#f1faee", "#8ab17d", "#d62828", "#003049", "#fcbf49"],
  beauty: ["#f8c8dc", "#e5989b", "#b5838d", "#ffffff", "#ffd6a5", "#cdb4db", "#2b2d42", "#d4af37"],
  pharmacy: ["#ffffff", "#e0f2fe", "#22c55e", "#0ea5e9", "#ef4444", "#f1f5f9", "#1d4ed8"],
  electronics: ["#111827", "#1f2937", "#e5e7eb", "#3b82f6", "#9ca3af", "#f9fafb"],
  home: ["#f3e9dc", "#c8a27c", "#6b9080", "#e07a5f", "#f2cc8f", "#81b29a", "#ffffff", "#3d405b"],
  footwear: ["#111827", "#f9fafb", "#b45309", "#7c2d12", "#2563eb", "#dc2626", "#d1d5db"],
  books: ["#7f1d1d", "#1e3a8a", "#065f46", "#f59e0b", "#4c1d95", "#e5e7eb", "#111827", "#be185d"],
  liquor: ["#14532d", "#3f2a14", "#7c2d12", "#1f2937", "#d97706", "#e5e7eb"],
  toys: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#facc15"],
  jewellery: ["#d4af37", "#e5e4e2", "#b76e79", "#1f2937", "#f8f4e3"],
  eyewear: ["#111827", "#7c2d12", "#b45309", "#d4af37", "#9ca3af"],
  bakery: ["#d4a373", "#faedcd", "#bc6c25", "#e9c46a", "#f4a261", "#6f4518"],
};

// deterministic RNG so a fixture always dresses the same way
function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

type Item = { w: number; h: number; d: number; put: (p: Parts, x: number, y: number, z: number) => void };
const tag = { role: "product" };

function carton(w: number, h: number, d: number, c: string, band = "#ffffff"): Item {
  return { w, h, d, put: (p, x, y, z) => {
    p.box("product", x, y, z, w, h, d, { color: c, tag });
    p.box("product", x + w * 0.1, y + h * 0.35, z + d + 0.05, w * 0.8, h * 0.3, 0.15, { color: band, tag });
  } };
}
function bottle(r: number, h: number, c: string, cap = "#1f2937", label = "#ffffff"): Item {
  return { w: r * 2, h, d: r * 2, put: (p, x, y, z) => {
    const cx = x + r, cz = z + r;
    p.cyl("product", [cx, y + h * 0.36, cz], r, h * 0.72, "y", { color: c, tag });
    p.cyl("product", [cx, y + h * 0.36, cz], r * 1.02, h * 0.3, "y", { color: label, tag });
    p.cyl("product", [cx, y + h * 0.8, cz], r * 0.45, h * 0.16, "y", { color: c, tag });
    p.cyl("product", [cx, y + h * 0.94, cz], r * 0.5, h * 0.12, "y", { color: cap, tag });
  } };
}
function jar(r: number, h: number, c: string, lid: string): Item {
  return { w: r * 2, h, d: r * 2, put: (p, x, y, z) => {
    p.cyl("product", [x + r, y + h * 0.42, z + r], r, h * 0.84, "y", { color: c, tag });
    p.cyl("product", [x + r, y + h * 0.92, z + r], r * 1.04, h * 0.16, "y", { color: lid, tag });
  } };
}
function casserole(r: number, h: number, c: string): Item {
  return { w: r * 2 + 4, h: h + 3, d: r * 2, put: (p, x, y, z) => {
    const cx = x + r + 2, cz = z + r;
    p.cyl("product", [cx, y + h * 0.4, cz], r, h * 0.8, "y", { color: c, tag });
    p.cyl("product", [cx, y + h * 0.88, cz], r * 0.96, h * 0.16, "y", { color: "#f8f4ec", tag });
    p.sphere("product", [cx, y + h + 0.6, cz], Math.max(1, r * 0.14), { color: "#d4af37", tag });
    for (const s of [-1, 1]) p.box("product", cx + s * (r + 1) - 1, y + h * 0.6, cz - 1.5, 2, 1.4, 3, { color: "#d4af37", tag });
  } };
}
function stack(w: number, n: number, d: number, c: string): Item {
  return { w, h: n * 3.2, d, put: (p, x, y, z) => {
    for (let k = 0; k < n; k++) p.box("product", x + (k % 2) * 0.4, y + k * 3.2, z, w - 0.4, 3.0, d, { color: k % 3 === 2 ? shade(c, 0.9) : c, tag });
  } };
}
function shoe(c: string): Item {
  return { w: 22, h: 11, d: 28, put: (p, x, y, z) => {
    for (const sx of [0, 11]) {
      p.box("product", x + sx, y, z, 10, 2.2, 27, { color: "#f3f4f6", tag });
      p.box("product", x + sx + 0.5, y + 2.2, z, 9, 8, 15, { color: c, tag });
      p.box("product", x + sx + 0.5, y + 2.2, z + 15, 9, 4.5, 11, { color: c, tag });
    }
  } };
}
function book(c: string, h: number, t: number): Item { return { w: t, h, d: 16, put: (p, x, y, z) => p.box("product", x, y, z, t, h, 16, { color: c, tag }) }; }
function wine(c: string): Item {
  return { w: 7.6, h: 31, d: 7.6, put: (p, x, y, z) => {
    p.cyl("product", [x + 3.8, y + 11, z + 3.8], 3.8, 22, "y", { color: c, tag });
    p.cyl("product", [x + 3.8, y + 11, z + 3.8], 3.9, 8, "y", { color: "#f5ebe0", tag });
    p.cyl("product", [x + 3.8, y + 25, z + 3.8], 1.3, 8, "y", { color: c, tag });
    p.cyl("product", [x + 3.8, y + 29.5, z + 3.8], 1.4, 3, "y", { color: "#a3171d", tag });
  } };
}
function device(c: string): Item {
  return { w: 18, h: 2, d: 26, put: (p, x, y, z) => {
    p.box("product", x, y, z, 18, 1.2, 24, { color: "#d1d5db", tag });
    p.box("screen", x + 0.5, y + 1.2, z + 1, 17, 11, 0.6, { rot: { axis: "x", angle: -1.25, pivot: [x, y + 1.2, z + 1.4] }, tag });
    void c;
  } };
}
function bust(): Item {
  return { w: 12, h: 18, d: 10, put: (p, x, y, z) => {
    p.box("product", x + 2, y, z + 1, 8, 2, 8, { color: "#1f2937", tag });
    p.box("product", x + 3, y + 2, z + 3, 6, 9, 4, { color: "#1f2937", tag });
    p.box("product", x, y + 11, z + 3, 12, 6, 4, { color: "#1f2937", tag });
    p.wire("product", [[x + 3, y + 12, z + 7.2], [x + 6, y + 8.5, z + 7.4], [x + 9, y + 12, z + 7.2]], 0.35, { color: "#d4af37", tag });
    p.sphere("product", [x + 6, y + 8.2, z + 7.6], 0.9, { color: "#9be7ff", tag });
  } };
}
function glasses(c: string): Item {
  return { w: 15, h: 5, d: 14, put: (p, x, y, z) => {
    for (const sx of [3.6, 11.4]) p.ring("product", [x + sx, y + 2.6, z + 12], 3.2, 0.35, { color: c, tag });
    p.box("product", x + 0.5, y + 2.2, z, 0.6, 0.8, 12, { color: c, tag }); p.box("product", x + 14, y + 2.2, z, 0.6, 0.8, 12, { color: c, tag });
  } };
}
function bun(c: string): Item { return { w: 9, h: 5, d: 9, put: (p, x, y, z) => p.sphere("product", [x + 4.5, y + 3, z + 4.5], 4.4, { color: c, tag }) }; }

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16), r = Math.min(255, ((n >> 16) & 255) * k), g = Math.min(255, ((n >> 8) & 255) * k), b = Math.min(255, (n & 255) * k);
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1)}`;
}

// One shelf product for a vertical, sized to the available clearance.
function pick(v: Vertical, R: () => number, clear: number, depth: number): Item {
  const pal = PAL[v] ?? PAL.grocery, c = pal[Math.floor(R() * pal.length)];
  const h = (lo: number, hi: number) => Math.max(4, Math.min(clear - 1, lo + R() * (hi - lo)));
  switch (v) {
    case "apparel": return stack(26, Math.max(2, Math.min(7, Math.floor((clear - 2) / 3.2))), Math.min(depth - 2, 30), c);
    case "footwear": return shoe(c);
    case "books": return book(c, h(18, 26), 2 + R() * 3);
    case "liquor": return wine(c);
    case "electronics": return R() < 0.4 ? device(c) : carton(14 + R() * 10, h(8, 22), Math.min(depth - 2, 12), c, "#e5e7eb");
    case "home": return R() < 0.55 ? casserole(7 + R() * 6, h(8, 14), c) : jar(5 + R() * 3, h(12, 22), "#eef2f3", pal[Math.floor(R() * pal.length)]);
    case "beauty": return R() < 0.5 ? bottle(2.2 + R() * 1.6, h(10, 18), c, "#d4af37", "#ffffff") : jar(3.5, h(5, 8), c, "#d4af37");
    case "pharmacy": return carton(8 + R() * 6, h(10, 16), Math.min(depth - 2, 6), c, "#0ea5e9");
    case "jewellery": return R() < 0.4 ? bust() : carton(8, 4, 8, "#1f2937", "#d4af37");
    case "eyewear": return glasses(c);
    case "toys": return carton(12 + R() * 14, h(12, 30), Math.min(depth - 2, 14), c, "#fff3b0");
    case "bakery": return bun(c);
    default: { const r = R(); return r < 0.45 ? carton(8 + R() * 12, h(12, 28), Math.min(depth - 2, 10), c) : r < 0.75 ? bottle(3 + R() * 2, h(18, 30), c) : jar(4, h(9, 14), c, "#e5e7eb"); }
  }
}

function hangGarment(p: Parts, at: Vec3, spine: boolean, len: number, c: string, rotY = 0) {
  const [x, y, z] = at;
  const w = spine ? 3 : 42, d = spine ? 40 : 3;
  const rot = rotY ? { axis: "y" as const, angle: rotY, pivot: [x, y, z] as Vec3 } : undefined;
  p.wire("metal", [[x, y + 1.6, z], [x, y - 3.5, z]], 0.2, { tag });
  p.box("product", x - w / 2, y - 4 - len, z - d / 2, w, len, d, { color: c, rot, tag });
  if (!spine) for (const s of [-1, 1]) p.box("product", x + s * 22 - (s < 0 ? 6 : 0), y - 4 - len * 0.55, z - 1.3, 6, len * 0.48, 2.6, { color: shade(c, 0.92), tag });
}

export function dress(surfaces: Surface[], v: Vertical, seed = 7): Parts {
  const p = new Parts();
  if (v === "none") return p;
  const R = rng(seed);
  const pal = PAL[v] ?? PAL.apparel;
  for (const s of surfaces) {
    if (s.kind === "shelf") {
      if (s.h < 4 || s.w < 4) continue;
      const rows = s.d > 30 && v !== "footwear" && v !== "apparel" ? 2 : 1;
      for (let row = 0; row < rows; row++) {
        let x = s.x + 1;
        let guard = 0;
        while (guard++ < 80) {
          const it = pick(v, R, s.h, s.d / rows);
          if (x + it.w > s.x + s.w - 0.5) break;
          if (it.d > s.d) break;
          const facings = it.w < 10 ? 1 + Math.floor(R() * 3) : 1;
          for (let f = 0; f < facings && x + it.w <= s.x + s.w - 0.5; f++) {
            const zf = s.z + s.d - it.d - 0.8 - row * (s.d / rows);
            const drop = s.slope ? Math.tan(s.slope) * (zf + it.d / 2 - s.z) : 0;
            it.put(p, x, s.y - drop, zf);
            x += it.w + 0.6;
          }
          x += 0.8;
        }
      }
    } else if (s.kind === "rail") {
      const n = Math.floor(s.w / 4.2);
      const len = Math.max(20, Math.min(s.h, 95));
      for (let i = 0; i < n; i++) hangGarment(p, [s.x + 2 + i * 4.2, s.y, s.z], true, len - (i % 3) * 4, pal[Math.floor(i / 3) % pal.length]);
    } else if (s.kind === "arm") {
      const [dx, , dz] = s.dir ?? [0, 0, 1];
      const len = Math.max(20, Math.min(s.h, 85));
      const faceOn = Math.abs(dz) > 0.7;               // arm points at the viewer → garments face out
      const n = Math.max(1, Math.min(7, Math.floor(s.w / (faceOn ? 5 : 4.2))));
      const c = pal[Math.floor(R() * pal.length)];
      for (let i = n - 1; i >= 0; i--) {
        const u = (i + 0.8) / (n + 0.5), drop = s.slope ? Math.sin(s.slope) * s.w * u : 0;
        const at: Vec3 = [s.x + dx * s.w * u, s.y - drop + 1, s.z + dz * s.w * u];
        if (faceOn) hangGarment(p, at, false, len, i === 0 ? c : shade(c, 0.94 + (i % 2) * 0.05));
        else hangGarment(p, at, true, len, c);
      }
    } else if (s.kind === "peg") {
      const [dx, , dz] = s.dir ?? [0, 0, 1];
      const c = pal[Math.floor(R() * pal.length)];
      const n = Math.max(1, Math.floor(s.w / 3.5));
      for (let i = n - 1; i >= 0; i--) {
        const u = (i + 1) / (n + 0.4), at: Vec3 = [s.x + dx * s.w * u, s.y, s.z + dz * s.w * u];
        const w = Math.abs(dz) > 0.7 ? 10 : 1.4, d = Math.abs(dz) > 0.7 ? 1.4 : 10;
        p.box("product", at[0] - w / 2, at[1] - 15, at[2] - d / 2, w, 15, d, { color: c, tag });
        p.box("product", at[0] - w / 2 + 0.3, at[1] - 3, at[2] + (Math.abs(dz) > 0.7 ? d / 2 : 0), Math.max(1, w - 0.6), 1.8, 0.2, { color: "#ffffff", tag });
      }
    } else if (s.kind === "ring") {
      const n = Math.floor((Math.PI * 2 * (s.radius ?? 40)) / 4.6);
      const len = Math.max(30, Math.min(s.h, 90));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        hangGarment(p, [s.x + Math.cos(a) * (s.radius ?? 40), s.y, s.z + Math.sin(a) * (s.radius ?? 40)], true, len, pal[Math.floor(i / 4) % pal.length], -a);
      }
    } else if (s.kind === "bulk") {
      const c = pal[Math.floor(R() * pal.length)];
      const rr = v === "toys" ? 3.5 : v === "bakery" ? 4 : 3;
      const fill = Math.max(4, s.h * 0.7);
      for (let i = 0; i < Math.min(220, (s.w * s.d) / (rr * rr * 1.6)); i++) {
        let x = s.x + rr + R() * (s.w - 2 * rr), z = s.z + rr + R() * (s.d - 2 * rr);
        if (s.radius) {                                // round bin: keep product inside the circle
          const cx = s.x + s.w / 2, cz = s.z + s.d / 2, a = R() * Math.PI * 2, r = Math.sqrt(R()) * (s.radius - rr);
          x = cx + Math.cos(a) * r; z = cz + Math.sin(a) * r;
        }
        const y = s.y + rr + R() * fill * (0.4 + 0.6 * R()) - (s.slope ? Math.tan(s.slope) * (z - s.z) : 0);
        p.sphere("product", [x, Math.max(s.y + rr, y), z], rr * (0.8 + R() * 0.4), { color: R() < 0.6 ? c : pal[Math.floor(R() * pal.length)], tag });
      }
    } else if (s.kind === "tube") {
      const c = pal[Math.floor(R() * pal.length)];
      p.cyl("product", [s.x, s.y + (s.h * 0.7) / 2, s.z], s.w * 0.95, s.h * 0.7, "y", { color: c, tag });
    }
  }
  return p;
}
