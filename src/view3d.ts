// 3D (perspective, orbit) and 2.5D (isometric orthographic) views of the shared
// part list. PBR materials + studio environment reflections, soft shadows,
// ambient occlusion and bloom on LED strips — the "rich" look comes from
// lighting the same geometry well, not from hand-made assets.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { bounds, inkOn, type Part, type Theme, type MatId } from "./model.ts";

export type Mode3D = "3d" | "iso";

// ── procedural textures (one canvas tile per pattern, repeated) ─────────────
const texCache = new Map<string, THREE.Texture>();
function tile(kind: string, bg: string, fg: string): THREE.Texture {
  const key = `${kind}|${bg}|${fg}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const S = 64, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d")!;
  if (bg !== "transparent") { g.fillStyle = bg; g.fillRect(0, 0, S, S); }
  g.fillStyle = fg; g.strokeStyle = fg;
  if (kind === "peg" || kind === "perf") { g.beginPath(); g.arc(S / 2, S / 2, S * (kind === "peg" ? 0.15 : 0.22), 0, Math.PI * 2); g.fill(); }
  if (kind === "slat") { g.fillRect(0, S * 0.38, S, S * 0.2); g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(0, S * 0.58, S, S * 0.06); }
  if (kind === "grid" || kind === "mesh") { g.lineWidth = S * 0.08; g.strokeRect(0, 0, S, S); }
  if (kind === "woodslat") { g.globalAlpha = 0.55; g.fillRect(S * 0.86, 0, S * 0.14, S); }
  if (kind === "slot") { g.fillRect(S * 0.38, S * 0.2, S * 0.24, S * 0.5); }
  if (kind === "grain") {                            // wood grain
    for (let i = 0; i < 26; i++) { g.globalAlpha = 0.05 + Math.random() * 0.08; g.fillRect(0, Math.random() * S, S, 0.6 + Math.random() * 1.8); }
  }
  if (kind === "screen") {
    const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, "#2b5d8c"); gr.addColorStop(0.5, "#0f2740"); gr.addColorStop(1, "#4b2d6b");
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

function labelTex(text: string, bg: string, w: number, h: number): THREE.Texture {
  const c = document.createElement("canvas"), k = 512 / Math.max(w, h);
  c.width = Math.max(16, Math.round(w * k)); c.height = Math.max(16, Math.round(h * k));
  const g = c.getContext("2d")!;
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = inkOn(bg); g.textAlign = "center"; g.textBaseline = "middle";
  const size = Math.min(c.height * 0.5, (c.width / Math.max(3, text.length)) * 1.5);
  g.font = `700 ${size}px Inter, Helvetica, Arial, sans-serif`;
  g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Viewer3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  persp = new THREE.PerspectiveCamera(32, 1, 1, 20000);
  ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 20000);
  camera: THREE.Camera = this.persp;
  controls: OrbitControls;
  composer: EffectComposer;
  gtao: GTAOPass; bloom: UnrealBloomPass; renderPass: RenderPass;
  group = new THREE.Group();
  key: THREE.DirectionalLight;
  floor: THREE.Mesh;
  mode: Mode3D = "3d";
  quality = true;
  onPick?: (partId: string | null) => void;
  private matCache = new Map<string, THREE.Material>();
  private theme?: Theme;
  private raf = 0;

  constructor(public host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    host.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.background = new THREE.Color("#eceae6");
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#d9d4cc", 0.35));
    this.key = new THREE.DirectionalLight("#fff6ea", 2.1);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.6; this.key.shadow.radius = 4;
    this.scene.add(this.key, this.key.target);

    this.floor = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: "#e4e1db", roughness: 0.92 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true;
    this.scene.add(this.floor, this.group);

    this.controls = new OrbitControls(this.persp, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
    this.gtao.updateGtaoMaterial({ radius: 12, distanceExponent: 1.4, thickness: 4, scale: 1.2 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.4, 1.0);
    const fx = new URLSearchParams(location.search).get("fx") ?? "ao";
    this.composer.addPass(this.renderPass);
    if (fx.includes("ao")) this.composer.addPass(this.gtao);
    if (fx.includes("bloom")) this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // click-to-select (ignored if the pointer moved — that was an orbit)
    let down: [number, number] | null = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = this.renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
      const hit = ray.intersectObjects(this.group.children, true).find((h) => h.object.userData.partId);
      this.onPick?.(hit ? hit.object.userData.partId : null);
    });
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.controls.update(); this.draw(); };
    loop();
  }

  private draw() {
    if (this.quality) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const w = Math.max(10, this.host.clientWidth), h = Math.max(10, this.host.clientHeight);
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    this.updateOrtho();
  }
  private orthoSpan = 300;
  private updateOrtho() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, s = this.orthoSpan / 2;
    const a = w / h;
    Object.assign(this.ortho, a > 1 ? { left: -s * a, right: s * a, top: s, bottom: -s } : { left: -s, right: s, top: s / a, bottom: -s / a });
    this.ortho.updateProjectionMatrix();
  }

  setMode(mode: Mode3D) {
    this.mode = mode;
    this.camera = mode === "3d" ? this.persp : this.ortho;
    this.controls.object = this.camera as any;
    this.renderPass.camera = this.camera; (this.gtao as any).camera = this.camera;
    if (mode === "iso") { const el = Math.atan(1 / Math.SQRT2); this.controls.minPolarAngle = this.controls.maxPolarAngle = Math.PI / 2 - el; }
    else { this.controls.minPolarAngle = 0; this.controls.maxPolarAngle = Math.PI / 2 - 0.02; }
  }

  private mat(m: MatId, color: string | undefined, theme: Theme): THREE.Material {
    const key = `${theme.name}|${m}|${color ?? ""}`;
    const hit = this.matCache.get(key); if (hit) return hit;
    const st = theme.mats[m];
    const col = color ?? (st.color === "transparent" ? "#999999" : st.color);
    let mat: THREE.Material;
    if (m === "glass" || m === "acrylic") {
      mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: st.rough ?? 0.05, metalness: 0, transparent: true, opacity: st.opacity ?? 0.3, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
    } else if (m === "light") {
      mat = new THREE.MeshStandardMaterial({ color: col, emissive: st.emissive ?? col, emissiveIntensity: 3 });
    } else if (m === "screen") {
      mat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: tile("screen", "", ""), emissive: "#ffffff", emissiveMap: tile("screen", "", ""), emissiveIntensity: 0.9, roughness: 0.06, clearcoat: 1 });
    } else {
      const p = new THREE.MeshPhysicalMaterial({ color: col, roughness: st.rough ?? 0.6, metalness: st.metal ?? 0, envMapIntensity: 1 });
      if (m === "wood" || m === "woodDark") { p.map = tile("grain", "#ffffff", "#000000"); }
      if (m === "marble" || m === "body" || m === "board") { p.clearcoat = 0.35; p.clearcoatRoughness = 0.4; }
      if (m === "product") { p.roughness = 0.45; p.clearcoat = 0.25; }
      mat = p;
    }
    this.matCache.set(key, mat);
    return mat;
  }

  private patternMat(part: Part, theme: Theme, rx: number, ry: number): THREE.Material {
    const st = theme.mats[part.mat];
    const base = this.mat(part.mat, part.color, theme) as THREE.MeshPhysicalMaterial;
    const m = base.clone();
    const transparent = part.mat === "gridwall" || part.pattern!.kind === "mesh";
    const t = tile(part.pattern!.kind, transparent ? "transparent" : (part.color ?? st.color), st.patternColor ?? "#555555").clone();
    t.needsUpdate = true; t.repeat.set(rx, ry);
    m.map = t; m.color = new THREE.Color("#ffffff");
    if (transparent) { m.transparent = true; m.alphaTest = 0.3; m.color = new THREE.Color(st.patternColor ?? "#5d636c"); m.side = THREE.DoubleSide; }
    return m;
  }

  setParts(parts: Part[], theme: Theme, opts: { refit?: boolean; selected?: string | null } = {}) {
    if (this.theme !== theme) { this.matCache.clear(); this.theme = theme; }
    for (const c of [...this.group.children]) { this.group.remove(c); c.traverse((o: any) => o.geometry?.dispose?.()); }
    for (const part of parts) {
      const obj = this.mesh(part, theme);
      if (!obj) continue;
      obj.traverse((o: any) => {
        if (!o.isMesh) return;
        o.userData.partId = part.id;
        const glassy = part.mat === "glass" || part.mat === "acrylic" || part.mat === "light";
        o.castShadow = !glassy; o.receiveShadow = true;
        if (opts.selected && part.tag?.path === opts.selected) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          o.material = mats.map((mm: any) => { const c = mm.clone(); if (c.emissive) { c.emissive = new THREE.Color("#2563eb"); c.emissiveIntensity = 0.55; } return c; });
          if (o.material.length === 1) o.material = o.material[0];
        }
      });
      this.group.add(obj);
    }
    const B = bounds(parts);
    const c = new THREE.Vector3((B.min[0] + B.max[0]) / 2, (B.min[1] + B.max[1]) / 2, (B.min[2] + B.max[2]) / 2);
    const R = Math.max(Math.hypot(B.size[0], B.size[1], B.size[2]) / 2, 15);
    this.scene.fog = new THREE.Fog("#eceae6", R * 5, R * 14);
    this.floor.scale.setScalar(R * 6); this.floor.position.set(c.x, Math.min(0, B.min[1]) - 0.05, c.z);
    this.key.position.set(c.x + R * 0.9, c.y + R * 2.1, c.z + R * 1.6); this.key.target.position.copy(c);
    const sc = this.key.shadow.camera as THREE.OrthographicCamera;
    Object.assign(sc, { left: -R * 1.4, right: R * 1.4, top: R * 1.4, bottom: -R * 1.4, near: 1, far: R * 8 }); sc.updateProjectionMatrix();
    if (opts.refit) this.fit(c, R);
  }

  fit(c?: THREE.Vector3, R?: number) {
    if (!c || !R) { const b = new THREE.Box3().setFromObject(this.group); c = b.getCenter(new THREE.Vector3()); R = b.getSize(new THREE.Vector3()).length() / 1.6; }
    this.controls.target.copy(c);
    if (this.mode === "3d") {
      const vf = (this.persp.fov * Math.PI) / 360, hf = Math.atan(Math.tan(vf) * this.persp.aspect);
      const dist = (R / Math.sin(Math.min(vf, hf))) * 1.02;
      this.persp.position.set(c.x + dist * 0.45, c.y + dist * 0.22, c.z + dist * 0.88);
      this.persp.near = dist / 50; this.persp.far = dist * 20; this.persp.updateProjectionMatrix();
    } else {
      this.orthoSpan = R * 2.1; this.updateOrtho();
      this.ortho.zoom = 1;
      this.ortho.position.set(c.x + R * 3, c.y + R * 3 * Math.tan(Math.atan(1 / Math.SQRT2)) * Math.SQRT2, c.z + R * 3);
      this.ortho.updateProjectionMatrix();
    }
    this.controls.update();
  }

  private mesh(part: Part, theme: Theme): THREE.Object3D | null {
    const m = this.mat(part.mat, part.color, theme);
    if (part.shape === "box") {
      const [w, h, d] = part.size;
      const r = Math.min(0.35, Math.min(w, h, d) * 0.22);
      const geo = r > 0.06 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
      let material: THREE.Material | THREE.Material[] = m;
      if (part.pattern) {
        // repeat so one tile = one pitch on the large faces
        const pm = this.patternMat(part, theme, w / part.pattern.pitch, h / part.pattern.pitch);
        material = part.pattern.kind === "mesh" && h < w && h < d ? this.patternMat(part, theme, w / part.pattern.pitch, d / part.pattern.pitch) : pm;
      }
      if (part.tag?.label) {
        const front = new THREE.MeshPhysicalMaterial({ map: labelTex(part.tag.label, theme.mats[part.mat].color, w, h), roughness: 0.4 });
        material = [m, m, m, m, front, front];
      }
      const mesh = new THREE.Mesh(geo, material);
      const center = new THREE.Vector3(part.min[0] + w / 2, part.min[1] + h / 2, part.min[2] + d / 2);
      if (!part.rot) { mesh.position.copy(center); return mesh; }
      const pivot = new THREE.Group();
      pivot.position.set(...part.rot.pivot);
      pivot.rotation[part.rot.axis] = part.rot.angle;
      mesh.position.copy(center.sub(new THREE.Vector3(...part.rot.pivot)));
      pivot.add(mesh);
      return pivot;
    }
    if (part.shape === "cyl") {
      const geo = new THREE.CylinderGeometry(part.radius, part.radius, part.length, Math.max(16, Math.min(48, Math.round(part.radius * 6))));
      const mesh = new THREE.Mesh(geo, part.pattern ? this.patternMat(part, theme, (part.radius * 6.28) / part.pattern.pitch, part.length / part.pattern.pitch) : m);
      if (part.axis === "x") mesh.rotation.z = Math.PI / 2;
      if (part.axis === "z") mesh.rotation.x = Math.PI / 2;
      mesh.position.set(...part.center);
      return mesh;
    }
    if (part.shape === "sphere") {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(part.radius, 20, 14), m);
      mesh.position.set(...part.center);
      return mesh;
    }
    if (part.shape === "wire") {
      const path = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 1; i < part.points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...part.points[i - 1]), new THREE.Vector3(...part.points[i])));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.TubeGeometry(path as any, Math.max(2, part.points.length * 6), part.radius, 10, false), m));
      for (let i = 1; i < part.points.length - 1; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(part.radius, 10, 8), m); s.position.set(...part.points[i]); g.add(s); }
      return g;
    }
    if (part.shape === "ring") {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(part.radius, part.tube, 12, 96), m);
      mesh.rotation.x = Math.PI / 2; mesh.position.set(...part.center);
      return mesh;
    }
    return null;
  }

  png(): string { this.draw(); return this.renderer.domElement.toDataURL("image/png"); }
  dispose() { cancelAnimationFrame(this.raf); this.renderer.dispose(); }
}
