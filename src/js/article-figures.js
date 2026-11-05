/**
 * Live article figures — small canvas animations placed in a post's markdown:
 *
 *   <figure class="blog-figure" data-figure="islands">
 *   <div class="live-figure"><canvas></canvas></div>
 *   <figcaption>…</figcaption>
 *   </figure>
 *
 * climb — experiments landing one at a time; the best-so-far line steps up when
 *           one beats it, and the run ends past the frontier
 * generation — a population going round the loop's five steps (evaluate, select
 *           parents, cross over, mutate, select survivors) for four generations
 * corpus — one paper through parse, chunk and embed, then the whole 337K-paper corpus by field
 * seeds, spawn, novelty — islands dealt different seeds, the two ways to found a new
 *           island, and the code-novelty gate with its LLM judge
 * ioai — the IOAI² results as a race, task by task, ending on the trophy tiers
 * agents — the deep-research pass: planner, parallel explorers, verifiers, critic,
 *           synthesizer, ending in a brief of what is known, contested and open
 * islands — four island populations evolving in parallel; the best migrate
 *           between islands and a stalled island gets reseeded
 * reading — papers feeding a cited landscape of ideas across nine facets
 * circle-packing — 26 circles settling into the best-known packing, then the
 *           1e-6 tolerance cheat, magnified, failing a strict check
 * research-map — an invented map of techniques in four families, filling in as a
 *           made-up run of candidates builds them; hover or tap a mark for its name
 *
 * A <figure data-grow> around an inline SVG chart draws its bars in on first view.
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

/* ───────────── Best so far ───────────── */

function createClimb(W, H, dpr) {
  const narrow = W < 520;
  const N = 46;
  const EVERY = 300;          // ms between experiments
  const LOOP = N * EVERY + 3200;
  const KEPT = [0, 2, 5, 8, 12, 15, 19, 24, 29, 35, 41]; // the experiments that beat the best so far
  const FRONTIER = 0.86;
  const L = narrow ? 30 : 46;
  const R = narrow ? 12 : 22;
  const T = narrow ? 56 : 66;
  const B = narrow ? 18 : 24;
  const pw = W - L - R;
  const ph = H - T - B;
  let clock = 0;

  // Gains shrink as the run goes on, and only the last kept experiment clears the frontier
  const runs = [];
  let best = 0;
  for (let i = 0, k = 0; i < N; i++) {
    if (KEPT[k] === i) {
      const prev = best;
      const jitter = k && k < KEPT.length - 1 ? (Math.random() - 0.5) * 0.014 : 0;
      best = 0.3 + 0.6 * (k / (KEPT.length - 1)) ** 0.8 + jitter;
      runs.push({ s: best, kept: true, gain: best - prev, best });
      k++;
    } else {
      runs.push({ s: Math.max(0.13, best - 0.012 - Math.random() ** 1.6 * 0.17), kept: false, best });
    }
  }
  const X = (i) => L + ((i + 0.5) / N) * pw;
  const Y = (s) => T + (1 - (s - 0.1) / 0.9) * ph;

  const backdrop = makeBackdrop(W, H, dpr, (g) => {
    g.strokeStyle = `rgba(${INK}, 0.06)`;
    g.lineWidth = 1;
    g.beginPath();
    for (const s of [0.3, 0.5, 0.7]) {
      const y = Math.round(Y(s)) + 0.5;
      g.moveTo(L, y);
      g.lineTo(W - R, y);
    }
    g.stroke();
  });

  function step(dt) {
    clock = (clock + dt) % LOOP;
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = Math.min(clamp(clock / 400, 0, 1), clamp((LOOP - clock) / 500, 0, 1));

    ctx.strokeStyle = `rgba(${INK}, 0.28)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L + 0.5, T - 8);
    ctx.lineTo(L + 0.5, H - B + 0.5);
    ctx.lineTo(W - R, H - B + 0.5);
    ctx.stroke();
    ctx.save();
    ctx.translate(L - 14, T + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = `rgba(${INK}, 0.5)`;
    ctx.font = '400 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('objective metric', 0, 0);
    ctx.restore();

    const t = clock / EVERY;
    const last = Math.min(N - 1, Math.floor(t));
    const reached = t >= KEPT[KEPT.length - 1] + 0.2;

    const fy = Math.round(Y(FRONTIER)) + 0.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = reached ? `rgba(${GOLD}, 0.85)` : `rgba(${INK}, 0.35)`;
    ctx.beginPath();
    ctx.moveTo(L, fy);
    ctx.lineTo(W - R, fy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = reached ? `rgb(${GOLD})` : `rgba(${INK}, 0.55)`;
    ctx.font = `italic 400 ${narrow ? 12 : 13}px Newsreader, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.fillText(reached ? 'reached the frontier' : 'the frontier: best known result', L + 10, fy - 8);

    // Best so far: flat until an experiment beats it, then a step up to that experiment
    ctx.beginPath();
    ctx.moveTo(X(0), Y(runs[0].best));
    for (let i = 1; i <= last; i++) {
      ctx.lineTo(X(i), Y(runs[i - 1].best));
      if (runs[i].kept) ctx.lineTo(X(i), Y(runs[i].s));
    }
    ctx.lineTo(Math.min(X(last) + (t - last) * (pw / N), X(N - 1)), Y(runs[last].best));
    ctx.strokeStyle = `rgb(${GOLD})`;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Experiments pop in; kept ones are gold and show what they gained
    const bg = pageColor();
    for (let i = 0; i <= last; i++) {
      const run = runs[i];
      const age = clock - i * EVERY;
      const g = clamp(age / 240, 0, 1);
      const pop = 1 + 0.6 * Math.sin(Math.PI * g) * (1 - g);
      ctx.beginPath();
      ctx.arc(X(i), Y(run.s), (run.kept ? 4 : 2.7) * g * pop, 0, Math.PI * 2);
      ctx.fillStyle = run.kept ? `rgb(${GOLD})` : `rgba(${INK}, 0.3)`;
      ctx.fill();
      if (!run.kept) continue;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = bg;
      ctx.stroke();
      if (i && age < 1300) {
        ctx.fillStyle = `rgba(${GOLD}, ${1 - age / 1300})`;
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${run.gain.toFixed(2)}`, X(i), Y(run.s) - 11);
      }
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${INK}, 0.85)`;
    ctx.font = `500 ${narrow ? 15 : 17}px Newsreader, Georgia, serif`;
    ctx.fillText(`Experiment ${last + 1}`, L, 26);
    ctx.fillStyle = `rgba(${INK}, 0.5)`;
    ctx.font = '400 11px Inter, sans-serif';
    ctx.fillText(`best so far ${runs[last].best.toFixed(2)}`, L, 44);
    ctx.restore();
  }

  // Starts from the first experiment; with reduced motion it shows the finished run
  return { step, draw, prewarm: 0, still: N * EVERY + 600 };
}

/* ───────────── One generation ───────────── */

const lerp = (a, b, k) => a + (b - a) * k;

// Seeded randomness, so the scripted generations play out the same way every time
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

// Plays the loop out in advance: who's picked as a parent, what each child inherits and
// mutates, and who survives. Survivors keep their place; children take the places the culled left.
function scriptGenerations(MU, LAMBDA, GENS, seed) {
  const r = seeded(seed);
  const genes = () => [r(), r(), r()].map((v) => 0.3 + 0.7 * v);
  let pop = Array.from({ length: MU }, (_, i) => ({ f: 0.05 + r() * 0.3, bars: genes(), col: 'pop', slot: i }));
  const gens = [];
  for (let g = 0; g < GENS; g++) {
    const ranked = [...pop].sort((p, q) => q.f - p.f);
    const pick = () => ranked[Math.min(MU - 1, Math.floor(r() ** 1.8 * MU))];
    const kids = [];
    for (let k = 0; k < LAMBDA; k++) {
      const a = pick();
      let b = pick();
      while (b === a) b = pick();
      const from = [0, 1, 2].map(() => (r() < 0.5 ? a : b));
      if (from.every((p) => p === a)) from[2] = b;
      if (from.every((p) => p === b)) from[0] = a;
      const crossBars = from.map((p, i) => p.bars[i]);
      const mut = Math.floor(r() * 3);
      const bars = crossBars.slice();
      bars[mut] = clamp(crossBars[mut] + (crossBars[mut] > 0.65 ? -1 : 1) * (0.25 + r() * 0.25), 0.25, 1);
      const fCross = lerp(Math.min(a.f, b.f), Math.max(a.f, b.f), 0.6);
      const f = clamp(fCross + 0.11 + gauss(r) * 0.1, 0.04, 0.95);
      kids.push({ a, b, fCross, f, crossBars, bars, mut, col: 'off', slot: k });
    }
    const all = [...pop, ...kids].sort((p, q) => q.f - p.f);
    const survivors = all.slice(0, MU);
    const culled = new Set(all.slice(MU));
    const cutoff = (all[MU - 1].f + all[MU].f) / 2;
    const parents = [...new Set(kids.flatMap((c) => [c.a, c.b]))].sort((p, q) => q.f - p.f);
    const free = [...Array(MU).keys()].filter((s) => !survivors.some((p) => p.col === 'pop' && p.slot === s));
    const next = survivors.map((p) => ({ f: p.f, bars: p.bars, mut: p.mut, col: 'pop', slot: p.col === 'pop' ? p.slot : free.shift(), prev: p }));
    gens.push({ pop, kids, parents, culled, cutoff });
    pop = next;
  }
  gens.push({ pop, kids: [], parents: [], culled: new Set(), cutoff: 0 });
  return gens;
}

// A population of candidate programs, height = fitness, going round the five steps of the
// loop: evaluate, select parents, cross over, mutate, select survivors. Four generations, then loops.
function createGeneration(W, H, dpr) {
  const narrow = W < 520;
  const MU = narrow ? 6 : 8;
  const LAMBDA = narrow ? 3 : 4;
  const GENS = 4;
  const T = { select: 1100, cross: 1900, mutate: 3200, survive: 4200, end: 5600 };
  const LOOP = GENS * T.end + 2800;
  const STEPS = ['evaluate', 'select parents', 'cross over', 'mutate', 'select survivors'];
  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  const L = narrow ? 30 : 50;
  const R = narrow ? 14 : 26;
  const top = narrow ? 50 : 76;
  const bot = H - (narrow ? 40 : 50);
  const MID = narrow ? 20 : 36;
  const pitch = (W - L - R - MID) / (MU + LAMBDA);
  const gw = narrow ? 17 : 26;
  const gh = narrow ? 13 : 19;
  const popX = (slot) => L + (slot + 0.5) * pitch;
  const offX = (slot) => L + MU * pitch + MID + (slot + 0.5) * pitch;
  const Y = (f) => lerp(bot - gh / 2 - 3, top + gh / 2, f);
  const divider = L + MU * pitch + MID / 2;
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const easeOut = (k) => 1 - (1 - k) ** 3;
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;
  let clock = 0;

  const gens = scriptGenerations(MU, LAMBDA, GENS, narrow ? 73 : 36);
  const posOf = (p) => ({ x: p.col === 'pop' ? popX(p.slot) : offX(p.slot), y: Y(p.f) });

  const backdrop = makeBackdrop(W, H, dpr, (g) => {
    g.strokeStyle = ink(0.28);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(L - 10.5, top - 6);
    g.lineTo(L - 10.5, bot + 0.5);
    g.lineTo(W - R, bot + 0.5);
    g.stroke();
    g.setLineDash([2, 4]);
    g.strokeStyle = ink(0.16);
    g.beginPath();
    g.moveTo(Math.round(divider) + 0.5, top - 6);
    g.lineTo(Math.round(divider) + 0.5, bot - 4);
    g.stroke();
  });
  const bg = pageColor();

  function label(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left' } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  // A candidate: a small card whose three bars stand for its code; gold marks what was mutated
  function glyph(ctx, x, y, bars, { alpha = 1, hollow = false, ring = 0, mut = -1, mutK = 0 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (ring > 0) {
      rrect(ctx, x - gw / 2 - 3, y - gh / 2 - 3, gw + 6, gh + 6, 5);
      ctx.strokeStyle = gold(ring);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    rrect(ctx, x - gw / 2 + 0.5, y - gh / 2 + 0.5, gw - 1, gh - 1, 3);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = ink(hollow ? 0.25 : 0.55);
    ctx.lineWidth = 1;
    ctx.stroke();
    const bt = narrow ? 1.5 : 2;
    const step = narrow ? 3.4 : 5;
    bars.forEach((len, i) => {
      ctx.fillStyle = ink(hollow ? 0.2 : 0.5);
      ctx.fillRect(x - gw / 2 + 4, y + (i - 1) * step - bt / 2, (gw - 8) * len, bt);
      if (i === mut && mutK > 0) {
        ctx.fillStyle = gold(mutK);
        ctx.fillRect(x - gw / 2 + 4, y + (i - 1) * step - bt / 2, (gw - 8) * len, bt);
      }
    });
    ctx.restore();
  }

  // An arc from a parent up and over to its child, drawn up to k along it
  function arc(ctx, from, to, k) {
    const cx = (from.x + to.x) / 2;
    const cy = Math.max(top - (narrow ? 14 : 22), Math.min(from.y, to.y) - (narrow ? 18 : 30) - Math.abs(to.x - from.x) * 0.12);
    const N = 28;
    ctx.beginPath();
    for (let i = 0; i <= N * k; i++) {
      const t = i / N;
      const u = 1 - t;
      const x = u * u * from.x + 2 * u * t * cx + t * t * to.x;
      const y = u * u * from.y + 2 * u * t * cy + t * t * to.y;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function step(dt) {
    clock = (clock + dt) % LOOP;
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = Math.min(span(clock, 0, 400), 1 - span(clock, LOOP - 600, LOOP));

    const gi = Math.min(GENS, Math.floor(clock / T.end));
    const t = gi === GENS ? Math.min(clock - GENS * T.end, T.select - 1) : clock - gi * T.end;
    const phase = t < T.select ? 0 : t < T.cross ? 1 : t < T.mutate ? 2 : t < T.survive ? 3 : 4;
    const G = gens[gi];

    label(ctx, `Generation ${gi + 1}`, L - 10, narrow ? 22 : 28, { font: `500 ${narrow ? 15 : 17}px ${SERIF}`, color: ink(0.85) });
    label(ctx, 'population', popX(0) - gw / 2, top - (narrow ? 12 : 18), { font: `400 ${narrow ? 10 : 11}px ${SANS}` });
    label(ctx, 'offspring', offX(0) - gw / 2, top - (narrow ? 12 : 18), { font: `400 ${narrow ? 10 : 11}px ${SANS}` });
    ctx.save();
    ctx.translate(L - (narrow ? 18 : 22), (top + bot) / 2);
    ctx.rotate(-Math.PI / 2);
    label(ctx, 'fitness', 0, 0, { font: `400 ${narrow ? 10 : 11}px ${SANS}`, align: 'center' });
    ctx.restore();

    // The five steps along the bottom; the current one is lit
    if (narrow) {
      const y = H - 14;
      STEPS.forEach((s, i) => {
        ctx.beginPath();
        ctx.arc(L - 6 + i * 11, y - 4, i === phase ? 3.4 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = i === phase ? gold() : ink(0.22);
        ctx.fill();
      });
      label(ctx, `${phase + 1}  ${STEPS[phase]}`, L - 6 + 5 * 11 + 4, y, { font: `500 13px ${SERIF}`, color: ink(0.85) });
    } else {
      // Spread by measured width, so the gaps between steps are even
      ctx.font = `500 13.5px ${SERIF}`;
      const widths = STEPS.map((s, i) => 12 + ctx.measureText(`${i + 1}  ${s}`).width);
      const x0 = L - 10;
      const gapX = (W - R - x0 - widths.reduce((a, b) => a + b)) / 4;
      const y = H - 16;
      STEPS.forEach((s, i) => {
        const on = i === phase;
        const x = x0 + widths.slice(0, i).reduce((a, b) => a + b, 0) + i * gapX;
        ctx.beginPath();
        ctx.arc(x + 3, y - 4.5, on ? 3.4 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = on ? gold() : ink(0.22);
        ctx.fill();
        label(ctx, `${i + 1}  ${s}`, x + 12, y, { font: `500 13.5px ${SERIF}`, color: ink(on ? 0.88 : 0.36) });
      });
    }

    const fadeAfter = 1 - span(t, T.survive, T.survive + 450);
    const cullK = span(t, T.survive + 800, T.survive + 1200);
    const kidState = (c, k) => {
      const appear = span(t, T.cross + k * 280 + 300, T.cross + k * 280 + 560);
      const mutK = span(t, T.mutate + k * 220, T.mutate + k * 220 + 520);
      return { appear, mutK, f: lerp(c.fCross, c.f, ease(mutK)) };
    };

    // Crossover: lines from both parents to each child
    G.kids.forEach((c, k) => {
      const lk = span(t, T.cross + k * 280, T.cross + k * 280 + 420);
      if (lk <= 0 || fadeAfter <= 0) return;
      const to = { x: offX(c.slot), y: Y(kidState(c, k).f) - gh / 2 - 1 };
      ctx.strokeStyle = ink(0.26 * fadeAfter);
      ctx.lineWidth = 1;
      for (const p of [c.a, c.b]) arc(ctx, { x: popX(p.slot), y: Y(p.f) - gh / 2 - 4 }, to, lk);
    });

    // The population: parents get a gold ring, the rest dim, the culled drop away
    G.pop.forEach((p, j) => {
      let { x, y } = posOf(p);
      let hollow = false;
      if (gi === 0) {
        const rise = ease(span(t, 150 + j * 95, 150 + j * 95 + 480));
        y = lerp(Y(0), y, rise);
        hollow = rise <= 0;
      } else if (p.prev) {
        const from = posOf(p.prev);
        const mk = ease(span(t, 0, 750));
        x = lerp(from.x, x, mk);
        y = lerp(from.y, y, mk);
      }
      const rank = G.parents.indexOf(p);
      const ring = rank >= 0 ? span(t, T.select + rank * 110, T.select + rank * 110 + 300) * fadeAfter : 0;
      const dim = rank < 0 ? span(t, T.select, T.select + 300) * fadeAfter : 0;
      const gone = G.culled.has(p) ? cullK : 0;
      // A child's gold mutation fades once it has joined the population
      const fresh = p.prev && p.prev.col === 'off' ? 1 - span(t, 300, 1000) : 0;
      glyph(ctx, x, y + gone * 10, p.bars, { alpha: (1 - 0.5 * dim) * (1 - gone), hollow, ring, mut: p.mut ?? -1, mutK: fresh });
    });

    // The offspring: built from both parents, then a mutation moves their fitness
    G.kids.forEach((c, k) => {
      const s = kidState(c, k);
      if (s.appear <= 0) return;
      const x = offX(c.slot);
      const y = Y(s.f);
      const gone = G.culled.has(c) ? cullK : 0;
      const bars = c.crossBars.map((v, i) => lerp(v, c.bars[i], ease(s.mutK)));
      glyph(ctx, x, y + gone * 10, bars, { alpha: easeOut(s.appear) * (1 - gone), mut: c.mut, mutK: s.mutK });
      if (s.mutK > 0 && s.mutK < 1) {
        ctx.beginPath();
        ctx.arc(x, y, gw * 0.55 + 12 * s.mutK, 0, Math.PI * 2);
        ctx.strokeStyle = gold(0.7 * (1 - s.mutK));
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    });

    // Survivor selection: a cut-off comes down until only the population's worth is above it
    if (phase === 4) {
      const ck = ease(span(t, T.survive, T.survive + 650));
      const y = Math.round(lerp(top - 4, Y(G.cutoff), ck)) + 0.5;
      ctx.save();
      ctx.globalAlpha *= 1 - span(t, T.end - 350, T.end);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = gold(0.85);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(L - 10, y);
      ctx.lineTo(W - R, y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Starts at generation 1; with reduced motion it holds on the last cut
  return { step, draw, prewarm: 0, still: T.end + T.survive - 50 };
}

/* ───────────── Research agents ───────────── */

// The pipeline itself, running. The planner fans out into four lanes; in each an explorer
// (the gold frame) reads paper after paper at its own pace and sends back what it finds.
// The verifiers check every find against its paper (one is struck), the critic goes
// back for something nobody looked at, and the synthesizer sorts the rest into a brief.
// Drawn at a design width, 680 px (360 on phones and other tall frames), then scaled to fit.
function createAgents(W, H, dpr) {
  const tall = W < 520 || H > W * 0.9;
  const vw = tall ? 360 : 680;
  const s = W / vw;
  const inner = createAgentsAt(vw, H / s, dpr * s);
  return {
    ...inner,
    draw(ctx) {
      ctx.save();
      ctx.scale(s, s);
      inner.draw(ctx);
      ctx.restore();
    }
  };
}

function createAgentsAt(W, H, dpr) {
  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  const STAGES = ['Planner', 'Explorers', 'Verifiers', 'Critic', 'Synthesizer'];
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;
  const rose = (a = 1) => `rgba(180, 87, 74, ${a})`;

  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

  const easeOut = (k) => 1 - (1 - k) ** 3;

  const loopAlpha = (clock, loop, inMs = 400, outMs = 500) => Math.min(span(clock, 0, inMs), 1 - span(clock, loop - outMs, loop));

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left' } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function textWidth(ctx, str, font) {
    ctx.font = font;
    return ctx.measureText(str).width;
  }

  function looping(LOOP, draw, extra = {}) {
    let clock = 0;
    return {
      loopMs: LOOP,
      prewarm: 0,
      ...extra,
      step(dt) {
        clock = (clock + dt) % LOOP;
      },
      draw(ctx) {
        draw(ctx, clock);
      }
    };
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  /** A white card, like the paper cards in the reading figure */
  function card(ctx, x, y, w, h, { border = ink(0.12), width = 1, dashed = false, fill = '#ffffff', r = 6 } = {}) {
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (border) {
      ctx.setLineDash(dashed ? [3, 3] : []);
      ctx.strokeStyle = border;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * A paper: a white card with an optional arXiv ID and greeked lines of text. Line `hl` of
   * the body can carry a highlight that has grown `hlK` of the way along it.
   */
  function paper(ctx, x, y, w, h, { id = null, idFont = `500 9.5px ${MONO}`, body = [0.92, 0.78, 0.86, 0.55], hl = -1, hlK = 0, hlColor = gold(0.3), border = ink(0.12), bw = 1, pad = 10, bar = 3, gap = 9, title = true, hlGrow = 3 } = {}) {
    card(ctx, x, y, w, h, { border, width: bw });
    let ly = y + pad;
    if (id) {
      text(ctx, `arXiv:${id}`, x + pad, ly + 8, { font: idFont, color: ink(0.45) });
      ly += 15;
    }
    const iw = w - 2 * pad;
    if (title) {
      ctx.fillStyle = ink(0.5);
      ctx.fillRect(x + pad, ly, iw * 0.9, bar);
      ly += gap + 2;
    }
    body.forEach((k, j) => {
      if (ly + bar > y + h - pad + 2) return;
      if (j === hl && hlK > 0) {
        const grow = Math.min(hlGrow, bar);
        ctx.fillStyle = hlColor;
        ctx.fillRect(x + pad - 2, ly - grow, (iw * k + 4) * hlK, bar + 2 * grow);
      }
      ctx.fillStyle = ink(j === hl && hlK > 0 ? 0.35 : 0.14);
      ctx.fillRect(x + pad, ly, iw * k, bar);
      ly += gap;
    });
  }

  /** A cross, drawn on as k goes 0 → 1 */
  function cross(ctx, x, y, s, color, k = 1, width = 1.6) {
    if (k <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    const a = Math.min(1, k * 2);
    const b = clamp(k * 2 - 1, 0, 1);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x - s + 2 * s * a, y - s + 2 * s * a);
    if (b > 0) {
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x + s - 2 * s * b, y - s + 2 * s * b);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** A claim's mark, in the reading figure's code: filled when supported, hollow when contested, a gold ring for an open gap */
  function mark(ctx, x, y, r, kind, a = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (kind === 'known') {
      ctx.fillStyle = ink(0.82 * a);
      ctx.fill();
    } else if (kind === 'contested') {
      ctx.fillStyle = `rgba(253, 250, 246, ${a})`;
      ctx.fill();
      ctx.strokeStyle = ink(0.72 * a);
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else if (kind === 'open') {
      ctx.fillStyle = `rgba(253, 250, 246, ${a})`;
      ctx.fill();
      ctx.strokeStyle = gold(a);
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (kind === 'found') {
      ctx.fillStyle = gold(0.9 * a);
      ctx.fill();
    } else if (kind === 'struck') {
      ctx.fillStyle = rose(0.9 * a);
      ctx.fill();
    }
  }

  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };

  /** A cubic from (x0, y0) to (x1, y1), drawn k of the way; horizontal or vertical tangents */
  function curve(ctx, x0, y0, x1, y1, k = 1, vertical = false) {
    if (k <= 0) return;
    const c = vertical
      ? [x0, y0 + (y1 - y0) * 0.5, x1, y1 - (y1 - y0) * 0.5]
      : [x0 + (x1 - x0) * 0.5, y0, x1 - (x1 - x0) * 0.5, y1];
    const n = 24;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 1; i <= n * k; i++) {
      const t = i / n;
      ctx.lineTo(bez(x0, c[0], c[2], x1, t), bez(y0, c[1], c[3], y1, t));
    }
    if (k < 1) ctx.lineTo(bez(x0, c[0], c[2], x1, k), bez(y0, c[1], c[3], y1, k));
    ctx.stroke();
  }

  const narrow = W < 520;
  const LOOP = 15600;
  const T = { plan: 300, explore: 1500, verify: 7400, critic: 8900, synth: 12100 };
  // Each lane's explorer reaches paper k at start + k * every; `finds` are the papers it
  // pulls a claim from, in order (index into CLAIMS[lane])
  const LANES = [
    { start: 1600, every: 1250, finds: [0, 2] },
    { start: 1750, every: 880, finds: [0, 1, 3] },
    { start: 1680, every: 1380, finds: [1, 3] },
    { start: 1820, every: 1040, finds: [0, 2] }
  ];
  // Lane 1's three finds: one-cycle (known), restarts (struck), and a third known one
  const kinds = [['known', 'contested'], ['known', 'struck', 'known'], ['known', 'known'], ['known', 'known']];
  const PAPERS = 4;
  const backdrop = makeBackdrop(W, H, dpr);

  // Layout. Wide: left to right, stage names along the top. Narrow: top to bottom, stage
  // names down the left.
  const L = narrow
    ? {
      planner: { x: W * (0.345 + 1.5 * 0.139), y: H * 0.1 },
      lane: (i) => ({ x: W * (0.345 + i * 0.139) }),
      paperAt: (i, k) => ({ x: W * (0.345 + i * 0.139), y: H * 0.205 + k * H * 0.083 }),
      pw: 24, ph: 28,
      gate: H * 0.535,
      slot: (i, j) => ({ x: W * (0.345 + i * 0.139), y: H * 0.535 + 15 + j * 14 }),
      critic: { x: W * 0.47, y: H * 0.705 },
      criticPaper: { x: W * (0.345 + 4 * 0.139), y: H * 0.705 },
      brief: { x: W * 0.29, y: H * 0.775, w: W * 0.67, h: H * 0.165 },
      r: 4.2
    }
    : {
      planner: { x: W * 0.095, y: H * 0.5 },
      lane: (i) => ({ y: H * (0.31 + i * 0.135) }),
      paperAt: (i, k) => ({ x: W * 0.225 + k * W * 0.082, y: H * (0.31 + i * 0.135) }),
      pw: 24, ph: 30,
      gate: W * 0.555,
      slot: (i, j) => ({ x: W * 0.555 + 16 + j * 15, y: H * (0.31 + i * 0.135) }),
      critic: { x: W * 0.705, y: H * 0.5 },
      criticPaper: { x: W * 0.225 + 1.5 * W * 0.082, y: H * 0.85 },
      brief: { x: W * 0.775, y: H * 0.3, w: W * 0.185, h: H * 0.4 },
      r: 4.5
    };
  // Stage name positions
  const labelAt = narrow
    ? [H * 0.1, H * 0.33, H * 0.535 + 26, H * 0.705, H * 0.858].map((y) => ({ x: 16, y: y + 5 }))
    : [W * 0.095, W * 0.36, W * 0.575, W * 0.705, W * 0.868].map((x) => ({ x, y: H * 0.13 }));

  // Every claim: lane, slot, when it leaves its paper, and how it is judged
  const claims = [];
  LANES.forEach((lane, i) => {
    lane.finds.forEach((k, j) => {
      const at = lane.start + k * lane.every + lane.every * 0.42;
      claims.push({ i, j, k, at, kind: kinds[i][j] });
    });
  });
  claims.forEach((c, n) => {
    c.check = T.verify + 250 + n * 95;
  });
  const missed = { i: 4, j: 0, at: T.critic + 2100, kind: 'known', check: T.critic + 2850 };
  const briefSlots = (() => {
    const kept = [...claims.filter((c) => c.kind !== 'struck'), missed];
    const rows = { known: [], contested: [] };
    kept.forEach((c) => rows[c.kind].push(c));
    return rows;
  })();

  const slotOf = (c) => (c.i === 4
    ? (narrow ? { x: L.slot(4, 0).x, y: L.slot(4, 0).y } : { x: L.slot(0, 0).x, y: L.criticPaper.y })
    : L.slot(c.i, c.j));

  function briefRowY(row) {
    const b = L.brief;
    return narrow ? b.y + 25 + row * (b.h - 40) : b.y + 22 + row * (b.h - 26) / 3;
  }
  function briefDot(kind, n) {
    const b = L.brief;
    const row = kind === 'known' ? 0 : kind === 'contested' ? 1 : 2;
    if (narrow) {
      // Two columns of rows: known spans the top, contested and open share the bottom
      if (row === 0) return { x: b.x + 84 + n * 15, y: briefRowY(0) - 4 };
      return { x: b.x + (row === 1 ? 84 : b.w - 24), y: briefRowY(1) - 4 };
    }
    return { x: b.x + 14 + n * 13, y: briefRowY(row) + 15 };
  }

  function stageAt(t) {
    if (t < T.explore) return 0;
    if (t < T.verify) return 1;
    if (t < T.critic) return 2;
    if (t < T.synth) return 3;
    return 4;
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP, 400, 600);
    const stage = stageAt(t);

    // Stage names; the active one is dark with a gold bar
    STAGES.forEach((name, s) => {
      const p = labelAt[s];
      const on = s === stage;
      const a = on ? 0.9 : s < stage ? 0.5 : 0.32;
      const font = `500 ${narrow ? 14 : 15}px ${SERIF}`;
      text(ctx, name, p.x, p.y, { font, color: ink(a), align: narrow ? 'left' : 'center' });
      if (on) {
        const w = textWidth(ctx, name, font);
        ctx.fillStyle = gold(0.9);
        if (narrow) ctx.fillRect(p.x, p.y + 5, w, 1.6);
        else ctx.fillRect(p.x - w / 2, p.y + 6, w, 1.6);
      }
    });
    if (!narrow) {
      // Small arrows between the stage names
      ctx.strokeStyle = ink(0.22);
      ctx.lineWidth = 1;
      for (let s = 0; s < 4; s++) {
        const a = labelAt[s];
        const b = labelAt[s + 1];
        const wa = textWidth(ctx, STAGES[s], `500 15px ${SERIF}`) / 2;
        const wb = textWidth(ctx, STAGES[s + 1], `500 15px ${SERIF}`) / 2;
        const x0 = a.x + wa + 8;
        const x1 = b.x - wb - 8;
        if (x1 - x0 < 8) continue;
        const y = a.y - 4;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.moveTo(x1 - 4, y - 3);
        ctx.lineTo(x1, y);
        ctx.lineTo(x1 - 4, y + 3);
        ctx.stroke();
      }
    }

    // Planner: fans out one direction per lane
    const P = L.planner;
    const planK = span(t, T.plan, T.plan + 500);
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const k = ease(span(t, T.plan + 200 + i * 120, T.plan + 900 + i * 120));
      ctx.strokeStyle = gold(0.55);
      if (narrow) {
        const top = L.paperAt(i, 0);
        curve(ctx, P.x, P.y + 7, top.x, top.y - L.ph / 2 - 6, k, true);
      } else {
        const first = L.paperAt(i, 0);
        curve(ctx, P.x + 7, P.y, first.x - L.pw / 2 - 8, first.y, k);
      }
    }
    // Lane rails
    ctx.strokeStyle = ink(0.1);
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const k = span(t, T.plan + 700 + i * 120, T.plan + 1200 + i * 120);
      if (k <= 0) continue;
      const a = L.paperAt(i, 0);
      const b = L.paperAt(i, PAPERS - 1);
      ctx.beginPath();
      if (narrow) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(a.x, lerp(a.y, L.gate, k));
      } else {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(lerp(a.x, L.gate, k), a.y);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(P.x, P.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = stage === 0 ? gold(0.95) : ink(0.75);
    ctx.globalAlpha *= 1;
    ctx.fill();
    if (stage === 0) {
      ctx.beginPath();
      ctx.arc(P.x, P.y, 6.5 + 6 * planK, 0, Math.PI * 2);
      ctx.strokeStyle = gold(0.5 * (1 - planK));
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Papers, and each lane's explorer moving along them
    for (let i = 0; i < 4; i++) {
      const lane = LANES[i];
      for (let k = 0; k < PAPERS; k++) {
        const p = L.paperAt(i, k);
        const appear = span(t, T.plan + 800 + i * 120 + k * 70, T.plan + 1100 + i * 120 + k * 70);
        if (appear <= 0) continue;
        const find = claims.find((c) => c.i === i && c.k === k);
        const hlK = find ? span(t, find.at - 300, find.at) : 0;
        ctx.save();
        ctx.globalAlpha *= appear;
        paper(ctx, p.x - L.pw / 2, p.y - L.ph / 2, L.pw, L.ph, { pad: 5, bar: 2.2, gap: 5, body: [0.9, 0.7, 0.85], hl: 1, hlK, hlColor: gold(0.6), hlGrow: 1.2 });
        ctx.restore();
      }
      // The explorer: a gold frame that moves from paper to paper while its lane runs
      const done = lane.start + PAPERS * lane.every;
      if (t > lane.start - 200 && t < done + 300) {
        const pos = (t - lane.start) / lane.every;
        const k = Math.floor(pos);
        const f = pos - k;
        const move = ease(span(f, 0.7, 1));
        const kk = clamp(k, 0, PAPERS - 1);
        const a = L.paperAt(i, kk);
        const b = L.paperAt(i, Math.min(PAPERS - 1, kk + 1));
        const last = k >= PAPERS - 1;
        const x = last ? a.x : lerp(a.x, b.x, move);
        const y = last ? a.y : lerp(a.y, b.y, move);
        const fa = Math.min(span(t, lane.start - 200, lane.start), 1 - span(t, done, done + 300));
        ctx.strokeStyle = gold(0.95 * fa);
        ctx.lineWidth = 1.5;
        rrect(ctx, x - L.pw / 2 - 4, y - L.ph / 2 - 4, L.pw + 8, L.ph + 8, 5);
        ctx.stroke();
      }
    }

    // Verifiers: a checkpoint where every lane meets the queue
    const gateA = span(t, T.plan + 900, T.plan + 1400);
    ctx.strokeStyle = ink(0.16 * gateA);
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (narrow) {
      ctx.moveTo(L.lane(0).x - 22, L.gate);
      ctx.lineTo(L.lane(4).x + 16, L.gate);
    } else {
      ctx.moveTo(L.gate, L.lane(0).y - 26);
      ctx.lineTo(L.gate, L.criticPaper.y + 18);
    }
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const g = narrow ? { x: L.lane(i).x, y: L.gate } : { x: L.gate, y: L.lane(i).y };
      const active = stage === 2;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = active ? gold(0.9 * gateA) : ink(0.4 * gateA);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }

    // The critic: reads over what came back, then reaches for a paper nobody opened
    const C = L.critic;
    const cA = span(t, T.plan + 1000, T.plan + 1500);
    ctx.beginPath();
    ctx.arc(C.x, C.y, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = stage === 3 ? gold(0.95) : ink(0.75 * cA);
    ctx.fill();
    if (stage === 3) {
      // Glances along the queue
      const scan = span(t, T.critic + 100, T.critic + 1100);
      const kept = claims.filter((c) => c.kind !== 'struck');
      kept.forEach((c, n) => {
        const k = span(scan, n / kept.length, n / kept.length + 0.25);
        const fade = 1 - span(t, T.critic + 1100, T.critic + 1500);
        if (k <= 0 || fade <= 0) return;
        const s = slotOf(c);
        ctx.strokeStyle = gold(0.35 * fade * Math.sin(Math.PI * k));
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(C.x, C.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      });
    }
    // Its paper
    const reach = ease(span(t, T.critic + 1200, T.critic + 1700));
    const cp = L.criticPaper;
    if (reach > 0) {
      const fade = 1 - span(t, T.synth + 300, T.synth + 900) * 0.6;
      ctx.save();
      ctx.globalAlpha *= fade;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = gold(0.7);
      ctx.lineWidth = 1.2;
      if (narrow) curve(ctx, C.x + 8, C.y, cp.x - L.pw / 2 - 5, cp.y, reach);
      else curve(ctx, C.x, C.y + 8, cp.x + L.pw / 2 + 6, cp.y, reach, false);
      ctx.setLineDash([]);
      if (reach >= 1) {
        const hlK = span(t, missed.at - 400, missed.at);
        paper(ctx, cp.x - L.pw / 2, cp.y - L.ph / 2, L.pw, L.ph, { pad: 5, bar: 2.2, gap: 5, body: [0.9, 0.7, 0.85], hl: 1, hlK, hlColor: gold(0.6), hlGrow: 1.2, border: gold(0.8), bw: 1.3 });
      }
      ctx.restore();
    }

    // Synthesizer: the brief
    const B = L.brief;
    const bA = span(t, T.synth, T.synth + 400);
    if (bA > 0) {
      ctx.save();
      ctx.globalAlpha *= bA;
      card(ctx, B.x, B.y, B.w, B.h, { border: ink(0.16) });
      const rows = narrow
        ? [['Known', B.x + 12, briefRowY(0)], ['Contested', B.x + 12, briefRowY(1)], ['Open', B.x + B.w - 62, briefRowY(1)]]
        : [['Known', B.x + 12, briefRowY(0)], ['Contested', B.x + 12, briefRowY(1)], ['Open', B.x + 12, briefRowY(2)]];
      rows.forEach(([name, x, y]) => text(ctx, name, x, y, { font: `500 11px ${SANS}`, color: ink(0.5) }));
      ctx.restore();
    }
    // Brief placeholder, faint, before the synthesizer starts
    if (bA < 1) {
      ctx.save();
      ctx.globalAlpha *= (1 - bA) * span(t, T.plan + 1100, T.plan + 1600);
      card(ctx, B.x, B.y, B.w, B.h, { border: ink(0.12), dashed: true, fill: null });
      ctx.restore();
    }
    // The claims: gold while unchecked, then judged at the checkpoint, then filed in the brief
    const all = [...claims, missed];
    all.forEach((c) => {
      if (t < c.at) return;
      const from = c.i === 4 ? cp : L.paperAt(c.i, c.k);
      const slot = slotOf(c);
      const fly = ease(span(t, c.at, c.at + 650));
      let x = lerp(from.x, slot.x, fly);
      let y = lerp(from.y, slot.y, fly);
      if (narrow && c.i < 4) x += Math.sin(Math.PI * fly) * 9;
      else if (c.i < 4) y -= Math.sin(Math.PI * fly) * 10;
      const checked = span(t, c.check, c.check + 220);
      let kind = checked > 0.5 ? c.kind : 'found';
      let a = 1;
      if (c.kind === 'struck' && checked > 0) {
        // Rejected: crossed out, then it drops out of the queue
        const drop = easeOut(span(t, c.check + 700, c.check + 1500));
        y += drop * 16;
        a = 1 - drop;
        if (a <= 0) return;
      }
      // Into the brief
      if (c.kind !== 'struck') {
        const row = briefSlots[c.kind];
        const n = row.indexOf(c);
        const at = T.synth + 200 + all.indexOf(c) * 60;
        const go = ease(span(t, at, at + 750));
        if (go > 0) {
          const d = briefDot(c.kind, n);
          x = lerp(x, d.x, go);
          y = lerp(y, d.y, go) - Math.sin(Math.PI * go) * 14;
        }
      }
      // The flash as a verifier checks it
      const flash = span(t, c.check - 120, c.check + 380);
      if (flash > 0 && flash < 1) {
        ctx.beginPath();
        ctx.arc(x, y, L.r + 2 + 6 * flash, 0, Math.PI * 2);
        ctx.strokeStyle = (c.kind === 'struck' ? rose : gold)(0.6 * (1 - flash));
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      mark(ctx, x, y, L.r, kind, a);
      if (c.kind === 'struck' && checked > 0) cross(ctx, x, y, L.r + 2.5, rose(0.95 * a), span(t, c.check, c.check + 300), 1.5);
    });

    // The synthesizer marks what nobody has answered yet
    const gapK = span(t, T.synth + 1500, T.synth + 1900);
    if (gapK > 0) {
      const d = briefDot('open', 0);
      mark(ctx, d.x, d.y, L.r * (0.6 + 0.4 * easeOut(gapK)), 'open', gapK);
    }
    ctx.restore();
  }, { still: 14600 });
}

/* ───────────── The corpus ───────────── */

// One paper through the full-text pipeline (source, parse, chunk, embed), then the whole corpus:
// 337K papers in machine learning, robotics and biology, lighting up gold as full text is backfilled.
// Shares are rounded and drawn, never counted. Drawn at a design width, 680 px (360 on phones), then scaled.
const createCorpus = (() => {
  const INK = '28, 25, 23';
  const GOLD = '184, 134, 11';
  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  const MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';
  const FEATHER = 28;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const easeOut = (k) => 1 - (1 - k) ** 3;
  const easeOutBack = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
  /** How far t is through [a, b], from 0 to 1 */
  const span = (t, a, b) => (a === Infinity ? 0 : clamp((t - a) / (b - a), 0, 1));
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;

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

  /** The page colour, opaque in the middle and dissolving at the edges. */
  function makeBackdrop(W, H, dpr) {
    const layer = makeLayer(W, H, dpr);
    layer.ctx.fillStyle = pageColor();
    layer.ctx.fillRect(0, 0, W, H);
    featherEdges(layer.ctx, W, H, FEATHER);
    return layer.canvas;
  }

  /** Fade in as a loop starts and out as it ends */
  const loopAlpha = (clock, loop, inMs = 400, outMs = 600) => Math.min(span(clock, 0, inMs), 1 - span(clock, loop - outMs, loop));

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', halo = 0 } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    if (halo) {
      // A soft knockout in the page colour, so dots passing behind the text go under it
      ctx.strokeStyle = pageColor();
      ctx.lineWidth = halo;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function textWidth(ctx, str, font) {
    ctx.font = font;
    return ctx.measureText(str).width;
  }

  function looping(LOOP, draw, extra = {}) {
    let clock = 0;
    return {
      loopMs: LOOP,
      prewarm: 0,
      ...extra,
      step(dt) {
        clock = (clock + dt) % LOOP;
      },
      draw(ctx) {
        draw(ctx, clock);
      }
    };
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  /** Small seeded generator, so every loop (and every recording) is the same */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rand) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /* The corpus */

  // Machine learning, robotics, biology. `share` of the corpus, the share of each field
  // with full text by September (`full`), and how much of each was in before the arXiv
  // metadata snapshot was loaded (`pre`; biology came in by hand, before it).
  const FIELDS = [
    { name: 'Machine learning', share: 0.778, full: 0.2, pre: 0.61 },
    { name: 'Robotics', share: 0.16, full: 0.95, pre: 0.2 },
    { name: 'Biology', share: 0.062, full: 0.23, pre: 1 }
  ];
  // One dot per thousand papers
  const UNITS = [262, 54, 21];
  const TOTAL_K = 337;

  /** The count, as the stat box had it: "337K" */
  function countLabel(k) {
    if (k < 1) return '0';
    return `${Math.round(k)}K`;
  }

  /** Split n into bundles of at most `size` (biology's small hand-built sets) */
  function bundles(n, size) {
    const out = [];
    while (n > 0) {
      const b = Math.min(size, n);
      out.push(b);
      n -= b;
    }
    return out;
  }

  /**
   * When each unit of the corpus arrives. Machine learning and robotics trickle in from the
   * scraper (faster as it goes), biology in a few small sets, and then the snapshot brings
   * the rest of machine learning and most of robotics at once. Returns
   * [{ f, at, flood }], per field in arrival order.
   */
  function schedule(counts, T, rand, bioBundle) {
    const pre = counts.map((n, f) => Math.round(n * FIELDS[f].pre));
    const trickle = [];
    for (let f = 0; f < 2; f++) for (let i = 0; i < pre[f]; i++) trickle.push(f);
    shuffle(trickle, rand);
    const out = [];
    const n = trickle.length;
    trickle.forEach((f, k) => {
      const u = (k + 0.2 + rand() * 0.6) / n;
      out.push({ f, at: T.start + (T.flood - 380 - T.start) * u ** 0.82, flood: false });
    });
    const sets = bundles(pre[2], bioBundle);
    sets.forEach((size, j) => {
      const at = T.start + (T.flood - 380 - T.start) * ((j + 0.55) / sets.length) ** 0.9;
      for (let i = 0; i < size; i++) out.push({ f: 2, at: at + i * 90, flood: false });
    });
    for (let f = 0; f < 3; f++) for (let i = pre[f]; i < counts[f]; i++) out.push({ f, at: T.flood, flood: true });
    out.sort((a, b) => a.at - b.at);
    return { all: out, pre };
  }

  /* Clusters */

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  /** Sunflower slots for n dots, centre outwards */
  function sunflower(n, c) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const r = c * Math.sqrt(k + 0.5);
      out.push({ x: r * Math.cos(k * GOLDEN), y: r * Math.sin(k * GOLDEN) });
    }
    return out;
  }

  /**
   * Three discs in a row, sitting on a common line with the field names under them, and
   * the count above the small ones, right-aligned with the last disc.
   */
  function clusterLayout(W, H, narrow) {
    const c = narrow ? 4.05 : 5.6;
    const r = narrow ? 2.15 : 2.8;
    const base = narrow ? H * 0.78 : H * 0.775;
    const gap = narrow ? 22 : 42;
    const R = UNITS.map((n) => c * Math.sqrt(n + 0.5) + r);
    const width = 2 * (R[0] + R[1] + R[2]) + 2 * gap;
    let x = W / 2 - width / 2;
    const centers = R.map((rad) => {
      const p = { x: x + rad, y: base - rad };
      x += 2 * rad + gap;
      return p;
    });
    const slots = UNITS.map((n, f) => sunflower(n, c).map((p) => ({ x: centers[f].x + p.x, y: centers[f].y + p.y })));
    return {
      c, r, base, R, centers, slots,
      rFull: r * 1.12,
      label: (f) => ({ x: centers[f].x, y: base + (narrow ? 20 : 25) }),
      labelFont: narrow ? `500 13px ${SERIF}` : `500 15px ${SERIF}`,
      count: { x: centers[2].x + R[2], y: narrow ? H * 0.27 : H * 0.3 },
      countFont: narrow ? `500 31px ${SERIF}` : `500 44px ${SERIF}`
    };
  }

  function drawCount(ctx, L, k, a = 1) {
    if (a <= 0) return;
    text(ctx, countLabel(k), L.count.x, L.count.y, { font: L.countFont, color: ink(0.86 * a), align: 'right', halo: 10 });
  }

  function drawFieldLabels(ctx, L, a = 1, labelAt = L.label) {
    if (a <= 0) return;
    FIELDS.forEach((fd, f) => {
      const p = labelAt(f);
      text(ctx, fd.name, p.x, p.y, { font: L.labelFont, color: ink(0.72 * a), align: 'center' });
    });
  }

  /** A unit of the corpus: soft ink with an abstract, gold once it has full text */
  function dot(ctx, x, y, r, goldK, a = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (goldK >= 1) ctx.fillStyle = gold(0.95 * a);
    else if (goldK <= 0) ctx.fillStyle = ink(0.3 * a);
    else {
      // Blend ink to gold
      const k = goldK;
      const col = [0, 1, 2].map((i) => Math.round(lerp([28, 25, 23][i], [184, 134, 11][i], k)));
      ctx.fillStyle = `rgba(${col.join(', ')}, ${lerp(0.3, 0.95, k) * a})`;
    }
    ctx.fill();
  }

  /**
   * When each field's dots get full text. Robotics is quick, biology was small, and
   * machine learning is still going when the loop ends: its last few land in the hold.
   */
  function fillSchedule(rand, start, endMl, tail, loopEnd) {
    const golds = UNITS.map((n, f) => Math.round(n * FIELDS[f].full));
    const times = [];
    // Machine learning: steady, then a slow tail into the hold
    const ml = [];
    const tailN = 6;
    for (let k = 0; k < golds[0] - tailN; k++) ml.push(start + (endMl - start) * ((k + rand() * 0.9) / (golds[0] - tailN)));
    for (let j = 0; j < tailN; j++) ml.push(tail + (loopEnd - tail) * ((j + 0.3 + rand() * 0.4) / tailN));
    times.push(ml);
    const ro = [];
    for (let k = 0; k < golds[1]; k++) ro.push(start + 250 + 2300 * ((k + rand() * 0.9) / golds[1]) ** 1.15);
    times.push(ro);
    const bio = [];
    for (let k = 0; k < golds[2]; k++) bio.push(start + 500 + 1700 * ((k + rand() * 0.8) / golds[2]));
    times.push(bio);
    return { golds, times };
  }

  /* One paper, then all of them */

  // One paper through the full-text pipeline: it arrives from its source, parsing finds its
  // headings and its table, it splits at the headings into chunks (the table kept whole),
  // and each chunk is embedded as a gold dot. The dots merge, the view pulls back, and the
  // paper is one dot in the robotics disc as the count climbs to 337K. Then the backfill
  // lights up the rest of the corpus.
  function createPath(W, H, dpr) {
    const narrow = W < 520;
    const LOOP = 15400;
    const T = {
      arrive: [300, 1100],
      move1: [1650, 2250], parse: [2250, 3150],
      move2: [3400, 4000], chunk: [4000, 4800],
      move3: [5100, 5700], embed: [5700, 6600],
      merge: [6700, 7150], zoom: [7250, 9150],
      fill: 9500
    };
    const STAGES = ['source', 'parse', 'chunk', 'embed'];
    const stageSpans = [[T.arrive[0], T.move1[0]], [T.move1[0], T.move2[0]], [T.move2[0], T.move3[0]], [T.move3[0], T.zoom[0]]];
    const rand = rng(31);
    const backdrop = makeBackdrop(W, H, dpr);
    const L = clusterLayout(W, H, narrow);

    const sx = (narrow ? [0.165, 0.39, 0.615, 0.84] : [0.2, 0.4, 0.6, 0.8]).map((k) => k * W);
    const stageY = narrow ? 36 : 54;
    const cy = narrow ? H * 0.56 : H * 0.57;
    const cw = narrow ? 64 : 108;
    const pad = narrow ? 5 : 8;
    const g = narrow ? 4.6 : 7.2;
    const bar = narrow ? 1.7 : 2.5;
    const idH = narrow ? 9 : 13;

    // The paper: four sections, split at the headings. The first holds its ID, title and
    // opening; the third holds the table.
    const SECTIONS = [
      { head: false, rows: ['id', 'title', 'title2', 'line', 'line', 'line'] },
      { head: true, rows: ['line', 'line', 'line'] },
      { head: true, rows: ['table', 'line'] },
      { head: true, rows: ['line', 'line'] }
    ];
    const rowH = { id: idH, title: g + 1, title2: g + 1, line: g, table: 3 * g + 2 };
    const widths = [0.92, 0.84, 0.95, 0.62, 0.88, 0.76, 0.9, 0.7, 0.81, 0.58];
    let yy = pad;
    let wi = 0;
    const secs = SECTIONS.map((s, si) => {
      const y0 = yy - (si ? pad / 2 : pad);
      const rows = [];
      if (s.head) {
        rows.push({ kind: 'head', y: yy, w: 0.42 });
        yy += g + 2;
      }
      s.rows.forEach((kind) => {
        rows.push({ kind, y: yy, w: kind === 'line' ? widths[wi++ % widths.length] : kind === 'title2' ? 0.6 : 0.9 });
        yy += rowH[kind];
      });
      yy += pad;
      return { y0, rows };
    });
    const ch = yy;
    secs.forEach((s, i) => {
      s.y1 = i < secs.length - 1 ? secs[i + 1].y0 : ch;
    });

    // Where the paper ends up: a slot near the middle of the robotics disc
    const home = L.slots[1][3];
    // The rest of the corpus, as dots, and when each gets full text
    const fill = fillSchedule(rand, T.fill, T.fill + 3300, T.fill + 3700, LOOP - 700);
    const corpus = [];
    for (let f = 0; f < 3; f++) {
      const idx = shuffle(L.slots[f].map((_, i) => i).filter((i) => !(f === 1 && i === 3)), rand);
      // The paper itself is one of robotics' gold dots already
      const golds = f === 1 ? fill.golds[f] - 1 : fill.golds[f];
      idx.forEach((i, n) => {
        corpus.push({ f, x: L.slots[f][i].x, y: L.slots[f][i].y, gold: n < golds ? fill.times[f][n] : Infinity });
      });
    }

    function cardX(t) {
      if (t < T.move1[0]) return lerp(-cw, sx[0], easeOut(span(t, T.arrive[0], T.arrive[1])));
      if (t < T.move2[0]) return lerp(sx[0], sx[1], ease(span(t, ...T.move1)));
      if (t < T.move3[0]) return lerp(sx[1], sx[2], ease(span(t, ...T.move2)));
      return lerp(sx[2], sx[3], ease(span(t, ...T.move3)));
    }

    /** The dots the chunks become, in a short column at the last stage */
    const dotY = (i) => cy + (i - 1.5) * (narrow ? 15 : 22);
    const bigR = narrow ? 3.3 : 4.4;

    function drawPaper(ctx, t) {
      const x = cardX(t);
      const parseK = ease(span(t, ...T.parse));
      const split = ease(span(t, ...T.chunk)) * (narrow ? 7 : 10);
      const left = x - cw / 2;
      const totalH = ch + split * (secs.length - 1);
      const top = cy - totalH / 2;
      const one = split < 0.3;
      if (one) {
        rrect(ctx, left + 0.5, top + 0.5, cw - 1, ch - 1, narrow ? 3 : 4);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = ink(0.16);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      secs.forEach((s, si) => {
        const oy = top + si * split;
        // Each chunk shrinks into its dot during the embed step, one after another
        const at = T.embed[0] + si * 170;
        const shrink = ease(span(t, at, at + 520));
        if (shrink >= 1) return;
        const scx = x;
        const scy = oy + (s.y0 + s.y1) / 2;
        const tx = lerp(scx, sx[3], shrink);
        const ty = lerp(scy, dotY(si), shrink);
        const sc = 1 - shrink;
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(sc, sc);
        ctx.translate(-scx, -scy);
        if (!one) {
          rrect(ctx, left + 0.5, oy + s.y0 + 0.5, cw - 1, s.y1 - s.y0 - 1, narrow ? 2.5 : 3.5);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = shrink > 0 ? gold(0.35 + 0.5 * shrink) : ink(0.16);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        s.rows.forEach((r) => {
          const ry = oy + r.y;
          const iw = cw - 2 * pad;
          if (r.kind === 'id') {
            text(ctx, narrow ? '2406.09246' : 'arXiv:2406.09246', left + pad, ry + idH - (narrow ? 3 : 5), { font: `500 ${narrow ? 7.2 : 8.6}px ${MONO}`, color: ink(0.45) });
          } else if (r.kind === 'title' || r.kind === 'title2') {
            ctx.fillStyle = ink(0.5);
            ctx.fillRect(left + pad, ry, iw * r.w, bar + 0.5);
          } else if (r.kind === 'line') {
            ctx.fillStyle = ink(0.15);
            ctx.fillRect(left + pad, ry, iw * r.w, bar);
          } else if (r.kind === 'head') {
            // Before parsing a heading is just another line; parsing finds it
            ctx.fillStyle = ink(0.15 * (1 - parseK));
            ctx.fillRect(left + pad, ry, iw * 0.8, bar);
            ctx.fillStyle = gold(0.85 * parseK);
            ctx.fillRect(left + pad, ry - 0.5 * parseK, iw * lerp(0.8, r.w, parseK), bar + parseK);
          } else if (r.kind === 'table') {
            // Three lines of text that parsing recognises as a table
            const tw = iw * 0.9;
            const th = 3 * g;
            ctx.fillStyle = ink(0.15 * (1 - parseK));
            for (let j = 0; j < 3; j++) ctx.fillRect(left + pad, ry + j * g, iw * [0.86, 0.9, 0.7][j], bar);
            if (parseK > 0) {
              ctx.strokeStyle = ink(0.34 * parseK);
              ctx.lineWidth = 0.8;
              ctx.strokeRect(left + pad + 0.5, ry - 1.5, tw, th);
              ctx.beginPath();
              for (let j = 1; j < 3; j++) {
                ctx.moveTo(left + pad + 0.5, ry - 1.5 + (th * j) / 3);
                ctx.lineTo(left + pad + 0.5 + tw, ry - 1.5 + (th * j) / 3);
              }
              for (let j = 1; j < 3; j++) {
                const cxx = left + pad + 0.5 + tw * (j === 1 ? 0.42 : 0.71);
                ctx.moveTo(cxx, ry - 1.5);
                ctx.lineTo(cxx, ry - 1.5 + th);
              }
              ctx.stroke();
            }
          }
        });
        ctx.restore();
      });
    }

    function drawStages(ctx, t) {
      const a = 1 - span(t, T.zoom[0], T.zoom[0] + 500);
      if (a <= 0) return;
      const font = `500 11px ${SANS}`;
      STAGES.forEach((name, i) => {
        const [s0, s1] = stageSpans[i];
        const on = span(t, s0 - 150, s0 + 150) * (1 - span(t, s1 - 150, s1 + 150));
        const shown = i === 0 ? span(t, 0, 300) : 1;
        text(ctx, name, sx[i], stageY, { font, color: ink((0.3 + 0.55 * on) * a * shown), align: 'center' });
        const w = textWidth(ctx, name, font);
        if (on > 0) {
          ctx.fillStyle = gold(0.9 * on * a);
          ctx.fillRect(sx[i] - (w / 2) * on, stageY + 5, w * on, 1.5);
        }
        // A small chevron to the next stage
        if (i < STAGES.length - 1) {
          const mx = (sx[i] + sx[i + 1]) / 2;
          ctx.strokeStyle = ink(0.22 * a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx - 2, stageY - 7.5);
          ctx.lineTo(mx + 1.5, stageY - 4);
          ctx.lineTo(mx - 2, stageY - 0.5);
          ctx.stroke();
        }
      });
    }

    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = loopAlpha(t, LOOP);

      drawStages(ctx, t);
      if (t < T.embed[1] + 200) drawPaper(ctx, t);

      // The chunk dots, then the one dot they merge into
      const merge = ease(span(t, ...T.merge));
      const z = ease(span(t, ...T.zoom));
      const Q = { x: sx[3], y: cy };
      const D = { x: lerp(Q.x, home.x, z), y: lerp(Q.y, home.y, z) };
      const S = 10 ** (1 - z);

      // The corpus, seen from close up at first, then from far enough back to see all of it
      if (z > 0) {
        const show = span(z, 0, 0.35);
        corpus.forEach((c) => {
          const x = D.x + (c.x - home.x) * S;
          const y = D.y + (c.y - home.y) * S;
          if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
          const goldK = easeOut(span(t, c.gold, c.gold + 320));
          const r = lerp(L.r, L.rFull, goldK) * (1 + (Math.min(S, 3) - 1) * 0.45);
          const gr = span(t, c.gold, c.gold + 650);
          if (gr > 0 && gr < 1) {
            ctx.beginPath();
            ctx.arc(x, y, L.r + (narrow ? 4 : 6) * gr, 0, Math.PI * 2);
            ctx.strokeStyle = gold(0.55 * (1 - gr));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          dot(ctx, x, y, r, goldK, show);
        });
        // The count climbs with how much of the corpus is in view
        const v = Math.exp(z * Math.log(TOTAL_K * 1000));
        const label = v < 1000 ? String(Math.round(v)) : countLabel(v / 1000);
        text(ctx, label, L.count.x, L.count.y, { font: L.countFont, color: ink(0.86 * span(z, 0.05, 0.3)), align: 'right', halo: 10 });
        // The names ride the zoom, under their discs
        drawFieldLabels(ctx, L, span(z, 0.72, 1), (f) => {
          const p = L.label(f);
          const c = L.centers[f];
          const below = (p.y - c.y - L.R[f]) + L.R[f] * S;
          return { x: D.x + (c.x - home.x) * S, y: D.y + (c.y - home.y) * S + below };
        });
      }

      // The paper's own dots: one per chunk, then one for the paper
      if (t >= T.embed[0]) {
        secs.forEach((s, si) => {
          const at = T.embed[0] + si * 170;
          const k = ease(span(t, at + 250, at + 520));
          if (k <= 0) return;
          const y = lerp(dotY(si), Q.y, merge);
          if (merge >= 1) return;
          dot(ctx, Q.x, y, bigR * k, 1);
        });
        if (merge > 0) {
          const r = lerp(bigR * 1.15, L.rFull * 1.25, z) * (merge < 1 ? easeOut(merge) : 1);
          // A ring that marks it as the corpus comes into view, then lets it go
          const ringA = span(z, 0.0, 0.2) * (1 - span(t, T.zoom[1] + 200, T.zoom[1] + 900));
          if (ringA > 0) {
            ctx.beginPath();
            ctx.arc(D.x, D.y, r + (narrow ? 4 : 5.5), 0, Math.PI * 2);
            ctx.strokeStyle = gold(0.6 * ringA);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          dot(ctx, D.x, D.y, r, 1);
        }
      }
      ctx.restore();
    }, { still: 13400 });
  }

  return (W, H, dpr) => {
    const tall = W < 520 || H > W * 0.9;
    const vw = tall ? 360 : 680;
    const s = W / vw;
    const inner = createPath(vw, H / s, dpr * s);
    return {
      ...inner,
      draw(ctx) {
        ctx.save();
        ctx.scale(s, s);
        inner.draw(ctx);
        ctx.restore();
      }
    };
  };
})();

/* ───────────── Seeds, spawns and the novelty gate ───────────── */

// Three island figures for the exploration section, in the islands figure's look:
// seeds dealt from a pool, the two ways to found a new island, and the code-novelty gate.
// All content is invented. Each is drawn at a design width, 680 px (360 on phones), then scaled.
const EXPLORE = (() => {
  /* Shared */

  const INK = '28, 25, 23';
  const GOLD = '184, 134, 11';
  const ROSE = '180, 87, 74';
  const FEATHER = 28;
  const MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  function seeded(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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

  function makeBackdrop(W, H, dpr, paint) {
    const layer = makeLayer(W, H, dpr);
    layer.ctx.fillStyle = pageColor();
    layer.ctx.fillRect(0, 0, W, H);
    if (paint) paint(layer.ctx);
    featherEdges(layer.ctx, W, H, FEATHER);
    return layer.canvas;
  }

  /* ───────────── Kit: shared by the sketches below ───────────── */

  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  /** How far t is through [a, b], from 0 to 1 */
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const easeOut = (k) => 1 - (1 - k) ** 3;
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;
  const rose = (a = 1) => `rgba(${ROSE}, ${a})`;
  /** Rise over [a, a + inMs], hold, fall over [b - outMs, b] */
  const pulse = (t, a, b, inMs = 300, outMs = 300) => Math.min(span(t, a, a + inMs), 1 - span(t, b - outMs, b));

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left' } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function textWidth(ctx, str, font) {
    ctx.font = font;
    return ctx.measureText(str).width;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  /** A white card, like the paper cards in the other figures */
  function card(ctx, x, y, w, h, { border = ink(0.14), width = 1, dashed = false, fill = '#ffffff', r = 6, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (border) {
      ctx.setLineDash(dashed ? [3, 3] : []);
      ctx.strokeStyle = border;
      ctx.lineWidth = width;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /** A tick, drawn on as k goes 0 → 1 */
  function tick(ctx, x, y, s, color, k = 1, width = 1.6) {
    if (k <= 0) return;
    const pts = [[x - s, y], [x - s * 0.35, y + s * 0.65], [x + s, y - s * 0.75]];
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    const d = k * (l1 + l2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(...pts[0]);
    if (d <= l1) ctx.lineTo(lerp(pts[0][0], pts[1][0], d / l1), lerp(pts[0][1], pts[1][1], d / l1));
    else {
      ctx.lineTo(...pts[1]);
      const e = (d - l1) / l2;
      ctx.lineTo(lerp(pts[1][0], pts[2][0], e), lerp(pts[1][1], pts[2][1], e));
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** A cross, drawn on as k goes 0 → 1 */
  function cross(ctx, x, y, s, color, k = 1, width = 1.6) {
    if (k <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    const a = Math.min(1, k * 2);
    const b = clamp(k * 2 - 1, 0, 1);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x - s + 2 * s * a, y - s + 2 * s * a);
    if (b > 0) {
      ctx.moveTo(x + s, y - s);
      ctx.lineTo(x + s - 2 * s * b, y - s + 2 * s * b);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /** A dashed line from (x0, y0) toward (x1, y1), drawn k of the way */
  function dashLine(ctx, x0, y0, x1, y1, k, color, dash = [3, 4], width = 1) {
    if (k <= 0) return;
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /** A point along a quadratic from p0 to p2 through control c */
  function quad(p0, c, p2, k) {
    const u = 1 - k;
    return { x: u * u * p0.x + 2 * u * k * c.x + k * k * p2.x, y: u * u * p0.y + 2 * u * k * c.y + k * k * p2.y };
  }

  /** An arc's control point: above the midpoint by `lift` */
  const arcControl = (a, b, lift) => ({ x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift });

  // Islands, drawn as in the islands figure
  const islandR = (R, ph, a) => R * (1 + 0.13 * Math.sin(3 * a + ph[0]) + 0.07 * Math.sin(5 * a + ph[1]));

  function islandPath(ctx, x, y, R, ph, s = 1) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const rr = islandR(R, ph, a) * s;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr * 0.82;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  /** Where a candidate at angle a, depth d (0 centre, ~0.75 near the coast) sits on an island */
  function islandPoint(x, y, R, ph, a, d) {
    const rr = islandR(R, ph, a) * d;
    return { x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * 0.82 };
  }

  /** Coastline and two dashed contours; `fill` paints the land first so islands can overlap */
  function drawIsland(ctx, x, y, R, ph, { alpha = 1, fill = null, coast = ink(0.55), fence = 0 } = {}) {
    if (R < 0.5 || alpha <= 0) return;
    if (fill) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      islandPath(ctx, x, y, R, ph, 1);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
    }
    [1, 0.72, 0.46].forEach((s, j) => {
      islandPath(ctx, x, y, R, ph, s);
      ctx.setLineDash(j ? [2, 3] : []);
      ctx.strokeStyle = j ? ink(0.18 * alpha) : coast.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * alpha})`);
      ctx.lineWidth = j ? 0.8 : 1.1;
      ctx.stroke();
    });
    ctx.setLineDash([]);
    // A protected warm-up: a dashed gold ring a little off the coast
    if (fence > 0) {
      islandPath(ctx, x, y, R, ph, 1.28);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = gold(0.75 * fence * alpha);
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function shapePath(ctx, x, y, r, shape) {
    ctx.beginPath();
    if (shape === 'triangle') {
      const s = r * 1.4;
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s * 0.9, y + s * 0.62);
      ctx.lineTo(x - s * 0.9, y + s * 0.62);
      ctx.closePath();
    } else if (shape === 'square') {
      const s = r * 0.92;
      ctx.rect(x - s, y - s, 2 * s, 2 * s);
    } else if (shape === 'diamond') {
      const s = r * 1.3;
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + s);
      ctx.lineTo(x - s, y);
      ctx.closePath();
    } else {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
  }

  /** A candidate: darker the higher it scores (f, 0–1), gold for the island's best */
  function drawDot(ctx, x, y, f, { best = false, grow = 1, alpha = 1, shape = 'circle', r = null, color = null } = {}) {
    if (grow <= 0 || alpha <= 0) return;
    const rad = (r ?? (best ? 3.6 : 2.6)) * (0.4 + 0.6 * grow);
    shapePath(ctx, x, y, rad, shape);
    ctx.fillStyle = color ?? (best ? gold(alpha) : ink((0.15 + f * 0.8) * alpha));
    ctx.fill();
  }

  function islandLabel(ctx, str, x, y, alpha = 1, narrow = false) {
    text(ctx, str, x, y, { font: `500 ${narrow ? 12 : 13}px ${SERIF}`, color: ink(0.85 * alpha) });
  }

  /** The islands figure's backdrop: page colour with a faint graticule, feathered at the edges */
  function chartBackdrop(W, H, dpr, paint) {
    return makeBackdrop(W, H, dpr, (g) => {
      g.strokeStyle = ink(0.05);
      g.lineWidth = 1;
      g.beginPath();
      for (let x = W / 8; x < W - 1; x += W / 8) {
        g.moveTo(Math.round(x) + 0.5, 0);
        g.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = H / 5; y < H - 1; y += H / 5) {
        g.moveTo(0, Math.round(y) + 0.5);
        g.lineTo(W, Math.round(y) + 0.5);
      }
      g.stroke();
      if (paint) paint(g);
    });
  }

  /** A small pill with a label, e.g. an idea pulled from a lineage. Returns its width. */
  function chip(ctx, x, y, label, { font = `400 10.5px ${MONO}`, h = 20, border = ink(0.2), fill = '#ffffff', color = ink(0.75), alpha = 1, bw = 1, strike = 0, dashed = false, padX = 8 } = {}) {
    const w = textWidth(ctx, label, font) + padX * 2;
    if (alpha <= 0) return w;
    ctx.save();
    ctx.globalAlpha *= alpha;
    rrect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, h / 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.setLineDash(dashed ? [3, 3] : []);
    ctx.strokeStyle = border;
    ctx.lineWidth = bw;
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, label, x + padX, y + h / 2 + 3.6, { font, color });
    if (strike > 0) {
      ctx.strokeStyle = rose(0.85);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x + padX - 2, y + h / 2);
      ctx.lineTo(x + padX - 2 + (w - 2 * padX + 4) * strike, y + h / 2);
      ctx.stroke();
    }
    ctx.restore();
    return w;
  }

  function looping(LOOP, draw, extra = {}) {
    let clock = 0;
    return {
      loopMs: LOOP,
      prewarm: 0,
      ...extra,
      step(dt) {
        clock = (clock + dt) % LOOP;
      },
      draw(ctx) {
        draw(ctx, clock);
      }
    };
  }

  /** Fade in as a loop starts and out as it ends */
  const loopAlpha = (clock, loop, inMs = 400, outMs = 500) => Math.min(span(clock, 0, inMs), 1 - span(clock, loop - outMs, loop));

  /* ═════════════ Starting Apart ═════════════ */

  /* ───────────── 1B · Dealt from a pool ───────────── */

  // The islands figure's layout with each island's founding idea drawn as a shape. First one
  // seed card is copied to all four islands, which fill with the same idea. Then a pool of
  // different first solutions is dealt out, one per island. The critic holds each card
  // against the seeds already dealt; one is too close to an earlier one (both tree
  // ensembles), turns rose and goes back. Each island fills with its own idea. Last, the
  // migrant fix: a migrant lands and is only logged, then it is bred.
  function createPool(W, H, dpr) {
    const narrow = W < 520;
    const LOOP = 21800;
    const PAGE = pageColor();
    const backdrop = chartBackdrop(W, H, dpr);
    const IDEAS = [
      { code: 'gbm()', shape: 'circle' },
      { code: 'cnn()', shape: 'triangle' },
      { code: 'forest()', shape: 'circle', close: 0 },
      { code: 'knn()', shape: 'square' },
      { code: 'ridge()', shape: 'diamond' }
    ];
    const NAMES = ['I', 'II', 'III', 'IV'];
    const R = narrow ? 44 : 50;
    const SPOTS = narrow ? [[95, 250], [265, 250], [95, 394], [265, 394]] : [[98, 268], [262, 268], [422, 268], [584, 268]];
    const CW = narrow ? 61 : 96;
    const CH = narrow ? 40 : 44;
    const CG = narrow ? 5.75 : 12;
    const CY = narrow ? 42 : 48;
    const CX0 = (W - (5 * CW + 4 * CG)) / 2;
    const poolX = (i) => CX0 + i * (CW + CG);
    const CHECK_Y = narrow ? 140 : 152;
    const codeFont = `500 ${narrow ? 9.5 : 10.5}px ${MONO}`;

    function seedCard(ctx, x, y, idea, { alpha = 1, scale = 1, border = ink(0.14), bw = 1, glyph = ink(0.75) } = {}) {
      if (alpha <= 0) return;
      const w = CW * scale;
      const h = CH * scale;
      ctx.save();
      ctx.globalAlpha *= alpha;
      card(ctx, x - w / 2, y - h / 2, w, h, { border, width: bw });
      if (scale <= 0.55) {
        // In flight: just the idea's shape
        shapePath(ctx, x, y, 3.4, idea.shape);
        ctx.fillStyle = glyph;
        ctx.fill();
      } else {
        ctx.translate(x - w / 2, y - h / 2);
        ctx.scale(scale, scale);
        if (narrow) {
          shapePath(ctx, 10, 11, 3.2, idea.shape);
          ctx.fillStyle = glyph;
          ctx.fill();
          text(ctx, idea.code, 7, 26, { font: codeFont, color: ink(0.78) });
          ctx.fillStyle = ink(0.13);
          ctx.fillRect(7, 32, CW * 0.6, 2.5);
        } else {
          shapePath(ctx, 13, 15, 3.6, idea.shape);
          ctx.fillStyle = glyph;
          ctx.fill();
          text(ctx, idea.code, 24, 19, { font: codeFont, color: ink(0.78) });
          ctx.fillStyle = ink(0.13);
          ctx.fillRect(10, 28, CW * 0.72, 2.5);
          ctx.fillRect(10, 35, CW * 0.48, 2.5);
        }
      }
      ctx.restore();
    }

    // Each island's candidates: founding seed in the middle, children further out
    const brood = (seed, shape) => {
      const r = seeded(seed);
      return Array.from({ length: 11 }, (_, i) => ({
        a: r() * Math.PI * 2,
        d: i ? 0.22 + Math.sqrt(r()) * 0.52 : 0,
        f: i ? clamp(0.25 + 0.55 * (i / 10) + (r() - 0.5) * 0.3, 0.05, 0.92) : 0.3,
        shape,
        spin: r() < 0.5 ? 1 : -1
      }));
    };

    /** An island founded at `born`, whose children arrive one per `every` ms from `from` */
    function island(ctx, k, kids, t, { born, from, every, alpha = 1, upto = 11 }) {
      const [x, y] = SPOTS[k];
      const bloom = span(t, born, born + 550);
      if (bloom <= 0) return null;
      const r = R * easeOut(bloom);
      drawIsland(ctx, x, y, r, [k * 1.7 + 0.4, k * 2.3 + 1.1], { alpha, fill: PAGE });
      const shown = [];
      kids.forEach((d, i) => {
        if (i >= upto) return;
        const at = i ? from + (i - 1) * every : born;
        if (t < at) return;
        shown.push({ ...islandPoint(x, y, r, [k * 1.7 + 0.4, k * 2.3 + 1.1], d.a + 0.0001 * t * d.spin, d.d), d, grow: span(t, at, at + 350) });
      });
      const best = shown.reduce((p, q) => (!p || q.d.f > p.d.f ? q : p), null);
      for (const s of shown) drawDot(ctx, s.x, s.y, s.d.f, { best: s === best, grow: s.grow, alpha, shape: s.d.shape, r: s.d.shape === 'circle' ? null : (s === best ? 3.4 : 2.5) });
      return best;
    }

    const titleFont = `500 ${narrow ? 14 : 15}px ${SERIF}`;
    const TX = narrow ? 16 : 24;
    const TY = narrow ? 27 : 30;
    const labelAt = (k) => [SPOTS[k][0] - R * 1.02, SPOTS[k][1] - R * 0.98 - 4];
    const T2 = 6400;
    const CLONES = [0, 1, 2, 3].map((k) => brood(100 + k * 7, 'circle'));
    // Act 2: the deal. Each card lifts to a point over its island, is checked, then lands or goes back.
    const DEAL = [
      { idea: 0, to: 0, t0: T2 + 900 },
      { idea: 1, to: 1, t0: T2 + 2000 },
      { idea: 2, to: 2, t0: T2 + 3100 },
      { idea: 3, to: 2, t0: T2 + 4800 },
      { idea: 4, to: 3, t0: T2 + 5900 }
    ];
    const LIFT = 500;
    const CHECK = 380;
    const LAND = 420;
    const KIDS = [brood(11, 'circle'), brood(23, 'triangle'), brood(37, 'square'), brood(41, 'diamond')];
    const GROW = T2 + 7100;
    const T3 = T2 + 9400; // the migrant
    const MIG = { from: 1, to: 2 };

    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = loopAlpha(t, LOOP);

      // Act 1 · copied to every island
      const a1 = 1 - span(t, T2 - 600, T2 - 100);
      if (a1 > 0) {
        text(ctx, 'copied to every island', TX, TY, { font: titleFont, color: ink(0.85 * a1 * span(t, 150, 550)) });
        const cx = W / 2;
        const cy = CY + CH / 2;
        seedCard(ctx, cx, cy, IDEAS[0], { alpha: span(t, 300, 700) * a1 });
        const bests = [];
        for (let k = 0; k < 4; k++) {
          const t0 = 1000 + k * 130;
          const f = span(t, t0, t0 + 720);
          const to = { x: SPOTS[k][0], y: SPOTS[k][1] };
          if (f > 0 && f < 1) {
            const p = quad({ x: cx, y: cy }, { x: (cx + to.x) / 2, y: cy + 10 }, to, ease(f));
            seedCard(ctx, p.x, p.y, IDEAS[0], { alpha: a1, scale: lerp(0.8, 0.25, ease(f)) });
          }
          const best = island(ctx, k, CLONES[k], t, { born: t0 + 700, from: 2400 + k * 40, every: 220, alpha: a1 });
          if (best) bests.push(best);
          const [lx, ly] = labelAt(k);
          islandLabel(ctx, `Island ${NAMES[k]}`, lx, ly, span(t, t0 + 800, t0 + 1100) * a1, narrow);
        }
        const same = span(t, 4900, 5300) * a1;
        if (same > 0) text(ctx, 'same idea on every island', W / 2, narrow ? 466 : 358, { font: `italic 400 ${narrow ? 13 : 14}px ${SERIF}`, color: ink(0.7 * same), align: 'center' });
      }

      // Act 2 · one seed each, dealt from a pool
      if (t > T2 - 100) {
        const titleSwap = span(t, T3 - 200, T3 + 200);
        text(ctx, 'one seed each', TX, TY, { font: titleFont, color: ink(0.85 * span(t, T2 - 100, T2 + 300) * (1 - titleSwap)) });
        const founded = [];
        // Pool cards still waiting
        IDEAS.forEach((idea, i) => {
          const deal = DEAL.find((d) => d.idea === i);
          if (t >= deal.t0) return;
          seedCard(ctx, poolX(i) + CW / 2, CY + CH / 2, idea, { alpha: span(t, T2 + 100 + i * 110, T2 + 450 + i * 110) });
        });
        DEAL.forEach((d) => {
          const idea = IDEAS[d.idea];
          const from = { x: poolX(d.idea) + CW / 2, y: CY + CH / 2 };
          const hold = { x: narrow ? W / 2 : SPOTS[d.to][0], y: CHECK_Y };
          const dest = { x: SPOTS[d.to][0], y: SPOTS[d.to][1] };
          const tc = d.t0 + LIFT;
          const tv = tc + CHECK + 60;
          const bad = idea.close !== undefined;
          if (t < d.t0) return;
          const others = founded.slice();
          if (!bad) founded.push(d);
          // Lift to the check point
          const lift = ease(span(t, d.t0, tc));
          let pos = { x: lerp(from.x, hold.x, lift), y: lerp(from.y, hold.y, lift) };
          let scale = 1;
          let alpha = 1;
          let border = ink(0.14);
          let bw = 1;
          if (bad) {
            const v = span(t, tv, tv + 250);
            border = v > 0 ? rose(0.85) : border;
            bw = v > 0 ? 1.4 : 1;
            alpha = 1 - span(t, tv + 750, tv + 1050);
          } else {
            const land = ease(span(t, tv + 120, tv + 120 + LAND));
            pos = { x: lerp(hold.x, dest.x, land), y: lerp(hold.y, dest.y, land) };
            scale = lerp(1, 0.25, land);
            if (land >= 1) alpha = 0;
            if (span(t, tv, tv + 200) > 0) {
              border = gold(0.8);
              bw = 1.3;
            }
          }
          // The critic's lines: from the card to the seed of every island already founded
          const lk = span(t, tc, tc + CHECK);
          const lf = 1 - span(t, tv + 300, tv + 600);
          if (others.length && lf > 0) {
            for (const o of others) {
              const hit = bad && o.idea === idea.close && t >= tv;
              dashLine(ctx, pos.x, pos.y + CH / 2 - 2, SPOTS[o.to][0], SPOTS[o.to][1], lk, hit ? rose(0.75 * lf) : ink(0.26 * lf), [2, 3]);
            }
          }
          seedCard(ctx, pos.x, pos.y, idea, { alpha, scale, border, bw, glyph: bad && t >= tv ? rose(0.9) : ink(0.75) });
          if (bad && t >= tv) {
            const v = span(t, tv, tv + 250) * (1 - span(t, tv + 750, tv + 1050));
            cross(ctx, pos.x + CW / 2 - 9, pos.y - CH / 2 + 9, 3.5, rose(0.9 * v), span(t, tv + 80, tv + 350), 1.4);
            text(ctx, 'too close', pos.x + CW / 2 + 8, pos.y + 4, { font: `500 11px ${SANS}`, color: rose(0.9 * v) });
          }
        });
        // Islands, founded as their cards land, then filling with their own idea
        DEAL.forEach((d) => {
          if (IDEAS[d.idea].close !== undefined) return;
          const born = d.t0 + LIFT + CHECK + 60 + 120 + LAND - 80;
          const k = d.to;
          island(ctx, k, KIDS[k], t, { born, from: GROW + k * 60, every: 190, alpha: 1 });
          const [lx, ly] = labelAt(k);
          islandLabel(ctx, `Island ${NAMES[k]}`, lx, ly, span(t, born + 100, born + 400), narrow);
        });

        // Coda · the migrant fix
        if (t > T3 - 200) {
          const ca = span(t, T3 - 200, T3 + 200);
          text(ctx, 'migrants', TX, TY, { font: titleFont, color: ink(0.85 * ca) });
          const fromIsl = { x: SPOTS[MIG.from][0], y: SPOTS[MIG.from][1] };
          const toIsl = { x: SPOTS[MIG.to][0], y: SPOTS[MIG.to][1] };
          const land = narrow ? { x: toIsl.x - 8, y: toIsl.y - 6 } : { x: toIsl.x - 14, y: toIsl.y - 8 };
          const fk = span(t, T3 + 200, T3 + 1300);
          const c = arcControl(fromIsl, land, narrow ? 40 : 70);
          if (fk < 1 && fk > 0) {
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = gold(0.55);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fromIsl.x, fromIsl.y);
            ctx.quadraticCurveTo(c.x, c.y, land.x, land.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          const p = fk < 1 ? quad(fromIsl, c, land, ease(fk)) : land;
          if (fk > 0) {
            drawDot(ctx, p.x, p.y, 0, { best: true, shape: 'triangle', r: 3.6 });
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = ink(0.4 * span(t, T3 + 1300, T3 + 1500));
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          // First it only arrives; then it's picked as a parent and breeds
          const NOTE_X = toIsl.x - R;
          const NOTE_Y = toIsl.y + R * 0.82 * 1.2 + (narrow ? 18 : 22);
          const logged = pulse(t, T3 + 1400, T3 + 3400, 300, 300);
          const bred = span(t, T3 + 3400, T3 + 3700);
          const noteY = NOTE_Y;
          if (logged > 0) text(ctx, 'logged, never bred', NOTE_X, noteY, { font: `400 11px ${SANS}`, color: ink(0.6 * logged) });
          if (bred > 0) text(ctx, 'now bred', NOTE_X, noteY, { font: `400 11px ${SANS}`, color: gold(0.95 * bred) });
          const KIDS_AT = narrow ? [[-18, 12], [10, 18], [-26, -6]] : [[-22, 14], [12, 20], [-32, -6]];
          KIDS_AT.forEach(([dx, dy], i) => {
            const at = T3 + 3800 + i * 380;
            const g = span(t, at, at + 350);
            if (g <= 0) return;
            dashLine(ctx, land.x, land.y, land.x + dx, land.y + dy, g, gold(0.5), [1.5, 2.5]);
            drawDot(ctx, land.x + dx, land.y + dy, 0.55 + i * 0.12, { grow: g, shape: 'triangle', r: 2.5 });
          });
        }
      }
      ctx.restore();
    }, { still: 15500 });
  }

  /* ═════════════ When Every Island Stalls ═════════════ */

  /** Best so far as a tiny step line: it climbs, then runs flat for longer as k goes 0 → 1 */
  function plateau(ctx, x, y, k, alpha = 1) {
    const pts = [[0, 9], [5, 9], [5, 6], [10, 6], [10, 3.5], [16, 3.5], [16, 1]];
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
    ctx.lineTo(x + 20 + 16 * k, y + 1);
    ctx.strokeStyle = ink(0.42 * alpha);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** Best so far still climbing, drawn on as k goes 0 → 1 (an island running ahead) */
  function climbing(ctx, x, y, k, alpha = 1) {
    if (k <= 0) return;
    const pts = [[0, 10], [5, 10], [5, 7.5], [10, 7.5], [10, 5], [15, 5], [15, 2.5], [20, 2.5], [20, 0], [25, 0], [25, -2.5], [30, -2.5], [30, -5]];
    const n = Math.max(1, Math.round(k * (pts.length - 1)));
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [px, py] = pts[i];
      if (i) ctx.lineTo(x + px, y + py);
      else ctx.moveTo(x + px, y + py);
    }
    ctx.strokeStyle = gold(0.9 * alpha);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // The map of what's been tried, as in the research-map figure: a row per family of
  // techniques, gold where some island has built one. Row 3 is a family nobody has tried.
  const TRIED = ['11010010', '10111000', '01100101', '00000000', '11000110'];
  const UNTRIED_ROW = 3;

  function mapCell(ctx, x, y, s, built, alpha = 1, pop = 1) {
    if (alpha <= 0 || pop <= 0) return;
    if (built) {
      const g = 1 + 0.5 * (1 - easeOut(pop));
      const sz = s * g;
      rrect(ctx, x + (s - sz) / 2, y + (s - sz) / 2, sz, sz, 2.5);
      ctx.fillStyle = gold(alpha);
      ctx.fill();
      return;
    }
    rrect(ctx, x + 0.5, y + 0.5, s - 1, s - 1, 2.5);
    ctx.strokeStyle = ink(0.24 * alpha * pop);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /** The map, its rows popping in from `t0`; returns where the untried row sits */
  function drawMap(ctx, x, y, s, gap, t, t0, alpha) {
    TRIED.forEach((row, r) => {
      const pop = span(t, t0 + r * 110, t0 + r * 110 + 320);
      [...row].forEach((c, i) => mapCell(ctx, x + i * (s + gap), y + r * (s + gap), s, c === '1', alpha, pop));
    });
    return { x, y: y + UNTRIED_ROW * (s + gap), w: 8 * (s + gap) - gap, h: s };
  }

  /** A gold box stepping down the rows of the map and stopping on the untried one */
  function scanMap(ctx, m, s, gap, k, settle, alpha) {
    if (k <= 0 || alpha <= 0) return;
    const r = Math.min(UNTRIED_ROW, Math.floor(k * (UNTRIED_ROW + 0.999)));
    const y = m.y - (UNTRIED_ROW - r) * (s + gap);
    rrect(ctx, m.x - 4, y - 4, m.w + 8, s + 8, 5);
    ctx.strokeStyle = gold((0.45 + 0.45 * settle) * alpha);
    ctx.lineWidth = 1.2 + 0.4 * settle;
    ctx.stroke();
  }

  /** A new island's candidates: one every `every` ms from `born`, scoring higher as they go */
  function newBrood(seed, n = 14) {
    const r = seeded(seed);
    return Array.from({ length: n }, (_, i) => ({
      a: r() * Math.PI * 2,
      d: i ? 0.18 + Math.sqrt(r()) * 0.55 : 0,
      f: clamp(0.18 + 0.62 * (i / (n - 1)) + (r() - 0.5) * 0.22, 0.05, 0.95),
      spin: r() < 0.5 ? 1 : -1
    }));
  }

  function drawBrood(ctx, x, y, R, ph, dots, t, born, every, alpha, { fence = 0, page, skip = -1 } = {}) {
    const bloom = span(t, born, born + 600);
    if (bloom <= 0 || alpha <= 0) return null;
    const r = R * easeOut(bloom);
    drawIsland(ctx, x, y, r, ph, { fill: page, alpha, fence });
    const shown = [];
    dots.forEach((d, i) => {
      if (i === skip) return;
      const at = born + 250 + i * every;
      if (t < at) return;
      shown.push({ ...islandPoint(x, y, r, ph, d.a + 0.0001 * t * d.spin, d.d), d, g: span(t, at, at + 300) });
    });
    const best = shown.reduce((p, q) => (!p || q.d.f > p.d.f ? q : p), null);
    for (const s of shown) drawDot(ctx, s.x, s.y, s.d.f, { best: s === best, grow: s.g, alpha });
    return { r, bloom };
  }

  /* ───────────── 2A · Stalled, then founded ───────────── */

  // The islands figure's chart, with every island's best-so-far line run flat. Round one:
  // synthesis spawn. Each island's best is traced back through its lineage, and the idea
  // that made it good comes out as a chip. Two chips cover the same ground, so one is left
  // out; the critic passes the set as never seen together, and the picks fuse into the seed
  // of a new island. Round two: the critic finds the combination in an earlier lineage, so
  // the system falls back to orthogonal spawn. The map shows a family nobody has tried,
  // what failed is passed in as things to avoid, and the new island gets a protected
  // warm-up: it climbs while the others sit flat, and a migrant stops at its fence.
  function createStalled(W, H, dpr) {
    const narrow = W < 520;
    const PAGE = pageColor();
    const backdrop = chartBackdrop(W, H, dpr);
    const R = narrow ? 38 : 46;
    const SPOTS = narrow ? [[92, 106], [262, 106], [92, 224], [262, 224]] : [[98, 132], [262, 132], [98, 290], [262, 290]];
    const V = narrow ? { x: 252, y: 398 } : { x: 548, y: 292 };
    const PHV = [2.6, 0.3];
    const NAMES = ['I', 'II', 'III', 'IV'];
    const IDEAS = ['wider net', 'mixup', 'cosine lr', 'restarts'];
    const PICKED = [true, true, true, false];
    const ph = (k) => [k * 1.7 + 0.4, k * 2.3 + 1.1];
    const chipFont = `400 ${narrow ? 10 : 10.5}px ${MONO}`;
    const chipH = narrow ? 19 : 20;
    const slot = (i) => (narrow ? { x: 34, y: 294 + i * 24 } : { x: 406, y: 50 + i * 26 });
    const NUM_X = narrow ? 16 : 386;
    const HEAD = narrow ? { x: 16, y: 280 } : { x: 386, y: 30 };
    const CRITIC_Y = narrow ? 412 : 176;
    const MAP = narrow ? { x: 16, y: 296, s: 10, g: 4 } : { x: 386, y: 52, s: 11, g: 4 };
    const AVOID = narrow ? { x: 16, y: 392, dy: 24, stack: true } : { x: 386, y: 152, dy: 0, stack: false };
    const AVOIDS = ['deeper net', 'bigger batch'];

    // Each island's candidates, and its best one's lineage: the best and three ancestors
    const pops = SPOTS.map(([x, y], k) => {
      const r = seeded(300 + k * 19);
      const dots = Array.from({ length: 13 }, () => ({ a: r() * Math.PI * 2, d: 0.15 + Math.sqrt(r()) * 0.58, f: 0.12 + r() * 0.42, spin: r() < 0.5 ? 1 : -1 }));
      const pos = (d) => islandPoint(x, y, R, ph(k), d.a, d.d);
      const best = dots[0];
      best.f = 0.92;
      const line = [best];
      const rest = dots.slice(1);
      for (const f of [0.66, 0.46, 0.26]) {
        const p0 = pos(line[line.length - 1]);
        rest.sort((p, q) => Math.hypot(pos(p).x - p0.x, pos(p).y - p0.y) - Math.hypot(pos(q).x - p0.x, pos(q).y - p0.y));
        const next = rest.find((d) => Math.hypot(pos(d).x - p0.x, pos(d).y - p0.y) > R * 0.2) || rest[0];
        rest.splice(rest.indexOf(next), 1);
        next.f = f;
        line.push(next);
      }
      return { x, y, k, dots, best, line: line.reverse() };
    });
    const VD = newBrood(77);
    const VD2 = newBrood(91, 16);

    // Timeline
    const T = { stall: [400, 1600], head: 1500, trace: 1900, chips: 2700, same: 4200, pick: 4700, critic: 5300, verdict: 5800, fuse: [6600, 7300], born: 7300, end1: [9500, 10100] };
    const T2 = 10100;
    const U = { head: T2 + 200, chips: T2 + 300, critic: T2 + 1000, verdict: T2 + 1400, swap: T2 + 2500, map: T2 + 3000, scan: [T2 + 3700, T2 + 4500], avoid: T2 + 4800, seed: [T2 + 5800, T2 + 6500], born: T2 + 6500, mig: [T2 + 8000, T2 + 9000] };
    const LOOP = T2 + 11000;

    function islands(ctx, t) {
      const stall = span(t, ...T.stall);
      for (const p of pops) {
        drawIsland(ctx, p.x, p.y, R, ph(p.k), { fill: PAGE });
        for (const d of p.dots) {
          const q = islandPoint(p.x, p.y, R, ph(p.k), d.a + 0.00004 * t * d.spin, d.d);
          d.px = q.x;
          d.py = q.y;
          if (d !== p.best) drawDot(ctx, q.x, q.y, d.f);
        }
        drawDot(ctx, p.best.px, p.best.py, p.best.f, { best: true });
        const lx = p.x - R * 1.02;
        const ly = p.y - R * 0.98 - 4;
        const name = `Island ${NAMES[p.k]}`;
        islandLabel(ctx, name, lx, ly, 1, narrow);
        plateau(ctx, lx + textWidth(ctx, name, `500 ${narrow ? 12 : 13}px ${SERIF}`) + 8, ly - 9, stall);
      }
    }

    function lineage(ctx, p, k, alpha) {
      if (k <= 0 || alpha <= 0) return;
      const pts = p.line.map((d) => ({ x: d.px, y: d.py }));
      const n = pts.length - 1;
      const upto = k * n;
      ctx.strokeStyle = gold(0.85 * alpha);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i <= n; i++) {
        const e = clamp(upto - (i - 1), 0, 1);
        if (e <= 0) break;
        ctx.lineTo(lerp(pts[i - 1].x, pts[i].x, e), lerp(pts[i - 1].y, pts[i].y, e));
      }
      ctx.stroke();
      pts.forEach((q, i) => {
        if (i >= n || i > upto) return;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4.6, 0, Math.PI * 2);
        ctx.strokeStyle = gold(0.7 * alpha);
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    function header(ctx, label, sub, alpha) {
      if (alpha <= 0) return;
      const font = `500 ${narrow ? 14 : 15}px ${SERIF}`;
      text(ctx, label, HEAD.x, HEAD.y, { font, color: ink(0.88 * alpha) });
      text(ctx, sub, HEAD.x + textWidth(ctx, label, font) + 8, HEAD.y, { font: `400 11px ${SANS}`, color: ink(0.45 * alpha) });
    }

    /** The four idea chips; `flyK` brings them from the islands, `chosen` outlines the picks */
    function chips(ctx, t, { flyFrom, appear, chosen, dim, alpha, fuseK = 0, verdictBad = 0 }) {
      const widths = IDEAS.map((s) => textWidth(ctx, s, chipFont) + 16);
      IDEAS.forEach((idea, i) => {
        const s = slot(i);
        const a = appear(i);
        if (a <= 0) return;
        let x = s.x;
        let y = s.y;
        if (flyFrom) {
          const p = pops[i].best;
          const k = ease(a);
          x = lerp(p.px - widths[i] / 2, s.x, k);
          y = lerp(p.py - chipH / 2, s.y, k);
        }
        let al = alpha * Math.min(1, a * 2.5);
        if (!PICKED[i]) al *= 1 - 0.65 * dim;
        if (fuseK > 0 && PICKED[i]) {
          const k = ease(fuseK);
          x = lerp(x, V.x - widths[i] / 2, k);
          y = lerp(y, V.y - chipH / 2, k);
          al *= 1 - span(fuseK, 0.6, 1);
        }
        if (fuseK > 0 && !PICKED[i]) al *= 1 - span(fuseK, 0, 0.4);
        const pick = PICKED[i] ? chosen : 0;
        const border = verdictBad > 0 && PICKED[i] ? rose(0.8) : pick > 0 ? gold(0.4 + 0.5 * pick) : ink(0.2);
        chip(ctx, x, y, idea, { font: chipFont, h: chipH, border, bw: pick > 0 ? 1.4 : 1, alpha: al });
        if (fuseK <= 0) text(ctx, NAMES[i], NUM_X, s.y + chipH / 2 + 4, { font: `500 ${narrow ? 11 : 12}px ${SERIF}`, color: ink(0.5 * al) });
      });
      return widths;
    }

    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = loopAlpha(t, LOOP);
      const TX = narrow ? 16 : 24;
      const TY = narrow ? 26 : 30;
      const titleA = t < T2 ? span(t, 300, 700) : 1;
      text(ctx, 'every island stalled', TX, TY, { font: `italic 400 ${narrow ? 14 : 15}px ${SERIF}`, color: ink(0.75 * titleA) });

      islands(ctx, t);

      if (t < T2) {
        // Round one · synthesis spawn
        const out = 1 - span(t, ...T.end1);
        header(ctx, 'synthesis spawn', 'tried first', span(t, T.head, T.head + 400) * out);
        const traceOut = 1 - span(t, T.fuse[0], T.fuse[0] + 500);
        pops.forEach((p, i) => lineage(ctx, p, span(t, T.trace + i * 150, T.trace + 700 + i * 150), traceOut * out));
        const fuseK = span(t, ...T.fuse);
        const widths = chips(ctx, t, {
          flyFrom: true,
          appear: (i) => span(t, T.chips + i * 150, T.chips + 600 + i * 150),
          chosen: span(t, T.pick, T.pick + 400),
          dim: span(t, T.same + 400, T.same + 800),
          alpha: out,
          fuseK
        });
        // Two chips that cover the same ground: a bracket, and the second is left out
        const sameA = span(t, T.same, T.same + 400) * (1 - span(t, T.fuse[0], T.fuse[0] + 300)) * out;
        if (sameA > 0) {
          const s2 = slot(2);
          const s3 = slot(3);
          const bx = s2.x + Math.max(widths[2], widths[3]) + 7;
          ctx.strokeStyle = ink(0.4 * sameA);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx - 3, s2.y + 4);
          ctx.lineTo(bx, s2.y + 4);
          ctx.lineTo(bx, s3.y + chipH - 4);
          ctx.lineTo(bx - 3, s3.y + chipH - 4);
          ctx.stroke();
          text(ctx, 'same ground', bx + 7, (s2.y + s3.y + chipH) / 2 + 4, { font: `400 11px ${SANS}`, color: ink(0.55 * sameA) });
        }
        // The critic: has this combination ever appeared in one lineage?
        const ca = span(t, T.critic, T.critic + 300) * (1 - span(t, T.fuse[0], T.fuse[0] + 400)) * out;
        if (ca > 0) {
          const cf = `500 ${narrow ? 12.5 : 13}px ${SERIF}`;
          text(ctx, 'critic', NUM_X, CRITIC_Y, { font: cf, color: ink(0.85 * ca) });
          const cx = NUM_X + textWidth(ctx, 'critic', cf) + 14;
          ctx.globalAlpha *= ca;
          tick(ctx, cx, CRITIC_Y - 4, 4.5, gold(0.95), span(t, T.verdict, T.verdict + 300));
          ctx.globalAlpha /= ca;
          text(ctx, 'never together before', cx + 12, CRITIC_Y, { font: `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`, color: ink(0.7 * ca * span(t, T.verdict + 100, T.verdict + 400)) });
        }
        // The fused seed, then the new island
        if (fuseK > 0.7 && t < T.born + 300) {
          const a = span(fuseK, 0.7, 1) * (1 - span(t, T.born, T.born + 300));
          drawDot(ctx, V.x, V.y, 1, { best: true, r: 4, alpha: a * out });
        }
        const nv = drawBrood(ctx, V.x, V.y, R, PHV, VD, t, T.born, 160, out, { page: PAGE });
        if (nv) islandLabel(ctx, 'Island V', V.x - R * 1.02, V.y - R * 0.98 - 4, span(t, T.born + 200, T.born + 500) * out, narrow);
      } else {
        // Round two · synthesis can't pass, so orthogonal spawn
        const swap = span(t, U.swap, U.swap + 400);
        header(ctx, 'synthesis spawn', 'tried first', span(t, U.head, U.head + 300) * (1 - swap));
        chips(ctx, t, {
          flyFrom: false,
          appear: (i) => span(t, U.chips + i * 90, U.chips + 300 + i * 90),
          chosen: span(t, U.chips + 500, U.chips + 800),
          dim: span(t, U.chips + 500, U.chips + 800),
          alpha: 1 - swap,
          verdictBad: span(t, U.verdict, U.verdict + 200)
        });
        const ca = span(t, U.critic, U.critic + 300) * (1 - swap);
        if (ca > 0) {
          const cf = `500 ${narrow ? 12.5 : 13}px ${SERIF}`;
          text(ctx, 'critic', NUM_X, CRITIC_Y, { font: cf, color: ink(0.85 * ca) });
          const cx = NUM_X + textWidth(ctx, 'critic', cf) + 14;
          ctx.globalAlpha *= ca;
          cross(ctx, cx, CRITIC_Y - 4, 4, rose(0.9), span(t, U.verdict, U.verdict + 300));
          ctx.globalAlpha /= ca;
          text(ctx, 'seen together before', cx + 12, CRITIC_Y, { font: `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`, color: rose(0.9 * ca * span(t, U.verdict + 100, U.verdict + 400)) });
        }
        const oa = span(t, U.swap + 200, U.swap + 600);
        header(ctx, 'orthogonal spawn', 'fallback', oa);
        if (oa > 0) {
          const m = drawMap(ctx, MAP.x, MAP.y, MAP.s, MAP.g, t, U.map, 1);
          const sk = span(t, ...U.scan);
          const settle = span(t, U.scan[1], U.scan[1] + 300);
          const mapOut = 1 - span(t, U.seed[1] + 600, U.seed[1] + 1200) * 0.5;
          scanMap(ctx, m, MAP.s, MAP.g, sk, settle, mapOut);
          if (settle > 0) text(ctx, 'untried', m.x + m.w + 9, m.y + MAP.s / 2 + 4, { font: `400 11px ${SANS}`, color: gold(0.95 * settle) });
          // What failed before, passed in as things to avoid
          const avA = span(t, U.avoid, U.avoid + 300);
          if (avA > 0) {
            text(ctx, 'avoid', AVOID.x, AVOID.y - 6, { font: `500 11px ${SANS}`, color: rose(0.85 * avA) });
            let ax = AVOID.x;
            AVOIDS.forEach((s, i) => {
              const at = U.avoid + 150 + i * 250;
              const w = chip(ctx, ax, AVOID.y + i * AVOID.dy, s, { font: chipFont, h: chipH, border: rose(0.45), color: ink(0.5), alpha: span(t, at, at + 300), strike: span(t, at + 200, at + 500) });
              if (!AVOID.stack) ax += w + 8;
            });
          }
          // The seed comes out of the untried row and founds the new island
          const sk2 = span(t, ...U.seed);
          if (sk2 > 0 && t < U.born + 300) {
            const from = { x: m.x + m.w / 2, y: m.y + MAP.s / 2 };
            const p = quad(from, { x: lerp(from.x, V.x, 0.7), y: from.y }, V, ease(sk2));
            drawDot(ctx, p.x, p.y, 1, { best: true, r: 4, alpha: 1 - span(t, U.born, U.born + 300) });
          }
          const fence = span(t, U.born + 200, U.born + 700);
          const nv = drawBrood(ctx, V.x, V.y, R, PHV, VD2, t, U.born, 120, 1, { page: PAGE, fence });
          if (nv) {
            const lx = V.x - R * 1.02;
            const ly = V.y - R * 0.98 - 4 - (narrow ? 8 : 10);
            islandLabel(ctx, 'Island V', lx, ly, span(t, U.born + 200, U.born + 500), narrow);
            climbing(ctx, lx + textWidth(ctx, 'Island V', `500 ${narrow ? 12 : 13}px ${SERIF}`) + 8, ly - 7, span(t, U.born + 400, U.born + 3200));
            const wa = fence * span(t, U.born + 500, U.born + 800);
            text(ctx, 'warm-up', V.x + R * 1.3 + 4, V.y + R * 0.5, { font: `500 11px ${SANS}`, color: gold(0.95 * wa) });
          }
          // A migrant heads for the new island and stops at its fence
          const mk = span(t, ...U.mig);
          if (mk > 0) {
            // On phones it comes from Island IV, round the right of the new island
            const src = narrow ? pops[3] : pops[1];
            const from = { x: src.best.px, y: src.best.py };
            const dx = narrow ? 0.9 : from.x - V.x;
            const dy = narrow ? -0.25 : from.y - V.y;
            const dl = Math.hypot(dx, dy / 0.82);
            const stop = { x: V.x + (dx / dl) * R * 1.42, y: V.y + (dy / dl) * R * 1.42 };
            const c = narrow ? { x: stop.x + 30, y: from.y + 30 } : arcControl(from, stop, 40);
            const gone = 1 - span(t, U.mig[1] + 300, U.mig[1] + 800);
            ctx.save();
            ctx.globalAlpha *= gone;
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = gold(0.5);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(c.x, c.y, stop.x, stop.y);
            ctx.stroke();
            ctx.setLineDash([]);
            const back = span(t, U.mig[1], U.mig[1] + 250);
            const p = quad(from, c, stop, ease(mk) - 0.06 * Math.sin(back * Math.PI));
            drawDot(ctx, p.x, p.y, 0, { best: true, r: 3.8 });
            if (mk >= 1) cross(ctx, stop.x + (dx / dl) * 9, stop.y + (dy / dl) * 9, 3, rose(0.85), span(t, U.mig[1], U.mig[1] + 250), 1.3);
            ctx.restore();
          }
        }
      }
      ctx.restore();
    }, { still: T2 + 9800 });
  }

  /* ═════════════ Code Novelty Rejection Sampling ═════════════ */

  // Invented training scripts. ⟦name⟧ marks a name the judge sees was only renamed.
  const NEAREST = ['⟦net⟧ = Net(width=256)', '⟦opt⟧ = AdamW(⟦net⟧.params, lr=3e-4)', 'for ⟦x⟧, ⟦y⟧ in loader:', '    loss = loss_fn(⟦net⟧(⟦x⟧), ⟦y⟧)', '    loss.backward()', '    ⟦opt⟧.step()'];
  const RENAMED = ['⟦model⟧ = Net(width=256)', '⟦optim⟧ = AdamW(⟦model⟧.params, lr=3e-4)', 'for ⟦inputs⟧, ⟦labels⟧ in loader:', '    loss = loss_fn(⟦model⟧(⟦inputs⟧), ⟦labels⟧)', '    loss.backward()', '    ⟦optim⟧.step()'];
  const REVISED = ['model = Net(width=256)', { s: 'optim = SGD(model.params, lr=0.1)', mark: 'new' }, { s: 'sched = cosine(optim, epochs)', mark: 'new' }, 'for inputs, labels in loader:', '    loss = loss_fn(model(inputs), labels)', '    loss.backward()', { s: '    optim.step(); sched.step()', mark: 'new' }];
  const MIXUP = ['net = Net(width=256)', 'opt = AdamW(net.params, lr=3e-4)', 'for x, y in loader:', { s: '    x, y = mixup(x, y)', mark: 'new' }, '    loss = loss_fn(net(x), y)', '    loss.backward()', '    opt.step()'];

  /**
   * Lines of code from (x, top). `marks` (0–1) lights the ⟦renamed⟧ names, `news` the lines
   * marked new; a line can also carry a diff sign ('+' or '-').
   */
  function codeLines(ctx, x, top, lines, { font, lh, w, alpha = 1, marks = 0, news = 0, upto = Infinity } = {}) {
    if (alpha <= 0) return;
    lines.forEach((ln, i) => {
      if (i >= upto) return;
      const L = typeof ln === 'string' ? { s: ln } : ln;
      const base = top + (i + 0.72) * lh;
      const rowTop = top + i * lh;
      if (L.mark === 'new' && news > 0) {
        ctx.fillStyle = gold(0.2 * news * alpha);
        ctx.fillRect(x - 5, rowTop + 1, w + 10, lh - 1);
      }
      if (L.sign === '-') {
        ctx.fillStyle = ink(0.05 * alpha);
        ctx.fillRect(x - 5, rowTop + 1, w + 10, lh - 1);
      }
      let cx = x;
      if (L.sign) {
        text(ctx, L.sign, cx, base, { font, color: ink(0.45 * alpha) });
        cx += textWidth(ctx, '  ', font);
      }
      const lineA = Math.min(1, Math.max(0, upto - i));
      L.s.split(/(⟦[^⟧]*⟧)/).forEach((seg) => {
        if (!seg) return;
        const hot = seg.startsWith('⟦');
        const str = hot ? seg.slice(1, -1) : seg;
        const sw = textWidth(ctx, str, font);
        if (hot && marks > 0) {
          rrect(ctx, cx - 1.5, rowTop + 2.5, sw + 3, lh - 4, 2.5);
          ctx.fillStyle = ink(0.11 * marks * alpha);
          ctx.fill();
        }
        text(ctx, str, cx, base, { font, color: ink((L.sign === '-' ? 0.5 : 0.8) * alpha * lineA) });
        cx += sw;
      });
    });
  }

  /** A progress ring for a training run, drawn on as k goes 0 → 1 */
  function trainRing(ctx, x, y, k, alpha = 1) {
    if (k <= 0 || alpha <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = ink(0.12 * alpha);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
    ctx.strokeStyle = gold(0.95 * alpha);
    ctx.stroke();
  }

  /* ───────────── 3A · The gate ───────────── */

  // One gate, two candidates. The first renames every variable in a script already on its
  // island: its embedding lands on the island's closest program and the similarity runs past
  // "too similar?", so the judge is called. The closest match comes up beside it with only
  // the renamed names lit, and the judge calls it a cosmetic copy. Its reasons go back to the
  // agent, which revises the method; the revision scores well under the line and trains.
  // The second candidate adds one line, mixup, to that same script. It scores as similar as
  // the copy did (the first score stays as a notch on the meter), but the judge reads it as
  // a new idea, and it trains.
  function createGate(W, H, dpr) {
    const narrow = W < 520;
    const PAGE = pageColor();
    const backdrop = chartBackdrop(W, H, dpr);
    const font = `400 ${narrow ? 9.5 : 11}px ${MONO}`;
    const lh = narrow ? 14 : 18;
    const pad = narrow ? 9 : 12;
    const CARD_H = 7 * lh + 2 * pad;
    const L = narrow
      ? { card: { x: 16, y: 36, w: 328 }, near: { x: 16, y: 186, w: 328 }, isl: { x: 180, y: 236, R: 44 }, meter: { x0: 64, x1: 296, y: 334 }, verdict: { x: 16, y: 376 }, note: { x: 16, y: 398 } }
      : { card: { x: 20, y: 80, w: 300 }, near: { x: 360, y: 80, w: 300 }, isl: { x: 512, y: 152, R: 60 }, meter: { x0: 412, x1: 612, y: 284 }, verdict: { x: 20, y: 278 }, note: { x: 20, y: 302 } };
    const PH = [0.7, 2.4];
    const THRESH = 0.78;
    const labelFont = `500 ${narrow ? 12.5 : 13}px ${SERIF}`;

    // The island's programs; the first is the closest match to both candidates
    const prog = (() => {
      const r = seeded(808);
      return Array.from({ length: 12 }, (_, i) => ({ a: i ? r() * Math.PI * 2 : 3.6, d: i ? 0.2 + Math.sqrt(r()) * 0.52 : 0.42, f: i ? 0.2 + r() * 0.5 : 0.55 }));
    })();
    const at = (a, d) => islandPoint(L.isl.x, L.isl.y, L.isl.R, PH, a, d);
    const NEAR = at(prog[0].a, prog[0].d);
    const SPOT_COPY = { x: NEAR.x + 7, y: NEAR.y - 4 };
    const SPOT_REVISED = at(0.5, 0.62);
    const SPOT_MIXUP = { x: NEAR.x + 5, y: NEAR.y + 5 };

    // Timeline: two candidates through the gate
    const C1 = 0;
    const C2 = 10200;
    const LOOP = C2 + 8800;
    const K = { card: 300, embed: [1300, 1900], ring: 1900, meter: [2200, 3000], judge: 3300, marks: 3900, verdict: 4700, note: 5200, back: 5800, send: [6000, 6600], isl: 6600, edit: [6800, 7500], embed2: [7800, 8400], meter2: [8400, 9000], train: [9100, 9900] };
    // How the revision's lines line up with the copy's: kept lines slide, the rest swap
    const EDIT_MAP = [0, -1, 3, 4, 5, -1];
    const M = { card: 300, embed: [1300, 1900], ring: 1900, meter: [2200, 3000], judge: 3300, news: 3900, verdict: 4700, note: 5000, back: 6300, train: [6700, 7500] };

    function meter(ctx, level, alpha, ghost = 0) {
      if (alpha <= 0) return;
      const { x0, x1, y } = L.meter;
      const tx = lerp(x0, x1, THRESH);
      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.fillStyle = ink(0.1);
      ctx.fillRect(x0, y - 1.5, x1 - x0, 3);
      ctx.fillStyle = level > THRESH ? ink(0.7) : ink(0.5);
      ctx.fillRect(x0, y - 1.5, (x1 - x0) * level, 3);
      if (ghost > 0) {
        ctx.fillStyle = ink(0.45 * ghost);
        ctx.fillRect(lerp(x0, x1, 0.88) - 0.75, y - 6, 1.5, 12);
      }
      // The line: past it, the judge is called in
      const over = level > THRESH ? 1 : 0;
      ctx.fillStyle = over ? rose(0.9) : ink(0.45);
      ctx.fillRect(tx - 0.75, y - 7, 1.5, 14);
      text(ctx, 'too similar?', tx, y - 12, { font: `500 11px ${SANS}`, color: over ? rose(0.9) : ink(0.5), align: 'center' });
      ctx.restore();
    }

    function codeCard(ctx, box, lines, { alpha = 1, marks = 0, news = 0, border = ink(0.14), bw = 1, label = null, upto = Infinity, edit = null } = {}) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      if (label) text(ctx, label, box.x, box.y - 9, { font: labelFont, color: ink(0.85) });
      card(ctx, box.x, box.y, box.w, CARD_H, { border, width: bw });
      const x = box.x + pad;
      const y = box.y + pad;
      const w = box.w - 2 * pad;
      if (edit) {
        // Kept lines slide to their new rows; the changed ones fade out and the new ones in
        const e = ease(edit.k);
        lines.forEach((ln, i) => {
          const j = edit.map[i];
          codeLines(ctx, x, y + (j >= 0 ? lerp(i, j, e) : i) * lh, [ln], { font, lh, w, marks, alpha: j >= 0 ? 1 : 1 - span(edit.k, 0, 0.35) });
        });
        edit.lines.forEach((ln, j) => {
          if (!edit.map.includes(j)) codeLines(ctx, x, y + j * lh, [ln], { font, lh, w, news: edit.news, alpha: span(edit.k, 0.5, 1) });
        });
      } else codeLines(ctx, x, y, lines, { font, lh, w, marks, news, upto });
      ctx.restore();
    }

    function islandView(ctx, t, alpha, extra) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha *= alpha;
      drawIsland(ctx, L.isl.x, L.isl.y, L.isl.R, PH, { fill: PAGE });
      const pts = prog.map((p) => at(p.a, p.d));
      const all = [...prog.map((p, i) => ({ ...pts[i], f: p.f })), ...extra.filter((e) => e.member)];
      const best = all.reduce((p, q) => (q.f > p.f ? q : p));
      for (const p of all) drawDot(ctx, p.x, p.y, p.f, { best: p === best, grow: p.grow ?? 1 });
      islandLabel(ctx, 'Island I', L.isl.x - L.isl.R * 1.02, L.isl.y - L.isl.R * 0.98 - 4, 1, narrow);
      ctx.restore();
    }

    /** A candidate's embedding: a dot from the card to its spot, and a ring on its closest program */
    function embed(ctx, t, span2, spot, { ring = Infinity, near = true, alpha = 1 }) {
      const k = span(t, ...span2);
      if (k <= 0 || alpha <= 0) return;
      const from = narrow ? { x: L.card.x + L.card.w / 2, y: L.card.y + CARD_H } : { x: L.card.x + L.card.w, y: L.card.y + CARD_H / 2 };
      const c = narrow ? { x: from.x + 60, y: lerp(from.y, spot.y, 0.4) } : { x: lerp(from.x, spot.x, 0.5), y: from.y - 30 };
      const p = quad(from, c, spot, ease(k));
      ctx.save();
      ctx.globalAlpha *= alpha;
      if (k < 1) {
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = ink(0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const q = quad(from, c, spot, ease(k) * (i / 20));
          if (i) ctx.lineTo(q.x, q.y);
          else ctx.moveTo(q.x, q.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = ink(0.85);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      const rk = span(t, ring, ring + 300);
      if (near && rk > 0) {
        ctx.beginPath();
        ctx.arc(NEAR.x, NEAR.y, 7, 0, Math.PI * 2);
        ctx.strokeStyle = ink(0.6 * rk);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    function verdict(ctx, t, t0, good, word, alpha) {
      const a = span(t, t0, t0 + 300) * alpha;
      if (a <= 0) return;
      const { x, y } = L.verdict;
      text(ctx, 'judge', x, y, { font: labelFont, color: ink(0.85 * a) });
      const mx = x + textWidth(ctx, 'judge', labelFont) + 13;
      ctx.save();
      ctx.globalAlpha *= a;
      if (good) tick(ctx, mx, y - 4, 4.5, gold(0.95), span(t, t0 + 150, t0 + 450));
      else cross(ctx, mx, y - 4, 4, rose(0.9), span(t, t0 + 150, t0 + 450));
      ctx.restore();
      text(ctx, word, mx + 13, y, { font: `italic 400 ${narrow ? 13 : 14}px ${SERIF}`, color: good ? ink(0.8 * a) : rose(0.9 * a) });
    }

    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = loopAlpha(t, LOOP);

      if (t < C2) {
        // Candidate one: a copy with new names
        const out = 1 - span(t, C2 - 500, C2 - 100);
        const judging = span(t, K.judge, K.judge + 450) * (1 - span(t, K.back, K.back + 400));
        // The island steps aside while the judge reads, and comes back once the reasons are sent
        const islA = t < K.back ? 1 - span(t, K.judge, K.judge + 450) : span(t, K.isl, K.isl + 400);
        const trained = span(t, ...K.train);
        const members = trained > 0 ? [{ ...SPOT_REVISED, f: 0.68, member: true, grow: span(t, K.train[1] - 200, K.train[1] + 200) }] : [];
        islandView(ctx, t, islA * out, members);
        const sendK = span(t, ...K.send);
        const bad = span(t, K.send[1] - 100, K.send[1] + 200) * (1 - span(t, K.edit[0], K.edit[1]));
        const editK = span(t, ...K.edit);
        codeCard(ctx, L.card, RENAMED, {
          alpha: span(t, K.card, K.card + 400) * out,
          label: 'candidate',
          marks: span(t, K.marks, K.marks + 400) * (1 - span(t, K.back, K.back + 300)),
          upto: span(t, K.card, K.card + 700) * 7,
          border: bad > 0 ? rose(0.4 + 0.45 * bad) : ink(0.14),
          bw: bad > 0 ? 1.3 : 1,
          edit: editK > 0 ? { k: editK, lines: REVISED, map: EDIT_MAP, news: span(t, K.edit[0] + 300, K.edit[1]) * (1 - span(t, K.train[1], K.train[1] + 600)) } : null
        });
        // First pass through the gate
        const firstOut = 1 - span(t, K.judge, K.judge + 300);
        embed(ctx, t, K.embed, SPOT_COPY, { ring: K.ring, alpha: firstOut * out });
        const lvl1 = 0.88 * ease(span(t, ...K.meter));
        const lvl2 = 0.52 * ease(span(t, ...K.meter2));
        const meterA = islA * out;
        meter(ctx, t < K.back ? lvl1 : lvl2, meterA * span(t, K.meter[0] - 300, K.meter[0]));
        // The judge reads the two side by side
        codeCard(ctx, L.near, NEAREST, { alpha: judging * out, label: 'closest match', marks: span(t, K.marks, K.marks + 400) });
        verdict(ctx, t, K.verdict, false, 'cosmetic copy', (1 - span(t, K.back - 100, K.back + 200)) * out);
        // Its reasons go back to the agent
        const na = span(t, K.note, K.note + 300) * (1 - span(t, K.send[1] - 100, K.send[1]));
        if (na > 0) {
          const from = { x: L.note.x, y: L.note.y };
          const to = { x: L.card.x + 10, y: L.card.y + CARD_H - 10 };
          const e = ease(sendK);
          text(ctx, '“only the names changed”', lerp(from.x, to.x, e), lerp(from.y, to.y, e), { font: `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`, color: ink(0.65 * na * out) });
        }
        // Second pass: well under the line, so straight to training
        embed(ctx, t, K.embed2, SPOT_REVISED, { near: false, alpha: (1 - span(t, K.train[1] - 200, K.train[1])) * out });
        trainRing(ctx, SPOT_REVISED.x, SPOT_REVISED.y, trained, (1 - span(t, K.train[1], K.train[1] + 300)) * out);
        if (trained > 0) text(ctx, 'train', SPOT_REVISED.x + 12, SPOT_REVISED.y + 4, { font: `500 11px ${SANS}`, color: gold(0.95 * out * span(t, K.train[0], K.train[0] + 200)) });
      } else {
        // Candidate two: the same script plus one new idea
        const u = t - C2;
        const judging = span(u, M.judge, M.judge + 450) * (1 - span(u, M.back, M.back + 400));
        const trained = span(u, ...M.train);
        const members = [{ ...SPOT_REVISED, f: 0.68, member: true }];
        if (trained > 0) members.push({ ...SPOT_MIXUP, f: 0.74, member: true, grow: span(u, M.train[1] - 200, M.train[1] + 200) });
        islandView(ctx, t, (1 - judging) * span(u, -300, 0), members);
        codeCard(ctx, L.card, MIXUP, {
          alpha: span(u, M.card, M.card + 400),
          label: 'candidate',
          news: span(u, M.news, M.news + 400),
          upto: span(u, M.card, M.card + 700) * 7
        });
        embed(ctx, t - C2, M.embed, SPOT_MIXUP, { ring: M.ring, alpha: 1 - span(u, M.train[1] - 200, M.train[1]) });
        const lvl = 0.9 * ease(span(u, ...M.meter));
        meter(ctx, lvl, (1 - judging) * span(u, M.meter[0] - 300, M.meter[0]), span(u, M.meter[0], M.meter[0] + 300));
        codeCard(ctx, L.near, NEAREST, { alpha: judging, label: 'closest match' });
        verdict(ctx, u, M.verdict, true, 'new idea', 1 - span(u, M.train[1] + 300, M.train[1] + 700));
        const na = span(u, M.note, M.note + 300) * (1 - span(u, M.train[1] + 300, M.train[1] + 700));
        if (na > 0) text(ctx, '“same scaffold, but mixup is new”', L.note.x, L.note.y, { font: `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`, color: ink(0.65 * na) });
        trainRing(ctx, SPOT_MIXUP.x, SPOT_MIXUP.y, trained, 1 - span(u, M.train[1], M.train[1] + 300));
        if (trained > 0) text(ctx, 'train', SPOT_MIXUP.x + 12, SPOT_MIXUP.y + 14, { font: `500 11px ${SANS}`, color: gold(0.95 * span(u, M.train[0], M.train[0] + 200) * (1 - span(u, M.train[1] + 400, M.train[1] + 800))) });
      }
      ctx.restore();
    }, { still: C2 + 5600 });
  }

  /* ───────────── Sizing ───────────── */

  /**
   * Each sketch has two layouts, drawn at a design width: 680 px across for wide frames, 360
   * for phones and other tall frames. This scales whichever one applies to the real frame,
   * so a 600 px or a 414 px figure gets the same composition as the one checked here.
   */
  function fitted(create) {
    return (W, H, dpr) => {
      const tall = W < 520 || H > W * 0.9;
      const vw = tall ? 360 : 680;
      const s = W / vw;
      const inner = create(vw, H / s, dpr * s);
      return {
        ...inner,
        draw(ctx) {
          ctx.save();
          ctx.scale(s, s);
          inner.draw(ctx);
          ctx.restore();
        }
      };
    };
  }

  return { seeds: fitted(createPool), spawn: fitted(createStalled), novelty: fitted(createGate) };
})();

/* ───────────── IOAI photo finish ───────────── */

// The IOAI² AI Models Track as a race: each of the six tasks adds its normalized score to every
// named system's bar, then the finish zooms in on the trophy tiers and the 1.47-point gap.
// Every number is from IOAI's public review. Drawn at 680 px (360 on phones), then scaled.
const createIOAIRace = (() => {
  const INK = '28, 25, 23';
  const GOLD = '184, 134, 11';
  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  const FEATHER = 28;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const easeOut = (k) => 1 - (1 - k) ** 3;
  /** How far t is through [a, b], from 0 to 1 */
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;

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

  /** The page colour, opaque in the middle and dissolving at the edges. */
  function makeBackdrop(W, H, dpr) {
    const layer = makeLayer(W, H, dpr);
    layer.ctx.fillStyle = pageColor();
    layer.ctx.fillRect(0, 0, W, H);
    featherEdges(layer.ctx, W, H, FEATHER);
    return layer.canvas;
  }

  /** Fade in as a loop starts and out as it ends */
  const loopAlpha = (clock, loop, inMs = 400, outMs = 500) => Math.min(span(clock, 0, inMs), 1 - span(clock, loop - outMs, loop));

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', halo = 0 } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    if (halo) {
      ctx.save();
      ctx.globalAlpha *= halo;
      ctx.strokeStyle = pageColor();
      ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
      ctx.restore();
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  function textWidth(ctx, str, font) {
    ctx.font = font;
    return ctx.measureText(str).width;
  }

  /** Largest size from `base` down to `min` at which `str` fits in maxW */
  function fitFont(ctx, str, maxW, base, min, make) {
    let size = base;
    while (size > min && textWidth(ctx, str, make(size)) > maxW) size -= 0.25;
    return make(size);
  }

  /** Greedy word wrap */
  function wrapLines(ctx, str, maxW, font) {
    ctx.font = font;
    const lines = [];
    let line = '';
    for (const word of str.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function looping(LOOP, draw, extra = {}) {
    let clock = 0;
    return {
      loopMs: LOOP,
      prewarm: 0,
      ...extra,
      step(dt) {
        clock = (clock + dt) % LOOP;
      },
      draw(ctx) {
        draw(ctx, clock);
      }
    };
  }

  /** The current stage's name, crossfading as the stages change; a gold rule under it */
  function stageName(ctx, t, x, y, schedule, { size = 15, align = 'left' } = {}) {
    schedule.forEach(([t0, t1, name]) => {
      const a = Math.min(span(t, t0, t0 + 300), 1 - span(t, t1 - 250, t1));
      if (a <= 0) return;
      const font = `500 ${size}px ${SERIF}`;
      text(ctx, name, x, y, { font, color: ink(0.88 * a), align });
      const w = textWidth(ctx, name, font);
      ctx.fillStyle = gold(0.9 * a);
      ctx.fillRect(align === 'center' ? x - w / 2 : x, y + 6, w * easeOut(span(t, t0, t0 + 450)), 1.6);
    });
  }

  /* Data: IOAI's per-task tables and trophy table (IOAI² Inaugural Edition Review, 2026) */

  const DATA = {"tasks":[{"name":"Find the Order","rows":[{"system":"Synthetic Sciences","score":100.0,"rank":1},{"system":"InfiAgents","score":78.2,"rank":2},{"system":"WestlakeNLP","score":77.7,"rank":3},{"system":"Leeroo","score":76.0,"rank":4},{"system":"Sakana AI","score":71.0,"rank":5},{"system":"anonymous","score":70.1,"rank":6},{"system":"Darwin Robotics","score":68.5,"rank":7},{"system":"TripleTree","score":66.7,"rank":8},{"system":"anonymous","score":64.3,"rank":9},{"system":"anonymous","score":64.2,"rank":10},{"system":"anonymous","score":57.2,"rank":11},{"system":"PKU-DCAI","score":51.1,"rank":12},{"system":"anonymous","score":49.7,"rank":13},{"system":"Cyrion Labs","score":0.0,"rank":14},{"system":"anonymous","score":0.0,"rank":15}]},{"name":"Chasing the Robot","rows":[{"system":"InfiAgents","score":100.0,"rank":1},{"system":"Leeroo","score":98.8,"rank":2},{"system":"anonymous","score":98.5,"rank":3},{"system":"anonymous","score":97.6,"rank":4},{"system":"Synthetic Sciences","score":96.1,"rank":5},{"system":"PKU-DCAI","score":95.6,"rank":6},{"system":"TripleTree","score":94.3,"rank":7},{"system":"anonymous","score":92.2,"rank":8},{"system":"WestlakeNLP","score":90.0,"rank":9},{"system":"anonymous","score":85.2,"rank":10},{"system":"Darwin Robotics","score":84.8,"rank":11},{"system":"Sakana AI","score":78.9,"rank":12},{"system":"Cyrion Labs","score":77.4,"rank":13},{"system":"anonymous","score":73.5,"rank":14},{"system":"anonymous","score":73.5,"rank":15}]},{"name":"Potato Contact","rows":[{"system":"PKU-DCAI","score":100.0,"rank":1},{"system":"anonymous","score":96.5,"rank":2},{"system":"Leeroo","score":92.0,"rank":3},{"system":"Sakana AI","score":90.6,"rank":4},{"system":"anonymous","score":90.2,"rank":5},{"system":"anonymous","score":87.9,"rank":6},{"system":"InfiAgents","score":87.5,"rank":7},{"system":"Darwin Robotics","score":83.1,"rank":8},{"system":"TripleTree","score":82.7,"rank":9},{"system":"Synthetic Sciences","score":78.7,"rank":10},{"system":"WestlakeNLP","score":77.6,"rank":11},{"system":"anonymous","score":73.8,"rank":12},{"system":"anonymous","score":53.2,"rank":13},{"system":"Cyrion Labs","score":43.3,"rank":14},{"system":"anonymous","score":42.8,"rank":15}]},{"name":"Double Agent Dilemma","rows":[{"system":"Synthetic Sciences","score":100.0,"rank":1},{"system":"WestlakeNLP","score":99.7,"rank":2},{"system":"anonymous","score":99.5,"rank":3},{"system":"Darwin Robotics","score":99.2,"rank":4},{"system":"Leeroo","score":98.8,"rank":5},{"system":"InfiAgents","score":98.8,"rank":6},{"system":"TripleTree","score":98.2,"rank":7},{"system":"anonymous","score":98.0,"rank":8},{"system":"anonymous","score":97.7,"rank":9},{"system":"Cyrion Labs","score":97.3,"rank":10},{"system":"anonymous","score":96.6,"rank":11},{"system":"Sakana AI","score":96.3,"rank":12},{"system":"anonymous","score":69.6,"rank":13},{"system":"anonymous","score":0.0,"rank":14},{"system":"PKU-DCAI","score":0.0,"rank":15}]},{"name":"Ghost of the Machine","rows":[{"system":"anonymous","score":100.0,"rank":1},{"system":"Synthetic Sciences","score":98.8,"rank":2},{"system":"anonymous","score":98.6,"rank":3},{"system":"anonymous","score":97.6,"rank":4},{"system":"WestlakeNLP","score":97.4,"rank":5},{"system":"InfiAgents","score":97.2,"rank":6},{"system":"Leeroo","score":97.2,"rank":7},{"system":"anonymous","score":97.1,"rank":8},{"system":"PKU-DCAI","score":96.6,"rank":9},{"system":"Sakana AI","score":96.5,"rank":10},{"system":"anonymous","score":96.2,"rank":11},{"system":"TripleTree","score":95.6,"rank":12},{"system":"anonymous","score":93.7,"rank":13},{"system":"Cyrion Labs","score":93.5,"rank":14},{"system":"Darwin Robotics","score":91.4,"rank":15}]},{"name":"IOAI Field","rows":[{"system":"InfiAgents","score":100.0,"rank":1},{"system":"Synthetic Sciences","score":95.5,"rank":2},{"system":"WestlakeNLP","score":89.0,"rank":3},{"system":"Darwin Robotics","score":78.8,"rank":4},{"system":"anonymous","score":77.1,"rank":5},{"system":"anonymous","score":73.8,"rank":6},{"system":"Leeroo","score":73.2,"rank":7},{"system":"anonymous","score":73.0,"rank":8},{"system":"PKU-DCAI","score":72.7,"rank":9},{"system":"anonymous","score":71.6,"rank":10},{"system":"anonymous","score":71.4,"rank":11},{"system":"Sakana AI","score":71.0,"rank":12},{"system":"TripleTree","score":70.4,"rank":13},{"system":"Cyrion Labs","score":65.6,"rank":14},{"system":"anonymous","score":0.0,"rank":15}]}],"trophy_table":{"rows":[{"rank":1,"system":"Synthetic Sciences","total":569.14},{"rank":2,"system":"InfiAgents (MBZUAI IFM)","total":561.74},{"rank":3,"system":"Leeroo","total":536.06},{"rank":4,"system":"WestlakeNLP","total":531.37},{"rank":5,"system":"(anonymous)*","total":527.39},{"rank":6,"system":"TripleTree (UCLA)","total":507.96},{"rank":7,"system":"Darwin Robotics","total":505.72},{"rank":8,"system":"Sakana AI","total":504.25},{"rank":11,"system":"(anonymous)*","total":464.97},{"rank":12,"system":"PKU-DCAI","total":415.97}]},"award_boundaries":{"implied_by_trophy_table":{"Champion":561.74,"Grand Master":531.37,"Master":504.25}}};

  const TASKS = DATA.tasks;
  const DARWIN = 'Darwin Robotics';
  const SAKANA = 'Sakana AI';
  /** The nine systems named on every task, in trophy-table order (Cyrion Labs has no published rank) */
  const NAMED = ['Synthetic Sciences', 'InfiAgents', 'Leeroo', 'WestlakeNLP', 'TripleTree', DARWIN, SAKANA, 'PKU-DCAI', 'Cyrion Labs'];
  const SHORT = {
    'Synthetic Sciences': 'Synthetic Sci.',
    InfiAgents: 'InfiAgents',
    Leeroo: 'Leeroo',
    WestlakeNLP: 'WestlakeNLP',
    TripleTree: 'TripleTree',
    [DARWIN]: 'Darwin',
    [SAKANA]: 'Sakana',
    'PKU-DCAI': 'PKU-DCAI',
    'Cyrion Labs': 'Cyrion'
  };
  const rowOf = (k, name) => TASKS[k].rows.find((r) => r.system === name);
  const OFFICIAL = {};
  const RANK = {};
  const ANON_TOTALS = [];
  DATA.trophy_table.rows.forEach((r) => {
    if (r.system.startsWith('(anonymous)')) ANON_TOTALS.push(r);
    else {
      const n = r.system.replace(/ \(.*\)$/, '');
      OFFICIAL[n] = r.total;
      RANK[n] = r.rank;
    }
  });
  /** Sum of a system's six printed scores, to one decimal (they're printed to one decimal) */
  const taskSum = (n) => Math.round(TASKS.reduce((s, t) => s + t.rows.find((r) => r.system === n).score, 0) * 10) / 10;
  /** Official total where there is one; Cyrion Labs, which has none, gets its task-score sum */
  const totalOf = (n) => OFFICIAL[n] ?? taskSum(n);
  const TIER = DATA.award_boundaries.implied_by_trophy_table;
  const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

  /* Photo finish */

  /**
   * A bar-chart race over the nine named systems: each task adds its normalized score to every
   * bar and the rows re-sort. Darwin and Sakana trade places three times. After Task 6 the axis
   * zooms to the finish, the two anonymous trophy winners take their places, the trophy tiers
   * shade in (each tier starts at its lowest holder's total) and the 1.47 gap is marked.
   */
  function createRace(W, H, dpr) {
    const narrow = W < 520;
    const LOOP = 18000;
    const T0 = 700;
    const D = 1650;
    const G = 760;
    const R = 560;
    const F0 = T0 + 6 * D;
    const ZOOM = [F0 + 150, F0 + 1450];
    const ANON = [F0 + 600, F0 + 1450];
    const BANDS = [F0 + 1100, F0 + 1900];
    const GAP = [F0 + 2050, F0 + 2550];
    const backdrop = makeBackdrop(W, H, dpr);
    const M = narrow ? 16 : 32;
    const rankW = narrow ? 17 : 22;
    const nameW = narrow ? 80 : 124;
    const xL = M + rankW + nameW + (narrow ? 4 : 10);
    const xR = W - M - (narrow ? 48 : 86);
    const top = narrow ? 82 : 66;
    const bottom = H - (narrow ? 42 : 34);
    const RACE = [0, 600];
    const FIN = [460, 600];

    const cum = {};
    NAMED.forEach((n) => {
      let s = 0;
      cum[n] = [0];
      for (let k = 0; k < 6; k++) {
        s += rowOf(k, n).score;
        cum[n].push(Math.round(s * 10) / 10);
      }
    });
    const orders = [NAMED.slice()];
    for (let k = 1; k <= 6; k++) orders.push(NAMED.slice().sort((a, b) => cum[b][k] - cum[a][k] || NAMED.indexOf(a) - NAMED.indexOf(b)));
    const ANONS = ANON_TOTALS.map((r) => ({ id: `anon${r.rank}`, total: r.total, rank: r.rank }));
    const FINAL = [...NAMED.map((n) => ({ id: n, total: totalOf(n) })), ...ANONS.map((a) => ({ id: a.id, total: a.total }))]
      .sort((a, b) => b.total - a.total)
      .map((r) => r.id);

    const nameFont = (ctx, n) => {
      const label = narrow ? SHORT[n] : n;
      const w = n === DARWIN ? 600 : 500;
      return fitFont(ctx, label, nameW, narrow ? 13 : 13.5, 10.5, (s) => `${w} ${s}px ${SERIF}`);
    };
    const schedule = TASKS.map((tk, j) => [j === 0 ? 250 : T0 - 300 + j * D, T0 - 300 + (j + 1) * D, `Task ${j + 1} · ${tk.name}`]);
    schedule.push([F0 - 300, LOOP + 1000, 'Total of 600']);

    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = loopAlpha(t, LOOP, 400, 600);

      const kZ = ease(span(t, ...ZOOM));
      const kA = ease(span(t, ...ANON));
      const kB = span(t, ...BANDS);
      const kG = span(t, ...GAP);
      const lo = lerp(RACE[0], FIN[0], kZ);
      const hi = lerp(RACE[1], FIN[1], kZ);
      const X = (v) => xL + ((v - lo) / (hi - lo)) * (xR - xL);
      const avail = bottom - top;
      const pitch = lerp(avail / 9, avail / 11, kA);
      const rowY = (slot) => top + (slot + 0.5) * pitch;
      const barH = Math.min(narrow ? 15 : 14, pitch * 0.5);
      const j = clamp(Math.floor((t - T0) / D), -1, 6);

      // Header: the task being added, and six marks for progress
      stageName(ctx, t, M, 30, schedule, { size: narrow ? 14.5 : 15.5 });
      for (let k = 0; k < 6; k++) {
        const w = narrow ? 11 : 14;
        const x = W - M - (6 - k) * (w + 4) + 4;
        const done = span(t, T0 + k * D, T0 + k * D + G);
        ctx.fillStyle = ink(0.12);
        ctx.fillRect(x, 24, w, 3);
        ctx.fillStyle = gold(0.85);
        ctx.fillRect(x, 24, w * done, 3);
      }

      // Trophy tiers, shaded in at the finish
      if (kB > 0) {
        const tiers = [
          ['Master', TIER.Master, TIER['Grand Master'], 0.02],
          ['Grand Master', TIER['Grand Master'], TIER.Champion, 0.033],
          ['Champion', TIER.Champion, 600, 0.046]
        ];
        tiers.forEach(([name, a, b, fill], ti) => {
          const x0 = X(a);
          const x1 = X(b);
          ctx.fillStyle = ink(fill * kB);
          ctx.fillRect(x0, top - 6, x1 - x0, bottom - top + 6);
          ctx.fillStyle = ink(0.14 * kB);
          ctx.fillRect(x0, top - 6, 1, bottom - top + 6);
          const font = `500 ${narrow ? 10.5 : 11}px ${SANS}`;
          const ly = narrow && ti === 1 ? top - 24 : top - 12;
          text(ctx, name, (x0 + x1) / 2, ly, { font, color: ink(0.55 * kB), align: 'center' });
        });
      }

      // Grid: hundreds during the race, fifties once zoomed
      // Fifties fade in once there's room for their numbers
      const room = (50 * (xR - xL)) / (hi - lo);
      const fifty = span(room, narrow ? 26 : 44, narrow ? 34 : 58);
      for (let v = 0; v <= 600; v += 50) {
        if (v < lo - 0.01 || v > hi + 0.01) continue;
        const a = v % 100 === 0 ? 1 : fifty;
        if (a <= 0.01) continue;
        const x = X(v);
        ctx.fillStyle = ink(0.06 * a);
        ctx.fillRect(x, top - 4, 1, bottom - top + 6);
        text(ctx, String(v), x, bottom + 16, { font: `400 ${narrow ? 10 : 10.5}px ${SANS}`, color: ink(0.38 * a), align: 'center' });
      }
      if (kZ > 0) {
        // A break in the axis once it no longer starts at zero
        ctx.strokeStyle = ink(0.35 * kZ);
        ctx.lineWidth = 1;
        for (const dx of [-2, 2]) {
          ctx.beginPath();
          ctx.moveTo(xL + dx - 2, bottom + 6);
          ctx.lineTo(xL + dx + 2, bottom - 2);
          ctx.stroke();
        }
      }

      // Rows
      const labelEnds = {};
      const drawRow = ({ id, label, italic, slot, v, freshFrom, freshA, valueStr, valueStr2, k2, rank, rankA, alpha, anon }) => {
        const y = rowY(slot);
        const darwin = id === DARWIN;
        const sakana = id === SAKANA;
        ctx.save();
        ctx.globalAlpha *= alpha;
        if (rank && rankA > 0) {
          text(ctx, String(rank), M + rankW - 6, y + 4, { font: `400 ${narrow ? 10.5 : 11}px ${SANS}`, color: darwin ? gold(rankA) : ink(0.42 * rankA), align: 'right' });
        }
        const nf = anon ? `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}` : nameFont(ctx, id);
        text(ctx, label, M + rankW, y + 4.5, { font: nf, color: darwin ? gold(1) : anon ? ink(0.5) : sakana ? ink(0.9) : ink(0.68) });
        const xe = Math.max(xL, X(v));
        if (xe > xL + 0.5) {
          rrect(ctx, xL, y - barH / 2, xe - xL, barH, Math.min(2, barH / 2));
          if (anon) {
            ctx.fillStyle = ink(0.06);
            ctx.fill();
            ctx.setLineDash([3, 2]);
            ctx.strokeStyle = ink(0.32);
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.fillStyle = darwin ? gold(0.8) : sakana ? ink(0.34) : ink(0.17);
            ctx.fill();
          }
          if (freshA > 0 && freshFrom < v) {
            const xs = Math.max(xL, X(freshFrom));
            if (xe - xs > 0.5) {
              ctx.fillStyle = darwin ? gold(0.95 * freshA) : ink(0.3 * freshA);
              ctx.fillRect(xs, y - barH / 2, xe - xs, barH);
            }
          }
        }
        const vf = `${darwin ? 600 : 500} ${narrow ? 10.5 : 11}px ${SANS}`;
        const vc = darwin ? gold(1) : sakana ? ink(0.72) : ink(0.5);
        const vx = xe + 6;
        if (valueStr2 && k2 > 0) {
          if (k2 < 1) text(ctx, valueStr, vx, y + 4, { font: vf, color: darwin ? gold(1 - k2) : sakana ? ink(0.72 * (1 - k2)) : ink(0.5 * (1 - k2)) });
          text(ctx, valueStr2, vx, y + 4, { font: vf, color: darwin ? gold(k2) : sakana ? ink(0.72 * k2) : ink(0.5 * k2) });
          labelEnds[id] = vx + textWidth(ctx, valueStr2, vf);
        } else {
          text(ctx, valueStr, vx, y + 4, { font: vf, color: vc });
          labelEnds[id] = vx + textWidth(ctx, valueStr, vf);
        }
        ctx.restore();
        return y;
      };

      const ys = {};
      const kOff = span(t, F0 + 250, F0 + 700);
      NAMED.forEach((n) => {
        let v;
        let slot;
        let freshFrom = 0;
        let freshA = 0;
        if (j < 0) {
          v = 0;
          slot = orders[0].indexOf(n);
        } else if (j < 6) {
          const g0 = T0 + j * D;
          const s = rowOf(j, n).score;
          v = cum[n][j] + s * ease(span(t, g0, g0 + G));
          slot = lerp(orders[j].indexOf(n), orders[j + 1].indexOf(n), ease(span(t, g0 + G, g0 + G + R)));
          freshFrom = cum[n][j];
          freshA = 1 - span(t, g0 + G + R * 0.4, g0 + G + R + 350);
        } else {
          v = cum[n][6];
          slot = lerp(orders[6].indexOf(n), FINAL.indexOf(n), kA);
        }
        const official = OFFICIAL[n];
        ys[n] = drawRow({
          id: n,
          label: narrow ? SHORT[n] : n,
          slot,
          v: j >= 6 && official ? lerp(v, official, kOff) : v,
          freshFrom,
          freshA,
          valueStr: v.toFixed(1),
          valueStr2: j >= 6 && official ? official.toFixed(2) : null,
          k2: kOff,
          rank: RANK[n],
          rankA: kA,
          alpha: 1
        });
      });
      if (kA > 0) {
        ANONS.forEach((a) => {
          drawRow({ id: a.id, label: 'anonymous', anon: true, slot: FINAL.indexOf(a.id), v: a.total, freshA: 0, valueStr: a.total.toFixed(2), rank: a.rank, rankA: kA, alpha: kA });
        });
      }

      // The photo finish: Darwin's 1.47 over Sakana
      if (kG > 0) {
        const y0 = ys[DARWIN];
        const y1 = ys[SAKANA];
        const bx = Math.max(labelEnds[DARWIN], labelEnds[SAKANA]) + 8;
        const k = easeOut(kG);
        ctx.strokeStyle = gold(0.9 * kG);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx - 3, y0);
        ctx.lineTo(bx, y0);
        ctx.lineTo(bx, lerp(y0, y1, k));
        if (k > 0.98) ctx.lineTo(bx - 3, y1);
        ctx.stroke();
        const gap = (OFFICIAL[DARWIN] - OFFICIAL[SAKANA]).toFixed(2);
        text(ctx, gap, bx + 6, (y0 + y1) / 2 + 4, { font: `600 ${narrow ? 11 : 11.5}px ${SANS}`, color: gold(kG) });
      }

      ctx.restore();
    }, { still: F0 + 4000 });
  }

  return (W, H, dpr) => {
    const tall = W < 520 || H > W * 0.9;
    const vw = tall ? 360 : 680;
    const s = W / vw;
    const inner = createRace(vw, H / s, dpr * s);
    return {
      ...inner,
      draw(ctx) {
        ctx.save();
        ctx.scale(s, s);
        inner.draw(ctx);
        ctx.restore();
      }
    };
  };
})();

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

/* ───────────── Circle packing ───────────── */

// The best-known packing of 26 circles in the unit square, as [x, y, r] (DeepMind's later
// strict construction, Georgiev et al. 2025, arXiv 2511.02864; our engine's best was this same packing).
const PACKING_26 = [[0.70261, 0.381666, 0.115149], [0.313116, 0.907608, 0.092392], [0.726906, 0.596043, 0.1006], [0.894817, 0.273953, 0.105183], [0.903849, 0.68208, 0.096151], [0.103061, 0.484601, 0.103061], [0.27163, 0.597635, 0.099898], [0.239711, 0.763674, 0.069181], [0.759352, 0.762959, 0.06944], [0.915074, 0.084926, 0.084926], [0.495532, 0.275343, 0.11763], [0.896533, 0.482596, 0.103467], [0.497284, 0.07886, 0.07886], [0.110779, 0.889221, 0.110779], [0.888844, 0.888844, 0.111156], [0.499428, 0.906073, 0.093927], [0.498668, 0.529963, 0.13701], [0.08464, 0.08464, 0.08464], [0.294609, 0.130221, 0.130221], [0.403359, 0.742417, 0.095842], [0.685943, 0.907408, 0.092592], [0.70231, 0.133259, 0.133259], [0.59522, 0.742049, 0.096019], [0.095732, 0.683259, 0.095732], [0.294746, 0.386924, 0.112077], [0.10679, 0.274783, 0.10679]];
const PACKING_SUM = 2.6359830849;
const FAKE_SUM = 2.6359987209; // the top "record" a check with 1e-6 of slack accepted
const ROSE = '180, 87, 74';

function createCirclePacking(W, H, dpr) {
  const portrait = H > W * 0.9;
  const S = portrait ? Math.min(W * 0.8, H * 0.55) : Math.min(H * 0.82, W * 0.5);
  const SX = portrait ? (W - S) / 2 : W * 0.05;
  const SY = portrait ? H * 0.05 : (H - S) / 2;
  const P = portrait
    ? { x: SX, y: SY + S + 34, w: S * 0.46, insetX: SX + S * 0.52, insetY: SY + S + 18, insetW: S * 0.48 }
    : { x: SX + S + W * 0.06, y: SY + 24, w: W * 0.36, insetX: SX + S + W * 0.06, insetY: SY + S * 0.46, insetW: Math.min(W * 0.34, S * 0.8) };
  const insetH = portrait ? Math.max(70, H - P.insetY - 14) : S * 0.5;
  const LOOP = 15000;
  const T = { settle: 400, hold: 6200, zoom: 8200, cheat: 9300, strict: 11800, fade: 13900 };
  const rand = (i, k) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const circles = PACKING_26.map(([x, y, r], i) => ({
    x, y, r,
    dx: (rand(i, 1) - 0.5) * 0.16,
    dy: (rand(i, 2) - 0.5) * 0.16,
    delay: rand(i, 3) * 1700
  }));
  const SETTLE = 4000;
  // The magnified contact: circles 10 and 16 touch near the middle of the square
  const A = PACKING_26[10];
  const B = PACKING_26[16];
  const nd = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const contact = [A[0] + (A[2] * (B[0] - A[0])) / nd, A[1] + (A[2] * (B[1] - A[1])) / nd];
  const ZOOM = insetH * 0.22 / 1e-6; // px per unit inside the inset: 1e-6 of overlap spans ~22% of it
  const magnification = Math.round(ZOOM / S / 1000) * 1000;
  const ease = (k) => 1 - (1 - k) ** 3;
  const px = (x) => SX + x * S;
  const py = (y) => SY + (1 - y) * S;
  let clock = 0;
  const backdrop = makeBackdrop(W, H, dpr);
  const bg = pageColor();

  function step(dt) {
    clock = (clock + dt) % LOOP;
  }

  function settled(c) {
    return ease(clamp((clock - T.settle - c.delay) / SETTLE, 0, 1));
  }

  function draw(ctx) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    const fadeOut = clamp((clock - T.fade) / 900, 0, 1);
    const fadeIn = clamp(clock / 400, 0, 1);
    ctx.save();
    ctx.globalAlpha = fadeIn * (1 - fadeOut);

    // The unit square and the circles settling into the packing
    ctx.strokeStyle = `rgba(${INK}, 0.4)`;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(SX + 0.5, SY + 0.5, S - 1, S - 1);
    let total = 0;
    let done = 0;
    for (const c of circles) {
      const e = settled(c);
      if (e >= 1) done++;
      const r = c.r * (0.1 + 0.9 * e);
      total += r;
      const x = c.x + c.dx * (1 - e);
      const y = c.y + c.dy * (1 - e);
      ctx.beginPath();
      ctx.arc(px(x), py(y), Math.max(1, r * S), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${INK}, ${0.05 + 0.04 * e})`;
      ctx.fill();
      ctx.strokeStyle = e >= 1 && clock < T.hold + 500 ? `rgba(${GOLD}, 0.9)` : `rgba(${INK}, ${0.35 + 0.3 * e})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const allIn = done === circles.length;
    const sumNow = allIn ? PACKING_SUM : (total / circles.reduce((a, c) => a + c.r, 0)) * PACKING_SUM;

    // Readout: the sum climbs to the record, then (the cheat) past it, then fails the strict check
    const cheatK = clamp((clock - T.cheat) / 1800, 0, 1);
    const cheating = clock >= T.cheat;
    const strict = clock >= T.strict;
    const shown = cheating ? PACKING_SUM + (FAKE_SUM - PACKING_SUM) * ease(cheatK) : sumNow;
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgba(${INK}, 0.5)`;
    ctx.font = '400 11.5px Inter, sans-serif';
    ctx.fillText('sum of radii', P.x, P.y);
    ctx.font = `500 ${portrait ? 22 : 28}px Satoshi, Inter, sans-serif`;
    ctx.fillStyle = cheating ? `rgb(${ROSE})` : allIn ? `rgb(${GOLD})` : `rgb(${INK})`;
    const numText = shown.toFixed(7);
    ctx.fillText(numText, P.x, P.y + (portrait ? 26 : 32));
    if (strict) {
      const w = ctx.measureText(numText).width;
      const sk = clamp((clock - T.strict) / 300, 0, 1);
      ctx.strokeStyle = `rgb(${ROSE})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(P.x, P.y + (portrait ? 18 : 22));
      ctx.lineTo(P.x + w * sk, P.y + (portrait ? 18 : 22));
      ctx.stroke();
    }
    ctx.font = '400 12px Inter, sans-serif';
    const sub = strict ? ['strict check: 0, invalid', `rgb(${ROSE})`]
      : cheating ? ['accepted by a check with 10⁻⁶ of slack', `rgb(${ROSE})`]
        : allIn ? ['the best known packing', `rgb(${GOLD})`]
          : ['circles settling into place', `rgba(${INK}, 0.5)`];
    ctx.fillStyle = sub[1];
    ctx.fillText(sub[0], P.x, P.y + (portrait ? 46 : 56));

    // The cheat, magnified: a contact where two circles push 1e-6 into each other
    const zk = clamp((clock - T.zoom) / 700, 0, 1);
    if (zk > 0) {
      const mx = px(contact[0]);
      const my = py(contact[1]);
      ctx.globalAlpha = fadeIn * (1 - fadeOut) * zk;
      ctx.strokeStyle = `rgba(${GOLD}, 0.9)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(mx, my, 9, 0, Math.PI * 2);
      ctx.stroke();
      const ix = P.insetX;
      const iy = P.insetY;
      const iw = P.insetW;
      ctx.strokeStyle = `rgba(${GOLD}, 0.35)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(mx + 9, my);
      ctx.lineTo(ix, iy + insetH / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix, iy, iw, insetH);
      ctx.clip();
      ctx.fillStyle = bg;
      ctx.fillRect(ix, iy, iw, insetH);
      // At this zoom both boundaries are straight: circle 16 above, circle 10 below
      const grow = cheating ? 1e-6 * ease(cheatK) : 0;
      const mid = iy + insetH / 2;
      const top = mid + (grow / 2) * ZOOM;
      const bottom = mid - (grow / 2) * ZOOM;
      ctx.fillStyle = `rgba(${INK}, 0.09)`;
      ctx.fillRect(ix, iy, iw, top - iy);
      ctx.fillRect(ix, bottom, iw, iy + insetH - bottom);
      if (grow > 0) {
        ctx.fillStyle = `rgba(${ROSE}, 0.45)`;
        ctx.fillRect(ix, bottom, iw, top - bottom);
      }
      ctx.strokeStyle = `rgba(${INK}, 0.65)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ix, top);
      ctx.lineTo(ix + iw, top);
      ctx.moveTo(ix, bottom);
      ctx.lineTo(ix + iw, bottom);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = `rgba(${INK}, 0.3)`;
      ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, insetH - 1);
      ctx.fillStyle = `rgba(${INK}, 0.5)`;
      ctx.font = '400 11px Inter, sans-serif';
      ctx.fillText(`one contact, magnified ×${magnification.toLocaleString('en-US')}`, ix, iy - 7);
      if (grow > 0) {
        ctx.fillStyle = `rgb(${ROSE})`;
        ctx.textAlign = 'right';
        ctx.fillText(`overlap ${(grow * 1e6).toFixed(1)}×10⁻⁶`, ix + iw - 8, mid - (grow / 2) * ZOOM - 6);
        ctx.textAlign = 'left';
      }
    }
    ctx.restore();
  }

  return { step, draw };
}

/* ───────────── Research map ───────────── */

// An invented RNA-folding map: techniques in four families, each an approach, an ingredient or a
// tweak, filling in as a made-up run of candidates builds them. Nothing here is from a real run.
// Drawn at a design width, 680 px (360 on phones and other tall frames), then scaled to fit.
const createResearchMap = (() => {
  const INK = '28, 25, 23';
  const GOLD = '184, 134, 11';
  const SERIF = 'Newsreader, Georgia, serif';
  const SANS = 'Inter, sans-serif';
  const FEATHER = 28;
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (k) => 1 - (1 - k) ** 3;
  /** How far t is through [a, b], from 0 to 1 */
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ink = (a) => `rgba(${INK}, ${a})`;
  const gold = (a = 1) => `rgba(${GOLD}, ${a})`;

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

  /** The page colour, opaque in the middle and dissolving at the edges. */
  function makeBackdrop(W, H, dpr) {
    const layer = makeLayer(W, H, dpr);
    layer.ctx.fillStyle = pageColor();
    layer.ctx.fillRect(0, 0, W, H);
    featherEdges(layer.ctx, W, H, FEATHER);
    return layer.canvas;
  }

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left' } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  /** Greedy word wrap */
  function wrapLines(ctx, str, maxW, font) {
    ctx.font = font;
    const lines = [];
    let line = '';
    for (const word of str.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
    else ctx.rect(x, y, w, h);
  }

  /* ───────────── The invented map ───────────── */

  const FAMILIES = [
    { id: 'fs', name: 'Structure prediction' },
    { id: 'fq', name: 'Sequence modeling' },
    { id: 'fd', name: 'Data and augmentation' },
    { id: 'fo', name: 'Training objectives' }
  ];

  // [id, tier (1 approach, 2 ingredient, 3 tweak), name, parent]
  const ENTRIES = [
    ['trunk', 1, 'Transformer trunk', 'fs'],
    ['pair', 2, 'Pair attention', 'trunk'],
    ['heads', 3, 'More attention heads', 'pair'],
    ['wide', 3, 'Wider pair channels', 'pair'],
    ['refine', 2, 'Iterative refinement', 'trunk'],
    ['passes', 3, 'Extra refinement passes', 'refine'],
    ['head', 2, 'Equivariant coordinate head', 'trunk'],
    ['step', 3, 'Smaller update steps', 'head'],
    ['tri', 2, 'Triangle updates', 'trunk'],
    ['gnn', 1, 'Graph network folder', 'fs'],
    ['edges', 2, 'Distance-cutoff edges', 'gnn'],
    ['diff', 1, 'Coordinate diffusion', 'fs'],
    ['sched', 2, 'Noise schedule', 'diff'],
    ['cos', 3, 'Cosine schedule', 'sched'],
    ['lm', 1, 'Pretrained language model', 'fq'],
    ['frozen', 2, 'Frozen embeddings', 'lm'],
    ['ft', 2, 'Fine-tuned encoder', 'lm'],
    ['lr', 3, 'Lower encoder learning rate', 'ft'],
    ['aln', 1, 'Alignment features', 'fq'],
    ['cov', 2, 'Covariation signal', 'aln'],
    ['aug', 1, 'Augmentation', 'fd'],
    ['rot', 2, 'Random rotations', 'aug'],
    ['crop', 2, 'Random crops', 'aug'],
    ['croplen', 3, 'Longer crops', 'crop'],
    ['noise', 2, 'Coordinate noise', 'aug'],
    ['self', 1, 'Self-training', 'fd'],
    ['unl', 2, 'Unlabelled sequences', 'self'],
    ['multi', 1, 'Multi-task supervision', 'fo'],
    ['dist', 2, 'Aligned distance loss', 'multi'],
    ['clamp', 3, 'Distance clamp', 'dist'],
    ['bp', 2, 'Base-pair contact loss', 'multi'],
    ['bpw', 3, 'Heavier contact weight', 'bp'],
    ['clash', 2, 'Clash penalty', 'multi'],
    ['curric', 1, 'Length curriculum', 'fo']
  ];

  const TIER_WORD = ['family', 'approach', 'ingredient', 'tweak'];

  const NODE = new Map();
  FAMILIES.forEach((f) => NODE.set(f.id, { id: f.id, tier: 0, name: f.name, parent: null, children: [], family: f.id }));
  ENTRIES.forEach(([id, tier, name, parent]) => {
    const p = NODE.get(parent);
    const nd = { id, tier, name, parent, children: [], family: p.family };
    NODE.set(id, nd);
    p.children.push(nd);
  });
  /** Every technique, depth first (families left out) */
  const ORDER = [];
  (function walk(list) {
    list.forEach((nd) => {
      if (nd.tier) ORDER.push(nd);
      walk(nd.children);
    });
  })(FAMILIES.map((f) => NODE.get(f.id)));
  const leafCount = (nd) => (nd.children.length ? nd.children.reduce((a, c) => a + leafCount(c), 0) : 1);
  function subtree(id) {
    const out = new Set();
    (function add(nd) {
      out.add(nd.id);
      nd.children.forEach(add);
    })(NODE.get(id));
    return out;
  }
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

  /* ───────────── The invented run ───────────── */

  // One lineage of 17 candidates. Each starts from its parent's program, keeps what the parent
  // built or inherited, and builds, tries or drops a few things of its own. Candidates 2 to 13
  // pile everything onto the transformer trunk; 14 swaps it for diffusion; 16 adds a language
  // model; 17 finally gets the clash penalty that 8 couldn't make run.
  const RUN = [
    { p: 0, built: ['trunk', 'pair', 'head', 'multi', 'dist', 'aug', 'rot'] },
    { p: 1, built: ['heads'] },
    { p: 1, built: ['refine'] },
    { p: 3, built: ['passes'] },
    { p: 2, built: ['wide'] },
    { p: 4, built: ['tri'] },
    { p: 6, built: ['step'] },
    { p: 5, tried: ['clash'] },
    { p: 7, built: ['crop'] },
    { p: 9, built: ['bp'] },
    { p: 7, planned: ['ft'] },
    { p: 10, built: ['bpw'] },
    { p: 12, built: ['clamp'] },
    { p: 1, built: ['diff', 'sched'], dropped: ['trunk'] },
    { p: 14, built: ['cos'] },
    { p: 13, built: ['lm', 'frozen'] },
    { p: 16, built: ['clash'] }
  ];
  const N = RUN.length;

  /** PRESENT[c]: technique id -> how candidate c has it: built | inherited | tried | planned */
  const PRESENT = [new Map()];
  const FIRST_BUILT = new Map();
  const FIRST_TRIED = new Map(); // id -> { c, planned }
  RUN.forEach((r, i) => {
    const c = i + 1;
    const m = new Map();
    if (r.p) {
      const gone = new Set((r.dropped || []).flatMap((id) => [...subtree(id)]));
      PRESENT[r.p].forEach((st, id) => {
        if ((st === 'built' || st === 'inherited') && !gone.has(id)) m.set(id, 'inherited');
      });
    }
    (r.built || []).forEach((id) => {
      m.set(id, 'built');
      if (!FIRST_BUILT.has(id)) FIRST_BUILT.set(id, c);
    });
    (r.tried || []).forEach((id) => {
      m.set(id, 'tried');
      if (!FIRST_TRIED.has(id)) FIRST_TRIED.set(id, { c, planned: false });
    });
    (r.planned || []).forEach((id) => {
      m.set(id, 'planned');
      if (!FIRST_TRIED.has(id)) FIRST_TRIED.set(id, { c, planned: true });
    });
    PRESENT.push(m);
  });
  const ancestors = (c) => {
    const out = new Set();
    for (let a = c; a; a = RUN[a - 1].p) out.add(a);
    return out;
  };

  /** The approach the figure singles out at the end, and how much got built under it */
  const FOCUS = 'trunk';
  const FOCUS_SET = subtree(FOCUS);
  const FOCUS_BUILT = [...FOCUS_SET].filter((id) => FIRST_BUILT.has(id)).length;
  const FOCUS_NOTE = `${FOCUS_BUILT} builds, one approach`;
  const FOCUS_LINES = [`${FOCUS_BUILT} builds,`, 'one approach'];

  /* ───────────── Timeline ───────────── */

  const LEAD = 1800;    // the map draws in, untouched
  const PER = 1250;     // ms per candidate
  const T_END = LEAD + N * PER;
  const HOLD = 7600;    // the whole run at rest, then the callout
  const LOOP = T_END + HOLD;
  const POP0 = 0.2;     // within a candidate: its builds pop over [POP0, POP1] of its slot
  const POP1 = 0.46;

  /** Which candidate is on show at `clock`, how far through its slot, and how far into the end view */
  function phase(clock) {
    const p = (clock - LEAD) / PER;
    if (p < 0) return { n: 0, k: 0, rv: 0, co: 0, seen: 0 };
    if (p >= N) {
      return { n: N, k: 1, rv: span(clock, T_END + 150, T_END + 800), co: span(clock, T_END + 900, T_END + 1700), seen: N };
    }
    const n = Math.floor(p) + 1;
    return { n, k: p - (n - 1), rv: 0, co: 0, seen: n };
  }

  /** Fade in as a loop starts and out as it ends */
  const loopAlpha = (clock) => Math.min(span(clock, 0, 350), 1 - span(clock, LOOP - 600, LOOP));

  /**
   * How one technique looks with candidate n on show, k through its slot, rv into the run view.
   * pale: built by someone before; solid: built by the candidate on show (pop: its stamp-in);
   * dot: inherited by it; dashed: tried but never built (hot while the trier is on show);
   * held: whether the candidate on show has it in its code at all.
   */
  function nodeState(id, n, k, rv) {
    const fb = FIRST_BUILT.get(id) || 0;
    const tf = FIRST_TRIED.get(id)?.c || 0;
    const cur = n ? PRESENT[n].get(id) : undefined;
    const prev = n > 1 ? PRESENT[n - 1].get(id) : undefined;
    const fade = n ? span(k, 0, 0.18) : 0;
    const stag = cur === 'built' ? RUN[n - 1].built.indexOf(id) * 0.055 : 0;
    const pop = cur === 'built' ? span(k, POP0 + stag, POP1 + stag) : 0;
    const flash = cur === 'built' ? span(k, POP0 + stag, POP0 + stag + 0.4) : 0;
    const pale = fb && fb < n ? 1 : fb && fb === n ? pop : 0;
    const solid = (1 - rv) * Math.max(cur === 'built' ? easeOut(pop) : 0, prev === 'built' ? 1 - fade : 0);
    const dot = (1 - rv) * lerp(prev === 'inherited' ? 1 : 0, cur === 'inherited' ? 1 : 0, fade);
    const isTry = (s) => s === 'tried' || s === 'planned';
    let dashed = 0;
    let dashK = 1;
    if (tf && tf < n && !(fb && fb < n)) dashed = fb === n ? 1 - pop : 1;
    if (tf && tf === n) {
      dashed = 1;
      dashK = span(k, POP0, POP1 + 0.1);
    }
    const hot = (1 - rv) * lerp(isTry(prev) ? 1 : 0, isTry(cur) ? 1 : 0, fade);
    const has = (s) => (s === 'built' || s === 'inherited' ? 1 : 0);
    const held = (1 - rv) * lerp(has(prev), has(cur), fade);
    return { pale, solid, pop, flash, dot, dashed, dashK, hot, held, builtNow: cur === 'built' && !rv };
  }

  /** Built-so-far count per tier, counting a fresh build once it has stamped in */
  function tierCounts(n, k) {
    const out = [0, 0, 0, 0];
    ORDER.forEach((nd) => {
      const fb = FIRST_BUILT.get(nd.id);
      if (!fb || fb > n) return;
      if (fb === n && nodeState(nd.id, n, k, 0).pop < 0.5) return;
      out[nd.tier]++;
    });
    return out;
  }

  /* ───────────── Words for the tooltips ───────────── */

  function nodeLine(id, vn, rv) {
    const nd = NODE.get(id);
    if (!nd.tier) {
      const all = ORDER.filter((o) => o.family === id);
      const done = all.filter((o) => FIRST_BUILT.get(o.id) && FIRST_BUILT.get(o.id) <= vn).length;
      return `family · ${done} of ${all.length} built so far`;
    }
    const t = TIER_WORD[nd.tier];
    const fb = FIRST_BUILT.get(id) || 0;
    const tr = FIRST_TRIED.get(id);
    const st = !rv && vn ? PRESENT[vn].get(id) : undefined;
    if (st === 'built') return `${t} · built by candidate ${vn}`;
    if (st === 'inherited') return `${t} · candidate ${vn} inherited it from ${RUN[vn - 1].p}`;
    if (st === 'tried') return `${t} · candidate ${vn} tried it, but it never ran`;
    if (st === 'planned') return `${t} · candidate ${vn} planned it, but never wrote it`;
    if (fb && fb <= vn) return `${t} · built by candidate ${fb}`;
    if (tr && tr.c <= vn) return tr.planned ? `${t} · planned by candidate ${tr.c}, never written` : `${t} · tried by candidate ${tr.c}, never ran`;
    return `${t} · on the map, ${vn >= N ? 'never tried' : 'not tried yet'}`;
  }

  function candLines(c) {
    const r = RUN[c - 1];
    const names = (ids) => ids.map((id) => lower(NODE.get(id).name)).join(', ');
    const title = c === 1 ? 'Candidate 1, the starting program' : `Candidate ${c}, a child of ${r.p}`;
    const lines = [];
    if (r.built) lines.push(`built ${names(r.built)}`);
    if (r.dropped) lines.push(`dropped the ${names(r.dropped)}`);
    if (r.tried) lines.push(`tried ${names(r.tried)}, which never ran`);
    if (r.planned) lines.push(`planned ${names(r.planned)}, never wrote it`);
    const kept = [...PRESENT[c].values()].filter((s) => s === 'inherited').length;
    if (kept) lines.push(`inherited ${kept} from its parent`);
    return { title, lines };
  }

  /** A small card near (ax, ay..ay+ah): a title line and a few quieter lines under it */
  function drawTip(ctx, W, ax, ay, ah, title, lines, bg) {
    ctx.save();
    const pad = 10;
    const maxW = Math.min(272, W - 24);
    const tf = `500 12px ${SANS}`;
    const sf = `400 11px ${SANS}`;
    const tl = wrapLines(ctx, title, maxW - 2 * pad, tf);
    const sl = lines.flatMap((s) => wrapLines(ctx, s, maxW - 2 * pad, sf));
    ctx.font = tf;
    let w = Math.max(...tl.map((s) => ctx.measureText(s).width));
    ctx.font = sf;
    w = Math.max(w, ...sl.map((s) => ctx.measureText(s).width));
    const tw = Math.min(maxW, w + 2 * pad);
    const th = 12 + tl.length * 16 + sl.length * 15 + 4;
    const tx = clamp(ax - tw / 2, 12, W - 12 - tw);
    let ty = ay - th - 10;
    if (ty < 8) ty = ay + ah + 10;
    rrect(ctx, tx, ty, tw, th, 6);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = ink(0.2);
    ctx.lineWidth = 1;
    ctx.stroke();
    tl.forEach((s, i) => text(ctx, s, tx + pad, ty + 20 + i * 16, { font: tf, color: ink(0.92) }));
    sl.forEach((s, i) => text(ctx, s, tx + pad, ty + 20 + tl.length * 16 + i * 15, { font: sf, color: ink(0.6) }));
    ctx.restore();
  }

  /* ───────────── Marks ───────────── */

  /** A technique as a disc of radius r */
  function drawDisc(ctx, x, y, r, s, bg, dim = 1) {
    ctx.save();
    ctx.globalAlpha *= dim;
    ctx.beginPath();
    ctx.arc(x, y, r - 0.5, 0, TAU);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = ink(0.24 * (1 - s.pale) * (1 - s.dashed));
    ctx.lineWidth = 1;
    ctx.stroke();
    if (s.pale) {
      ctx.fillStyle = gold(0.26 * s.pale);
      ctx.fill();
      ctx.strokeStyle = gold(0.55 * s.pale);
      ctx.stroke();
    }
    if (s.dashed) {
      ctx.setLineDash([2.2, 2.2]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = gold((0.6 + 0.4 * s.hot) * s.dashed);
      ctx.beginPath();
      ctx.arc(x, y, r - 0.5, -Math.PI / 2, -Math.PI / 2 + TAU * s.dashK);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (s.solid) {
      const g = s.builtNow ? 1 + 0.55 * (1 - easeOut(s.pop)) : 1;
      ctx.beginPath();
      ctx.arc(x, y, r * g, 0, TAU);
      ctx.fillStyle = gold(s.solid);
      ctx.fill();
    }
    if (s.flash > 0 && s.flash < 1) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2 + 9 * easeOut(s.flash), 0, TAU);
      ctx.strokeStyle = gold(0.55 * (1 - s.flash));
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (s.dot) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.7, r * 0.36), 0, TAU);
      ctx.fillStyle = ink(0.8 * s.dot);
      ctx.fill();
    }
    ctx.restore();
  }

  /** A technique as a block (rx, ry, rw, rh); the inherited dot sits at its left */

  /* ───────────── Lineage strip ───────────── */

  // The candidates in birth order along a baseline, each joined to its parent by an arc above
  // it. The candidate on show is gold, its ancestors are dark, and the rest are faint.
  function lineageLayout(x0, x1, base, hMax) {
    return { x: (c) => x0 + ((c - 1) / (N - 1)) * (x1 - x0), base, hMax, x0, x1 };
  }

  function drawLineage(ctx, L, ph, show, { label = true } = {}) {
    const anc = show ? ancestors(show) : new Set();
    const live = show && (ph.hovered || ph.rv < 0.5);
    ctx.save();
    ctx.lineCap = 'round';
    for (let c = 2; c <= ph.seen; c++) {
      const p = RUN[c - 1].p;
      const x0 = L.x(p);
      const x1 = L.x(c);
      const h = Math.min(L.hMax, 8 + (x1 - x0) * 0.32);
      const draw = c === ph.n && !ph.rv ? easeOut(span(ph.k, 0, 0.3)) : 1;
      const onPath = live && anc.has(c);
      ctx.strokeStyle = onPath ? ink(0.5) : ink(0.15);
      ctx.lineWidth = onPath ? 1.3 : 1;
      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps * draw; i++) {
        const t = i / steps;
        // A cubic from parent to child, rising to h
        const x = (1 - t) ** 3 * x0 + 3 * (1 - t) ** 2 * t * x0 + 3 * (1 - t) * t * t * x1 + t ** 3 * x1;
        const y = L.base - h * 4 * t * (1 - t) * 1.0;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let c = 1; c <= ph.seen; c++) {
      const x = L.x(c);
      const grow = c === ph.n && !ph.rv ? easeOut(span(ph.k, 0.1, 0.35)) : 1;
      const isShow = live && c === show;
      const r = (isShow ? 4.6 : anc.has(c) && live ? 3.2 : 2.8) * grow;
      ctx.beginPath();
      ctx.arc(x, L.base, r, 0, TAU);
      ctx.fillStyle = isShow ? gold() : live && anc.has(c) ? ink(0.72) : ink(0.3);
      ctx.fill();
    }
    if (label && live) {
      const lx = clamp(L.x(show), L.x0 + 26, L.x1 - 26);
      const a = show === ph.n && !ph.hovered ? span(ph.k, 0.05, 0.3) : 1;
      text(ctx, `candidate ${show}`, lx, L.base + 17, { font: `400 11px ${SANS}`, color: ink(0.55 * a), align: 'center' });
    }
    ctx.restore();
  }

  function hitLineage(L, ph, p) {
    if (!p || Math.abs(p.y - L.base) > 13) return null;
    let best = null;
    let bd = 1e9;
    for (let c = 1; c <= ph.seen; c++) {
      const d = Math.abs(p.x - L.x(c));
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return bd <= Math.max(8, (L.x(2) - L.x(1)) / 2) ? best : null;
  }

  /** The candidate on show: the one playing, or the one under the pointer */
  function viewOf(ph, hover) {
    if (hover?.kind === 'cand') return { n: hover.c, k: 1, rv: 0, hovered: true };
    return { n: ph.n, k: ph.k, rv: ph.rv, hovered: false };
  }

  /* Family trees */

  // Four small trees, one per family: approaches on top, the ingredients that plug into them
  // below, and tweaks at the bottom, with disc size falling by tier. Candidates play in turn
  // along the lineage strip underneath.
  function createTree(W, H, dpr) {
    const narrow = W < 520;
    const PAD = narrow ? 12 : 22;
    const rows = narrow ? [['fs', 'fq'], ['fd', 'fo']] : [['fs', 'fq', 'fd', 'fo']];
    const famGap = narrow ? 20 : 18;
    const labelY = narrow ? [34, 220] : [60];
    const dy = narrow ? 42 : 94;
    const R = narrow ? [0, 7.5, 5.5, 4] : [0, 9.5, 7, 4.8];
    const LABEL_FONT = `400 ${narrow ? 12.5 : 13}px ${SERIF}`;
    const pos = new Map();
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = LABEL_FONT;
    rows.forEach((fams, ri) => {
      // Share the row out by leaf count, but never narrower than a family's own label
      const avail = W - 2 * PAD - (fams.length - 1) * famGap;
      const need = new Map(fams.map((f) => [f, measure.measureText(NODE.get(f).name).width + 8]));
      const width = new Map();
      for (;;) {
        const free = fams.filter((f) => !width.has(f));
        const room = avail - [...width.values()].reduce((a, b) => a + b, 0);
        const slot = room / free.reduce((a, f) => a + leafCount(NODE.get(f)), 0);
        const tight = free.filter((f) => leafCount(NODE.get(f)) * slot < need.get(f));
        if (!tight.length) {
          free.forEach((f) => width.set(f, leafCount(NODE.get(f)) * slot));
          break;
        }
        tight.forEach((f) => width.set(f, need.get(f)));
      }
      let cursor = PAD;
      fams.forEach((f) => {
        const slot = width.get(f) / leafCount(NODE.get(f));
        (function place(nd) {
          if (!nd.children.length) {
            pos.set(nd.id, { x: cursor + slot / 2, y: labelY[ri] + nd.tier * dy - (nd.tier ? 12 : 0) });
            cursor += slot;
            return;
          }
          nd.children.forEach(place);
          const xs = nd.children.map((c) => pos.get(c.id).x);
          pos.set(nd.id, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: labelY[ri] + nd.tier * dy - (nd.tier ? 12 : 0) });
        })(NODE.get(f));
        // Family labels sit centred over the family's span, not over its approaches
        const fam = pos.get(f);
        const first = cursor - width.get(f);
        fam.x = (first + cursor) / 2;
        fam.y = labelY[ri];
        cursor += famGap;
      });
    });
    const lin = narrow ? lineageLayout(28, W - 28, 432, 46) : lineageLayout(44, W - 44, 460, 54);
    // The callout: a hull around the focus approach and everything under it
    const fx = [...FOCUS_SET].map((id) => pos.get(id).x);
    const fy = [...FOCUS_SET].map((id) => pos.get(id).y);
    const hull = { x0: Math.min(...fx) - 16, x1: Math.max(...fx) + 16, y0: Math.min(...fy) - 17, y1: Math.max(...fy) + 13 };
    const noteY = hull.y1 + (narrow ? 19 : 24);

    let clock = 0;
    let hover = null;
    const backdrop = makeBackdrop(W, H, dpr);
    const bg = pageColor();

    function step(dt) {
      clock = (clock + dt) % LOOP;
    }

    function hit(p) {
      if (!p) return null;
      const ph = phase(clock);
      const c = hitLineage(lin, ph, p);
      if (c) return { kind: 'cand', c };
      let best = null;
      let bd = 1e9;
      pos.forEach((q, id) => {
        const nd = NODE.get(id);
        if (!nd.tier) return;
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < bd) {
          bd = d;
          best = id;
        }
      });
      if (best && bd <= R[NODE.get(best).tier] + (narrow ? 9 : 8)) return { kind: 'node', id: best };
      // Family labels
      for (const f of FAMILIES) {
        const q = pos.get(f.id);
        if (Math.abs(p.x - q.x) < 60 && Math.abs(p.y - (q.y - 4)) < 10) return { kind: 'node', id: f.id };
      }
      return null;
    }

    function pointer(p) {
      hover = hit(p);
    }

    function edgePath(ctx, a, b, t = 1) {
      const ym = (a.y + b.y) / 2;
      const steps = 18;
      ctx.beginPath();
      for (let i = 0; i <= steps * t; i++) {
        const u = i / steps;
        const x = (1 - u) ** 3 * a.x + 3 * (1 - u) ** 2 * u * a.x + 3 * (1 - u) * u * u * b.x + u ** 3 * b.x;
        const y = (1 - u) ** 3 * a.y + 3 * (1 - u) ** 2 * u * ym + 3 * (1 - u) * u * u * ym + u ** 3 * b.y;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      const ph = phase(clock);
      const v = viewOf(ph, hover);
      ph.hovered = v.hovered;
      const co = v.hovered ? 0 : ph.co;
      ctx.save();
      ctx.globalAlpha = loopAlpha(clock);
      const appear = (tier) => easeOut(span(clock, 250 + tier * 320, 650 + tier * 320));
      const dimOf = (id) => (FOCUS_SET.has(id) ? 1 : 1 - 0.55 * co);

      // The callout's hull goes under everything
      if (co > 0) {
        ctx.save();
        ctx.globalAlpha *= co;
        rrect(ctx, hull.x0, hull.y0, hull.x1 - hull.x0, hull.y1 - hull.y0, 12);
        ctx.fillStyle = gold(0.07);
        ctx.fill();
        ctx.strokeStyle = gold(0.6);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // Edges: faint for the map, darker where the candidate on show has the child, gold as it builds it
      ORDER.forEach((nd) => {
        const a0 = pos.get(nd.parent);
        const b0 = pos.get(nd.id);
        const a = NODE.get(nd.parent).tier === 0 ? { x: a0.x, y: a0.y + 7 } : { x: a0.x, y: a0.y + R[nd.tier - 1] };
        const b = { x: b0.x, y: b0.y - R[nd.tier] };
        const s = nodeState(nd.id, v.n, v.k, v.rv);
        const ap = appear(nd.tier);
        if (!ap) return;
        ctx.save();
        ctx.globalAlpha *= dimOf(nd.id);
        ctx.lineWidth = 1;
        ctx.strokeStyle = ink((0.13 + 0.3 * s.held) * ap);
        edgePath(ctx, a, b, ap);
        ctx.stroke();
        if (s.builtNow && s.pop > 0) {
          ctx.strokeStyle = gold(0.9);
          ctx.lineWidth = 1.6;
          edgePath(ctx, a, b, easeOut(s.pop));
          ctx.stroke();
        }
        ctx.restore();
      });

      // Family labels
      FAMILIES.forEach((f) => {
        const q = pos.get(f.id);
        text(ctx, f.name, q.x, q.y, { font: LABEL_FONT, color: ink(0.8 * appear(0) * (f.id === 'fs' ? 1 : 1 - 0.5 * co)), align: 'center' });
      });

      // Techniques
      ORDER.forEach((nd) => {
        const q = pos.get(nd.id);
        const ap = appear(nd.tier);
        if (!ap) return;
        const s = nodeState(nd.id, v.n, v.k, v.rv);
        ctx.save();
        ctx.globalAlpha *= ap;
        drawDisc(ctx, q.x, q.y, R[nd.tier] * (0.6 + 0.4 * ap), s, bg, dimOf(nd.id));
        ctx.restore();
      });

      if (co > 0) {
        const nf = `400 ${narrow ? 13 : 14.5}px ${SERIF}`;
        ctx.font = nf;
        const nw = ctx.measureText(FOCUS_NOTE).width;
        const nx = clamp((hull.x0 + hull.x1) / 2 - nw / 2, PAD, W - PAD - nw);
        text(ctx, FOCUS_NOTE, nx, noteY, { font: nf, color: gold(co) });
      }

      drawLineage(ctx, lin, ph, v.n);
      ctx.restore();

      if (hover?.kind === 'node') {
        const q = pos.get(hover.id);
        const nd = NODE.get(hover.id);
        const r = nd.tier ? R[nd.tier] : 8;
        if (nd.tier) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, r + 2.5, 0, TAU);
          ctx.strokeStyle = ink(0.85);
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        drawTip(ctx, W, q.x, q.y - r - (nd.tier ? 0 : 10), 2 * r + 4, nd.name, [nodeLine(hover.id, v.n, v.rv)], bg);
      } else if (hover?.kind === 'cand') {
        const { title, lines } = candLines(hover.c);
        drawTip(ctx, W, lin.x(hover.c), lin.base - 8, 16, title, lines, bg);
      }
    }


    return { step, draw, pointer, loopMs: LOOP, prewarm: 0, still: T_END + 2600 };
  }

  return (W, H, dpr) => {
    const tall = W < 520 || H > W * 0.9;
    const vw = tall ? 360 : 680;
    const s = W / vw;
    const inner = createTree(vw, H / s, dpr * s);
    return {
      ...inner,
      draw(ctx) {
        ctx.save();
        ctx.scale(s, s);
        inner.draw(ctx);
        ctx.restore();
      },
      pointer(p) {
        inner.pointer(p ? { x: p.x / s, y: p.y / s } : null);
      }
    };
  };
})();

const FIGURES = {
  climb: createClimb,
  generation: createGeneration,
  agents: createAgents,
  corpus: createCorpus,
  seeds: EXPLORE.seeds,
  spawn: EXPLORE.spawn,
  novelty: EXPLORE.novelty,
  ioai: createIOAIRace,
  islands: createIslands,
  reading: createReading,
  'circle-packing': createCirclePacking,
  'research-map': createResearchMap
};

/* ───────────── Charts that draw in ───────────── */

// A <figure data-grow> wraps an inline SVG chart: its [data-bar] shapes grow from the left
// and its [data-reveal] marks fade in, once, when the chart first scrolls into view.
class GrowOnView {
  constructor(figure) {
    this.io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      figure.classList.add('is-grown');
      this.io.disconnect();
    }, { threshold: 0.35 });
    this.io.observe(figure);
  }

  destroy() {
    this.io.disconnect();
  }
}

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

    // Figures with hover detail get the pointer; a touch keeps its tooltip until the next tap
    this.onPointer = (e) => {
      if (!this.sketch?.pointer || (e.type === 'pointerleave' && e.pointerType === 'touch')) return;
      const r = canvas.getBoundingClientRect();
      this.sketch.pointer(e.type === 'pointerleave' ? null : { x: e.clientX - r.left, y: e.clientY - r.top });
      if (this.rafId === null) this.draw();
    };
    ['pointermove', 'pointerdown', 'pointerleave'].forEach((t) => canvas.addEventListener(t, this.onPointer));

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
    this.sketch = this.create(this.w, this.h, this.dpr, this.canvas);
    // A sketch can set its own head start (`prewarm`) and the moment it freezes on under reduced motion (`still`)
    const warm = this.reduceMotion ? (this.sketch.still ?? 9000) : (this.sketch.prewarm ?? PREWARM_MS);
    for (let t = 0; t < warm; t += 16) this.sketch.step(16);
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
    ['pointermove', 'pointerdown', 'pointerleave'].forEach((t) => this.canvas.removeEventListener(t, this.onPointer));
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
  container.querySelectorAll('[data-grow]').forEach((figure) => mounted.push(new GrowOnView(figure)));
}
