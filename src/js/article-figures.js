/**
 * Live article figures — small canvas animations placed in a post's markdown:
 *
 *   <figure class="blog-figure" data-figure="islands">
 *   <div class="live-figure"><canvas></canvas></div>
 *   <figcaption>…</figcaption>
 *   </figure>
 *
 * islands — four island populations evolving in parallel; the best migrate
 *           between islands and a stalled island gets reseeded
 * reading — papers feeding a cited landscape of ideas across nine facets
 *
 * Figures sit on the page colour and dissolve at their edges, so they mute the
 * site's Game of Life background behind them without reading as a hard block.
 *
 * Zero dependencies. Each figure animates only while on screen.
 */

const INK = '28, 25, 23';
const GOLD = '184, 134, 11';
const FEATHER = 28;         // px over which a figure's backdrop dissolves into the page
const PREWARM_MS = 2500;
const MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function pageColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#fdfaf6';
}

function makeLayer(W, H, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * dpr);
  c.height = Math.round(H * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: c, ctx: g };
}

/** Erase toward each edge of a layer, so whatever it holds fades out there. */
function featherEdges(g, W, H, size, sides = 'tblr') {
  g.save();
  g.globalCompositeOperation = 'destination-out';
  const edges = {
    t: [0, 0, 0, size, 0, 0, W, size],
    b: [0, H, 0, H - size, 0, H - size, W, size],
    l: [0, 0, size, 0, 0, 0, size, H],
    r: [W, 0, W - size, 0, W - size, 0, size, H]
  };
  for (const side of sides) {
    const [x0, y0, x1, y1, rx, ry, rw, rh] = edges[side];
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = grad;
    g.fillRect(rx, ry, rw, rh);
  }
  g.restore();
}

/** The page colour (plus any static linework), opaque in the middle and dissolving at the edges. */
function makeBackdrop(W, H, dpr, paint) {
  const layer = makeLayer(W, H, dpr);
  layer.ctx.fillStyle = pageColor();
  layer.ctx.fillRect(0, 0, W, H);
  if (paint) paint(layer.ctx);
  featherEdges(layer.ctx, W, H, FEATHER);
  return layer.canvas;
}

/* ───────────── Islands ───────────── */

function createIslands(W, H, dpr) {
  const narrow = W < 520;
  const R = Math.min(H * 0.19, W * (narrow ? 0.15 : 0.19));
  const SPOTS = [[0.2, 0.36], [0.47, 0.68], [0.76, 0.34], [0.86, 0.76]];
  const NAMES = ['I', 'II', 'III', 'IV'];
  const TICK_MS = 900;
  const MIGRATE_MS = 2800;
  const FLIGHT_MS = 1600;
  let clock = 0;
  let nextTick = TICK_MS;
  let nextMigration = MIGRATE_MS;
  let migrations = [];

  const radius = (isl, a) => R * (1 + 0.13 * Math.sin(3 * a + isl.phase[0]) + 0.07 * Math.sin(5 * a + isl.phase[1]));
  const freshDot = (f) => ({ a: Math.random() * Math.PI * 2, d: Math.sqrt(Math.random()) * 0.72, f, born: clock });
  const dotPos = (isl, dot) => {
    const rr = radius(isl, dot.a) * dot.d;
    return { x: isl.x + Math.cos(dot.a) * rr, y: isl.y + Math.sin(dot.a) * rr * 0.82 };
  };

  const islands = SPOTS.map(([fx, fy], k) => {
    const isl = { x: fx * W, y: fy * H, name: NAMES[k], phase: [k * 1.7 + 0.4, k * 2.3 + 1.1], dots: [], best: 0, stall: 0, note: null };
    for (let i = 0; i < 13; i++) isl.dots.push(freshDot(0.25 + Math.random() * 0.35));
    return isl;
  });

  function evolve(isl) {
    isl.dots.sort((p, q) => q.f - p.f);
    const parent = isl.dots[Math.floor(Math.random() ** 2 * 4)];
    isl.dots[isl.dots.length - 1] = {
      a: parent.a + (Math.random() - 0.5) * 0.8,
      d: clamp(parent.d + (Math.random() - 0.5) * 0.25, 0.05, 0.75),
      f: clamp(parent.f + (Math.random() - 0.62) * 0.08, 0.02, 0.99), // most edits hurt
      born: clock
    };
    const best = Math.max(...isl.dots.map((d) => d.f));
    if (best > isl.best + 0.002) {
      isl.best = best;
      isl.stall = 0;
    } else {
      isl.stall++;
    }
    if (isl.stall > 9) {
      // Stalled: reseed a third of the island with fresh ideas
      isl.dots.sort((p, q) => q.f - p.f);
      for (let i = 9; i < 13; i++) isl.dots[i] = freshDot(0.2 + Math.random() * 0.3);
      isl.stall = 0;
      isl.note = { text: 'stalled · reseeded', t0: clock };
    }
  }

  function arcPoint(from, to, k) {
    const cx = (from.x + to.x) / 2;
    const cy = Math.min(from.y, to.y) - H * 0.18;
    const u = 1 - k;
    return { x: u * u * from.x + 2 * u * k * cx + k * k * to.x, y: u * u * from.y + 2 * u * k * cy + k * k * to.y, cx, cy };
  }

  function step(dt) {
    clock += dt;
    for (const isl of islands) for (const d of isl.dots) d.a += 0.00012 * dt * (d.d > 0.4 ? 1 : -1);
    while (clock > nextTick) {
      islands.forEach(evolve);
      nextTick += TICK_MS;
    }
    if (clock > nextMigration) {
      const from = islands.reduce((p, q) => (q.best > p.best ? q : p));
      const others = islands.filter((i) => i !== from);
      const to = others[Math.floor(Math.random() * others.length)];
      const dot = [...from.dots].sort((p, q) => q.f - p.f)[0];
      migrations.push({ from, to, f: dot.f, t0: clock });
      nextMigration += MIGRATE_MS;
    }
    migrations = migrations.filter((mg) => {
      if (clock - mg.t0 < FLIGHT_MS) return true;
      mg.to.dots.sort((p, q) => q.f - p.f);
      mg.to.dots[mg.to.dots.length - 1] = { a: Math.random() * 6, d: 0.2, f: mg.f, born: clock };
      mg.to.note = { text: 'migrant arrived', t0: clock };
      return false;
    });
  }

  // Page-coloured backdrop with a faint graticule, both fading out at the edges
  const backdrop = makeBackdrop(W, H, dpr, (g) => {
    g.strokeStyle = `rgba(${INK}, 0.05)`;
    g.lineWidth = 1;
    g.beginPath();
    for (let x = W / 8; x < W; x += W / 8) {
      g.moveTo(Math.round(x) + 0.5, 0);
      g.lineTo(Math.round(x) + 0.5, H);
    }
    for (let y = H / 5; y < H; y += H / 5) {
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(W, Math.round(y) + 0.5);
    }
    g.stroke();
  });

  function draw(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);

    for (const isl of islands) {
      // Coastline and contours
      [1, 0.72, 0.46].forEach((s, j) => {
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2;
          const rr = radius(isl, a) * s;
          const x = isl.x + Math.cos(a) * rr;
          const y = isl.y + Math.sin(a) * rr * 0.82;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.setLineDash(j ? [2, 3] : []);
        ctx.strokeStyle = `rgba(${INK}, ${j ? 0.18 : 0.55})`;
        ctx.lineWidth = j ? 0.8 : 1.1;
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Candidates: darker scores higher, gold is the island's best
      const best = isl.dots.reduce((p, q) => (q.f > p.f ? q : p));
      for (const d of isl.dots) {
        const p = dotPos(isl, d);
        const grow = clamp((clock - d.born) / 500, 0, 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, (d === best ? 3.6 : 2.6) * (0.4 + 0.6 * grow), 0, Math.PI * 2);
        ctx.fillStyle = d === best ? `rgb(${GOLD})` : `rgba(${INK}, ${0.15 + d.f * 0.8})`;
        ctx.fill();
      }

      const lx = isl.x - R * 1.05;
      const ly = isl.y - R * 0.95;
      ctx.fillStyle = `rgba(${INK}, 0.85)`;
      ctx.font = `500 ${narrow ? 12 : 13}px Newsreader, Georgia, serif`;
      ctx.fillText(`Island ${isl.name}`, lx, ly);
      ctx.fillStyle = `rgba(${INK}, 0.5)`;
      ctx.font = '400 11px Inter, sans-serif';
      ctx.fillText(`best ${isl.best.toFixed(3)}`, lx, ly + 15);
      if (isl.note && clock - isl.note.t0 < 1800) {
        ctx.fillStyle = `rgba(${GOLD}, ${1 - (clock - isl.note.t0) / 1800})`;
        ctx.font = 'italic 400 12px Newsreader, Georgia, serif';
        ctx.fillText(isl.note.text, lx, ly + 30);
      }
    }

    // Migrations
    for (const mg of migrations) {
      const k = clamp((clock - mg.t0) / FLIGHT_MS, 0, 1);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const { cx, cy } = arcPoint(mg.from, mg.to, 0);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = `rgba(${GOLD}, 0.55)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mg.from.x, mg.from.y);
      ctx.quadraticCurveTo(cx, cy, mg.to.x, mg.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const p = arcPoint(mg.from, mg.to, e);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${GOLD})`;
      ctx.fill();
    }

    // Compass
    ctx.save();
    ctx.translate(W - 34, 34);
    ctx.strokeStyle = `rgba(${INK}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(${INK}, 0.6)`;
    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -15);
    ctx.restore();

    ctx.fillStyle = `rgba(${INK}, 0.5)`;
    ctx.font = '400 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    if (narrow) {
      ctx.fillText('darker = higher score  ·  gold = island best', 14, H - 30);
      ctx.fillText('dashed = migration', 14, H - 14);
    } else {
      ctx.fillText('darker = higher score   ·   gold = island best   ·   dashed = migration', 18, H - 16);
    }
  }

  return { step, draw };
}

/* ───────────── Teaching it to read ───────────── */

function createReading(W, H, dpr) {
  const TOTAL = 92; // the run described in the post: 92 ideas, 9 facets, every one cited
  const FACETS = ['Architectures', 'Objectives', 'Data', 'Augmentation', 'Optimization', 'Regularization', 'Evaluation', 'Ensembling', 'Compute'];
  const IDS = ['2310.06770', '2106.09685', '1706.03762', '2203.15556', '2001.08361', '1412.6980', '2210.11416', '1905.11946', '2302.13971', '1512.03385', '2205.14135', '1803.05407'];
  // Wide frames: papers scroll up a column on the left. Tall frames (phones):
  // the landscape sits on top and papers scroll sideways along the bottom.
  const portrait = H > W * 0.75;
  const GAP = 12;
  const CARD_W = portrait ? 148 : W * 0.33;
  const CARD_H = portrait ? 80 : 92;
  const pitch = (portrait ? CARD_W : CARD_H) + GAP;
  const L = portrait
    ? { colX: 0, colY: H * 0.7, gridX: W * 0.05, gridW: W * 0.9, gridY: H * 0.16, gridH: H * 0.48, countY: 34, legendX: W * 0.05 }
    : { colX: W * 0.04, colY: 0, gridX: W * 0.43, gridW: W * 0.53, gridY: H * 0.2, gridH: H * 0.66, countY: 44, legendX: W * 0.43 };
  let clock = 0;
  let scroll = 0;
  let ideas = [];
  let nextIdea = 600;
  let holdUntil = 0;
  const cards = IDS.map((id, i) => ({ id, lines: [0.92, 0.72 + ((i * 37) % 23) / 100, 0.85, 0.5 + ((i * 53) % 41) / 100] }));
  const cardAt = (k) => cards[((k % cards.length) + cards.length) % cards.length];
  const cardPos = (k) => (portrait
    ? { x: k * pitch - scroll + GAP, y: L.colY }
    : { x: L.colX, y: k * pitch - scroll + GAP });
  const facetCenter = (i) => ({
    x: L.gridX + ((i % 3) + 0.5) * (L.gridW / 3),
    y: L.gridY + (Math.floor(i / 3) + 0.5) * (L.gridH / 3)
  });
  const backdrop = makeBackdrop(W, H, dpr);
  const column = makeLayer(W, H, dpr); // papers are drawn here, then faded at the column's ends

  function step(dt) {
    clock += dt;
    scroll += dt * 0.018;
    if (holdUntil) {
      if (clock > holdUntil) {
        ideas = [];
        holdUntil = 0;
        nextIdea = clock + 600;
      }
      return;
    }
    if (clock > nextIdea && ideas.length < TOTAL) {
      const facet = Math.floor(Math.random() * 9);
      const c = facetCenter(facet);
      const n = ideas.filter((d) => d.facet === facet).length;
      const a = n * 2.4;
      const rr = portrait ? 4 + Math.sqrt(n) * 6.5 : 6 + Math.sqrt(n) * 9;
      const kind = Math.random() < 0.62 ? 'supported' : Math.random() < 0.6 ? 'contested' : 'gap';
      ideas.push({
        facet, kind, t0: clock,
        x: c.x + Math.cos(a) * rr,
        y: c.y + (portrait ? 6 : 0) + Math.sin(a) * rr * (portrait ? 0.7 : 0.8),
        src: Math.floor((scroll + (portrait ? W : H) * 0.5) / pitch), // the paper passing the middle
        line: 1 + Math.floor(Math.random() * 3)
      });
      nextIdea = clock + 210 + Math.random() * 120;
      if (ideas.length === TOTAL) holdUntil = clock + 4500;
    }
  }

  function bar(ctx, x, y, w, a) {
    ctx.fillStyle = `rgba(${INK}, ${a})`;
    ctx.fillRect(x, y, w, 4);
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    drawColumn(column.ctx);
    ctx.drawImage(column.canvas, 0, 0, W, H);
    drawLandscape(ctx);
  }

  // Papers scrolling past, fading in and out at the ends of the column
  function drawColumn(ctx) {
    ctx.clearRect(0, 0, W, H);
    const first = Math.floor(scroll / pitch) - 1;
    const count = Math.ceil((portrait ? W : H) / pitch) + 2;
    for (let k = first; k < first + count; k++) {
      const { x, y } = cardPos(k);
      const card = cardAt(k);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = `rgba(${INK}, 0.1)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y + 0.5, CARD_W - 1, CARD_H, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = `rgba(${INK}, 0.45)`;
      ctx.font = `500 10px ${MONO}`;
      ctx.fillText(`arXiv:${card.id}`, x + 12, y + 20);
      bar(ctx, x + 12, y + 30, (CARD_W - 24) * card.lines[0], 0.55);
      card.lines.slice(1).forEach((w, j) => bar(ctx, x + 12, y + 48 + j * 12, (CARD_W - 24) * w, 0.14));
      for (const d of ideas) {
        if (d.src !== k) continue;
        const grow = clamp((clock - d.t0) / 350, 0, 1);
        const fade = clamp(1 - (clock - d.t0 - 900) / 700, 0, 1);
        if (fade <= 0) continue;
        ctx.fillStyle = `rgba(${GOLD}, ${0.28 * fade})`;
        ctx.fillRect(x + 10, y + 46 + (d.line - 1) * 12, (CARD_W - 20) * card.lines[d.line] * grow, 8);
      }
    }
    featherEdges(ctx, W, H, 44, portrait ? 'lr' : 'tb');
  }

  function drawLandscape(ctx) {
    // Threads from passage to idea
    for (const d of ideas) {
      const k = clamp((clock - d.t0) / 500, 0, 1);
      const fade = clamp(1 - (clock - d.t0 - 700) / 600, 0, 1);
      if (fade <= 0) continue;
      const card = cardPos(d.src);
      const sx = portrait ? card.x + CARD_W / 2 : card.x + CARD_W;
      const sy = portrait ? card.y : card.y + 50 + (d.line - 1) * 12;
      const ex = sx + (d.x - sx) * k;
      const ey = sy + (d.y - sy) * k;
      ctx.strokeStyle = `rgba(${GOLD}, ${0.5 * fade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      if (portrait) ctx.bezierCurveTo(sx, sy - 40, ex, ey + 40, ex, ey);
      else ctx.bezierCurveTo(sx + 40, sy, ex - 40, ey, ex, ey);
      ctx.stroke();
    }

    // Facets and the ideas placed in them
    ctx.font = `500 ${portrait ? 10 : 11}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    FACETS.forEach((name, i) => {
      const c = facetCenter(i);
      ctx.fillStyle = `rgba(${INK}, 0.45)`;
      ctx.fillText(name, c.x, c.y - L.gridH / 6 + 12);
    });
    ctx.textAlign = 'left';
    for (const d of ideas) {
      const k = clamp((clock - d.t0 - 400) / 300, 0, 1);
      if (k <= 0) continue;
      ctx.beginPath();
      ctx.arc(d.x, d.y, (portrait ? 2.8 : 3.2) * k, 0, Math.PI * 2);
      if (d.kind === 'supported') {
        ctx.fillStyle = `rgba(${INK}, 0.85)`;
        ctx.fill();
      } else if (d.kind === 'contested') {
        ctx.strokeStyle = `rgba(${INK}, 0.7)`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgb(${GOLD})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }

    // Count
    const placed = ideas.filter((d) => clock - d.t0 > 400).length;
    ctx.fillStyle = `rgb(${INK})`;
    ctx.font = `500 ${portrait ? 22 : 26}px Satoshi, Inter, sans-serif`;
    ctx.fillText(String(placed), L.gridX, L.countY);
    const w = ctx.measureText(String(placed)).width;
    ctx.fillStyle = `rgba(${INK}, 0.4)`;
    ctx.font = `500 ${portrait ? 13 : 15}px Satoshi, Inter, sans-serif`;
    ctx.fillText(` / ${TOTAL} ideas`, L.gridX + w, L.countY);
    if (portrait) {
      ctx.textAlign = 'right';
      ctx.font = '400 11px Inter, sans-serif';
      ctx.fillText('9 facets · every idea cited', W - L.gridX, L.countY);
      ctx.textAlign = 'left';
    } else {
      ctx.font = '400 11.5px Inter, sans-serif';
      ctx.fillText('9 facets · every idea cited', L.gridX + 2, L.countY + 18);
    }

    // Legend
    const ly = H - 14;
    let lx = L.legendX;
    const item = (mark, label) => {
      mark(lx + 4, ly - 4);
      ctx.fillStyle = `rgba(${INK}, 0.5)`;
      ctx.font = '400 11px Inter, sans-serif';
      ctx.fillText(label, lx + 13, ly);
      lx += ctx.measureText(label).width + (portrait ? 22 : 30);
    };
    item((x, y) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = `rgba(${INK}, 0.85)`; ctx.fill(); }, 'well-supported');
    item((x, y) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.strokeStyle = `rgba(${INK}, 0.7)`; ctx.lineWidth = 1.1; ctx.stroke(); }, 'contested');
    item((x, y) => { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.strokeStyle = `rgb(${GOLD})`; ctx.lineWidth = 1.4; ctx.stroke(); }, 'open gap');
  }

  return { step, draw };
}

const FIGURES = { islands: createIslands, reading: createReading };

/* ───────────── Mounting ───────────── */

class LiveFigure {
  constructor(canvas, create) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.create = create;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rafId = null;
    this.visible = false;
    this.lastTs = 0;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? false;
      if (this.visible) this.start();
    }, { threshold: 0 });
    this.io.observe(canvas);

    this.onVisibility = () => {
      if (!document.hidden && this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
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
    // The layouts are drawn for the figure's size, so a new size starts a fresh run
    this.sketch = this.create(this.w, this.h, this.dpr);
    for (let t = 0; t < (this.reduceMotion ? 9000 : PREWARM_MS); t += 16) this.sketch.step(16);
    this.draw();
  }

  draw() {
    if (!this.sketch) return;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.sketch.draw(this.ctx);
  }

  start() {
    if (this.rafId !== null || this.destroyed || this.reduceMotion) return;
    this.lastTs = 0;
    const loop = (ts) => {
      this.rafId = null;
      if (this.destroyed || !this.visible || document.hidden) return;
      const dt = this.lastTs ? Math.min(50, ts - this.lastTs) : 16;
      this.lastTs = ts;
      this.sketch?.step(dt);
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
  }
}

let mounted = [];

/**
 * Mount every live figure inside `container` (a rendered post body), after
 * tearing down the previous page's figures. Pass nothing to just tear down.
 */
export function mountArticleFigures(container) {
  mounted.forEach((f) => f.destroy());
  mounted = [];
  if (!container) return;
  container.querySelectorAll('[data-figure]').forEach((figure) => {
    const create = FIGURES[figure.dataset.figure];
    const canvas = figure.querySelector('canvas');
    if (create && canvas) mounted.push(new LiveFigure(canvas, create));
  });
}
