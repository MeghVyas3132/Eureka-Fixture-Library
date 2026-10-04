// Editor schema per family. The properties panel is generated from this, so a
// new field on a family is one line here — no hand-built form.
import { shelf, arm, att } from "./families.ts";

export type Field =
  | { key: string; label: string; type: "num"; min: number; max: number; step?: number; unit?: string }
  | { key: string; label: string; type: "int"; min: number; max: number }
  | { key: string; label: string; type: "enum"; options: string[] }
  | { key: string; label: string; type: "bool" }
  | { key: string; label: string; type: "text" }
  | { key: string; label: string; type: "list"; item: Field[]; make: (list: any[]) => any; itemLabel: (it: any, i: number) => string; min?: number };

const num = (key: string, label: string, min: number, max: number, step = 1, unit = "cm"): Field => ({ key, label, type: "num", min, max, step, unit });

const SHELF: Field[] = [
  num("y", "Height", 0, 300, 0.5), num("depth", "Depth (0 = auto)", 0, 120),
  { key: "type", label: "Type", type: "enum", options: ["board", "glass", "wire", "acrylic"] },
  { key: "dividers", label: "Dividers", type: "int", min: 0, max: 20 },
  num("fence", "Fence", 0, 15, 0.5), num("slope", "Slope", 0, 30, 1, "°"), num("lip", "Front lip", 0, 10, 0.5),
  { key: "light", label: "LED strip", type: "bool" },
];

export const SCHEMAS: Record<string, Field[]> = {
  shelving: [
    num("width", "Width", 30, 600), num("height", "Height", 30, 300), num("depth", "Depth", 15, 120),
    { key: "sided", label: "Sides", type: "enum", options: ["single", "double"] },
    { key: "frame", label: "Frame", type: "enum", options: ["uprights", "panels", "cabinet"] },
    { key: "finish", label: "Finish", type: "enum", options: ["board", "wood", "metal", "cardboard", "glass", "body", "marble"] },
    { key: "back", label: "Back", type: "enum", options: ["none", "plain", "pegboard", "slatwall", "glass", "mirror", "perforated"] },
    num("base", "Base / plinth", 0, 60), num("canopy", "Canopy (lit)", 0, 40),
    num("header", "Header", 0, 60), { key: "headerText", label: "Header text", type: "text" },
    { key: "doors", label: "Doors", type: "enum", options: ["none", "glass", "solid"] },
    { key: "topCap", label: "Top cap", type: "bool" }, { key: "casters", label: "Casters", type: "bool" },
    num("slotPitch", "Slot pitch", 1, 10, 0.1),
    {
      key: "columns", label: "Columns (partitions)", type: "list", min: 1,
      make: (l) => ({ shelves: (l[l.length - 1]?.shelves ?? [shelf(60)]).map((s: any) => ({ ...s })) }),
      itemLabel: (c, i) => `Column ${i + 1} · ${c.shelves.length} shelves`,
      item: [{
        key: "shelves", label: "Shelves", type: "list",
        make: (l) => shelf(Math.min(290, (l.reduce((m: number, s: any) => Math.max(m, s.y), 0) || 20) + 35), l[0] ? { type: l[0].type, lip: l[0].lip } : {}),
        itemLabel: (s, i) => `Shelf ${i + 1} · ${s.y} cm · ${s.type}${s.dividers ? ` · ${s.dividers} div` : ""}`,
        item: SHELF,
      }],
    },
    {
      key: "pegRows", label: "Peg-hook rows (on back)", type: "list",
      make: (l) => ({ y: Math.max(20, (l[l.length - 1]?.y ?? 150) - 30), count: 4, length: 20 }),
      itemLabel: (r, i) => `Row ${i + 1} · ${r.y} cm · ${r.count} hooks`,
      item: [num("y", "Height", 10, 300, 0.01), { key: "count", label: "Hooks / column", type: "int", min: 1, max: 12 }, num("length", "Hook length", 5, 40)],
    },
  ],
  rack: [
    { key: "base", label: "Base", type: "enum", options: ["cross", "h", "round", "casters", "plate"] },
    { key: "poles", label: "Poles", type: "int", min: 1, max: 2 },
    num("width", "Pole spacing", 0, 300), num("depth", "Foot depth", 20, 100), num("height", "Height", 40, 250),
    num("ring", "Ring diameter", 0, 150), num("ringY", "Ring height", 30, 220),
    { key: "topShelf", label: "Top shelf", type: "bool" }, num("header", "Header", 0, 40), { key: "headerText", label: "Header text", type: "text" },
    {
      key: "arms", label: "Arms", type: "list", make: (l) => arm(((l.length * 90) % 360), 120),
      itemLabel: (a, i) => `Arm ${i + 1} · ${a.type} · ${a.angle}° · ${a.y} cm`,
      item: [
        { key: "pole", label: "Pole", type: "int", min: 0, max: 1 }, num("angle", "Direction", 0, 359, 5, "°"), num("y", "Height", 10, 240, 0.5),
        num("length", "Length", 5, 80), { key: "type", label: "Type", type: "enum", options: ["straight", "waterfall", "peg", "shelf"] },
        { key: "studs", label: "Studs", type: "int", min: 2, max: 12 }, num("slope", "Slope", 0, 40, 1, "°"),
      ],
    },
    { key: "rails", label: "Rails (2 poles)", type: "list", make: (l) => ({ y: Math.max(40, (l[l.length - 1]?.y ?? 180) - 40) }), itemLabel: (r, i) => `Rail ${i + 1} · ${r.y} cm`, item: [num("y", "Height", 20, 240, 0.5)] },
  ],
  table: [
    { key: "shape", label: "Shape", type: "enum", options: ["rect", "round"] },
    num("width", "Width / Ø", 30, 400), num("depth", "Depth", 30, 200), num("height", "Height", 10, 120),
    { key: "tiers", label: "Tiers", type: "int", min: 1, max: 5 }, num("tierStep", "Tier step", 8, 60), num("tierInset", "Tier inset", 0.05, 0.4, 0.01, "×"),
    { key: "base", label: "Base", type: "enum", options: ["legs", "pedestal", "solid", "slab"] },
    { key: "finish", label: "Finish", type: "enum", options: ["wood", "board", "metal", "marble", "glass", "body", "cardboard"] },
    { key: "top", label: "Top", type: "enum", options: ["flat", "glass_case", "glass_lid", "crates", "checkout"] },
    num("caseHeight", "Case height", 10, 80), { key: "caseShelves", label: "Case shelves", type: "int", min: 0, max: 4 },
    { key: "drawers", label: "Drawers", type: "int", min: 0, max: 8 }, { key: "shelfBelow", label: "Lower shelf", type: "bool" }, { key: "light", label: "Case light", type: "bool" },
  ],
  wall: [
    num("width", "Width", 30, 1200), num("height", "Height", 30, 400),
    { key: "type", label: "Surface", type: "enum", options: ["slatwall", "pegboard", "gridwall", "plain", "perforated", "woodslat", "mirror", "standards"] },
    num("pitch", "Pitch / spacing", 1, 120, 0.01), num("base", "Base", 0, 40), num("header", "Header", 0, 60), { key: "headerText", label: "Header text", type: "text" },
    {
      key: "attachments", label: "Attachments", type: "list", make: () => att("shelf", 10, 100),
      itemLabel: (a, i) => `${i + 1}. ${a.type.replace("_", " ")} @ ${Math.round(a.x)}, ${Math.round(a.y)}`,
      item: [
        { key: "type", label: "Type", type: "enum", options: ["faceout_arm", "waterfall_arm", "shelf", "glass_shelf", "hang_rail", "hooks", "basket", "tv", "mirror", "light"] },
        num("x", "X", 0, 1200, 0.5), num("y", "Y", 0, 400, 0.5), num("length", "Depth / length", 2, 80), num("width", "Width", 5, 400), { key: "count", label: "Count", type: "int", min: 1, max: 20 },
      ],
    },
  ],
  bin: [
    { key: "style", label: "Style", type: "enum", options: ["wire", "solid", "crate", "gravity", "pallet"] },
    { key: "shape", label: "Shape", type: "enum", options: ["rect", "round"] },
    num("width", "Width", 10, 200), num("depth", "Depth", 10, 200), num("height", "Height", 10, 200),
    num("legs", "Legs", 0, 30), { key: "casters", label: "Casters", type: "bool" },
    { key: "dividers", label: "Dividers", type: "int", min: 0, max: 6 }, { key: "count", label: "Tubes", type: "int", min: 1, max: 10 },
    { key: "finish", label: "Finish", type: "enum", options: ["board", "wood", "metal", "cardboard", "body"] },
  ],
  hardware: [
    { key: "kind", label: "Kind", type: "enum", options: ["single_hook", "double_hook", "j_hook", "waterfall_hook", "bin_hook", "faceout_arm", "waterfall_arm", "shelf_bracket", "hanger", "sign_holder", "riser", "divider", "fence", "price_channel", "shelf_talker", "connector_tips"] },
    num("length", "Length", 2, 80), num("width", "Width", 2, 200), num("height", "Height", 1, 60), { key: "count", label: "Count", type: "int", min: 1, max: 12 },
    { key: "mount", label: "Mount", type: "enum", options: ["slatwall", "pegboard", "gridwall", "standards"] },
    { key: "style", label: "Hanger style", type: "enum", options: ["standard", "faceout", "suit", "clip", "cascade", "kids"] },
    { key: "orientation", label: "Hanger orientation", type: "enum", options: ["face", "spine"] },
  ],
};
