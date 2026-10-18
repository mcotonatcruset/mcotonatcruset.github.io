import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Units ≈ metres. Seen from the side: the camera looks at the back wall (z = -5) and slides along x.
// Room: x -6.4..0.5. Terrace: x 0.5..5.1. Things near z = 0 are foreground and pass faster (parallax).
// Any group with userData.section is clickable and opens that section.

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

function add(parent, geo, color, x, y, z, extra) {
  const m = new THREE.Mesh(geo, mat(color, extra));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
// slightly rounded edges catch the light: nothing real has a perfectly sharp corner
const box = (p, w, h, d, color, x, y, z, extra) =>
  add(p, new RoundedBoxGeometry(w, h, d, 2, Math.min(0.012, Math.min(w, h, d) * 0.25)), color, x, y, z, extra);
const cyl = (p, rt, rb, h, color, x, y, z, seg = 10) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z);
const glow = (color, i = 1.2) => ({ emissive: color, emissiveIntensity: i });

function group(scene, section) {
  const g = new THREE.Group();
  if (section) g.userData.section = section;
  scene.add(g);
  return g;
}

// a sub-group placed at (x, y, z), so a piece can be modelled around its own origin
function part(parent, x, y, z, ry = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  parent.add(g);
  return g;
}

function shell(scene) {
  const g = group(scene);
  box(g, 6.9, 0.2, 6, '#a07f60', -2.95, -0.1, -2, { roughness: 0.6 });  // oak floor
  for (let z = -4.4; z < 1; z += 0.6) box(g, 6.9, 0.004, 0.015, '#8f6f53', -2.95, 0.002, z); // floorboards
  box(g, 4.6, 0.2, 6, '#77736d', 2.8, -0.15, -2, { roughness: 0.9 }); // terrace deck
  box(g, 6.9, 4.6, 0.2, '#7f92a8', -2.95, 2.3, -5.1, { roughness: 0.95 }); // back wall, slate blue: the complement of the terracotta accent, like the keycaps and the blue spool
  box(g, 0.2, 4.6, 6, '#7489a0', -6.5, 2.3, -2, { roughness: 0.95 });     // left wall, end of the walk
  box(g, 6.9, 0.1, 0.02, '#efebe4', -2.95, 0.05, -4.99);  // skirting
  box(g, 0.02, 0.1, 6, '#efebe4', -6.39, 0.05, -2);
  // open sliding door to the terrace: back post on the wall, front post in the foreground
  box(g, 0.12, 2.6, 0.12, '#efebe4', 0.5, 1.3, -4.9);
  box(g, 0.14, 3.6, 0.14, '#efebe4', 0.5, 1.8, -0.4);
  box(g, 0.12, 0.04, 4.6, '#efebe4', 0.5, 0.02, -2.7);
  // terrace railing, behind the bonsai
  for (let x = 0.8; x <= 5.1; x += 0.5) box(g, 0.05, 0.9, 0.05, '#34332f', x, 0.45, -4.9, METAL);
  box(g, 4.4, 0.05, 0.07, '#34332f', 2.9, 0.92, -4.9, METAL);
}

const BLACK = '#1f2024';
const METAL = { metalness: 0.6, roughness: 0.4 };
const RGB = ['#ff3d7f', '#8a5cff', '#2ad4ff'];
// real proportions: a 1.9 m desk with its surface at 74 cm, two 27" monitors on a dual arm
const TOP = 0.74;
const SCREEN_Y = TOP + 0.38;
const ARM = [-2.95, -4.9]; // x, z of the monitor arm pole

function desk(scene) {
  // decoration: the monitors and the phone on it are the sections
  const g = group(scene);
  box(g, 1.9, 0.035, 0.8, '#6e5440', -3, TOP - 0.0175, -4.55, { roughness: 0.55 }); // walnut top
  for (const x of [-3.88, -2.12]) {                                   // black steel T-legs
    box(g, 0.06, TOP - 0.06, 0.06, BLACK, x, TOP / 2, -4.55, METAL);
    box(g, 0.07, 0.03, 0.7, BLACK, x, 0.015, -4.55, METAL);
    box(g, 0.06, 0.025, 0.7, BLACK, x, TOP - 0.05, -4.55, METAL);
  }
  box(g, 1.7, 0.05, 0.025, BLACK, -3, TOP - 0.1, -4.85, METAL);          // crossbar
  box(g, 1.7, 0.01, 0.01, RGB[1], -3, TOP + 0.005, -4.93, glow(RGB[1], 0.9)); // LED strip behind the monitors
  // dual monitor arm: clamp on the back edge and a pole; each monitor() adds its own arm
  box(g, 0.06, 0.08, 0.08, '#2a2b30', ARM[0], TOP - 0.03, ARM[1], METAL);
  add(g, new THREE.CylinderGeometry(0.018, 0.018, 0.48, 16), '#2a2b30', ARM[0], TOP + 0.24, ARM[1], METAL);
  cyl(g, 0.026, 0.026, 0.05, BLACK, ARM[0], SCREEN_Y, ARM[1], 16);    // collar
  const light = new THREE.PointLight(RGB[1], 1.2, 1.8);
  light.position.set(-3, TOP + 0.15, -4.9);
  g.add(light);

  box(g, 0.9, 0.004, 0.4, '#25262a', -2.95, TOP + 0.002, -4.38, { roughness: 0.9 }); // desk mat
  keyboard(part(g, -2.98, TOP + 0.004, -4.37)).userData.note = 'keyboard'; // hover-only notes: ui.keyboard / ui.mouse
  mouse(part(g, -2.68, TOP + 0.004, -4.35, -0.1)).userData.note = 'mouse';
  box(g, 0.15, 0.012, 0.21, '#cfc4b0', -3.38, TOP + 0.006, -4.3).rotation.y = 0.2;  // kraft notebook
  box(g, 0.008, 0.008, 0.14, '#2b2d31', -3.35, TOP + 0.016, -4.3).rotation.y = 0.2; // pen
  // mug, next to the PC
  add(g, new THREE.CylinderGeometry(0.042, 0.04, 0.095, 20), '#eeeae3', -3.6, TOP + 0.048, -4.33, { roughness: 0.3 });
  cyl(g, 0.036, 0.036, 0.004, '#3b2a20', -3.6, TOP + 0.09, -4.33, 20);
  add(g, new THREE.TorusGeometry(0.022, 0.007, 8, 16), '#eeeae3', -3.553, TOP + 0.05, -4.33, { roughness: 0.3 });
}

// 75% keyboard: blue keycaps, navy mods, orange accents. Per row: colour + width in key units, *n repeats, _ is a gap
const KEYS = [
  'o1 _.25 b1*4 _.25 n1*4 _.25 b1*4 _.25 n1',
  'b1*13 n2 _.25 n1',
  'n1.5 b1*12 b1.5 _.25 n1',
  'n1.75 b1*11 o2.25 _.25 n1',
  'n2.25 b1*10 n1.75 _.25 o1 n1',
  'n1.25*3 o6.25 n1*3 _.25 o1*3',
];
const KEYCAP = { b: '#2f5c96', n: '#232838', o: '#f0a040' };
function keyboard(k) {
  const U = 0.019;
  box(k, 0.33, 0.026, 0.145, '#18191c', 0, 0.013, 0, METAL);          // aluminium case
  KEYS.forEach((row, r) => {
    const z = -0.0595 + (r + (r && 0.25) + 0.5) * U;                  // gap under the F row
    let u = 0;
    for (const t of row.split(' ')) {
      const [, c, w, n = 1] = t.match(/^(\w)([\d.]+)(?:\*(\d+))?$/);
      for (let i = 0; i < n; i++, u += +w)
        if (c !== '_') box(k, w * U - 0.003, 0.011, U - 0.003, KEYCAP[c], -0.154 + (u + w / 2) * U, 0.029, z, { roughness: 0.5 });
    }
  });
  cyl(k, 0.008, 0.008, 0.014, '#111', -0.154 + 15.75 * U, 0.033, -0.0595 + 0.5 * U, 20); // knob
  return k;
}

// white wireless mouse (G Pro X Superlight 2):an egg with the hump at the back, black wheel, two side buttons
function mouse(m) {
  const white = { roughness: 0.45 };
  const body = add(m, new THREE.SphereGeometry(1, 24, 16), '#f1f0ec', 0, 0, 0, white);
  body.scale.set(0.031, 0.036, 0.062);
  body.rotation.x = -0.12;                                            // front dips toward the buttons
  const wheel = cyl(m, 0.009, 0.009, 0.006, '#151515', 0, 0.028, -0.03, 16);
  wheel.rotation.z = Math.PI / 2;
  for (const z of [-0.012, 0.008]) box(m, 0.004, 0.006, 0.016, '#e4e3df', -0.03, 0.018, z, white);
  return m;
}

function chair(scene) {
  // gaming chair, rolled aside to the right of the desk so it doesn't hide the screens,
  // and close enough to the desk that it doesn't hide the printer either
  const c = part(group(scene), -1.82, 0, -4.3, 0.9);                  // seat turned toward the desk
  const fabric = { roughness: 0.9 };
  for (let i = 0; i < 5; i++) {                                      // star base on casters
    const leg = part(c, 0, 0.07, 0, (i / 5) * Math.PI * 2);
    box(leg, 0.04, 0.03, 0.3, BLACK, 0, 0, 0.15, METAL);
    cyl(leg, 0.025, 0.025, 0.04, '#111', 0, -0.04, 0.29, 12).rotation.z = Math.PI / 2;
  }
  add(c, new THREE.CylinderGeometry(0.025, 0.025, 0.34, 16), '#8a8d93', 0, 0.25, 0, METAL); // gas lift
  box(c, 0.52, 0.09, 0.5, BLACK, 0, 0.46, 0, fabric);                 // seat
  box(c, 0.2, 0.092, 0.44, '#4a4c52', 0, 0.462, 0, fabric);
  const back = part(c, 0, 0.5, 0.23);
  back.rotation.x = 0.12;                                            // slight recline
  box(back, 0.48, 0.62, 0.08, BLACK, 0, 0.33, 0, fabric);
  box(back, 0.18, 0.54, 0.082, '#4a4c52', 0, 0.32, 0, fabric);
  for (const s of [-1, 1]) box(back, 0.07, 0.5, 0.13, BLACK, s * 0.25, 0.28, -0.02, fabric); // side bolsters
  box(back, 0.28, 0.12, 0.09, BLACK, 0, 0.7, 0, fabric);             // headrest
  for (const s of [-1, 1]) {                                         // armrests
    box(c, 0.04, 0.2, 0.04, BLACK, s * 0.27, 0.58, 0.02, METAL);
    box(c, 0.07, 0.03, 0.26, '#2a2b30', s * 0.27, 0.69, 0);
  }
}

function gamingPC(scene) {
  // mid tower on the left end of the desk; the front with the fans faces the camera
  const g = part(group(scene), -3.78, TOP, -4.7);
  g.userData.note = 'pc';                                             // hover-only: ui.pc
  for (const dx of [-0.08, 0.08]) for (const dz of [-0.18, 0.18]) box(g, 0.035, 0.02, 0.035, '#111', dx, 0.01, dz);
  box(g, 0.21, 0.46, 0.44, '#17181c', 0, 0.25, 0, METAL);             // case
  box(g, 0.18, 0.43, 0.008, '#24262c', 0, 0.25, 0.222);               // mesh front
  RGB.forEach((c, i) => {
    const fan = add(g, new THREE.TorusGeometry(0.058, 0.007, 8, 24), c, 0, 0.1 + i * 0.135, 0.228, glow(c, 1));
    for (let b = 0; b < 3; b++) box(fan, 0.095, 0.018, 0.003, '#30323a', 0, 0, -0.004).rotation.z = (b / 3) * Math.PI;
  });
  box(g, 0.01, 0.01, 0.008, '#fafafa', 0.07, 0.455, 0.226, glow('#fafafa', 0.6)); // power button
}

// the page's fonts (style.css: --serif, --sans), for text drawn on canvases; never rejects, so a failed load
// still draws, with the fallback
const SERIF = '"Young Serif", Georgia, serif';
const SANS = '"Atkinson Hyperlegible Next", system-ui, sans-serif';
const FONTS = Promise.all([`24px ${SERIF}`, `24px ${SANS}`, `bold 24px ${SANS}`].map((f) => document.fonts.load(f))).catch(() => {});

// what a screen shows from the room: the section's real first lines, in the page's language, on the same sheet the
// HTML uses once the camera is inside (style.css: --surface, --chip, --ink, --muted, --line, --accent).
// Returns { tex, draw(page) }; page = { bar, title, lines: [paragraphs], rows: [[label, text]] }
const [SURFACE, CHIP, INK, MUTED, LINE, ACCENT] = ['#fcf9f8', '#f4eae6', '#27201d', '#705f58', '#e5dad5', '#b44c31'];
function screenArt(W = 640, H = 360) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const x = c.getContext('2d');
  x.fillStyle = SURFACE; // blank sheet until the first draw()
  x.fillRect(0, 0, W, H);
  const s = W / 640 > 0.5 ? 1 : 0.6; // the phone's canvas is narrow: smaller type, same layout
  const pad = 40 * s;
  // word-wraps into at most max lines, the last one cut with an ellipsis
  const wrap = (text, width, max) => {
    const out = [];
    let line = '';
    for (const w of text.split(' ')) {
      const next = line ? `${line} ${w}` : w;
      if (x.measureText(next).width <= width) { line = next; continue; }
      out.push(line);
      line = w;
      if (out.length === max) break;
    }
    if (out.length < max) out.push(line);
    else out[max - 1] = out[max - 1].replace(/\s*\S*$/, '…');
    return out;
  };
  return {
    tex,
    draw(page) {
      x.fillStyle = SURFACE;
      x.fillRect(0, 0, W, H);
      x.fillStyle = CHIP;
      x.fillRect(0, 0, W, 30);
      x.textAlign = 'left';
      x.fillStyle = MUTED;
      x.font = `bold 15px ${SANS}`;
      x.fillText(page.bar, 16, 20);
      let y = 30 + 48 * s;
      x.fillStyle = INK;
      x.font = `${34 * s}px ${SERIF}`;
      x.fillText(page.title, pad, y);
      y += 22 * s;
      x.font = `${17 * s}px ${SANS}`;
      for (const p of page.lines) {
        for (const l of wrap(p, W - pad * 2, 3)) x.fillText(l, pad, (y += 24 * s));
        y += 10 * s;
      }
      for (const [label, text] of page.rows) {
        if (y + 52 * s > H - 8) break; // a row is 52px: never cut one at the bottom edge
        x.fillStyle = LINE;
        x.fillRect(pad, (y += 8 * s), W - pad * 2, 1);
        x.fillStyle = MUTED;
        x.font = `${14 * s}px ${SANS}`;
        x.fillText(label, pad, (y += 22 * s));
        x.fillStyle = ACCENT;
        x.font = `bold ${16 * s}px ${SANS}`;
        x.fillText(wrap(text, W - pad * 2, 1)[0], pad, (y += 22 * s));
      }
      tex.needsUpdate = true;
    },
  };
}

const ARTS = {}; // section -> screenArt(), filled by monitor() and phone()

// returns the screen mesh: main.js flies the camera into it and lays the section's HTML over it
function monitor(scene, section, x) {
  const g = group(scene, section);
  const [w, h, y, z] = [0.6, 0.335, SCREEN_Y, -4.72];
  // arm from the pole to the back of the monitor, with an elbow joint
  const [dx, dz] = [x - ARM[0], z - 0.08 - ARM[1]];
  box(g, Math.hypot(dx, dz), 0.035, 0.045, '#2a2b30', ARM[0] + dx / 2, y, ARM[1] + dz / 2, METAL).rotation.y = -Math.atan2(dz, dx);
  cyl(g, 0.024, 0.024, 0.06, BLACK, x, y, z - 0.08, 16);
  box(g, 0.1, 0.1, 0.03, BLACK, x, y, z - 0.065);                    // VESA mount
  box(g, w * 0.6, h * 0.6, 0.03, BLACK, x, y, z - 0.04);             // rear housing
  box(g, w + 0.016, h + 0.03, 0.02, BLACK, x, y - 0.007, z - 0.012, { roughness: 0.4 }); // thin bezel, slim chin
  const art = (ARTS[section] = screenArt()).tex;
  return add(g, new THREE.PlaneGeometry(w, h), '#111', x, y, z, { map: art, emissive: '#fff', emissiveMap: art, emissiveIntensity: 0.75, roughness: 0.6 });
}

// returns the screen mesh, like monitor(); faces the camera (no turn) so the HTML can be laid over it straight
function phone(scene) {
  const g = group(scene, 'contact');
  const p = part(g, -2.2, TOP, -4.5);
  box(p, 0.08, 0.008, 0.07, '#3a3c43', 0, 0.004, 0, METAL);          // aluminium stand
  box(p, 0.06, 0.09, 0.008, '#3a3c43', 0, 0.045, -0.03, METAL).rotation.x = -0.35;
  box(p, 0.08, 0.02, 0.012, '#3a3c43', 0, 0.012, 0.024, METAL);      // lip
  const ph = part(p, 0, 0.088, 0);
  ph.rotation.x = -0.3;                                              // leaning back on the stand
  box(ph, 0.075, 0.155, 0.008, '#15161a', 0, 0, 0, { roughness: 0.3 });
  const art = (ARTS.contact = screenArt(270, 540)).tex;
  return add(ph, new THREE.PlaneGeometry(0.068, 0.145), '#111', 0, 0, 0.0045, { map: art, emissive: '#fff', emissiveMap: art, emissiveIntensity: 0.75, roughness: 0.2 });
}

// a spot on the rod at x, turned sideways like in a real wardrobe so they overlap; glb() hangs a wooden
// hanger and the garment there. item = index in sections.experience.items: clicking it in the open wardrobe pops that card
function onRod(p, x, item) {
  const g = part(p, x, 0, 0, 0.9);
  if (item !== undefined) g.userData.item = item;
  return g;
}

// clothes, shoes, hangers, ball and hoop are modelled in Blender (public/models/kit.glb), real size; so are the
// bonsais (public/models/bonsais.glb, origin at the pot's bottom centre).
// Origins: garments top centre, hangers on the rod, shoes/'Plegat' bottom centre, ball centre, hoop board centre.
// slots = [[node name, parent, scale, y, tint?]].
// Loads after the first frame, so it sets e0 for main.js' hover; materials are cloned so hover lights one garment only.
function glb(slots, file = 'kit') {
  new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${file}.glb`, (gltf) => {
    for (const [name, p, s, y, tint] of slots) {
      const m = gltf.scene.getObjectByName(name).clone();
      m.position.set(0, y, 0);
      m.scale.setScalar(s);
      m.traverse((o) => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        if (tint) o.material.color.set(tint);
        o.castShadow = o.receiveShadow = true;
        o.userData.e0 = 0;
      });
      p.add(m);
    }
  });
}

function wardrobe(scene) {
  const g = group(scene, 'experience');
  // ponytail: modelled at 2 × 2.6 m, scaled to a real 1.6 × 2.1 m around its base against the wall
  g.scale.setScalar(0.8);
  g.position.set(-5.4 + 6 * 0.8, 0, -5 * 0.2); // centre at x -5.4
  // carcass (sides, crown, plinth, divider, shelves at y 0.7/1.25/1.8, rail at y 2.2) is one model, origin at its bottom centre
  const slots = [['Armari', part(g, -6, 0, -4.55), 1, 0]];

  // left: hanging clothes, sneakers below
  const rod = part(g, 0, 2.2, -4.55);
  // jacket = current job, shirt = Accenture, tee = internship, hoodie = UOC, pants = DAM
  [['Americana', 0], ['Camisa', 1], ['Dessuadora', 3], ['Samarreta', 2], ['PantalonsLlargs', 4]].forEach(([name, item], i) => {
    const spot = onRod(rod, -6.61 + i * 0.18, item);
    const pants = name === 'PantalonsLlargs';
    slots.push([pants ? 'PenjadorPantalons' : 'PenjadorSamarreta', spot, 0.8, 0], [name, spot, 0.8, pants ? -0.19 : -0.04]);
  });
  // running, smart and basketball shoes; the models are right feet, the left one is mirrored
  ['SabatesCorrer', 'SabatesMudar', 'SabatesBasquet'].forEach((name, i) => {
    for (const s of [-1, 1]) {
      const foot = part(g, -6.74 + i * 0.37 + s * 0.06, 0.205, -4.45, s * 0.04);
      foot.scale.x = s;
      slots.push([name, foot, 1, 0]);
    }
  });

  // right: shelves with folded clothes, the basketball at the bottom
  const fold = ['#384e6b', '#8a9bb0', '#a8604c', '#cdb88a', '#3b3f4a', '#6b7b5e'];
  [0.7, 1.25, 1.8].forEach((y, i) => {
    for (let j = 0; j < 3; j++) slots.push(['Plegat', part(g, -5.37, y + 0.015 + j * 0.085, -4.7), 1, 0, fold[(i * 2 + j) % fold.length]]);
  });
  // turn the spot where all four seams meet (the model's +Y pole) towards the viewer, a bit off-centre
  const ball = part(g, -5.37, 0.42, -4.6);
  ball.quaternion.setFromUnitVectors(new THREE.Vector3(-0.3, 1, 0.4).normalize(), new THREE.Vector3(0, 0, 1));
  slots.push(['Pilota', ball, 0.2 / 0.12, 0]); // r 0.2 here, the model is a real 12 cm ball

  // doors hinge on the outer edges; main.js swings them open while the section is open.
  // 'Porta' is the right door (origin on the hinge); the left one mirrors only the model, not what hangs on the door
  const doors = [-1, 1].map((s) => {
    const d = part(g, -6 + s * 0.975, 1.375, -4.08);
    const look = part(d, 0, 0, 0);
    look.scale.x = s;
    slots.push(['Porta', look, 1, 0]);
    return d;
  });
  // mini hoop on the inside of the right door (phase 2: mini-game)
  slots.push(['Cistella', part(doors[1], -0.485, 0.45, -0.03, Math.PI), 1.1, 0]);

  // the left door is the locker: match jerseys and shorts on two hooks, facing in (rotated π)
  const hook = (y) => {
    cyl(doors[0], 0.012, 0.012, 0.05, '#b9b4ab', 0.485, y, -0.045).rotation.x = Math.PI / 2;
    return part(doors[0], 0.485, y, -0.03, Math.PI);
  };
  const jerseys = hook(0.72);
  const away = part(jerseys, 0.06, 0, 0.0); // peeks out on the hinge side, clear of the gap between the doors
  away.rotation.z = 0.1;
  const home = part(jerseys, 0, 0, 0.025);
  glb([...slots, ['Partit2na', away, 1, 0], ['Partit1ra', home, 1, 0], ['Pantalons', hook(-0.3), 1, 0]]);
  return doors;
}

// matte PLA
const MATTE = { roughness: 0.55 };
const PLA = { terracotta: '#b5694f' };

function printer(scene) {
  const g = group(scene, 'cv');
  box(g, 0.5, 0.6, 0.45, '#e2ddd5', -0.6, 0.3, -4.75);                // side cabinet
  box(g, 0.48, 0.006, 0.008, '#c8c2b8', -0.6, 0.35, -4.525);          // drawer line
  box(g, 0.12, 0.015, 0.015, '#b9b4ab', -0.6, 0.48, -4.52, METAL);    // handle

  // Ender-3 V3 SE at real size
  const e = part(g, -0.6, 0.6, -4.78);
  const black = '#1e1f23';
  const alu = { ...METAL, color: '#2b2d31' };    // black anodised 2020 extrusions
  const steel = { metalness: 0.9, roughness: 0.3 };
  for (const x of [-0.15, 0.15]) for (const z of [-0.13, 0.13]) cyl(e, 0.012, 0.012, 0.008, '#111', x, 0.004, z, 12);
  box(e, 0.33, 0.06, 0.3, black, 0, 0.038, 0);                         // base, PSU inside
  box(e, 0.07, 0.006, 0.002, '#6b6f76', -0.09, 0.04, 0.151);           // logo plate
  // screen on the front right, tilted up towards you
  const ui = part(e, 0.115, 0.075, 0.165);
  ui.rotation.x = -0.6;
  box(ui, 0.095, 0.065, 0.014, black, 0, 0, 0);
  box(ui, 0.075, 0.048, 0.002, '#3d7bd9', 0, 0.002, 0.008, glow('#3d7bd9', 0.9));
  // Y: dual rails, heated bed with the textured PEI plate
  for (const x of [-0.06, 0.06]) box(e, 0.012, 0.01, 0.3, '#b8bcc2', x, 0.073, 0, steel);
  box(e, 0.16, 0.012, 0.12, black, 0, 0.084, 0.01);                    // carriage
  box(e, 0.235, 0.006, 0.235, '#9aa0a6', 0, 0.094, 0.01, METAL);        // heated bed
  box(e, 0.23, 0.002, 0.23, '#2f2c28', 0, 0.098, 0.01, { roughness: 0.8 }); // PEI sheet
  for (const x of [-0.1, 0.1]) cyl(e, 0.008, 0.008, 0.008, '#c9b48c', x, 0.092, 0.115, 12); // levelling knobs
  // Z: two extrusions, a lead screw and a motor on each side, top bar
  for (const s of [-1, 1]) {
    box(e, 0.02, 0.42, 0.02, alu.color, s * 0.165, 0.275, -0.04, alu);
    box(e, 0.042, 0.042, 0.042, black, s * 0.14, 0.09, -0.04);          // Z motor
    add(e, new THREE.CylinderGeometry(0.004, 0.004, 0.36, 8), '#b8bcc2', s * 0.14, 0.29, -0.04, steel); // lead screw
    box(e, 0.03, 0.03, 0.03, '#3a3c43', s * 0.175, 0.47, -0.04);        // top corner bracket
  }
  box(e, 0.37, 0.02, 0.02, alu.color, 0, 0.495, -0.04, alu);            // top bar
  // X: gantry at print height, motor on the left, belt along the front
  const y = 0.25;
  box(e, 0.36, 0.03, 0.02, alu.color, 0, y, -0.025, alu);
  box(e, 0.042, 0.042, 0.042, black, -0.2, y, -0.02);                   // X motor
  box(e, 0.34, 0.006, 0.002, '#111', 0, y + 0.006, -0.0145);            // belt
  // Sprite toolhead: compact black block, part-cooling fan on the front, brass nozzle
  const th = part(e, 0.03, y - 0.01, 0.012);
  box(th, 0.06, 0.08, 0.05, black, 0, 0, 0);
  add(th, new THREE.TorusGeometry(0.016, 0.003, 8, 20), '#5a5d63', 0, -0.005, 0.026);
  box(th, 0.02, 0.003, 0.002, '#d9d4cc', 0, 0.03, 0.026);               // logo
  add(th, new THREE.ConeGeometry(0.005, 0.012, 8), '#c9a227', 0, -0.046, 0, METAL).rotation.x = Math.PI;
  // spool holder on the top bar, the spool side-on
  box(e, 0.012, 0.05, 0.012, alu.color, 0.06, 0.53, -0.04, alu);
  const spool = part(e, 0.06, 0.62, -0.04);
  for (const dx of [-0.03, 0.03]) cyl(spool, 0.1, 0.1, 0.006, black, dx, 0, 0, 32).rotation.z = Math.PI / 2;
  add(spool, new THREE.CylinderGeometry(0.08, 0.08, 0.054, 32), PLA.terracotta, 0, 0, 0, MATTE).rotation.z = Math.PI / 2;
  cyl(e, 0.0015, 0.0015, 0.25, PLA.terracotta, 0.045, 0.38, -0.005, 4).rotation.z = 0.06; // filament down to the head

  // the "CV" coming out of it, a few lines of text on the page; its top edge is right under the nozzle
  box(e, 0.17, 0.095, 0.004, '#f5f5f0', 0.02, 0.147, 0.01, { roughness: 0.9 });
  for (let i = 0; i < 4; i++) box(e, i ? 0.13 : 0.07, 0.006, 0.001, i ? '#9aa0a6' : '#2b2d31', i ? 0.02 : -0.01, 0.175 - i * 0.017, 0.0125);
}

// floating shelves on the wall above the printer: where the prints end up.
// print = index in sections.makes.items: each figure opens its own card, like the bonsais
function prints(scene) {
  const g = group(scene);
  for (const y of [1.55, 1.95]) {
    box(g, 0.72, 0.03, 0.2, '#6e5440', -0.6, y, -4.9, { roughness: 0.55 }); // walnut, like the desk
    for (const x of [-0.88, -0.32]) box(g, 0.02, 0.06, 0.16, BLACK, x, y - 0.045, -4.91, METAL); // brackets
  }
  const totoro = part(g, -0.62, 1.965, -4.88, -0.35);
  totoro.userData.print = 0;
  glb([['Totoro', totoro, 1.4, 0]], 'totoro'); // the real 14 cm figure
  // lower shelf: spare filament, no invented prints
  [['#2f5c96', -0.78], ['#e8e2d8', -0.6], [PLA.terracotta, -0.42]].forEach(([c, x]) => {
    const s = part(g, x, 1.565 + 0.07, -4.9);
    // standing face-on: only the flange rims and the hub are black, so the filament's colour shows
    for (const dz of [-0.025, 0.025]) add(s, new THREE.TorusGeometry(0.066, 0.004, 6, 32), BLACK, 0, 0, dz);
    add(s, new THREE.CylinderGeometry(0.062, 0.062, 0.046, 32), c, 0, 0, 0, MATTE).rotation.x = Math.PI / 2;
    cyl(s, 0.026, 0.026, 0.05, '#2b2d31', 0, 0, 0, 20).rotation.x = Math.PI / 2;
  });
}

// picture drawn on a canvas: the poster over the desk (lit, so it shares the wall's light) and the unlit view past the terrace
function painting(parent, w, h, x, y, z, draw, px = 1024, lit = false) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = Math.round((px * h) / w);
  draw(c.getContext('2d'), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? mat('#bdb7ae', { map: t, roughness: 0.9 }) /* dimmed: the desk lamp sits right in front of it */ : new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// fills the bare wall over the monitors: a basketball half-court drawn as a plan, framed in black
function poster(scene) {
  const g = group(scene);
  box(g, 0.74, 0.54, 0.025, BLACK, -3, 1.95, -4.985);
  const m = painting(g, 0.66, 0.46, -3, 1.95, -4.97, (x, W, H) => {
    x.fillStyle = '#f4ede2';
    x.fillRect(0, 0, W, H);
    x.strokeStyle = '#b44c31';
    x.lineWidth = 5;
    const u = W / 17;                                                  // 15 m wide court + margins
    const [L, T, cx] = [u, u * 0.8, W / 2];
    // FIBA half court, baseline at the top; the frame crops it below the free-throw circle
    x.strokeRect(L, T, 15 * u, 14 * u);
    x.strokeRect(cx - 2.45 * u, T, 4.9 * u, 5.8 * u);                 // the key
    x.beginPath(); x.arc(cx, T + 5.8 * u, 1.8 * u, 0, Math.PI); x.stroke(); // free-throw circle
    const a = Math.acos(6.6 / 6.75);                                  // the arc meets the corner lines 0.9 m in from the sidelines
    x.beginPath();
    x.moveTo(cx - 6.6 * u, T);
    x.arc(cx, T + 1.575 * u, 6.75 * u, Math.PI - a, a, true);         // three-point line
    x.lineTo(cx + 6.6 * u, T);
    x.stroke();
    x.beginPath(); x.moveTo(cx - 0.9 * u, T + 1.2 * u); x.lineTo(cx + 0.9 * u, T + 1.2 * u); x.stroke(); // backboard
    x.beginPath(); x.arc(cx, T + 1.575 * u, 0.23 * u, 0, 7); x.stroke(); // hoop
  }, 1024, true);
  m.receiveShadow = true;
}

// what you see past the railing: evening sky, a ridge of hills and the roofs below; unlit, far behind the terrace
function view(scene) {
  painting(scene, 18, 13, 7, 0.5, -14, (x, W, H) => {
    const hz = H * ((7 - 1.35) / 13);                                  // eye height: the horizon sits level with the camera
    const sky = x.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#b9c4d6');
    sky.addColorStop(0.7, '#f1c9a6');
    sky.addColorStop(1, '#f7d6b4');
    x.fillStyle = sky;
    x.fillRect(0, 0, W, H);
    const ridge = (color, base, amp, f, ph) => {
      x.fillStyle = color;
      x.beginPath();
      x.moveTo(0, H);
      for (let i = 0; i <= W; i += 8) x.lineTo(i, base - amp * (0.6 * Math.sin(i * f + ph) + 0.4 * Math.sin(i * f * 2.7 + ph * 3)));
      x.lineTo(W, H);
      x.fill();
    };
    ridge('#b7a99c', hz - 30, 34, 0.004, 1);                           // far hills, hazy
    ridge('#8f8478', hz + 10, 26, 0.007, 4);
    // two rows of houses with tiled roofs, the far row smaller and hazier; seeded so it never changes between visits
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    [[hz + 40, 0.55, ['#b9a593', '#ad9886'], '#a07a66'], [hz + 85, 1, ['#c4ab94', '#b39b85', '#cdb9a2'], '#9c634d']]
      .forEach(([base, k, walls, roof]) => {
        for (let i = -rnd() * 40; i < W; ) {
          const w = (34 + rnd() * 56) * k;
          const top = base - rnd() * 34 * k;
          const pitch = 12 * k;
          x.fillStyle = roof;
          x.beginPath(); x.moveTo(i - 3, top + pitch); x.lineTo(i + w / 2, top); x.lineTo(i + w + 3, top + pitch); x.fill();
          x.fillStyle = walls[Math.floor(rnd() * walls.length)];
          x.fillRect(i, top + pitch, w, H);
          i += w + rnd() * 6 * k;
        }
      });
  }, 2048);
}

function terrace(scene) {
  // no section: the bench is decoration, only the bonsais are clickable (userData.skill)
  const g = group(scene);
  // display bench: weathered slats on concrete blocks
  for (const x of [1.2, 2.8, 4.4]) box(g, 0.14, 0.43, 0.4, '#9a968f', x, 0.215, -4.45, { roughness: 1 });
  for (const z of [-4.59, -4.45, -4.31]) box(g, 3.6, 0.04, 0.12, '#6b5a4a', 2.8, 0.45, z, { roughness: 0.9 });
  // the semi-cascade falls below its pot, so it sits on a little wooden stand
  box(g, 0.24, 0.12, 0.24, '#5c4636', 2.72, 0.53, -4.45, { roughness: 0.9 });
  // one species and style per skill, size ≈ years of practice: C#/.NET moyogi pine, SQL formal upright cedar,
  // VB.NET semi-cascade juniper with deadwood, web weeping willow, and the wired sapling = what's next.
  // skill = index in sections.skills.items: each tree is clicked on its own and pops that card
  glb([['BonsaiMoyogi', 1.35, 0.47, -4.48], ['BonsaiChokkan', 2.1, 0.47, -4.42], ['BonsaiKengai', 2.72, 0.59, -4.45],
    ['BonsaiSalze', 3.5, 0.47, -4.42], ['BonsaiPlanter', 4.15, 0.47, -4.45]]
    .map(([name, x, y, z], skill) => {
      const p = part(g, x, y, z);
      p.userData.skill = skill;
      return [name, p, 1, 0];
    }), 'bonsais');

  // little wooden sign staked in the deck, in front of the bench's right end; returns draw(text), redrawn on each language change
  const s = part(g, 3.95, 0, -3.8, -0.15);
  box(s, 0.04, 0.4, 0.03, '#5c4636', 0, 0.2, -0.01, { roughness: 0.9 });       // stake
  const board = part(s, 0, 0.4, 0);
  board.rotation.x = -0.15;                                                    // leaning back a little
  box(board, 0.62, 0.36, 0.02, '#7a5a40', 0, 0, 0, { roughness: 0.9 });
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  add(board, new THREE.PlaneGeometry(0.58, 0.32), '#fff', 0, 0, 0.011, { map: tex, roughness: 0.9 });
  return (text) => FONTS.then(() => {
    const x = c.getContext('2d');
    x.fillStyle = '#c9a77c';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#3b2a1e';
    x.textAlign = 'center';
    const [title, ...lines] = text.split('\n');
    x.font = `62px ${SERIF}`;
    x.fillText(title, 320, 110, 600);
    x.font = `40px ${SANS}`;
    lines.forEach((l, i) => x.fillText(l, 320, 210 + i * 62, 610));
    tex.needsUpdate = true;
  });
}

export function buildRoom(scene) {
  shell(scene);
  desk(scene);
  chair(scene);
  gamingPC(scene);
  const screens = { about: monitor(scene, 'about', -3.265), projects: monitor(scene, 'projects', -2.635), contact: phone(scene) };
  const doors = wardrobe(scene);
  printer(scene);
  prints(scene);
  poster(scene);
  view(scene);
  const sign = terrace(scene);
  // repaints the three screens in the page's language (t = content/<lang>.json); the phone's clock every minute too
  let last;
  const paint = (t, links) => FONTS.then(() => {
    last = [t, links];
    const sec = t.sections;
    ARTS.about.draw({ bar: sec.about.menu, title: sec.about.title, lines: sec.about.body.slice(0, 2), rows: [] });
    ARTS.projects.draw({ bar: sec.projects.menu, title: sec.projects.title, lines: [], rows: sec.projects.items.map((it) => [it.meta, it.title]) });
    const time = new Date().toLocaleTimeString(document.documentElement.lang, { hour: '2-digit', minute: '2-digit' });
    ARTS.contact.draw({ bar: time, title: sec.contact.title, lines: sec.contact.body, rows: links.map(([name, , text]) => [name, text]) });
  });
  setInterval(() => last && paint(...last), 60000);
  return { doors, screens, sign, paint };
}
