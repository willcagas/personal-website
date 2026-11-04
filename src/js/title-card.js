/**
 * Title card — a wordmark over an animated background, chosen per post:
 *
 * life     — Conway's Game of Life on a bounded grid: cells ease in and out,
 *            the middle stays calm behind the wordmark, and now and then a
 *            live cluster flares warm white (a breakthrough).
 * frontier — a mountain range engraved in light ink. Candidates step up the
 *            slopes, downhill steps are discarded, and a dashed frontier line
 *            rises whenever the best climber passes it. The wordmark sits in
 *            the sky above the range.
 * latent   — multi-head latent attention as a bow-tie, on a light paper card:
 *            per-head key/value lines pinch into one thin latent behind the
 *            wordmark and fan back out. Each token is a pulse that turns
 *            DeepSeek blue while it's latent, and adds a block to two caches
 *            along the bottom: a long one for standard attention, a short blue
 *            one for the latent.
 *
 * Zero dependencies. Pauses offscreen / in hidden tabs.
 */

const BG = '12, 12, 11';       // #0c0c0b
const LIGHT = '246, 241, 231';
const GOLD = '214, 165, 72';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Mix two "r, g, b" colours */
const mix = (a, b, k) => {
  const pb = b.split(',').map(Number);
  return a.split(',').map((v, i) => Math.round(lerp(Number(v), pb[i], k))).join(', ');
};

/** Canvas text with a halo of the card's background, so it reads over linework. */
function haloText(ctx, text, x, y, halo = BG) {
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `rgb(${halo})`;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

/* ───────────── Game of Life ───────────── */

function createLife(W, H) {
  const CELL = 7;             // CSS px per cell
  const PAD = 6;              // overscan cells so the grid's hard edge sits off-screen
  const STEP_MS = 150;        // one Conway generation
  const SOUP_DENSITY = 0.42;
  const FLARE_EVERY = 24;     // generations between breakthroughs
  const PREWARM_MS = 3000;

  const cols = Math.ceil(W / CELL) + 2 * PAD;
  const rows = Math.ceil(H / CELL) + 2 * PAD;
  const len = cols * rows;
  let grid = new Uint8Array(len);
  let next = new Uint8Array(len);
  const bright = new Float32Array(len);
  const flash = new Float32Array(len);
  let ticks = 0;
  let stepAccum = 0;
  const ix = (f) => PAD + Math.floor(f * (cols - 2 * PAD));
  const iy = (f) => PAD + Math.floor(f * (rows - 2 * PAD));

  function soup(c0, r0) {
    for (let r = r0; r < r0 + 5; r++) {
      for (let c = c0; c < c0 + 5; c++) {
        if (c < cols && r < rows && Math.random() < SOUP_DENSITY) grid[r * cols + c] = 1;
      }
    }
  }

  /** A breakthrough: one live cluster flares warm white. */
  function flare() {
    for (let k = 0; k < 60; k++) {
      const c = ix(Math.random());
      const r = iy(Math.random());
      if (!grid[r * cols + c]) continue;
      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const cc = c + dc;
          const rr = r + dr;
          if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && dc * dc + dr * dr <= 9) flash[rr * cols + cc] = 1;
        }
      }
      return;
    }
  }

  function tick() {
    // Bounded grid: cells past the edge count as dead
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) n += grid[rr * cols + cc];
          }
        }
        const i = r * cols + c;
        next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    }
    [grid, next] = [next, grid];
    ticks++;

    // Keep the field lively without overcrowding it
    if (ticks % 6 === 0) {
      let pop = 0;
      for (let i = 0; i < len; i++) pop += grid[i];
      if (pop < len * 0.07) soup(ix(Math.random()), iy(Math.random()));
    }
    if (ticks % FLARE_EVERY === 0) flare();
  }

  function step(dt) {
    stepAccum += dt;
    while (stepAccum >= STEP_MS) {
      tick();
      stepAccum -= STEP_MS;
    }
    const k = Math.min(1, dt / 190);
    const decay = Math.min(1, dt / 900);
    for (let i = 0; i < len; i++) {
      bright[i] += (grid[i] - bright[i]) * k;
      if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - decay);
    }
  }

  function draw(ctx) {
    ctx.fillStyle = `rgb(${BG})`;
    ctx.fillRect(0, 0, W, H);
    const sz = CELL - 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const b = Math.max(bright[i], flash[i] * 0.8);
        if (b < 0.03) continue;
        const x = (c - PAD) * CELL + 1;
        const y = (r - PAD) * CELL + 1;
        if (x < -CELL || y < -CELL || x > W || y > H) continue;
        // Keep the middle calm behind the wordmark
        const dx = (x - W / 2) / (W * 0.3);
        const dy = (y - H / 2) / (H * 0.26);
        const a = b * clamp(Math.hypot(dx, dy) ** 1.6, 0.06, 1) * 0.55;
        ctx.fillStyle = flash[i] > 0.1
          ? `rgba(255, 236, 205, ${Math.min(1, a + flash[i] * 0.5)})`
          : `rgba(${LIGHT}, ${a})`;
        ctx.fillRect(x, y, sz, sz);
      }
    }
  }

  for (let i = 0; i < 26; i++) soup(ix(Math.random()), iy(Math.random()));
  for (let t = 0; t < PREWARM_MS; t += 16) step(16);
  return { step, draw };
}

/* ───────────── Climbing toward the frontier ───────────── */

function createFrontier(W, H, dpr, { minimal = false } = {}) {
  const BASE = H * 0.98;
  const TOP = H * 0.42;         // where a score of 1.0 would sit; the sky above holds the wordmark
  const N = 7;
  const PROPOSE_MS = 420;
  const s = clamp(W / 680, 0.72, 1);   // labels and dots shrink on small cards
  const HOLD_MS = 3200;
  const PREWARM_MS = 2500;
  let range, art, climbers, frontier, frontierY, clock, nextSwap, holdUntil, fadeK;

  const yOf = (f) => BASE - f * (BASE - TOP);

  function makeRange() {
    const peaks = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      peaks.push({ x: W * (0.07 + (i + 0.2 + Math.random() * 0.6) * (0.86 / n)), h: 0.36 + Math.random() * 0.26, w: W * (0.045 + Math.random() * 0.03) });
    }
    peaks[1 + Math.floor(Math.random() * (n - 2))].h = 0.9 + Math.random() * 0.04;
    const far = Array.from({ length: 6 }, (_, i) => ({ x: W * (i / 5) + (Math.random() - 0.5) * 60, h: 0.55 + Math.random() * 0.3, w: W * (0.07 + Math.random() * 0.05) }));
    const score = (x, ps, base = 0.05) => {
      let v = base;
      for (const p of ps) v = Math.max(v, p.h * Math.exp(-((x - p.x) ** 2) / (2 * p.w * p.w)));
      return v + 0.012 * Math.sin(x * 0.09) + 0.008 * Math.sin(x * 0.23 + 1);
    };
    return { fit: (x) => score(x, peaks), farFit: (x) => score(x, far, 0.2), best: Math.max(...peaks.map((p) => p.h)) };
  }

  // The range, engraved: silhouette, layered contour strokes, and hatching on the shaded faces
  function engrave() {
    const c = document.createElement('canvas');
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = `rgb(${BG})`;
    g.fillRect(0, 0, W, H);

    // Far range, faint
    g.strokeStyle = `rgba(${LIGHT}, 0.2)`;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = yOf(range.farFit(x) * 0.78) - 4;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    for (let k = 1; k < 7; k++) {
      g.strokeStyle = `rgba(${LIGHT}, ${0.05 - k * 0.006})`;
      g.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = yOf(range.farFit(x) * 0.78) - 4 + k * 7;
        if (x) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }

    // Near range occludes the far one
    const ridge = (x) => yOf(range.fit(x));
    g.fillStyle = `rgb(${BG})`;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) g.lineTo(x, ridge(x));
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.save();
    g.clip();
    for (let k = 1; k < 16; k++) {
      g.strokeStyle = `rgba(${LIGHT}, ${0.1 * (1 - k / 16) ** 1.5})`;
      g.lineWidth = 0.8;
      g.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const y = ridge(x) + k * 6.5;
        if (x) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    }
    // Hatching on faces turned away from the light (upper left)
    g.lineWidth = 0.8;
    for (let x = 2; x < W; x += 3.2) {
      const slope = (ridge(x + 2) - ridge(x - 2)) / 4;
      if (slope <= 0.12) continue;
      const depth = 18 + 90 * Math.min(1, slope);
      for (let d = 4; d < depth; d += 4.5) {
        g.strokeStyle = `rgba(${LIGHT}, ${0.26 * (1 - d / depth) ** 1.2})`;
        g.beginPath();
        g.moveTo(x, ridge(x) + d);
        g.lineTo(x - 5, ridge(x) + d + 6);
        g.stroke();
      }
    }
    g.restore();
    g.strokeStyle = `rgba(${LIGHT}, 0.8)`;
    g.lineWidth = 1.4;
    g.beginPath();
    for (let x = 0; x <= W; x += 2) {
      if (x) g.lineTo(x, ridge(x));
      else g.moveTo(x, ridge(x));
    }
    g.stroke();
    return c;
  }

  // Fresh candidates start somewhere low, never on a summit
  function lowX() {
    let x = 0;
    for (let i = 0; i < 40; i++) {
      x = W * (0.04 + Math.random() * 0.92);
      if (range.fit(x) < 0.4) break;
    }
    return x;
  }

  const spawn = (x) => ({ x, from: x, to: x, moveT: -1e9, born: clock, ghosts: [], stuck: 0, next: clock + 300 + Math.random() * PROPOSE_MS });

  function reset() {
    range = makeRange();
    art = engrave();
    clock = 0;
    climbers = [];
    for (let i = 0; i < N; i++) climbers.push(spawn(lowX()));
    frontier = Math.max(...climbers.map((c) => range.fit(c.x)));
    frontierY = yOf(frontier);
    nextSwap = 2400;
    holdUntil = 0;
    fadeK = 0;
  }

  function step(dt) {
    clock += dt;
    frontierY += (yOf(frontier) - frontierY) * Math.min(1, dt / 260);
    if (holdUntil) {
      if (clock > holdUntil) {
        fadeK = clamp((clock - holdUntil) / 600, 0, 1);
        if (fadeK >= 1) reset();
      }
      return;
    }
    for (const c of climbers) {
      c.ghosts = c.ghosts.filter((g) => clock - g.t0 < 900);
      if (clock < c.next || clock - c.moveT < 300) continue;
      c.next = clock + PROPOSE_MS * (0.8 + Math.random() * 0.4);
      // Propose a nearby step; keep it only if it climbs
      const nx = clamp(c.to + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 12), 8, W - 8);
      if (range.fit(nx) > range.fit(c.to)) {
        c.from = c.to;
        c.to = nx;
        c.moveT = clock;
        c.stuck = 0;
      } else {
        c.ghosts.push({ x: nx, t0: clock });
        c.stuck++;
      }
      const f = range.fit(c.to);
      if (f > frontier) frontier = f;
    }
    // Swap the most hopeless climber for a fresh candidate
    if (clock > nextSwap) {
      nextSwap = clock + 2200;
      const worst = climbers.reduce((a, b) => (range.fit(b.to) < range.fit(a.to) || (b.stuck > 8 && a.stuck <= 8) ? b : a));
      climbers[climbers.indexOf(worst)] = spawn(lowX());
    }
    if (frontier >= range.best * 0.985) holdUntil = clock + HOLD_MS;
  }

  function draw(ctx) {
    ctx.fillStyle = `rgb(${BG})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1 - fadeK;
    ctx.drawImage(art, 0, 0, W, H);

    // Frontier
    ctx.strokeStyle = `rgba(${LIGHT}, 0.45)`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(14, frontierY);
    ctx.lineTo(W - 14, frontierY);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!minimal) {
      ctx.textAlign = 'right';
      ctx.font = `italic 400 ${13 * s}px Newsreader, Georgia, serif`;
      ctx.fillStyle = `rgba(${LIGHT}, 0.7)`;
      haloText(ctx, `frontier · ${frontier.toFixed(2)}`, W - 16, frontierY - 6);
      ctx.textAlign = 'left';
    }

    // Climbers: fading rings where a step went downhill, gold for the best
    const best = climbers.reduce((a, b) => (range.fit(b.to) > range.fit(a.to) ? b : a));
    for (const c of climbers) {
      const appear = clamp((clock - c.born) / 500, 0, 1);
      for (const g of c.ghosts) {
        ctx.strokeStyle = `rgba(${LIGHT}, ${0.45 * (1 - (clock - g.t0) / 900) * appear})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(g.x, yOf(range.fit(g.x)), 3 * s, 0, Math.PI * 2);
        ctx.stroke();
      }
      const x = lerp(c.from, c.to, ease(clamp((clock - c.moveT) / 300, 0, 1)));
      const y = yOf(range.fit(x));
      const isBest = c === best;
      ctx.globalAlpha = (1 - fadeK) * appear;
      ctx.fillStyle = `rgb(${BG})`;
      ctx.beginPath();
      ctx.arc(x, y, (isBest ? 6.2 : 5.4) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isBest ? `rgb(${GOLD})` : `rgba(${LIGHT}, 0.85)`;
      ctx.beginPath();
      ctx.arc(x, y, (isBest ? 4.4 : 3.6) * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1 - fadeK;
    }
    if (holdUntil && !minimal) {
      const x = best.to;
      ctx.globalAlpha = (1 - fadeK) * clamp((clock - (holdUntil - HOLD_MS)) / 400, 0, 1);
      ctx.fillStyle = `rgb(${GOLD})`;
      ctx.font = `italic 400 ${13 * s}px Newsreader, Georgia, serif`;
      ctx.textAlign = 'center';
      haloText(ctx, 'summit reached', x, yOf(range.fit(x)) - 14 * s);
      ctx.textAlign = 'left';
    }
    ctx.globalAlpha = 1;
  }

  reset();
  for (let t = 0; t < PREWARM_MS; t += 16) step(16);
  return { step, draw };
}

/* ───────────── The latent bottleneck ───────────── */

function createLatent(W, H, dpr, { minimal = false } = {}) {
  // A light card (main.css gives it the same paper background and a dark wordmark)
  const PAPER = '241, 236, 226';
  const INK = '28, 25, 23';
  const BLUE = '77, 107, 254';      // DeepSeek's blue
  const s = clamp(W / 680, 0.17, 1);   // labels and strokes shrink on small cards
  const N = W < 260 ? 9 : 15;          // per-head key/value lines
  const TOP = H * 0.1;
  const BOT = H * 0.8;
  const MID = (TOP + BOT) / 2;         // the wordmark sits here (main.css)
  const WAIST = H * 0.022;
  const RATIO = 7;                     // how much more the standard cache holds per token (illustrative)
  const TOKEN_MS = 760;
  const TRAVEL_MS = 3000;              // one pulse, edge to edge
  const SEQ = 14;                      // tokens before both caches empty
  const BAR_X0 = W * 0.31;
  const BAR_X1 = W * 0.69;
  const BAR_H = Math.max(1.5, 4 * s);
  const UNIT = (BAR_X1 - BAR_X0) / (SEQ * RATIO);
  const labels = !minimal && W >= 260;
  const LABEL_PX = Math.max(10, 12.5 * s);
  const PREWARM_MS = 9300;        // a moment with no pulse half off the edge (the still under reduced motion)

  // Quiet behind the wordmark, as on the Game of Life card
  const calm = (x) => clamp(Math.hypot((x - W / 2) / (W * 0.3), (MID - H / 2) / (H * 0.26)) ** 1.6, 0.06, 1);
  // How pinched the lines are at x: 0 at the edges, 1 behind the wordmark
  const pinch = (x) => ease(clamp((1 - Math.abs(x - W / 2) / (W / 2)) / 0.64, 0, 1));
  const lineY = (i, x) => {
    const f = i / (N - 1) - 0.5;
    const p = pinch(x);
    return lerp(MID + f * (BOT - TOP), MID + f * WAIST, p) + Math.sin(x * 0.012 + i) * 1.5 * s * (1 - p);
  };
  const headX = (p) => ((clock - p.born) / TRAVEL_MS) * (W + 60) - 30;

  // The lines never move, so they're drawn once
  const lines = document.createElement('canvas');
  lines.width = Math.round(W * dpr);
  lines.height = Math.round(H * dpr);
  const g = lines.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.lineCap = 'round';
  g.lineWidth = Math.max(0.6, 0.9 * s);
  for (let i = 0; i < N; i++) {
    for (let x = 0; x < W; x += 6) {
      g.strokeStyle = `rgba(${INK}, ${0.17 * calm(x) * (1 - 0.65 * pinch(x))})`;
      g.beginPath();
      g.moveTo(x, lineY(i, x));
      g.lineTo(x + 6, lineY(i, x + 6));
      g.stroke();
    }
  }

  let clock = 0;
  let pulses = [];
  let nextAt = 0;
  let cached = 0;
  let emptyAt = 0;
  let cacheFade = 1;

  function step(dt) {
    clock += dt;
    while (clock >= nextAt) {
      pulses.push({ born: nextAt, counted: false });
      nextAt += TOKEN_MS;
    }
    // A token is cached as it passes the waist
    for (const p of pulses) {
      if (p.counted || headX(p) < W / 2) continue;
      p.counted = true;
      if (emptyAt) continue;
      cached++;
      if (cached >= SEQ) emptyAt = clock + 1800;
    }
    if (emptyAt) {
      cacheFade = 1 - span(clock, emptyAt, emptyAt + 500);
      if (clock > emptyAt + 500) {
        cached = 0;
        emptyAt = 0;
        cacheFade = 1;
      }
    }
    pulses = pulses.filter((p) => clock - p.born < TRAVEL_MS + 200);
  }

  function draw(ctx) {
    ctx.fillStyle = `rgb(${PAPER})`;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(lines, 0, 0, W, H);
    ctx.lineCap = 'round';

    // Pulses: ink while per-head, blue while latent
    const tail = Math.max(10, 30 * s);
    ctx.lineWidth = Math.max(1, 1.6 * s);
    for (const p of pulses) {
      const head = headX(p);
      const pk = pinch(head);
      const latent = span(pk, 0.72, 0.95);
      const k = Math.max(0.3, calm(head));
      if (latent > 0) {
        const r = Math.max(8, 38 * s);
        const glow = ctx.createRadialGradient(head, MID, 0, head, MID, r);
        glow.addColorStop(0, `rgba(${BLUE}, ${0.28 * latent})`);
        glow.addColorStop(1, `rgba(${BLUE}, 0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(head - r, MID - r, r * 2, r * 2);
      }
      // Once the lines are closer together than they are thick, each is fainter, so the bundle doesn't pile into a bar
      const spacing = lerp(BOT - TOP, WAIST, pk) / (N - 1);
      const overlap = Math.max(1, (ctx.lineWidth * 1.5) / spacing);
      ctx.strokeStyle = `rgba(${mix(INK, BLUE, latent)}, ${clamp((lerp(0.75, 0.95, latent) * k) / overlap, 0, 1)})`;
      for (let i = 0; i < N; i++) {
        ctx.beginPath();
        for (let d = 0; d <= tail; d += 3) {
          const x = head - d;
          if (d) ctx.lineTo(x, lineY(i, x));
          else ctx.moveTo(x, lineY(i, x));
        }
        ctx.stroke();
      }
    }

    // The two caches, one block per token
    const y0 = H * 0.865;
    const y1 = y0 + Math.max(BAR_H + 9 * s, labels ? LABEL_PX * 1.3 : BAR_H + 3);
    ctx.fillStyle = `rgba(${INK}, 0.08)`;
    ctx.fillRect(BAR_X0 + cached * RATIO * UNIT, y0, Math.max(0, BAR_X1 - BAR_X0 - cached * RATIO * UNIT), BAR_H);
    ctx.globalAlpha = cacheFade;
    for (let t = 0; t < cached; t++) {
      const fresh = t === cached - 1 ? 1 : 0;
      ctx.fillStyle = `rgba(${INK}, ${0.42 + 0.3 * fresh})`;
      ctx.fillRect(BAR_X0 + t * RATIO * UNIT, y0, RATIO * UNIT - Math.max(1, s), BAR_H);
      ctx.fillStyle = `rgba(${BLUE}, ${0.85 + 0.15 * fresh})`;
      ctx.fillRect(BAR_X0 + t * UNIT, y1, Math.max(1, UNIT - Math.max(0.6, 0.8 * s)), BAR_H);
    }
    ctx.globalAlpha = 1;

    if (labels) {
      const wide = W >= 480;
      ctx.font = `italic 400 ${LABEL_PX}px Newsreader, Georgia, serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(${INK}, 0.6)`;
      haloText(ctx, wide ? 'KV cache, every head' : 'every head', BAR_X0 - 10 * s, y0 + BAR_H / 2, PAPER);
      ctx.fillStyle = `rgba(${BLUE}, 0.9)`;
      haloText(ctx, wide ? 'KV cache, latent' : 'latent', BAR_X0 - 10 * s, y1 + BAR_H / 2, PAPER);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  for (let t = 0; t < PREWARM_MS; t += 16) step(16);
  return { step, draw };
}

const BACKGROUNDS = { life: createLife, frontier: createFrontier, latent: createLatent };

/* ───────────── Mounting ───────────── */

let activeInstances = [];

class TitleCard {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.toggle = root.querySelector('[data-hero-toggle]');
    this.create = BACKGROUNDS[root.dataset.background] || createLife;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.visible = true;
    this.paused = false;
    this.lastTs = 0;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();

    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.start();
    }, { threshold: 0 });
    this.io.observe(this.canvas);

    this.onVisibility = () => {
      if (!document.hidden && this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.onToggle = () => {
      this.paused = !this.paused;
      this.toggle.setAttribute('aria-label', this.paused ? 'Play animation' : 'Pause animation');
      this.toggle.dataset.paused = String(this.paused);
    };
    if (this.toggle) {
      if (this.reduceMotion) this.toggle.hidden = true;
      else this.toggle.addEventListener('click', this.onToggle);
    }

    this.start();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (rect.width === this.w && rect.height === this.h) return;
    this.w = rect.width;
    this.h = rect.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    // Backgrounds are laid out for the card's size, so a new size starts a fresh one
    // Minimal cards (small thumbnails) draw no text
    this.field = this.create(this.w, this.h, this.dpr, { minimal: this.root.dataset.minimal === 'true' });
    this.draw();
  }

  draw() {
    if (!this.field) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.field.draw(this.ctx);
  }

  start() {
    if (this.rafId !== null || this.destroyed) return;
    if (this.reduceMotion) {
      this.draw();
      return;
    }
    this.lastTs = 0;
    const loop = (ts) => {
      this.rafId = null;
      if (this.destroyed || !this.visible || document.hidden) return;
      const dt = this.lastTs ? Math.min(64, ts - this.lastTs) : 16;
      this.lastTs = ts;
      if (!this.paused) this.field?.step(dt);
      this.draw();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.resizeObserver.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    if (this.toggle) this.toggle.removeEventListener('click', this.onToggle);
  }
}

/** Mount a title card on a specific element; the caller destroys it. */
export function createTitleCard(root) {
  return new TitleCard(root);
}

/**
 * Mount the title cards on the current page: a post's hero, or one per post on the Writings list.
 * Safe to call on every navigation; cleans up the previous page's cards.
 */
export function initTitleCards(root) {
  activeInstances.forEach((card) => card.destroy());
  activeInstances = [...root.querySelectorAll('[data-title-card]')].map((el) => new TitleCard(el));
}
