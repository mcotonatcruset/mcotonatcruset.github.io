import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildRoom } from './room.js';
import { initUI, LINKS } from './ui.js';
import './style.css';

// side view: the camera faces the back wall and only slides along x, stopping in front of each object
// makes shares the printer's stop: the print shelf hangs on the wall above it
const STOPS = { experience: -5.4, about: -3.265, projects: -2.635, contact: -2.2, cv: -0.6, makes: -0.6, skills: 2.75 };
const START = 'projects';
const ZOOM = { experience: 0.55 }; // metres the camera moves in while that section is open
const DOOR_ANGLE = 1.75;
const FILL = 0.92; // share of the view the monitor fills once the camera is inside it
const WALL_Z = -5;
const EYE_Y = 1.35;
const LOOK_Y = 1.15;
const FOV = 32;
const GLOW = new THREE.Color(0x5a3a14);
const PANEL_W = 440;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const xs = Object.values(STOPS);
const SORTED = [...new Set(xs)].sort((a, b) => a - b);
// on portrait screens the bonsai bench is wider than the view: one more stop at each end, so every tree can be reached
const PORTRAIT = [...SORTED, 1.7, 3.8].sort((a, b) => a - b);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#scene'), antialias: true, alpha: true });
} catch {
  // ponytail: no WebGL → menu + panels only, same content
  document.body.classList.add('no3d');
  document.querySelector('.loading').hidden = true;
  initUI({});
}

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.85;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  // soft studio reflections so wood, metal and screens read as different materials
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.15;

  // evening: low warm sun through the terrace door, dim cool fill, the desk lit by its lamp and screens
  scene.add(new THREE.HemisphereLight('#9fb0d6', '#2e241e', 0.3));
  const sun = new THREE.DirectionalLight('#ffbb88', 2.2);
  sun.position.set(7.5, 5, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 4;
  sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 8, bottom: -8, far: 40 });
  scene.add(sun);
  const lamp = new THREE.PointLight('#ffc48a', 6, 7);
  lamp.position.set(-3, 1.9, -3.9);
  scene.add(lamp);
  const monitors = new THREE.PointLight('#a9bcff', 1.2, 2.5);
  monitors.position.set(-2.95, 1.0, -4.1);
  scene.add(monitors);

  // the models (wardrobe kit, bonsais, Totoro) stream in after the first frame: say so until they're all here
  const loading = document.querySelector('.loading');
  THREE.DefaultLoadingManager.onProgress = (url, done, total) => { loading.dataset.progress = `${Math.round((done / total) * 100)}%`; };
  THREE.DefaultLoadingManager.onLoad = THREE.DefaultLoadingManager.onError = () => { loading.hidden = true; };
  const { doors, screens, sign, paint } = buildRoom(scene);
  const screenEl = document.querySelector('.screen');

  scene.traverse((o) => { if (o.material?.emissive) o.userData.e0 = o.material.emissive.getHex(); });

  function nearest(x) {
    let best;
    for (const id in STOPS) if (!best || Math.abs(STOPS[id] - x) < Math.abs(STOPS[best] - x)) best = id;
    return best;
  }

  // ---- walking ----
  let x = STOPS[START];
  let goal = x;
  let focused = null;
  let dir = 0; // last direction of travel, so a slow wheel still reaches the next object
  let snapTimer;
  const lean = new THREE.Vector2(); // pointer-driven head tilt, for depth
  const leanGoal = new THREE.Vector2();

  const stops = () => (camera.aspect < 1 ? PORTRAIT : SORTED);
  const clampX = (v) => Math.min(stops().at(-1), Math.max(stops()[0], v));
  const go = (v) => {
    v = clampX(v);
    if (v !== goal) dir = Math.sign(v - goal);
    goal = v;
  };
  // settle on the next object in the direction of travel (a small tolerance lets a tiny nudge fall back)
  function snap() {
    const ahead = dir > 0 ? stops().find((s) => s >= goal - 0.2) : dir < 0 ? stops().findLast((s) => s <= goal + 0.2) : undefined;
    goal = ahead ?? STOPS[nearest(goal)];
    dir = 0;
  }
  const snapSoon = () => { clearTimeout(snapTimer); snapTimer = setTimeout(snap, 160); };

  // distance from the wall: pull back on portrait screens so an object still fits
  const distance = () => (camera.aspect < 1 ? 6.5 : 5);
  // metres of wall visible across the screen, so a drag moves the room 1:1 with the finger
  const wallWidth = () => 2 * distance() * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * camera.aspect;

  // keep the focused object visible next to the panel: right side panel on desktop, bottom sheet (78vh) on mobile
  function offset() {
    if (!focused || focused === 'experience' || focused === 'skills' || screens[focused]) return camera.clearViewOffset(); // no side panel for these
    const wide = innerWidth > 800;
    camera.setViewOffset(innerWidth, innerHeight, wide ? PANEL_W / 2 : 0, wide ? 0 : innerHeight * 0.39, innerWidth, innerHeight);
  }

  const ui = initUI({
    onWalk: (id) => go(STOPS[id]),
    onOpen: (id) => { focused = id; go(STOPS[id]); offset(); },
    onClose: () => { focused = null; offset(); highlight(null); tip.hidden = true; },
    onLang: (t) => { sign(t.ui.bonsaiSign); paint(t, LINKS); },
  });

  addEventListener('wheel', (e) => {
    if (focused || ui.cardOpen()) return;
    highlight(null);
    tip.hidden = true;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    go(goal + d * (e.deltaMode === 1 ? 16 : 1) * 0.004);
    snapSoon();
  }, { passive: true });

  addEventListener('keydown', (e) => {
    if (focused || ui.cardOpen() || e.target.tagName === 'SELECT' || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    const s = stops();
    const i = s.indexOf(s.reduce((b, v) => (Math.abs(v - goal) < Math.abs(b - goal) ? v : b)));
    go(s[Math.max(0, Math.min(s.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)))]);
  });

  // ---- picking + dragging ----
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const tip = document.querySelector('.tooltip');
  const canvas = renderer.domElement;
  let hovered = null;
  let drag = null;

  function pick(e) {
    ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    let o = ray.intersectObject(scene, true)[0]?.object;
    // in the open wardrobe each garment is its own target, on the open terrace each bonsai; while walking, a bonsai,
    // a print or a note, or else the whole object of a section
    const key = focused === 'experience' ? 'item' : focused === 'skills' ? 'skill' : focused ? null : 'section';
    for (; o && key; o = o.parent) if (o.userData[key] !== undefined || (!focused && (o.userData.skill !== undefined || o.userData.print !== undefined || o.userData.note))) return o;
  }
  const label = ({ userData: u }) => (u.note ? ui.note(u.note) : u.section ? ui.label(u.section) : u.skill !== undefined ? ui.itemLabel(u.skill, 'skills')
    : u.print !== undefined ? ui.itemLabel(u.print, 'makes') : ui.itemLabel(u.item));

  function highlight(t) {
    if (t === hovered) return;
    hovered?.traverse((m) => m.isMesh && m.material.emissive.setHex(m.userData.e0));
    hovered = t;
    t?.traverse((m) => m.isMesh && m.material.emissive.add(GLOW));
    canvas.style.cursor = t && !t.userData.note ? 'pointer' : '';
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (focused) return; // no walking while a section is open
    drag = { x0: e.clientX, goal0: goal, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') leanGoal.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    if (drag) {
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) {
        go(drag.goal0 - (dx / innerWidth) * wallWidth());
        highlight(null);
        tip.hidden = true;
        canvas.style.cursor = 'grabbing';
        return;
      }
    }
    if (e.pointerType !== 'mouse') return;
    const t = pick(e);
    highlight(t);
    tip.hidden = !t;
    if (t) {
      tip.textContent = label(t);
      tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    const wasDrag = drag?.moved;
    drag = null;
    canvas.style.cursor = hovered && !hovered.userData.note ? 'pointer' : '';
    if (wasDrag) return snap();
    const t = pick(e);
    if (focused === 'experience') return t ? ui.showItem(t.userData.item, e.clientX, e.clientY) : ui.hideItem();
    if (!t || t.userData.note) return;
    highlight(null);
    tip.hidden = true;
    if (t.userData.skill !== undefined) return ui.showCard('skills', t.userData.skill);
    if (t.userData.print !== undefined) return ui.showCard('makes', t.userData.print);
    ui.open(t.userData.section);
  });
  canvas.addEventListener('pointercancel', () => { drag = null; snap(); });
  canvas.addEventListener('pointerleave', () => { highlight(null); tip.hidden = true; leanGoal.set(0, 0); });

  // ---- loop ----
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    offset();
  }
  addEventListener('resize', resize);
  resize();

  let last = 0;
  let active = null;
  let zoom = 0;
  let open = 0;
  let dive = 0; // 0 = in the room, 1 = inside a monitor
  let screen = null;
  const look = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const span = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  // distance at which the screen fills FILL of the view
  const diveDist = ({ width: w, height: h }) => Math.max(h / span, w / (span * camera.aspect)) / FILL;
  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 7);
    x += (goal - x) * k;
    if (!reduceMotion) lean.lerp(leanGoal, 1 - Math.exp(-dt * 3));
    const slow = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.5);
    // ponytail: half the zoom on narrow screens, or the object no longer fits across
    zoom += ((ZOOM[focused] ?? 0) * (innerWidth > 800 ? 1 : 0.5) - zoom) * slow;
    open += ((focused === 'experience' ? 1 : 0) - open) * slow;
    doors[0].rotation.y = -open * DOOR_ANGLE;
    doors[1].rotation.y = open * DOOR_ANGLE;
    // the last monitor stays the target while flying back out of it
    if (screens[focused]) screen = screens[focused];
    dive += ((screens[focused] ? 1 : 0) - dive) * slow;
    // the eye moves a little with the pointer while the gaze stays on the wall: nearer things shift more
    const still = 1 - dive;
    camera.position.set(x + lean.x * 0.25 * still, EYE_Y - lean.y * 0.12 * still, WALL_Z + distance() - zoom);
    look.set(x, LOOK_Y, WALL_Z);
    const size = screen?.geometry.parameters;
    if (screen && dive > 0.001) {
      // straight in front of the screen, along its normal (the phone leans back on its stand)
      screen.getWorldPosition(p);
      n.set(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(q));
      camera.position.lerp(a.copy(p).addScaledVector(n, diveDist(size)), dive);
      look.lerp(p, dive);
    }
    camera.lookAt(look);
    if (screen && !screenEl.hidden) {
      // the HTML rides on the monitor: laid out at its final size, scaled to where the screen is right now
      camera.updateMatrixWorld();
      screen.localToWorld(a.set(-size.width / 2, size.height / 2, 0)).project(camera);
      screen.localToWorld(b.set(size.width / 2, 0, 0)).project(camera);
      const w = (size.width / (diveDist(size) * span * camera.aspect)) * innerWidth;
      Object.assign(screenEl.style, {
        width: `${w}px`,
        height: `${(size.height / (diveDist(size) * span)) * innerHeight}px`,
        transform: `translate(${((a.x + 1) / 2) * innerWidth}px, ${((1 - a.y) / 2) * innerHeight}px) scale(${(((b.x - a.x) / 2) * innerWidth) / w})`,
        opacity: Math.min(1, Math.max(0, (dive - 0.8) / 0.17)), // reaches 1: the approach is asymptotic, so /0.2 stalls at 0.99
      });
    }
    const here = nearest(x);
    if (here !== active) ui.active((active = here));
    renderer.render(scene, camera);
  });
}
