// Fixture catalog. ★ = from eureka_fixtures.xlsx; the rest extend coverage to
// every vertical. Each entry is a preset of a family — edit any number, add a
// shelf, change partitions; no artwork is involved anywhere.
import { evenShelves, shelf, arm, att, type FixtureSpec, type ShelvingSpec, type RackSpec, type TableSpec, type WallSpec, type BinSpec, type HardwareSpec, type Column } from "./families.ts";
import type { Vertical } from "./dress.ts";

export interface Preset { id: string; name: string; group: string; sheet?: boolean; vertical: Vertical; spec: FixtureSpec }

const shelving = (o: Partial<ShelvingSpec>): ShelvingSpec => ({
  family: "shelving", width: 120, height: 180, depth: 45, sided: "single", frame: "uprights", finish: "board",
  back: "pegboard", base: 12, header: 0, headerText: "", topCap: false, canopy: 0, doors: "none", casters: false, slotPitch: 2.5, pegRows: [],
  columns: [{ shelves: evenShelves(4, 12, 180) }], ...o,
});
const cols = (n: number, shelves: () => ReturnType<typeof evenShelves>): Column[] => Array.from({ length: n }, () => ({ shelves: shelves() }));
const rack = (o: Partial<RackSpec>): RackSpec => ({
  family: "rack", base: "cross", poles: 1, width: 0, depth: 50, height: 150, arms: [], rails: [], ring: 0, ringY: 120, topShelf: false, header: 0, headerText: "", ...o,
});
const table = (o: Partial<TableSpec>): TableSpec => ({
  family: "table", shape: "rect", width: 150, depth: 75, height: 76, tiers: 1, tierStep: 26, tierInset: 0.22, base: "legs", finish: "wood",
  top: "flat", caseHeight: 30, caseShelves: 1, drawers: 0, shelfBelow: false, light: false, ...o,
});
const wall = (o: Partial<WallSpec>): WallSpec => ({ family: "wall", width: 120, height: 240, type: "slatwall", pitch: 7.62, base: 10, header: 0, headerText: "", attachments: [], ...o });
const bin = (o: Partial<BinSpec>): BinSpec => ({ family: "bin", style: "wire", shape: "rect", width: 60, depth: 60, height: 80, legs: 8, casters: false, dividers: 0, count: 4, finish: "board", ...o });
const hw = (o: Partial<HardwareSpec>): HardwareSpec => ({ family: "hardware", kind: "single_hook", length: 20, width: 40, height: 10, count: 3, mount: "slatwall", style: "standard", orientation: "face", ...o });

export const CATALOG: Preset[] = [
  // ── Wall systems ──────────────────────────────────────────────────────────
  { id: "slatwall", name: "Slatwall Panel", group: "Wall systems", sheet: true, vertical: "none", spec: wall({ width: 120, height: 120, base: 0 }) },
  { id: "pegboard", name: "Pegboard Panel", group: "Wall systems", sheet: true, vertical: "none", spec: wall({ width: 120, height: 120, base: 0, type: "pegboard", pitch: 2.54 }) },
  { id: "gridwall", name: "Gridwall Panel", group: "Wall systems", sheet: true, vertical: "none", spec: wall({ width: 60, height: 150, base: 0, type: "gridwall", pitch: 7.62 }) },
  { id: "standards", name: "Slotted Wall Standards", group: "Wall systems", sheet: true, vertical: "none", spec: wall({ width: 120, height: 200, base: 0, type: "standards", pitch: 60 }) },
  { id: "perforated", name: "Perforated Metal Panel", group: "Wall systems", vertical: "none", spec: wall({ width: 120, height: 200, type: "perforated", pitch: 1.5 }) },
  { id: "woodslat", name: "Wood Slat Feature Wall", group: "Wall systems", vertical: "none", spec: wall({ width: 120, height: 240, type: "woodslat", pitch: 6, header: 25, headerText: "NEW IN" }) },
  { id: "apparel-bay", name: "Apparel Wall Bay (arms + rail + shelf)", group: "Wall systems", vertical: "apparel", spec: wall({
    width: 120, height: 240, header: 22, headerText: "NEW SEASON",
    attachments: [att("faceout_arm", 30, 198, { length: 30 }), att("waterfall_arm", 90, 198, { length: 38 }), att("hang_rail", 6, 122, { width: 108, length: 30 }), att("shelf", 4, 30, { width: 112, length: 32 })],
  }) },
  { id: "peg-wall", name: "Pegboard Accessory Wall", group: "Wall systems", vertical: "toys", spec: wall({
    width: 120, height: 200, type: "pegboard", pitch: 2.54,
    attachments: [att("hooks", 12, 170, { width: 100, count: 6, length: 20 }), att("hooks", 12, 130, { width: 100, count: 6, length: 20 }), att("hooks", 12, 90, { width: 100, count: 6, length: 15 }), att("basket", 10, 50, { width: 100, length: 30 })],
  }) },
  { id: "glass-shelf-wall", name: "Beauty Wall (glass shelves + light)", group: "Wall systems", vertical: "beauty", spec: wall({
    width: 120, height: 220, type: "standards", pitch: 112, header: 24, headerText: "SKIN CARE",
    attachments: [att("glass_shelf", 4, 170, { width: 112, length: 25 }), att("glass_shelf", 4, 140, { width: 112, length: 25 }), att("glass_shelf", 4, 110, { width: 112, length: 28 }), att("glass_shelf", 4, 80, { width: 112, length: 30 }), att("mirror", 30, 60, { width: 60, length: 40 }), att("light", 4, 200, { width: 112 })],
  }) },
  { id: "tv-wall", name: "TV / Display Wall", group: "Wall systems", vertical: "electronics", spec: wall({
    width: 240, height: 240, type: "plain", header: 24, headerText: "SMART TV",
    attachments: [att("tv", 10, 210, { width: 140 }), att("tv", 160, 210, { width: 70 }), att("tv", 160, 160, { width: 70 }), att("shelf", 10, 90, { width: 220, length: 40 }), att("shelf", 10, 45, { width: 220, length: 40 })],
  }) },
  { id: "shoe-wall", name: "Shoe Wall (floating shelves)", group: "Wall systems", vertical: "footwear", spec: wall({
    width: 120, height: 220, type: "woodslat", pitch: 6,
    attachments: [170, 140, 110, 80, 50].map((y) => att("glass_shelf", 8, y, { width: 104, length: 30 })),
  }) },

  // ── Shelving & gondolas ───────────────────────────────────────────────────
  { id: "gondola", name: "Gondola Bay", group: "Shelving & gondolas", sheet: true, vertical: "grocery", spec: shelving({ columns: [{ shelves: evenShelves(4, 12, 180, { lip: 3 }) }] }) },
  { id: "gondola-2s", name: "Gondola — Double-sided Run (3 bays)", group: "Shelving & gondolas", vertical: "grocery", spec: shelving({
    width: 300, depth: 90, sided: "double", header: 25, headerText: "SNACKS & BEVERAGES", columns: cols(3, () => evenShelves(4, 12, 180, { lip: 3 })),
  }) },
  { id: "gondola-peg", name: "Gondola — Peg Top + Shelves", group: "Shelving & gondolas", vertical: "pharmacy", spec: shelving({
    columns: [{ shelves: [shelf(40, { lip: 3 }), shelf(75, { lip: 3 })] }], header: 22, headerText: "PERSONAL CARE",
    pegRows: [{ y: 165, count: 5, length: 25 }, { y: 135, count: 5, length: 25 }, { y: 105, count: 5, length: 20 }],
  }) },
  { id: "endcap", name: "Endcap", group: "Shelving & gondolas", sheet: true, vertical: "grocery", spec: shelving({ width: 90, depth: 50, back: "plain", header: 30, headerText: "OFFER", columns: [{ shelves: evenShelves(3, 12, 180, { lip: 4 }) }] }) },
  { id: "wall-bay", name: "Wall Shelving Bay (3 columns)", group: "Shelving & gondolas", vertical: "home", spec: shelving({
    width: 240, height: 210, depth: 40, frame: "panels", back: "plain", base: 10, columns: cols(3, () => evenShelves(4, 10, 205)),
  }) },
  { id: "niche", name: "Lit Niche Wall (Nayasa style)", group: "Shelving & gondolas", vertical: "home", spec: shelving({
    width: 240, height: 220, depth: 38, frame: "panels", finish: "board", back: "plain", base: 15, canopy: 18, headerText: "NAYASA",
    columns: cols(3, () => evenShelves(3, 15, 200, { light: true })),
  }) },
  { id: "cube", name: "Cube Unit (3×3)", group: "Shelving & gondolas", sheet: true, vertical: "apparel", spec: shelving({
    width: 107, height: 111, depth: 38, frame: "panels", back: "plain", base: 4, topCap: true, columns: cols(3, () => [shelf(39), shelf(74)]),
  }) },
  { id: "bookcase", name: "Bookshelf", group: "Shelving & gondolas", vertical: "books", spec: shelving({
    width: 90, height: 200, depth: 30, frame: "panels", finish: "wood", back: "plain", base: 8, columns: cols(1, () => evenShelves(5, 8, 198)),
  }) },
  { id: "shoe-unit", name: "Slanted Shoe Shelf Unit", group: "Shelving & gondolas", vertical: "footwear", spec: shelving({
    width: 100, height: 180, depth: 40, frame: "panels", finish: "wood", back: "plain", columns: [{ shelves: evenShelves(4, 12, 180, { slope: 14, fence: 3 }) }],
  }) },
  { id: "wine-rack", name: "Wine / Liquor Rack", group: "Shelving & gondolas", vertical: "liquor", spec: shelving({
    width: 120, height: 200, depth: 35, frame: "panels", finish: "wood", back: "plain", base: 8, header: 20, headerText: "WINES",
    columns: cols(2, () => evenShelves(5, 8, 198, { dividers: 5, slope: 6, fence: 4 })),
  }) },
  { id: "fsdu", name: "FSDU (cardboard floor stand)", group: "Shelving & gondolas", vertical: "toys", spec: shelving({
    width: 60, height: 150, depth: 40, frame: "panels", finish: "cardboard", back: "plain", base: 10, header: 30, headerText: "NEW!",
    columns: [{ shelves: evenShelves(3, 10, 150, { lip: 6 }) }],
  }) },
  { id: "trolley", name: "Display Trolley (casters)", group: "Shelving & gondolas", vertical: "home", spec: shelving({
    width: 60, height: 90, depth: 40, frame: "uprights", back: "none", base: 0, casters: true, topCap: true, columns: [{ shelves: [shelf(30, { type: "wire", fence: 5 }), shelf(60, { type: "wire", fence: 5 })] }],
  }) },
  { id: "bakery-rack", name: "Bakery Rack (wire, sloped)", group: "Shelving & gondolas", vertical: "bakery", spec: shelving({
    width: 120, height: 170, depth: 50, back: "none", base: 0, frame: "uprights", topCap: true, columns: [{ shelves: evenShelves(4, 0, 170, { type: "wire", slope: 12, fence: 4 }) }],
  }) },

  // ── Cabinets, cases & refrigeration ───────────────────────────────────────
  { id: "glass-cabinet", name: "Glass Door Display Cabinet", group: "Cabinets & refrigeration", vertical: "home", spec: shelving({
    width: 100, height: 200, depth: 45, frame: "panels", finish: "wood", back: "mirror", base: 12, canopy: 10, doors: "glass",
    columns: cols(2, () => evenShelves(3, 12, 190, { type: "glass", light: true })),
  }) },
  { id: "chiller", name: "Upright Glass-door Chiller (2 door)", group: "Cabinets & refrigeration", vertical: "liquor", spec: shelving({
    width: 130, height: 200, depth: 70, frame: "cabinet", finish: "body", back: "plain", base: 14, canopy: 22, headerText: "CHILLED", doors: "glass",
    columns: cols(2, () => evenShelves(4, 14, 178, { type: "wire", light: false })),
  }) },
  { id: "multideck", name: "Open Multideck Chiller", group: "Cabinets & refrigeration", vertical: "grocery", spec: shelving({
    width: 190, height: 200, depth: 80, frame: "cabinet", finish: "body", back: "plain", base: 40, canopy: 20, headerText: "DAIRY",
    columns: [{ shelves: evenShelves(4, 40, 180, { slope: 8, lip: 6, light: true }) }],
  }) },
  { id: "chest-freezer", name: "Island / Chest Freezer", group: "Cabinets & refrigeration", vertical: "grocery", spec: table({ width: 180, depth: 85, height: 88, finish: "body", top: "glass_lid" }) },
  { id: "vitrine", name: "Glass Counter Showcase (jewellery)", group: "Cabinets & refrigeration", vertical: "jewellery", spec: table({
    width: 150, depth: 60, height: 95, base: "solid", finish: "wood", top: "glass_case", caseHeight: 30, caseShelves: 0, light: true,
  }) },
  { id: "pastry-case", name: "Pastry / Bakery Case", group: "Cabinets & refrigeration", vertical: "bakery", spec: table({
    width: 150, depth: 70, height: 90, base: "solid", finish: "marble", top: "glass_case", caseHeight: 45, caseShelves: 1, light: true,
  }) },

  // ── Apparel racks ─────────────────────────────────────────────────────────
  { id: "t-stand", name: "T-Stand", group: "Racks & stands", sheet: true, vertical: "apparel", spec: rack({ arms: [arm(0, 145), arm(180, 145)] }) },
  { id: "two-way", name: "2-Way (straight + waterfall)", group: "Racks & stands", vertical: "apparel", spec: rack({ height: 165, arms: [arm(90, 150, { type: "waterfall", length: 38 }), arm(270, 120, { type: "waterfall", length: 38 })] }) },
  { id: "four-way", name: "Four-Way Rack", group: "Racks & stands", sheet: true, vertical: "apparel", spec: rack({ arms: [arm(0, 145), arm(90, 130), arm(180, 145), arm(270, 130)] }) },
  { id: "waterfall-tower", name: "Waterfall Tower", group: "Racks & stands", sheet: true, vertical: "apparel", spec: rack({ height: 170, arms: [arm(0, 155, { type: "waterfall", length: 38 }), arm(180, 155, { type: "waterfall", length: 38 })] }) },
  { id: "rounder", name: "Rounder", group: "Racks & stands", sheet: true, vertical: "apparel", spec: rack({ base: "round", depth: 60, height: 135, ring: 90, ringY: 128 }) },
  { id: "hang-rail", name: "Hang Rail (freestanding)", group: "Racks & stands", sheet: true, vertical: "apparel", spec: rack({ poles: 2, width: 120, base: "h", height: 150, rails: [{ y: 145 }] }) },
  { id: "double-hang", name: "Double-hang H-Rack", group: "Racks & stands", vertical: "apparel", spec: rack({ poles: 2, width: 120, base: "h", height: 180, rails: [{ y: 175 }, { y: 95 }] }) },
  { id: "z-rack", name: "Rolling Rail + Top Shelf", group: "Racks & stands", vertical: "apparel", spec: rack({ poles: 2, width: 150, base: "casters", height: 160, rails: [{ y: 150 }], topShelf: true }) },
  { id: "saree-rack", name: "Saree / Dupatta Bar Rack", group: "Racks & stands", vertical: "apparel", spec: rack({ poles: 2, width: 90, base: "h", height: 190, rails: [185, 160, 135, 110, 85, 60].map((y) => ({ y })) }) },
  { id: "spinner", name: "Spinner Rack", group: "Racks & stands", sheet: true, vertical: "toys", spec: rack({
    base: "round", height: 165, header: 14, headerText: "",
    arms: [40, 70, 100, 130].flatMap((y) => [0, 60, 120, 180, 240, 300].map((a) => arm(a + (y % 60), y, { type: "peg", length: 18 }))),
  }) },
  { id: "eyewear-tower", name: "Eyewear / Accessory Tower", group: "Racks & stands", vertical: "eyewear", spec: rack({
    base: "plate", height: 170, header: 14, headerText: "OPTICS",
    arms: [60, 85, 110, 135].flatMap((y) => [0, 90, 180, 270].map((a) => arm(a, y, { type: "shelf", length: 14 }))),
  }) },

  // ── Tables, podiums & counters ────────────────────────────────────────────
  { id: "display-table", name: "Display Table", group: "Tables & counters", sheet: true, vertical: "apparel", spec: table({}) },
  { id: "nesting", name: "Nesting Tables (3 tier)", group: "Tables & counters", vertical: "home", spec: table({ width: 160, depth: 80, height: 60, tiers: 3, tierStep: 22, base: "slab" }) },
  { id: "round-tiered", name: "Round Tiered Table", group: "Tables & counters", vertical: "home", spec: table({ shape: "round", width: 120, depth: 120, height: 70, tiers: 3, tierStep: 24, base: "pedestal", finish: "marble" }) },
  { id: "podium", name: "Podium / Plinth", group: "Tables & counters", vertical: "electronics", spec: table({ width: 60, depth: 60, height: 90, base: "solid", finish: "board" }) },
  { id: "island", name: "Island Table + Lower Shelf", group: "Tables & counters", vertical: "books", spec: table({ width: 160, depth: 90, height: 80, base: "legs", shelfBelow: true }) },
  { id: "produce", name: "Produce Table (tilted crates)", group: "Tables & counters", vertical: "grocery", spec: table({ width: 180, depth: 90, height: 70, base: "legs", top: "crates" }) },
  { id: "counter", name: "Service Counter (drawers)", group: "Tables & counters", vertical: "pharmacy", spec: table({ width: 180, depth: 60, height: 95, base: "solid", finish: "board", drawers: 4 }) },
  { id: "checkout", name: "Checkout / Cash Wrap", group: "Tables & counters", vertical: "grocery", spec: table({ width: 220, depth: 70, height: 85, finish: "board", top: "checkout" }) },

  // ── Bins & bulk ───────────────────────────────────────────────────────────
  { id: "dump-bin", name: "Dump Bin (wire)", group: "Bins & bulk", sheet: true, vertical: "toys", spec: bin({}) },
  { id: "round-bin", name: "Round Bin", group: "Bins & bulk", vertical: "grocery", spec: bin({ shape: "round", style: "solid", finish: "cardboard", width: 60, depth: 60, height: 75, legs: 0 }) },
  { id: "crate", name: "Wooden Crate Stack", group: "Bins & bulk", vertical: "grocery", spec: bin({ style: "crate", width: 50, depth: 35, height: 30, legs: 0 }) },
  { id: "gravity", name: "Gravity Bulk Dispensers", group: "Bins & bulk", vertical: "grocery", spec: bin({ style: "gravity", width: 120, depth: 30, height: 140, count: 4 }) },
  { id: "pallet", name: "Pallet Display", group: "Bins & bulk", vertical: "grocery", spec: bin({ style: "pallet", width: 120, depth: 100, height: 80 }) },

  // ── Hardware & accessories ────────────────────────────────────────────────
  { id: "faceout-arm", name: "Faceout Arm", group: "Hardware", sheet: true, vertical: "apparel", spec: hw({ kind: "faceout_arm", length: 30 }) },
  { id: "waterfall-arm", name: "Waterfall Arm", group: "Hardware", vertical: "apparel", spec: hw({ kind: "waterfall_arm", length: 38 }) },
  { id: "shelf-bracket", name: "Shelf Bracket", group: "Hardware", sheet: true, vertical: "apparel", spec: hw({ kind: "shelf_bracket", width: 60, length: 30 }) },
  { id: "riser", name: "Riser", group: "Hardware", sheet: true, vertical: "beauty", spec: hw({ kind: "riser", width: 30, length: 24, height: 15, count: 2 }) },
  { id: "sign-holder", name: "Sign Holder", group: "Hardware", sheet: true, vertical: "none", spec: hw({ kind: "sign_holder", width: 15, height: 21 }) },
  { id: "connector-tips", name: "Connector Tip Set", group: "Hardware", sheet: true, vertical: "none", spec: hw({ kind: "connector_tips" }) },
  { id: "divider", name: "Shelf Dividers", group: "Hardware", vertical: "grocery", spec: hw({ kind: "divider", width: 90, length: 40, height: 12, count: 4 }) },
  { id: "fence", name: "Shelf Fence", group: "Hardware", vertical: "grocery", spec: hw({ kind: "fence", width: 90, length: 40, height: 6 }) },
  { id: "price-channel", name: "Price Channel / Ticket Strip", group: "Hardware", vertical: "grocery", spec: hw({ kind: "price_channel", width: 90, length: 40, count: 4 }) },
  { id: "shelf-talker", name: "Shelf Talker / Wobbler", group: "Hardware", vertical: "grocery", spec: hw({ kind: "shelf_talker", width: 90, length: 40 }) },
  { id: "single-hook", name: "Single Prong Hook", group: "Hooks", sheet: true, vertical: "toys", spec: hw({ kind: "single_hook", mount: "pegboard" }) },
  { id: "double-hook", name: "Double Prong Hook", group: "Hooks", sheet: true, vertical: "toys", spec: hw({ kind: "double_hook", mount: "pegboard" }) },
  { id: "j-hook", name: "J-Hook", group: "Hooks", sheet: true, vertical: "none", spec: hw({ kind: "j_hook", length: 8, width: 6 }) },
  { id: "waterfall-hook", name: "Waterfall / Cascade Hook", group: "Hooks", sheet: true, vertical: "none", spec: hw({ kind: "waterfall_hook", length: 28, count: 5 }) },
  { id: "bin-hook", name: "Bin / Scoop Hook", group: "Hooks", sheet: true, vertical: "grocery", spec: hw({ kind: "bin_hook", mount: "pegboard", width: 14, length: 12 }) },
  { id: "hanger-standard", name: "Standard Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 42, style: "standard" }) },
  { id: "hanger-faceout", name: "Face-out / Rotating Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 42, style: "faceout" }) },
  { id: "hanger-suit", name: "Suit Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 46, style: "suit" }) },
  { id: "hanger-clip", name: "Trouser / Skirt Clip Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 36, style: "clip" }) },
  { id: "hanger-cascade", name: "Cascade / Multi-tier Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 40, style: "cascade" }) },
  { id: "hanger-kids", name: "Kids Hanger", group: "Hangers", sheet: true, vertical: "none", spec: hw({ kind: "hanger", width: 30, style: "kids" }) },
];
