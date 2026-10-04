import { CATALOG, type Preset } from "./catalog.ts";
import { buildFixture, type FixtureSpec, type Surface } from "./families.ts";
import { dress, VERTICALS, type Vertical } from "./dress.ts";
import { SCHEMAS, type Field } from "./schema.ts";
import { THEMES, snapTo, bounds, type Part } from "./model.ts";
import { render2D, type View2D } from "./view2d.ts";
import { Viewer3D } from "./view3d.ts";

type View = View2D | "iso" | "3d";
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const qs = new URLSearchParams(location.search);

const state = {
  preset: CATALOG.find((p) => p.id === qs.get("p")) ?? CATALOG.find((p) => p.id === "gondola")!,
  spec: null as unknown as FixtureSpec,
  view: (qs.get("view") as View) || "3d",
  theme: qs.get("theme") || "standard",
  vertical: (qs.get("dress") as Vertical) || ("auto" as any),
  selected: qs.get("sel") as string | null,
  open: new Set<string>(),
  parts: [] as Part[],
  surfaces: [] as Surface[],
};
state.spec = clone(state.preset.spec);

let viewer: Viewer3D | null = null;
const getViewer = () => {
  if (!viewer) {
    viewer = new Viewer3D($("#v3d"));
    viewer.onPick = (id) => select(id ? state.parts.find((p) => p.id === id)?.tag?.path ?? null : null);
    if (qs.get("q") === "low") viewer.quality = false;
  }
  return viewer;
};

const vertical = (): Vertical => (state.vertical === ("auto" as any) ? state.preset.vertical : state.vertical);
function build() {
  const b = buildFixture(state.spec);
  state.surfaces = b.surfaces;
  state.parts = [...b.list, ...dress(b.surfaces, vertical()).list];
}

// ── rendering ────────────────────────────────────────────────────────────────
let refitNext = true;
function render() {
  build();
  const is2D = state.view === "front" || state.view === "top" || state.view === "side";
  $("#v2d").style.display = is2D ? "block" : "none";
  $("#v3d").style.display = is2D ? "none" : "block";
  const theme = THEMES[state.theme];
  if (is2D) $("#v2d").innerHTML = render2D(state.parts, theme, state.view as View2D, { selected: state.selected });
  else {
    const v = getViewer();
    if (v.mode !== state.view) { v.setMode(state.view as "3d" | "iso"); refitNext = true; }
    v.setParts(state.parts, theme, { refit: refitNext, selected: state.selected });
    refitNext = false;
  }
  renderMetrics();
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === state.view));
  $("#json").textContent = JSON.stringify(state.spec, null, 1);
}

function renderMetrics() {
  const fx = state.parts.filter((p) => p.tag?.role !== "product");
  const B = bounds(fx);
  const sh = state.surfaces.filter((s) => s.kind === "shelf");
  const hang = state.surfaces.filter((s) => s.kind === "rail" || s.kind === "arm" || s.kind === "ring");
  const linShelf = sh.reduce((a, s) => a + s.w, 0) / 100;
  const area = sh.reduce((a, s) => a + s.w * s.d, 0) / 10000;
  const linHang = hang.reduce((a, s) => a + (s.kind === "ring" ? 2 * Math.PI * (s.radius ?? 0) : s.w), 0) / 100;
  const pegs = state.surfaces.filter((s) => s.kind === "peg").length;
  const prods = state.parts.length - fx.length;
  $("#metrics").innerHTML = [
    `<b>${Math.round(B.size[0])} × ${Math.round(B.size[1])} × ${Math.round(B.size[2])}</b> cm`,
    sh.length ? `${sh.length} shelf surfaces · ${linShelf.toFixed(1)} m linear · ${area.toFixed(2)} m²` : "",
    linHang ? `${linHang.toFixed(1)} m hanging` : "", pegs ? `${pegs} pegs` : "",
    `${fx.length} parts${prods ? ` + ${prods} sample products` : ""}`,
  ].filter(Boolean).join('<span class="dot">·</span>');
}

// ── catalog (left) with lazy live thumbnails ─────────────────────────────────
function renderCatalog() {
  const q = ($("#search") as HTMLInputElement).value.toLowerCase();
  const groups = new Map<string, Preset[]>();
  for (const p of CATALOG) if (!q || `${p.name} ${p.group} ${p.vertical}`.toLowerCase().includes(q)) (groups.get(p.group) ?? groups.set(p.group, []).get(p.group)!).push(p);
  const el = $("#catalog"); el.innerHTML = "";
  for (const [g, items] of groups) {
    const h = document.createElement("h4"); h.textContent = `${g} · ${items.length}`; el.appendChild(h);
    const grid = document.createElement("div"); grid.className = "cgrid"; el.appendChild(grid);
    for (const p of items) {
      const b = document.createElement("button");
      b.className = "item" + (p.id === state.preset.id ? " on" : "");
      b.innerHTML = `<div class="thumb" data-thumb="${p.id}"></div><span>${p.name}</span>${p.sheet ? '<i title="From eureka_fixtures.xlsx">★</i>' : ""}`;
      b.onclick = () => loadPreset(p);
      grid.appendChild(b);
    }
  }
  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    const div = e.target as HTMLElement, p = CATALOG.find((c) => c.id === div.dataset.thumb)!;
    const b = buildFixture(p.spec);
    div.innerHTML = render2D([...b.list, ...dress(b.surfaces, p.vertical).list], THEMES[state.theme], "front", { dims: false, shadow: false });
    io.unobserve(div);
  }), { root: el, rootMargin: "200px" });
  el.querySelectorAll("[data-thumb]").forEach((d) => io.observe(d));
  $("#count").textContent = `${CATALOG.length} fixtures · ${CATALOG.filter((c) => c.sheet).length} from sheet`;
}

function loadPreset(p: Preset) {
  state.preset = p; state.spec = clone(p.spec); state.selected = null; state.open.clear();
  refitNext = true;
  renderCatalog(); renderForm(); render();
}

// ── properties (right): generated from the family schema ────────────────────
function getAt(obj: any, path: string) { return path ? path.split(".").reduce((o, k) => o?.[k], obj) : obj; }

function renderForm() {
  const host = $("#form");
  const scroll = host.scrollTop;
  host.innerHTML = "";
  $("#ptitle").textContent = state.preset.name;
  $("#pfamily").textContent = `${state.spec.family} family`;
  host.appendChild(fieldsEl(state.spec, SCHEMAS[state.spec.family], ""));
  host.scrollTop = scroll;
  if (state.selected) host.querySelector(`[data-path="${state.selected}"]`)?.scrollIntoView({ block: "nearest" });
}

function fieldsEl(obj: any, fields: Field[], base: string): HTMLElement {
  const wrap = document.createElement("div"); wrap.className = "fields";
  for (const fd of fields) {
    if (!(fd.key in obj)) continue;
    const path = base ? `${base}.${fd.key}` : fd.key;
    if (fd.type === "list") { wrap.appendChild(listEl(obj, fd, path)); continue; }
    const row = document.createElement("label"); row.className = "row";
    row.innerHTML = `<span>${fd.label}</span>`;
    const commit = (v: any, structural = false) => { obj[fd.key] = v; render(); if (structural) renderForm(); };
    if (fd.type === "num") {
      const r = document.createElement("input"); r.type = "range"; r.min = String(fd.min); r.max = String(fd.max); r.step = String(fd.step ?? 1); r.value = obj[fd.key];
      const n = document.createElement("input"); n.type = "number"; n.step = String(fd.step ?? 1); n.value = obj[fd.key];
      r.oninput = () => { n.value = r.value; commit(+r.value); };
      n.onchange = () => { r.value = n.value; commit(+n.value, true); };
      r.onchange = () => renderForm();
      const u = document.createElement("em"); u.textContent = fd.unit ?? "";
      row.append(r, n, u);
    } else if (fd.type === "int") {
      const box = document.createElement("div"); box.className = "step";
      const n = document.createElement("input"); n.type = "number"; n.min = String(fd.min); n.max = String(fd.max); n.value = obj[fd.key];
      const set = (v: number) => { v = Math.max(fd.min, Math.min(fd.max, v)); n.value = String(v); commit(v, true); };
      const m = document.createElement("button"); m.textContent = "−"; m.onclick = (e) => { e.preventDefault(); set(+n.value - 1); };
      const p = document.createElement("button"); p.textContent = "+"; p.onclick = (e) => { e.preventDefault(); set(+n.value + 1); };
      n.onchange = () => set(+n.value);
      box.append(m, n, p); row.appendChild(box);
    } else if (fd.type === "enum") {
      if (fd.options.length <= 4) {
        const seg = document.createElement("div"); seg.className = "seg";
        for (const o of fd.options) {
          const b = document.createElement("button"); b.textContent = o.replace(/_/g, " "); b.className = obj[fd.key] === o ? "on" : "";
          b.onclick = (e) => { e.preventDefault(); commit(o, true); };
          seg.appendChild(b);
        }
        row.appendChild(seg);
      } else {
        const s = document.createElement("select");
        s.innerHTML = fd.options.map((o) => `<option ${o === obj[fd.key] ? "selected" : ""} value="${o}">${o.replace(/_/g, " ")}</option>`).join("");
        s.onchange = () => commit(s.value, true);
        row.appendChild(s);
      }
    } else if (fd.type === "bool") {
      const t = document.createElement("input"); t.type = "checkbox"; t.className = "tog"; t.checked = !!obj[fd.key];
      t.onchange = () => commit(t.checked, true);
      row.appendChild(t);
    } else {
      const t = document.createElement("input"); t.type = "text"; t.value = obj[fd.key] ?? "";
      t.oninput = () => commit(t.value);
      row.appendChild(t);
    }
    wrap.appendChild(row);
  }
  return wrap;
}

function listEl(obj: any, fd: Extract<Field, { type: "list" }>, path: string): HTMLElement {
  const list: any[] = obj[fd.key];
  const sec = document.createElement("section"); sec.className = "list";
  const head = document.createElement("div"); head.className = "lhead";
  head.innerHTML = `<b>${fd.label}</b><span>${list.length}</span>`;
  const add = document.createElement("button"); add.textContent = "+ Add"; add.className = "add";
  add.onclick = () => { list.push(fd.make(list)); state.open.add(`${path}.${list.length - 1}`); render(); renderForm(); };
  head.appendChild(add);
  if (fd.key === "shelves") {
    const ev = document.createElement("button"); ev.textContent = "Even"; ev.title = "Space shelves evenly";
    ev.onclick = () => {
      const s: any = state.spec; const lo = (s.base ?? 0) + (s.casters ? 8 : 0), hi = s.height - (s.canopy ?? 0);
      list.sort((a, b) => a.y - b.y).forEach((sh, i) => (sh.y = Math.round(snapTo(lo + ((hi - lo) * (i + 1)) / (list.length + 1), s.slotPitch))));
      render(); renderForm();
    };
    head.insertBefore(ev, add);
  }
  sec.appendChild(head);
  list.forEach((it, i) => {
    const ipath = `${path}.${i}`;
    const det = document.createElement("details");
    det.dataset.path = ipath;
    det.open = state.open.has(ipath) || !!state.selected?.startsWith(ipath + ".") || state.selected === ipath;
    if (state.selected === ipath) det.classList.add("sel");
    det.ontoggle = () => (det.open ? state.open.add(ipath) : state.open.delete(ipath));
    const sum = document.createElement("summary");
    sum.innerHTML = `<span>${fd.itemLabel(it, i)}</span>`;
    const tools = document.createElement("span"); tools.className = "tools";
    const mk = (label: string, title: string, fn: () => void) => { const b = document.createElement("button"); b.textContent = label; b.title = title; b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fn(); render(); renderForm(); }; tools.appendChild(b); };
    mk("⧉", "Duplicate", () => list.splice(i + 1, 0, clone(it)));
    if (fd.key === "columns") mk("⇉", "Copy these shelves to every column", () => list.forEach((c, k) => k !== i && (c.shelves = clone(it.shelves))));
    if (list.length > (fd.min ?? 0)) mk("✕", "Remove", () => list.splice(i, 1));
    sum.appendChild(tools);
    det.appendChild(sum);
    det.appendChild(fieldsEl(it, fd.item, ipath));
    sec.appendChild(det);
  });
  return sec;
}

function select(path: string | null) {
  state.selected = path;
  if (path) { const parts = path.split("."); for (let k = 2; k <= parts.length; k += 2) state.open.add(parts.slice(0, k).join(".")); }
  render(); renderForm();
}

// ── 2D direct manipulation: drag shelves / rails / arms / attachments ───────
function wire2D() {
  const host = $("#v2d");
  let drag: { part: Part; target: any; x0: number; y0: number; ox: number; oy: number; svg: SVGSVGElement } | null = null;
  const pt = (svg: SVGSVGElement, e: PointerEvent) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM()!.inverse()); };
  host.addEventListener("pointerdown", (e) => {
    const el = (e.target as Element).closest("[data-id]") as SVGElement | null;
    const part = el && state.parts.find((p) => p.id === el.dataset.id);
    const path = part?.tag?.path ?? null;
    if (!part || !path) { select(null); return; }
    state.selected = path;
    if (part.tag?.drag && state.view === "front") {
      const svg = host.querySelector("svg")!; const p = pt(svg, e);
      const target = getAt(state.spec, path);
      drag = { part, target, x0: p.x, y0: p.y, ox: target.x ?? 0, oy: target.y, svg };
      host.setPointerCapture(e.pointerId);
    }
    render(); renderForm();
  });
  host.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = pt(host.querySelector("svg")!, e);
    const snap = drag.part.tag?.snap;
    drag.target.y = +snapTo(drag.oy - (p.y - drag.y0), snap).toFixed(2);
    if (drag.part.tag?.drag === "xy") drag.target.x = +snapTo(drag.ox + (p.x - drag.x0), snap && snap < 5 ? snap : 1).toFixed(1);
    render();
    $("#hint").textContent = `${drag.part.tag?.role} → y ${drag.target.y} cm${drag.part.tag?.drag === "xy" ? `, x ${drag.target.x} cm` : ""}${snap ? ` · snaps to ${snap} cm` : ""}`;
  });
  host.addEventListener("pointerup", () => { if (drag) { drag = null; renderForm(); } });
}

// ── chrome ───────────────────────────────────────────────────────────────────
function wireChrome() {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) => (b.onclick = () => { state.view = b.dataset.view as View; render(); }));
  const th = $("#theme") as HTMLSelectElement;
  th.innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}" ${k === state.theme ? "selected" : ""}>${t.name}</option>`).join("");
  th.onchange = () => { state.theme = th.value; render(); renderCatalog(); };
  const dr = $("#dress") as HTMLSelectElement;
  dr.innerHTML = `<option value="auto">Dress: auto</option>` + VERTICALS.map((v) => `<option value="${v}" ${v === state.vertical ? "selected" : ""}>Dress: ${v}</option>`).join("");
  dr.onchange = () => { state.vertical = dr.value as any; render(); };
  ($("#search") as HTMLInputElement).oninput = () => renderCatalog();
  $("#fit").onclick = () => { refitNext = true; render(); };
  $("#reset").onclick = () => loadPreset(state.preset);
  const dl = (name: string, href: string) => { const a = document.createElement("a"); a.download = name; a.href = href; a.click(); };
  $("#exp-svg").onclick = () => {
    const v = (["front", "top", "side"].includes(state.view) ? state.view : "front") as View2D;
    dl(`${state.preset.id}-${v}.svg`, URL.createObjectURL(new Blob([render2D(state.parts, THEMES[state.theme], v)], { type: "image/svg+xml" })));
  };
  $("#exp-png").onclick = () => { if (state.view === "3d" || state.view === "iso") dl(`${state.preset.id}-${state.view}.png`, getViewer().png()); };
  $("#exp-json").onclick = () => dl(`${state.preset.id}.json`, URL.createObjectURL(new Blob([JSON.stringify(state.spec, null, 2)], { type: "application/json" })));
  $("#apply-json").onclick = () => { try { state.spec = JSON.parse($("#json").textContent!); render(); renderForm(); } catch (e) { alert(String(e)); } };
}

// ── contact sheet mode (?sheet=front|iso|3d) for reviewing the whole library ─
async function sheetMode(kind: string) {
  document.body.className = "sheet";
  const ids = qs.get("ids")?.split(",");
  const list = ids ? CATALOG.filter((p) => ids.includes(p.id)) : CATALOG;
  const grid = document.createElement("div"); grid.className = "sgrid"; document.body.innerHTML = ""; document.body.appendChild(grid);
  const theme = THEMES[state.theme];
  if (kind === "front" || kind === "top" || kind === "side") {
    for (const p of list) {
      const b = buildFixture(p.spec);
      grid.insertAdjacentHTML("beforeend", `<figure>${render2D([...b.list, ...dress(b.surfaces, p.vertical).list], theme, kind as View2D, { dims: false })}<figcaption>${p.sheet ? "★ " : ""}${p.name}</figcaption></figure>`);
    }
  } else {
    const host = document.createElement("div"); host.style.cssText = "position:fixed;left:-9999px;width:480px;height:480px"; document.body.appendChild(host);
    const v = new Viewer3D(host); v.setMode(kind as any); v.quality = qs.get("q") !== "low";
    for (const p of list) {
      const b = buildFixture(p.spec);
      v.setParts([...b.list, ...dress(b.surfaces, p.vertical).list], theme, { refit: true });
      grid.insertAdjacentHTML("beforeend", `<figure><img src="${v.png()}"><figcaption>${p.sheet ? "★ " : ""}${p.name}</figcaption></figure>`);
    }
  }
  document.title = "done";
}

if (qs.get("sheet")) sheetMode(qs.get("sheet")!);
else {
  wireChrome(); wire2D(); renderCatalog(); renderForm(); render();
  if (state.selected) select(state.selected);
}
