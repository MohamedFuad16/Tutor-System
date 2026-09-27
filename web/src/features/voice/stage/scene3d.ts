/**
 * The 3D stage: builds a declarative Scene (shared/voice.ts) with three.js.
 * The tutor only ever describes objects (shape, size, colour, orbit, label);
 * nothing it writes runs as code. Parts materialise one after another with a
 * springy scale-in, glass-like materials catch a soft studio environment,
 * light sources glow, orbiting parts leave faint paths, labels float in HTML
 * (crisp at any zoom), and the camera eases to whatever the tutor points at.
 * The learner can drag to spin, pinch or scroll to zoom and tap any part.
 * Lazy-loaded with the scene component, so three.js never weighs on the app.
 */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Scene, SceneObject, StageView, Vec3 } from "@shared/voice";

const PALETTE = ["#ff9a4d", "#22d3ee", "#a78bfa", "#34d399", "#f472b6", "#fbbf24", "#60a5fa", "#f87171"];
const UP = new THREE.Vector3(0, 1, 0);
const TURN = (Math.PI * 2) / 60; // "turns per minute" → radians per second

type Part = {
  spec: SceneObject;
  index: number;
  /** Placed and rotated in the world. */
  root: THREE.Group;
  /** Scaled while building in, spun by `spin`. */
  body: THREE.Group;
  materials: THREE.Material[];
  label?: CSS2DObject;
  radius: number;
  path?: THREE.LineLoop;
  base: THREE.Vector3;
};

export type SceneViewOptions = {
  motion: boolean;
  onSelect: (id: string | null) => void;
};

const easeOutBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const toVector = (value: Vec3 | undefined, fallback = new THREE.Vector3()) =>
  value ? new THREE.Vector3(value[0], value[1], value[2]) : fallback.clone();

function scalar(size: SceneObject["size"], fallback: number) {
  if (typeof size === "number") return size;
  if (Array.isArray(size)) return Math.max(size[0], size[2]) / 2;
  return fallback;
}
function triple(size: SceneObject["size"], fallback: Vec3): Vec3 {
  if (Array.isArray(size)) return size;
  if (typeof size === "number") return [size, size, size];
  return fallback;
}

/** Soft round sprite texture for glows and stars. */
function radialTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SceneView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labels: CSS2DRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly controls: OrbitControls;
  private readonly parts = new Map<string, Part>();
  private readonly order: Part[] = [];
  private readonly decor = new THREE.Group();
  private readonly timer = new THREE.Timer();
  private readonly textures: THREE.Texture[] = [];
  private readonly started = performance.now();
  private frame = 0;
  private focusId: string | null = null;
  /** Where the camera is easing to: a target at a distance, or (reset) an exact position. */
  private goal: { target: THREE.Vector3; distance: number; follow?: string; position?: THREE.Vector3 } | null = null;
  private home = { target: new THREE.Vector3(), position: new THREE.Vector3(0, 5, 12) };
  private radius = 8;
  private resize: ResizeObserver | null = null;
  private pointer: { x: number; y: number } | null = null;
  private disposed = false;
  private positions = new Map<string, THREE.Vector3>();

  constructor(
    private readonly host: HTMLElement,
    private readonly spec: Scene,
    private readonly options: SceneViewOptions,
  ) {
    const width = host.clientWidth || 640;
    const height = host.clientHeight || 420;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = "scene-canvas";
    host.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.setSize(width, height);
    this.labels.domElement.className = "scene-labels";
    host.appendChild(this.labels.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.textures.push(environment);
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 5000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = options.motion;
    this.controls.autoRotateSpeed = 0.6;
    // The learner grabbing the model takes over from any camera move in progress.
    this.controls.addEventListener("start", () => (this.goal = null));

    for (const [index, object] of spec.objects.entries()) this.addPart(object, index);
    this.placeOrbits(0);
    this.frameScene();
    this.addLights();
    this.addDecor(spec.mood ?? "studio");
    this.scene.add(this.decor);

    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointerup", this.onPointerUp);
    if (typeof ResizeObserver !== "undefined") {
      this.resize = new ResizeObserver(() => this.onResize());
      this.resize.observe(host);
    }
    this.tick();
  }

  // ---------------------------------------------------------------- building

  private material(object: SceneObject, index: number) {
    const color = new THREE.Color(PALETTE[index % PALETTE.length]);
    if (object.color) color.setStyle(object.color);
    const opacity = object.opacity ?? 1;
    if (object.glow) return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.4,
      metalness: 0.06,
      clearcoat: 0.65,
      clearcoatRoughness: 0.28,
      transparent: opacity < 1,
      opacity,
      wireframe: Boolean(object.wireframe),
      emissive: new THREE.Color(0x000000),
    });
  }

  private addPart(object: SceneObject, index: number) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const materials: THREE.Material[] = [];
    const mesh = (geometry: THREE.BufferGeometry, material = this.material(object, index)) => {
      materials.push(material);
      const created = new THREE.Mesh(geometry, material);
      created.userData.partId = object.id;
      body.add(created);
      return created;
    };

    let radius = 1;
    const from = object.from ? toVector(object.from) : null;
    const to = object.to ? toVector(object.to) : null;
    let base = toVector(object.position);

    // Shapes placed between two points (bonds, rods, forces).
    const between = (thickness: number) => {
      const start = from ?? base;
      const end = to ?? base.clone().add(new THREE.Vector3(0, thickness * 20, 0));
      const direction = end.clone().sub(start);
      const length = Math.max(0.001, direction.length());
      base = start.clone().add(end).multiplyScalar(0.5);
      root.quaternion.setFromUnitVectors(UP, direction.normalize());
      return length;
    };

    switch (object.shape) {
      case "sphere":
        radius = scalar(object.size, 1);
        mesh(new THREE.SphereGeometry(radius, 48, 32));
        break;
      case "box": {
        const [w, h, d] = triple(object.size, [1.5, 1.5, 1.5]);
        mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.08));
        radius = Math.max(w, h, d) / 2;
        break;
      }
      case "cylinder":
      case "capsule":
      case "cone": {
        const connected = Boolean(from && to);
        const r = connected ? scalar(object.size, 0.12) : scalar(object.size, 0.6);
        const height = connected ? between(r) : Array.isArray(object.size) ? object.size[1] : r * 2.4;
        if (object.shape === "cylinder") mesh(new THREE.CylinderGeometry(r, r, height, 40));
        else if (object.shape === "cone") mesh(new THREE.ConeGeometry(r, height, 48));
        else mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, height - r * 2), 10, 28));
        radius = Math.max(r, height / 2);
        break;
      }
      case "torus":
        radius = scalar(object.size, 1);
        mesh(new THREE.TorusGeometry(radius, radius * 0.22, 28, 96));
        break;
      case "ring": {
        radius = scalar(object.size, 3);
        const geometry = new THREE.TorusGeometry(radius, Math.max(0.015, radius * 0.01), 8, 180);
        geometry.rotateX(Math.PI / 2); // lies flat, like an orbit path
        mesh(geometry);
        break;
      }
      case "plane": {
        const [w, , d] = triple(object.size, [10, 1, 10]);
        const geometry = new THREE.PlaneGeometry(w, d);
        geometry.rotateX(-Math.PI / 2);
        const material = this.material(object, index);
        material.side = THREE.DoubleSide;
        mesh(geometry, material);
        radius = Math.max(w, d) / 2;
        break;
      }
      case "arrow": {
        const shaft = scalar(object.size, 0.06);
        const length = between(shaft);
        const head = Math.min(length * 0.3, shaft * 7);
        const material = this.material(object, index);
        const stem = mesh(new THREE.CylinderGeometry(shaft, shaft, length - head, 24), material);
        stem.position.y = -head / 2;
        const tip = mesh(new THREE.ConeGeometry(shaft * 3, head, 32), material);
        tip.position.y = length / 2 - head / 2;
        radius = length / 2;
        break;
      }
      case "line": {
        const points = object.points?.length ? object.points.map((point) => toVector(point)) : [from!, to!];
        const center = points
          .reduce((sum, point) => sum.add(point), new THREE.Vector3())
          .multiplyScalar(1 / points.length);
        base = center;
        const local = points.map((point) => point.clone().sub(center));
        const curve = new THREE.CatmullRomCurve3(local, false, "centripetal");
        mesh(new THREE.TubeGeometry(curve, Math.max(24, local.length * 20), scalar(object.size, 0.04), 10, false));
        radius = Math.max(...local.map((point) => point.length()), 0.5);
        break;
      }
      case "label":
        radius = 0.4;
        break;
    }

    if (object.rotation && !(from && to)) {
      root.rotation.set(
        THREE.MathUtils.degToRad(object.rotation[0]),
        THREE.MathUtils.degToRad(object.rotation[1]),
        THREE.MathUtils.degToRad(object.rotation[2]),
      );
    }
    root.position.copy(base);

    if (object.glow && materials.length) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.texture(radialTexture("rgba(255,255,255,0.9)", "rgba(255,255,255,0)")),
          color: (materials[0] as THREE.MeshBasicMaterial | undefined)?.color ?? new THREE.Color(0xffffff),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0.85,
        }),
      );
      halo.scale.setScalar(radius * 4.2);
      materials.push(halo.material);
      body.add(halo);
      const light = new THREE.PointLight((materials[0] as THREE.MeshBasicMaterial).color, 60, 0, 1.5);
      body.add(light);
    }

    let label: CSS2DObject | undefined;
    if (object.label) {
      const element = document.createElement("div");
      element.className = "scene-label";
      element.textContent = object.label;
      label = new CSS2DObject(element);
      label.position.set(0, object.shape === "label" ? 0 : radius * 1.15 + 0.25, 0);
      label.center.set(0.5, 1);
      root.add(label);
      element.style.opacity = "0";
    }

    if (!this.options.motion) body.scale.setScalar(1);
    else body.scale.setScalar(0.0001);
    this.scene.add(root);
    const part: Part = { spec: object, index, root, body, materials, radius, base, label };
    this.parts.set(object.id, part);
    this.order.push(part);

    if (object.orbit) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 160 }, (_, i) => {
          const angle = (i / 160) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(angle) * object.orbit!.radius, 0, Math.sin(angle) * object.orbit!.radius);
        }),
      );
      const path = new THREE.LineLoop(
        geometry,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false }),
      );
      path.rotation.x = THREE.MathUtils.degToRad(object.orbit.tilt ?? 0);
      part.path = path;
      this.scene.add(path);
    }
  }

  private texture(texture: THREE.Texture) {
    this.textures.push(texture);
    return texture;
  }

  /** Where an orbit's centre is this frame: a fixed point, another (possibly orbiting) part, or the origin. */
  private centerOf(part: Part, time: number, depth = 0): THREE.Vector3 {
    const center = part.spec.orbit?.center;
    if (Array.isArray(center)) return toVector(center);
    if (typeof center === "string" && depth < 6) {
      const other = this.parts.get(center);
      if (other) return this.positionOf(other, time, depth + 1).clone();
    }
    return part.base.clone();
  }

  private positionOf(part: Part, time: number, depth = 0): THREE.Vector3 {
    const cached = this.positions.get(part.spec.id);
    if (cached) return cached;
    const orbit = part.spec.orbit;
    let position = part.base.clone();
    if (orbit) {
      const center = this.centerOf(part, time, depth);
      const angle =
        THREE.MathUtils.degToRad(orbit.phase ?? 0) + (this.options.motion ? time * (orbit.speed ?? 4) * TURN : 0);
      const tilt = THREE.MathUtils.degToRad(orbit.tilt ?? 0);
      const x = Math.cos(angle) * orbit.radius;
      const z = Math.sin(angle) * orbit.radius;
      position = center.add(new THREE.Vector3(x, -z * Math.sin(tilt), z * Math.cos(tilt)));
    }
    this.positions.set(part.spec.id, position);
    return position;
  }

  private placeOrbits(time: number) {
    this.positions.clear();
    for (const part of this.order) {
      if (!part.spec.orbit) continue;
      part.root.position.copy(this.positionOf(part, time));
      part.path?.position.copy(this.centerOf(part, time));
    }
  }

  /** Points the camera at the whole model (or where the tutor asked it to look). */
  private frameScene() {
    const box = new THREE.Box3();
    const reach = new THREE.Vector3();
    for (const part of this.order) {
      const orbit = part.spec.orbit;
      const center = orbit ? this.centerOf(part, 0) : part.root.position.clone();
      if (orbit) {
        // An orbit sweeps a (tilted) disc: wide, but only as tall as its tilt.
        const spread = orbit.radius + part.radius;
        const lift = Math.abs(Math.sin(THREE.MathUtils.degToRad(orbit.tilt ?? 0))) * orbit.radius + part.radius;
        reach.set(spread, lift, spread);
      } else reach.setScalar(part.radius);
      box.expandByPoint(center.clone().add(reach));
      box.expandByPoint(center.clone().sub(reach));
    }
    const size = box.getSize(new THREE.Vector3());
    let target = box.getCenter(new THREE.Vector3());
    this.radius = Math.max(0.5, Math.max(size.x, size.y, size.z) / 2);
    // Fit both ways: the vertical field of view and the horizontal one this aspect gives.
    const aspect = this.camera.aspect || 1.5;
    const vertical = THREE.MathUtils.degToRad(this.camera.fov) / 2;
    const horizontal = Math.atan(Math.tan(vertical) * aspect);
    const flat = size.y < Math.max(size.x, size.z) * 0.35;
    const fit = (this.radius / Math.tan(Math.min(vertical, horizontal))) * (flat ? 1.05 : 1.2);
    // Flat systems (orbits, floor plans) read best from higher up.
    const direction = flat ? new THREE.Vector3(0.45, 0.8, 1) : new THREE.Vector3(0.62, 0.42, 1);
    let position = target.clone().add(direction.normalize().multiplyScalar(fit));
    const asked = this.spec.camera;
    if (asked?.position) {
      const candidate = toVector(asked.position);
      const wantedTarget = asked.target ? toVector(asked.target) : target;
      const distance = candidate.distanceTo(wantedTarget);
      // Trust the tutor's camera unless it would put the model out of view.
      if (distance > this.radius * 0.8 && distance < this.radius * 6) {
        position = candidate;
        target = wantedTarget;
      }
    }
    this.home = { target, position };
    this.camera.position.copy(position);
    this.camera.near = Math.max(0.01, this.radius / 200);
    this.camera.far = this.radius * 200;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.minDistance = this.radius * 0.12;
    this.controls.maxDistance = this.radius * 9;
    this.controls.update();
  }

  private addLights() {
    const r = this.radius;
    this.scene.add(new THREE.HemisphereLight(0xe3e9ff, 0x1a1a22, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(r, r * 2, r * 1.5);
    const rim = new THREE.DirectionalLight(0x8b5cf6, 1.1);
    rim.position.set(-r * 1.4, r * 0.6, -r);
    const fill = new THREE.DirectionalLight(0x22d3ee, 0.5);
    fill.position.set(r, -r * 0.4, -r);
    this.scene.add(key, rim, fill);
  }

  private addDecor(mood: NonNullable<Scene["mood"]>) {
    const r = this.radius;
    const floor = this.home.target.y - r * 0.9;
    if (mood === "space") {
      const count = 1600;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const direction = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        direction.multiplyScalar(r * (25 + Math.random() * 25));
        positions.set([direction.x, direction.y, direction.z], i * 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size: 1.6,
          sizeAttenuation: false,
          color: 0xdfe8ff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      );
      this.decor.add(stars);
      return;
    }
    const grid = new THREE.GridHelper(
      r * 7,
      36,
      mood === "blueprint" ? 0x3b82f6 : 0x55555e,
      mood === "blueprint" ? 0x1d3557 : 0x2a2a31,
    );
    const material = grid.material as THREE.Material;
    material.transparent = true;
    material.opacity = mood === "blueprint" ? 0.45 : 0.18;
    material.depthWrite = false;
    grid.position.y = floor;
    this.decor.add(grid);
    if (mood === "studio") {
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(r * 2.4, 64),
        new THREE.MeshBasicMaterial({
          map: this.texture(radialTexture("rgba(255,255,255,0.13)", "rgba(255,255,255,0)")),
          transparent: true,
          depthWrite: false,
        }),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = floor + 0.001;
      this.decor.add(disc);
    }
  }

  // ---------------------------------------------------------------- per frame

  private tick = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    const time = (performance.now() - this.started) / 1000;
    this.animate(time, dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  };

  private animate(time: number, dt: number) {
    const stagger = Math.min(0.07, 2.4 / Math.max(1, this.order.length));
    for (const part of this.order) {
      // Build in: parts pop into being one after another.
      const progress = this.options.motion ? clamp01((time - 0.15 - part.index * stagger) / 0.75) : 1;
      part.body.scale.setScalar(Math.max(0.0001, easeOutBack(progress)));
      if (part.label) part.label.element.style.opacity = String(clamp01((progress - 0.6) / 0.4));
      if (part.path) (part.path.material as THREE.LineBasicMaterial).opacity = 0.16 * progress;
      if (part.spec.spin && this.options.motion) part.body.rotation.y += part.spec.spin * TURN * dt;
      const focused = part.spec.id === this.focusId;
      for (const material of part.materials) {
        if (material instanceof THREE.MeshPhysicalMaterial) {
          const glow = focused ? 0.28 + 0.2 * Math.sin(time * 4.2) : 0;
          material.emissive.copy(material.color).multiplyScalar(glow);
        }
      }
      part.label?.element.classList.toggle("is-focus", focused);
    }
    this.placeOrbits(time);

    // Ease the camera toward whatever the tutor (or the learner's tap) pointed at.
    if (this.goal) {
      if (this.goal.follow) {
        const part = this.parts.get(this.goal.follow);
        if (part) this.goal.target.copy(part.root.getWorldPosition(new THREE.Vector3()));
      }
      // Time-based easing: the move feels the same at any frame rate.
      const ease = 1 - Math.exp(-dt * 3.2);
      if (this.goal.position) {
        this.controls.target.lerp(this.goal.target, ease);
        this.camera.position.lerp(this.goal.position, ease);
        if (this.camera.position.distanceTo(this.goal.position) < this.radius * 0.002) this.goal = null;
        return;
      }
      this.controls.target.lerp(this.goal.target, ease);
      const offset = this.camera.position.clone().sub(this.controls.target);
      const distance = THREE.MathUtils.lerp(offset.length(), this.goal.distance, ease);
      this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
      if (
        !this.goal.follow &&
        Math.abs(distance - this.goal.distance) < 0.01 &&
        this.controls.target.distanceTo(this.goal.target) < 0.01
      ) {
        this.goal = null;
      }
    }
  }

  // ---------------------------------------------------------------- commands

  focus(id: string | null) {
    const part = id ? this.parts.get(id) : undefined;
    this.focusId = part ? part.spec.id : null;
    if (!part) return;
    this.goal = {
      target: part.root.getWorldPosition(new THREE.Vector3()),
      distance: Math.min(this.radius * 2.2, Math.max(part.radius * 6, this.radius * 0.35)),
      follow: part.spec.orbit ? part.spec.id : undefined,
    };
  }

  view(view: StageView) {
    const distance = this.camera.position.distanceTo(this.controls.target);
    switch (view) {
      case "zoom_in":
        this.goal = {
          target: this.controls.target.clone(),
          distance: Math.max(this.controls.minDistance, distance * 0.62),
        };
        break;
      case "zoom_out":
        this.goal = {
          target: this.controls.target.clone(),
          distance: Math.min(this.controls.maxDistance, distance * 1.55),
        };
        break;
      case "reset":
        this.focusId = null;
        this.goal = {
          target: this.home.target.clone(),
          distance: this.home.position.distanceTo(this.home.target),
          position: this.home.position.clone(),
        };
        this.controls.autoRotate = this.options.motion;
        break;
      case "rotate":
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 1.4;
        break;
      case "stop":
        this.controls.autoRotate = false;
        break;
      default:
        break;
    }
  }

  get rotating() {
    return this.controls.autoRotate;
  }

  /** Camera passthrough mode: the model floats in the learner's room, without its backdrop. */
  setAr(on: boolean) {
    this.decor.visible = !on;
  }

  // ---------------------------------------------------------------- input

  private onPointerDown = (event: PointerEvent) => {
    this.pointer = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent) => {
    const down = this.pointer;
    this.pointer = null;
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = ray
      .intersectObjects(
        this.order.map((part) => part.body),
        true,
      )
      .find((item) => item.object.userData.partId);
    const id = (hit?.object.userData.partId as string | undefined) ?? null;
    if (id) this.focus(id);
    this.options.onSelect(id);
  };

  private onResize() {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height);
    this.labels.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resize?.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onPointerUp);
    this.controls.dispose();
    this.scene.traverse((object) => {
      const withGeometry = object as THREE.Mesh;
      withGeometry.geometry?.dispose?.();
      const material = withGeometry.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose?.();
    });
    for (const texture of this.textures) texture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labels.domElement.remove();
  }
}
