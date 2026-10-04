// 2D projections (front elevation / top plan / side elevation) of the shared
// part list, as SVG in centimetres. Painter's order by depth, shaded materials
// (gradient overlays give volume), real patterns, dimension lines.
import { boxCorners, partBounds, bounds, inkOn, type Part, type Theme, type Vec3, type MatId } from "./model.ts";

export type View2D = "front" | "top" | "side";

const PROJ: Record<View2D, (v: Vec3) => [number, number]> = {
  front: (v) => [v[0], -v[1]],
  top: (v) => [v[0], v[2]],
  side: (v) => [v[2], -v[1]],
};
// depth toward the viewer: larger = drawn later (nearer)
const DEPTH: Record<View2D, (p: Part) => number> = {
  front: (p) => { const [a, b] = partBounds(p); return b[2] * 1.0 + a[2] * 0.001; },
  top: (p) => { const [a, b] = partBounds(p); return b[1] + a[1] * 0.001; },
  side: (p) => { const [a, b] = partBounds(p); return -a[0] - b[0] * 0.001; },
};
const VIEW_AXIS: Record<View2D, "x" | "y" | "z"> = { front: "z", top: "y", side: "x" };

const f = (n: number) => +n.toFixed(2);
let seq = 0;

function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [], up: [number, number][] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function darken(hex: string, k: number) {
  if (!hex.startsWith("#")) return "#444";
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
}

function patternTile(kind: string, pitch: number, bg: string, fg: string, sw: number): [number, number, string] {
  const p = pitch, bgr = bg === "transparent" ? "" : `<rect width="${f(p)}" height="${f(p)}" fill="${bg}"/>`;
  switch (kind) {
    case "peg": return [p, p, `${bgr}<circle cx="${f(p / 2)}" cy="${f(p / 2)}" r="${f(p * 0.15)}" fill="${fg}"/>`];
    case "perf": return [p, p, `${bgr}<circle cx="${f(p / 2)}" cy="${f(p / 2)}" r="${f(p * 0.22)}" fill="${fg}"/>`];
    case "slat": return [p, p, `${bgr}<rect y="${f(p * 0.42)}" width="${f(p)}" height="${f(p * 0.2)}" fill="${fg}"/><rect y="${f(p * 0.62)}" width="${f(p)}" height="${f(p * 0.07)}" fill="#ffffff" opacity="0.5"/>`];
    case "grid": case "mesh": return [p, p, `${bgr}<path d="M0 0H${f(p)}M0 0V${f(p)}" stroke="${fg}" stroke-width="${f(Math.max(sw, p * 0.06))}"/>`];
    case "woodslat": return [p, p, `${bgr}<rect x="${f(p * 0.86)}" width="${f(p * 0.14)}" height="${f(p)}" fill="${fg}" opacity="0.55"/>`];
    case "slot": return [p, p, `${bgr}<rect x="${f(p * 0.38)}" y="${f(p * 0.2)}" width="${f(p * 0.24)}" height="${f(p * 0.5)}" rx="${f(p * 0.1)}" fill="${fg}"/>`];
    default: return [p, p, bgr];
  }
}

export interface Render2DOptions { selected?: string | null; dims?: boolean; pad?: number; shadow?: boolean }

export function render2D(parts: Part[], theme: Theme, view: View2D, opt: Render2DOptions = {}): string {
  const ns = `v${++seq}`;
  const P = PROJ[view];
  const fixtureParts = parts.filter((p) => p.tag?.role !== "product");
  const B = bounds(fixtureParts.length ? fixtureParts : parts);
  const all = bounds(parts);
  const corners: Vec3[] = [all.min, all.max];
  const pp = corners.map(P);
  let minU = Math.min(pp[0][0], pp[1][0]), maxU = Math.max(pp[0][0], pp[1][0]);
  let minV = Math.min(pp[0][1], pp[1][1]), maxV = Math.max(pp[0][1], pp[1][1]);
  const span = Math.max(maxU - minU, maxV - minV, 1);
  const sw = span / 700;
  const defs: string[] = [];
  const out: string[] = [];

  // shared shading overlays: give every flat fill volume without per-part logic
  defs.push(`<linearGradient id="${ns}-shV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.16"/></linearGradient>`);
  defs.push(`<linearGradient id="${ns}-shH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.18"/><stop offset="0.35" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></linearGradient>`);
  defs.push(`<linearGradient id="${ns}-shBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.15"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.65" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>`);
  defs.push(`<linearGradient id="${ns}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.05"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.25"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.02"/><stop offset="1" stop-color="#fff" stop-opacity="0.12"/></linearGradient>`);
  defs.push(`<radialGradient id="${ns}-sph" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.6"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient>`);
  defs.push(`<radialGradient id="${ns}-floor"><stop offset="0" stop-color="#000" stop-opacity="0.22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`);
  defs.push(`<filter id="${ns}-glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${f(span / 220)}"/></filter>`);
  defs.push(`<filter id="${ns}-ds" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="${f(span / 500)}" dy="${f(span / 350)}" stdDeviation="${f(span / 400)}" flood-color="#000" flood-opacity="0.18"/></filter>`);

  const patCache = new Map<string, string>();
  const patFill = (part: Part): string | null => {
    if (!part.pattern) return null;
    if (view !== "front" && !(view === "top" && part.pattern.kind === "mesh")) return null;
    const ms = theme.mats[part.mat];
    const key = `${part.pattern.kind}-${part.pattern.pitch}-${part.mat}`;
    if (!patCache.has(key)) {
      const id = `${ns}-pat${patCache.size}`;
      const bg = part.mat === "gridwall" || part.pattern.kind === "mesh" ? "transparent" : (part.color ?? ms.color);
      const fg = ms.patternColor ?? darken(ms.color, 0.55);
      const [w, h, body] = patternTile(part.pattern.kind, part.pattern.pitch, bg, fg, sw);
      // anchor patterns at the world origin so adjacent panels line up
      defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${f(w)}" height="${f(h)}">${body}</pattern>`);
      patCache.set(key, id);
    }
    return `url(#${patCache.get(key)})`;
  };

  // floor shadow
  if (view !== "top" && opt.shadow !== false) {
    const cx = (P(B.min)[0] + P(B.max)[0]) / 2, w = Math.abs(P(B.max)[0] - P(B.min)[0]);
    out.push(`<ellipse cx="${f(cx)}" cy="0" rx="${f(w * 0.56)}" ry="${f(span * 0.018)}" fill="url(#${ns}-floor)"/>`);
    out.push(`<line x1="${f(minU - span * 0.04)}" y1="0" x2="${f(maxU + span * 0.04)}" y2="0" stroke="#d6d2ca" stroke-width="${f(sw * 1.2)}"/>`);
  }

  const sorted = [...parts].sort((a, b) => DEPTH[view](a) - DEPTH[view](b));
  for (const part of sorted) {
    const ms = theme.mats[part.mat as MatId];
    let color = part.color ?? ms.color;
    const transparent = color === "transparent";
    if (transparent) color = "none";
    const op = ms.opacity != null ? ` fill-opacity="${ms.opacity}"` : "";
    const stroke = transparent ? "none" : darken(part.color ?? ms.color, 0.72);
    const sel = opt.selected && part.tag?.path === opt.selected;
    const data = ` data-id="${part.id}"${part.tag?.drag ? ' class="drag"' : ""}`;
    const selStroke = sel ? ` stroke="#2563eb" stroke-width="${f(sw * 3)}"` : ` stroke="${stroke}" stroke-width="${f(sw * 0.7)}"`;
    const isLight = part.mat === "light";

    if (part.shape === "box") {
      const pts = hull(boxCorners(part).map(P));
      const d = `M${pts.map((q) => `${f(q[0])} ${f(q[1])}`).join("L")}Z`;
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      const pf = patFill(part);
      if (isLight) out.push(`<path d="${d}" fill="${ms.emissive ?? color}" filter="url(#${ns}-glow)" opacity="0.9"/>`);
      out.push(`<path${data} d="${d}" fill="${pf && !pf.includes("transparent") && part.mat !== "gridwall" && part.pattern?.kind !== "mesh" ? pf : color}"${op}${selStroke}/>`);
      if (pf && (part.mat === "gridwall" || part.pattern?.kind === "mesh")) out.push(`<path d="${d}" fill="${pf}" pointer-events="none"/>`);
      if (part.mat === "glass" || part.mat === "acrylic" || part.mat === "mirror") out.push(`<path d="${d}" fill="url(#${ns}-glass)" pointer-events="none"/>`);
      else if (!transparent) {
        const metalish = (ms.metal ?? 0) > 0.5;
        const shade = metalish ? (bw > bh ? "shBar" : "shH") : "shV";
        out.push(`<path d="${d}" fill="url(#${ns}-${shade})" pointer-events="none"/>`);
      }
      if (part.tag?.label && view === "front" && bh > 2) {
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const size = Math.min(bh * 0.5, (bw / Math.max(3, part.tag.label.length)) * 1.5);
        out.push(`<text x="${f(cx)}" y="${f(cy)}" font-size="${f(size)}" fill="${inkOn(part.color ?? ms.color)}" text-anchor="middle" dominant-baseline="central" font-family="Inter,Helvetica,Arial,sans-serif" font-weight="700" letter-spacing="${f(size * 0.06)}" pointer-events="none">${part.tag.label}</text>`);
      }
    } else if (part.shape === "cyl") {
      const [a, b] = partBounds(part);
      if (part.axis === VIEW_AXIS[view]) {
        const c = P(part.center);
        out.push(`<circle${data} cx="${f(c[0])}" cy="${f(c[1])}" r="${f(part.radius)}" fill="${color}"${op}${selStroke}/>`);
        out.push(`<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(part.radius)}" fill="url(#${ns}-sph)" pointer-events="none" opacity="0.6"/>`);
      } else {
        const p1 = P(a), p2 = P(b);
        const x = Math.min(p1[0], p2[0]), y = Math.min(p1[1], p2[1]), w = Math.abs(p2[0] - p1[0]), h = Math.abs(p2[1] - p1[1]);
        const along = PROJ[view](part.axis === "x" ? [1, 0, 0] : part.axis === "y" ? [0, 1, 0] : [0, 0, 1]);
        const vertical = Math.abs(along[1]) > Math.abs(along[0]);
        const rx = Math.min(w, h) * 0.12;
        out.push(`<rect${data} x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${color}"${op}${selStroke}/>`);
        out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="url(#${ns}-${vertical ? "shH" : "shBar"})" pointer-events="none"/>`);
        if (part.mat === "glass" || part.mat === "acrylic") out.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${ns}-glass)" pointer-events="none"/>`);
      }
    } else if (part.shape === "sphere") {
      const c = P(part.center);
      out.push(`<circle${data} cx="${f(c[0])}" cy="${f(c[1])}" r="${f(part.radius)}" fill="${color}"${op} stroke="${stroke}" stroke-width="${f(sw * 0.4)}"/>`);
      out.push(`<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(part.radius)}" fill="url(#${ns}-sph)" pointer-events="none"/>`);
    } else if (part.shape === "wire") {
      const d = part.points.map((q, i) => { const [u, v] = P(q); return `${i ? "L" : "M"}${f(u)} ${f(v)}`; }).join("");
      const r2 = Math.max(part.radius * 2, sw * 1.2);
      out.push(`<path${data} d="${d}" fill="none" stroke="${sel ? "#2563eb" : darken(color === "none" ? "#888888" : color, 0.75)}" stroke-width="${f(r2 + sw * 0.8)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(r2)}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`);
      out.push(`<path d="${d}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="${f(r2 * 0.3)}" stroke-linecap="round" pointer-events="none" transform="translate(${f(-r2 * 0.12)} ${f(-r2 * 0.18)})"/>`);
    } else if (part.shape === "ring") {
      const c = P(part.center);
      if (view === "top") out.push(`<circle${data} cx="${f(c[0])}" cy="${f(c[1])}" r="${f(part.radius)}" fill="none" stroke="${color}" stroke-width="${f(part.tube * 2)}"/>`);
      else {
        out.push(`<ellipse${data} cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(part.radius)}" ry="${f(part.radius * 0.1)}" fill="none" stroke="${darken(color, 0.75)}" stroke-width="${f(part.tube * 2 + sw)}"/>`);
        out.push(`<ellipse cx="${f(c[0])}" cy="${f(c[1])}" rx="${f(part.radius)}" ry="${f(part.radius * 0.1)}" fill="none" stroke="${color}" stroke-width="${f(part.tube * 2)}" pointer-events="none"/>`);
      }
    }
  }

  // dimension lines (overall W × H, or W × D in plan)
  if (opt.dims !== false) {
    const lo = P(B.min), hi = P(B.max);
    const x0 = Math.min(lo[0], hi[0]), x1 = Math.max(lo[0], hi[0]), y0 = Math.min(lo[1], hi[1]), y1 = Math.max(lo[1], hi[1]);
    const off = span * 0.05, ts = span * 0.022, col = "#64748b";
    const dimH = (y: number, label: string) => out.push(
      `<g stroke="${col}" stroke-width="${f(sw)}"><line x1="${f(x0)}" y1="${f(y)}" x2="${f(x1)}" y2="${f(y)}"/><line x1="${f(x0)}" y1="${f(y - ts * 0.4)}" x2="${f(x0)}" y2="${f(y + ts * 0.4)}"/><line x1="${f(x1)}" y1="${f(y - ts * 0.4)}" x2="${f(x1)}" y2="${f(y + ts * 0.4)}"/></g>` +
      `<text x="${f((x0 + x1) / 2)}" y="${f(y + ts * 1.1)}" font-size="${f(ts)}" fill="${col}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif">${label}</text>`);
    const dimV = (x: number, label: string) => out.push(
      `<g stroke="${col}" stroke-width="${f(sw)}"><line x1="${f(x)}" y1="${f(y0)}" x2="${f(x)}" y2="${f(y1)}"/><line x1="${f(x - ts * 0.4)}" y1="${f(y0)}" x2="${f(x + ts * 0.4)}" y2="${f(y0)}"/><line x1="${f(x - ts * 0.4)}" y1="${f(y1)}" x2="${f(x + ts * 0.4)}" y2="${f(y1)}"/></g>` +
      `<text x="${f(x - ts * 0.6)}" y="${f((y0 + y1) / 2)}" font-size="${f(ts)}" fill="${col}" text-anchor="middle" font-family="Inter,Helvetica,Arial,sans-serif" transform="rotate(-90 ${f(x - ts * 0.6)} ${f((y0 + y1) / 2)})">${label}</text>`);
    const r = (n: number) => `${Math.round(n)} cm`;
    if (view === "front") { dimH(y1 + off, r(B.size[0])); dimV(x0 - off, r(B.size[1])); }
    if (view === "top") { dimH(y1 + off, r(B.size[0])); dimV(x0 - off, r(B.size[2])); }
    if (view === "side") { dimH(y1 + off, r(B.size[2])); dimV(x0 - off, r(B.size[1])); }
    minU -= off * 2.4; maxV += off * 2.2;
  }
  const pad = opt.pad ?? span * 0.04;
  const vb = `${f(minU - pad)} ${f(minV - pad)} ${f(maxU - minU + pad * 2)} ${f(maxV - minV + pad * 2)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet"><defs>${defs.join("")}</defs><g filter="url(#${ns}-ds)">${out.join("")}</g></svg>`;
}
