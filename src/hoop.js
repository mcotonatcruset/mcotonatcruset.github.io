// the mini-game behind the hoop on the wardrobe door: the half court from the poster over the desk, seen side-on.
// Real FIBA sizes in metres: s = distance out from the baseline (the hoop is on the right), y = height
const W = 960;
const H = 540;
const SC = 100; // px per metre
const FLOOR = 28; // px under the floor line
const BOARD = { s: 1.2, bottom: 2.9, top: 3.95 };
const RIM = { s: 1.575, y: 3.05, r: 0.225 };
const THREE_PT = RIM.s + 6.75;
const FREE_THROW = 5.8;
const SPOTS = [2.6, 4.2, FREE_THROW, 7.2, 8.6]; // a new one after every shot; the last is behind the three-point line
const BALL_R = 0.12;
const RELEASE_Y = 2.1; // over the shooter's head
const G = 9.8;
const BOUNCE = 0.6;
const STIFF = 5; // m/s per metre of pull-back
const VMAX = 12;
const ROUND = 30; // seconds, from the first shot
const INK = '#27201d';
const LINE = '#b44c31'; // the poster's lines
const PAPER = '#f4ede2';

const X = (s) => W - (s + 0.6) * SC;
const Y = (y) => H - FLOOR - y * SC;

// onHud({ points, left, over }) whenever one of them changes
export function hoopGame(canvas, onHud) {
  const ctx = canvas.getContext('2d');
  let g = null; // the round
  let raf = 0;
  let last = 0;

  const spawn = () => {
    const s = SPOTS[Math.floor(Math.random() * SPOTS.length)];
    g.b = { s, y: RELEASE_Y, vs: 0, vy: 0, fly: false, scored: false, t: 0, spin: 0, from: s };
  };

  function start() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    g = { points: 0, t0: 0, over: false, aim: null, drag: null, kb: 0, kt: 0, ang: 0, hud: '', pop: null };
    spawn();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    g = null;
  }

  function shoot() {
    const t = performance.now() / 1000;
    if (!g.t0 || g.over) Object.assign(g, { t0: t, points: 0, over: false });
    Object.assign(g.b, { vs: g.aim.vs, vy: g.aim.vy, fly: true });
    g.aim = null;
  }

  // slingshot: pull back from anywhere on the court, the ball flies the other way
  const at = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (!g || g.b.fly) return;
    g.drag = at(e);
    g.kb = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!g?.drag) return;
    const p = at(e);
    const dx = (g.drag.x - p.x) / SC;
    const dy = (p.y - g.drag.y) / SC;
    if (Math.hypot(dx, dy) < 0.1) return (g.aim = null);
    const k = Math.min(STIFF, VMAX / Math.hypot(dx, dy));
    g.aim = { vs: -dx * k, vy: dy * k }; // pulled left, flies right: towards the hoop
  });
  canvas.addEventListener('pointerup', () => {
    if (g?.drag && g.aim) shoot();
    if (g) g.drag = null;
  });
  canvas.addEventListener('pointercancel', () => g && (g.drag = g.aim = null));

  // keyboard: Space or Enter starts the angle sweeping, fixes it and sweeps the power, then shoots
  canvas.closest('dialog').addEventListener('keydown', (e) => {
    if (!g || (e.key !== ' ' && e.key !== 'Enter') || e.target.closest('button')) return;
    e.preventDefault();
    if (e.repeat || g.b.fly) return;
    g.kt = performance.now() / 1000;
    if (g.kb === 2) return shoot(), (g.kb = 0);
    g.kb++;
  });

  function step(b, h) {
    const y0 = b.y;
    b.vy -= G * h;
    b.s += b.vs * h;
    b.y += b.vy * h;
    if (b.vs < 0 && b.s - BALL_R < BOARD.s && b.s > BOARD.s && b.y > BOARD.bottom && b.y < BOARD.top) {
      b.s = BOARD.s + BALL_R;
      b.vs *= -BOUNCE;
    }
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.vy *= -BOUNCE;
      b.vs *= 0.8;
    }
    // side-on, the rim is its front and back edge; the board's corners bounce the same way
    for (const [ps, py] of [[RIM.s + RIM.r, RIM.y], [RIM.s - RIM.r, RIM.y], [BOARD.s, BOARD.top], [BOARD.s, BOARD.bottom]]) {
      const ds = b.s - ps;
      const dy = b.y - py;
      const d = Math.hypot(ds, dy);
      if (d >= BALL_R || !d) continue;
      const vn = (b.vs * ds + b.vy * dy) / d;
      b.s = ps + (ds / d) * BALL_R;
      b.y = py + (dy / d) * BALL_R;
      if (vn < 0) b.vs -= ((1 + BOUNCE) * vn * ds) / d, b.vy -= ((1 + BOUNCE) * vn * dy) / d;
    }
    if (!b.scored && y0 >= RIM.y && b.y < RIM.y && Math.abs(b.s - RIM.s) < RIM.r) {
      b.scored = true;
      if (!g.over) {
        const n = b.from >= THREE_PT ? 3 : 2;
        g.points += n;
        g.pop = { text: `+${n}`, t: 0 };
      }
    }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = now / 1000;
    const b = g.b;
    const left = g.t0 ? Math.max(0, ROUND - (t - g.t0)) : ROUND;
    if (g.t0 && !left) g.over = true;
    if (g.kb) {
      const w = 0.5 - 0.5 * Math.cos((t - g.kt) * 2.5);
      if (g.kb === 1) g.ang = 0.5 + 0.8 * w; // ~30°..75°
      const v = g.kb === 2 ? 5 + (VMAX - 5) * w : 8;
      g.aim = { vs: -Math.cos(g.ang) * v, vy: Math.sin(g.ang) * v };
    }
    if (b.fly) {
      const n = Math.ceil(dt * 240); // substeps, so a fast ball can't skip through the rim
      for (let i = 0; i < n; i++) step(b, dt / n);
      b.t += dt;
      b.spin += (b.vs * dt) / BALL_R;
      if (b.t > 3.5 || b.s < -0.6 - BALL_R || b.s > 9.6) spawn();
    }
    if (g.pop && (g.pop.t += dt) > 0.8) g.pop = null;
    draw(b);
    const hud = { points: g.points, left: Math.ceil(left), over: g.over };
    const key = JSON.stringify(hud);
    if (key !== g.hud) onHud(hud), (g.hud = key);
    raf = requestAnimationFrame(frame);
  }

  function draw(b) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgb(180 76 49 / 0.14)';
    ctx.fillRect(X(FREE_THROW), Y(0), FREE_THROW * SC, FLOOR); // the key, under the floor line
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const line = (...pts) => {
      ctx.beginPath();
      pts.forEach(([s, y], i) => (i ? ctx.lineTo(X(s), Y(y)) : ctx.moveTo(X(s), Y(y))));
      ctx.stroke();
    };
    line([-1, 0], [10, 0]); // the floor
    for (const s of [0, FREE_THROW, THREE_PT]) line([s, 0], [s, -0.18]); // baseline, free-throw and three-point lines
    line([-0.45, 0], [-0.45, 3.3], [BOARD.s - 0.05, 3.3]); // stanchion and arm
    ctx.strokeRect(X(BOARD.s), Y(BOARD.top), 0.05 * SC, (BOARD.top - BOARD.bottom) * SC); // backboard, side-on
    line([BOARD.s, RIM.y], [RIM.s + RIM.r, RIM.y]); // rim
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 4; i++) line([RIM.s - RIM.r + (i * RIM.r) / 2, RIM.y], [RIM.s - RIM.r * 0.6 + (i * RIM.r * 0.6) / 2, RIM.y - 0.4]); // net
    // where the shot comes from
    ctx.fillStyle = INK;
    ctx.fillRect(X(b.from) - 12, Y(0) - 1.5, 24, 3);
    // aim: the first quarter-second of the arc, enough to judge it without giving the shot away
    if (g.aim && !b.fly) {
      for (let i = 1; i <= 8; i++) {
        const t = i * 0.03;
        ctx.beginPath();
        ctx.arc(X(b.s + g.aim.vs * t), Y(b.y + g.aim.vy * t - (G * t * t) / 2), 2.5, 0, 7);
        ctx.fill();
      }
    }
    // the ball, with one seam so the spin shows
    const [bx, by, r] = [X(b.s), Y(b.y), BALL_R * SC];
    ctx.fillStyle = LINE;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, 7);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + Math.cos(b.spin) * r, by + Math.sin(b.spin) * r);
    ctx.lineTo(bx - Math.cos(b.spin) * r, by - Math.sin(b.spin) * r);
    ctx.stroke();
    if (g.pop) {
      ctx.globalAlpha = 1 - g.pop.t / 0.8;
      ctx.fillStyle = LINE;
      ctx.font = `32px 'Young Serif', Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(g.pop.text, X(RIM.s), Y(RIM.y + 0.5) - g.pop.t * 30);
      ctx.globalAlpha = 1;
    }
  }

  return { start, stop };
}
