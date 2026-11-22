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
 * methods — three methods (jamming, DC programming, Arrow–Hurwicz) reaching the same 26-circle packing
 * ioai — the IOAI² results as a race, task by task, ending on the trophy tiers
 * agents — the deep-research pass: planner, parallel explorers, verifiers, critic,
 *           synthesizer, ending in a brief of what is known, contested and open
 * islands — four island populations evolving in parallel; the best migrate
 *           between islands and a stalled island gets reseeded
 * reading — papers feeding a cited landscape of ideas across nine facets
 * research-map — an invented map of techniques in four families, filling in as a
 *           made-up run of candidates builds them; hover or tap a mark for its name
 * ds-architecture — DeepSeek-V3's whole model, zooming into MLA and DeepSeekMoE in turn
 * ds-rmsnorm, ds-swiglu — RMSNorm and SwiGLU worked on one vector, inside a DeepSeek block
 * ds-mla-squares, ds-cache-memory — MLA's compression counted to scale, and how many tokens
 *           the same memory holds with every head's keys and values versus the latent
 * ds-moe-route, ds-moe-balance — a DeepSeekMoE layer routing tokens to the shared expert and
 *           its top 8 of 256, and load balancing by nudging each expert's bias
 * ds-rope-dials — RoPE's rotating pairs as dials, with a position track and the score against
 *           the offset: both tokens slide, every hand turns, and the score stays put
 * ds-mtp-towers — DeepSeek-V3's MTP module beside the main model: the shared embedding and
 *           output head, the combine step, its one block, and the module dropped at inference
 * ds-train-loss — the mini model's measured loss over its 10 billion training tokens, with the
 *           learning-rate schedule under it
 * ds-sft-loss — its loss over fine-tuning, two passes over smol-smoltalk, drawn the same way
 * ds-mini-stack — the mini model drawn to scale, one square per routed expert: it stacks up to
 *           212.6M parameters, then a token goes up and lights the 108.2M it uses
 * ds-fact-dots — twelve easy questions, twenty replies each, before and after fine-tuning
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

/* ───────────── Three roads to one packing ───────────── */

// The three ways the engine matched the circle-packing record, side by side, all ending on the
// same packing: Lubachevsky–Stillinger jamming (a real simulation, then an eased polish), a damped
// Arrow–Hurwicz iteration (real primal-dual steps, started near the record and eased in at the end)
// and DC programming (illustrative iterates). Drawn at 680 px (360 on phones), then scaled.
const createPackingMethods = (() => {
  const { PACKING_SUM, N, FRAME_MS, PAIRS, AH_RHO, sumOf, buildJam, buildAH, buildDCIterates } = (() => {
    /**
     * The three methods, as trajectories in the unit square. Each build*() returns a list of
     * frames (Float64Array of [x, y, r] per circle, 26 circles, sampled every FRAME_MS of
     * figure time) that ends exactly on PACKING_26, circle k on target k. Pure and seeded:
     * no DOM, no Math.random, so every loop and every recording is the same.
     *
     * - Jamming is a real time-stepped Lubachevsky–Stillinger run: equal disks with random
     *   positions and velocities, elastic collisions with each other and the walls, radii
     *   growing at a common rate until the disks jam. The polish that follows (jammed disks
     *   matched to the targets, then eased onto them) is illustrative.
     * - Arrow–Hurwicz is a real damped primal-dual iteration on the actual augmented
     *   Lagrangian (one multiplier per pair and per wall, radii on a larger step than
     *   centres), from small scattered circles near the record. A weak pull toward the record
     *   keeps it in that basin, so the motion is the method's but the landing spot is chosen,
     *   and its last 1.5 s are eased onto the record (it creeps along a soft direction for a
     *   long while otherwise). Its iterates overlap, so `valid` holds each frame's sum with
     *   the overlaps trimmed off.
     * - DC programming is illustrative: iterates are constructed (geometric steps toward the
     *   record with a decaying zigzag, radii trimmed until no two circles overlap), not
     *   solved as linear programs.
     */

    // The best-known packing of 26 circles in the unit square, as [x, y, r] (copied from
    // src/js/article-figures.js: DeepMind's later strict construction, Georgiev et al. 2025)
    const PACKING_26 = [[0.70261, 0.381666, 0.115149], [0.313116, 0.907608, 0.092392], [0.726906, 0.596043, 0.1006], [0.894817, 0.273953, 0.105183], [0.903849, 0.68208, 0.096151], [0.103061, 0.484601, 0.103061], [0.27163, 0.597635, 0.099898], [0.239711, 0.763674, 0.069181], [0.759352, 0.762959, 0.06944], [0.915074, 0.084926, 0.084926], [0.495532, 0.275343, 0.11763], [0.896533, 0.482596, 0.103467], [0.497284, 0.07886, 0.07886], [0.110779, 0.889221, 0.110779], [0.888844, 0.888844, 0.111156], [0.499428, 0.906073, 0.093927], [0.498668, 0.529963, 0.13701], [0.08464, 0.08464, 0.08464], [0.294609, 0.130221, 0.130221], [0.403359, 0.742417, 0.095842], [0.685943, 0.907408, 0.092592], [0.70231, 0.133259, 0.133259], [0.59522, 0.742049, 0.096019], [0.095732, 0.683259, 0.095732], [0.294746, 0.386924, 0.112077], [0.10679, 0.274783, 0.10679]];
    const PACKING_SUM = 2.6359830849;
    const N = PACKING_26.length;
    const FRAME_MS = 1000 / 60;
    const RSUM = PACKING_26.reduce((a, c) => a + c[2], 0);

    /** Sum of radii of a frame, scaled so the record's own coordinates read PACKING_SUM */
    const sumOf = (f) => {
      let s = 0;
      for (let i = 0; i < N; i++) s += f[3 * i + 2];
      return (s / RSUM) * PACKING_SUM;
    };

    function mulberry32(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const smooth = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /** A frame holding the record itself */
    function targetFrame() {
      const f = new Float64Array(3 * N);
      PACKING_26.forEach(([x, y, r], i) => f.set([x, y, r], 3 * i));
      return f;
    }

    /**
     * Match points to the record's circles: globally greedy on squared distance (closest
     * pair first), then pairwise swaps while they shorten the total. Returns target index
     * per point.
     */
    function assign(pts, w = 0) {
      const cost = (i, j) => {
        const [x, y, r] = PACKING_26[j];
        return (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2 + w * ((pts[i][2] || 0) - r) ** 2;
      };
      const pairs = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) pairs.push([cost(i, j), i, j]);
      pairs.sort((a, b) => a[0] - b[0]);
      const to = new Array(N).fill(-1);
      const taken = new Array(N).fill(false);
      for (const [, i, j] of pairs) {
        if (to[i] < 0 && !taken[j]) {
          to[i] = j;
          taken[j] = true;
        }
      }
      for (let pass = 0, better = true; better && pass < 50; pass++) {
        better = false;
        for (let a = 0; a < N; a++) {
          for (let b = a + 1; b < N; b++) {
            if (cost(a, to[b]) + cost(b, to[a]) < cost(a, to[a]) + cost(b, to[b]) - 1e-12) {
              [to[a], to[b]] = [to[b], to[a]];
              better = true;
            }
          }
        }
      }
      return to;
    }

    /** Reorder a frame's circles so circle k sits at index to[k] */
    function permute(f, to) {
      const g = new Float64Array(3 * N);
      for (let i = 0; i < N; i++) g.set(f.subarray(3 * i, 3 * i + 3), 3 * to[i]);
      return g;
    }

    /* ───────────── Lubachevsky–Stillinger jamming (a real simulation) ───────────── */

    /**
     * Equal disks, random positions and velocities, radius r = lambda growing at a common
     * rate. Time-stepped: move, grow, exchange normal velocity on contact (equal masses,
     * elastic, plus the surfaces' growth speed so touching disks part), reflect off the
     * walls, then project out any overlap. Kinetic energy is held fixed (growth pumps it in).
     * When the projection can no longer clear the overlaps the growth rate is cut, and once
     * it has fallen to a hundredth the disks are jammed: growth stops and they rattle down
     * (damped) to rest.
     */
    function simulateJam(seed, { seconds = 6, speed = 0.32, grow = 0.02, sub = 12, damp = 2.5 } = {}) {
      const rnd = mulberry32(seed);
      const x = new Float64Array(N);
      const y = new Float64Array(N);
      const vx = new Float64Array(N);
      const vy = new Float64Array(N);
      for (let n = 0, tries = 0; n < N && tries < 100000; tries++) {
        const px = 0.04 + 0.92 * rnd();
        const py = 0.04 + 0.92 * rnd();
        let ok = true;
        for (let m = 0; m < n; m++) if ((x[m] - px) ** 2 + (y[m] - py) ** 2 < 0.11 ** 2) ok = false;
        if (!ok) continue;
        x[n] = px;
        y[n] = py;
        const a = rnd() * Math.PI * 2;
        const s = speed * (0.6 + 0.8 * rnd());
        vx[n] = Math.cos(a) * s;
        vy[n] = Math.sin(a) * s;
        n++;
      }
      let KE0 = 0;
      for (let i = 0; i < N; i++) KE0 += vx[i] ** 2 + vy[i] ** 2;
      let lam = 0;
      let g = grow;
      let jammedAt = -1;
      let KE = KE0;
      const dt = FRAME_MS / 1000 / sub;
      const frames = [];
      const total = Math.round((seconds * 1000) / FRAME_MS);
      for (let fr = 0; fr <= total; fr++) {
        const f = new Float64Array(3 * N);
        for (let i = 0; i < N; i++) f.set([x[i], y[i], lam], 3 * i);
        frames.push(f);
        for (let s = 0; s < sub; s++) {
          for (let i = 0; i < N; i++) {
            x[i] += vx[i] * dt;
            y[i] += vy[i] * dt;
          }
          const grew = jammedAt < 0 ? g * dt : 0;
          lam += grew;
          const r = lam;
          const sep = jammedAt < 0 ? 2 * g : 0; // surfaces approach at 2g
          // Collisions: elastic exchange of the normal components
          for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
              const dx = x[j] - x[i];
              const dy = y[j] - y[i];
              const d2 = dx * dx + dy * dy;
              if (d2 >= (2 * r) ** 2 || d2 === 0) continue;
              const d = Math.sqrt(d2);
              const nx = dx / d;
              const ny = dy / d;
              const vn = (vx[j] - vx[i]) * nx + (vy[j] - vy[i]) * ny;
              if (vn < sep) {
                const extra = Math.max(0, sep - (vn < 0 ? -vn : vn)) / 2;
                const kick = (vn < 0 ? -vn : 0) + extra;
                vx[i] -= kick * nx;
                vy[i] -= kick * ny;
                vx[j] += kick * nx;
                vy[j] += kick * ny;
              }
            }
          }
          for (let i = 0; i < N; i++) {
            const w = jammedAt < 0 ? g : 0;
            if (x[i] - r < 0 && vx[i] < w) vx[i] = Math.max(-vx[i], w);
            if (x[i] + r > 1 && vx[i] > -w) vx[i] = Math.min(-vx[i], -w);
            if (y[i] - r < 0 && vy[i] < w) vy[i] = Math.max(-vy[i], w);
            if (y[i] + r > 1 && vy[i] > -w) vy[i] = Math.min(-vy[i], -w);
          }
          // Project out overlaps
          let worst = 0;
          for (let it = 0; it < 6; it++) {
            worst = 0;
            for (let i = 0; i < N; i++) {
              for (let j = i + 1; j < N; j++) {
                const dx = x[j] - x[i];
                const dy = y[j] - y[i];
                const d2 = dx * dx + dy * dy;
                if (d2 >= (2 * r) ** 2 || d2 === 0) continue;
                const d = Math.sqrt(d2);
                const o = 2 * r - d;
                worst = Math.max(worst, o);
                const m = o / 2 / d;
                x[i] -= dx * m;
                y[i] -= dy * m;
                x[j] += dx * m;
                y[j] += dy * m;
              }
            }
            for (let i = 0; i < N; i++) {
              x[i] = clamp(x[i], r, 1 - r);
              y[i] = clamp(y[i], r, 1 - r);
            }
          }
          // Growth control: back off when the overlaps stop clearing
          if (jammedAt < 0) {
            if (worst > 2e-4) {
              lam -= grew;
              g *= 0.93;
            } else g = Math.min(grow, g * 1.004);
            if (g < grow * 0.01) jammedAt = fr;
          }
          // Hold the kinetic energy fixed while compressing; after the jam let it die away
          let ke = 0;
          for (let i = 0; i < N; i++) ke += vx[i] ** 2 + vy[i] ** 2;
          if (jammedAt < 0) KE = KE0;
          else KE *= Math.exp(-damp * dt);
          const sc = ke > 0 ? Math.sqrt(KE / ke) : 0;
          for (let i = 0; i < N; i++) {
            vx[i] *= sc;
            vy[i] *= sc;
          }
        }
      }
      return { frames, jammedAt, radius: lam };
    }

    /**
     * The jamming panel: the simulation, then the polish. Jammed disks are matched to the
     * record's circles and eased onto them over polishMs.
     */
    function buildJam({ seed = 7, simMs = 8000, restMs = 600, polishMs = 1500, ...opts } = {}) {
      const sim = simulateJam(seed, { seconds: simMs / 1000, ...opts });
      // Stop a moment after the jam, once the rattling has died down
      if (sim.jammedAt >= 0) sim.frames.length = Math.min(sim.frames.length, sim.jammedAt + Math.round(restMs / FRAME_MS) + 1);
      const last = sim.frames[sim.frames.length - 1];
      const pts = [];
      for (let i = 0; i < N; i++) pts.push([last[3 * i], last[3 * i + 1], last[3 * i + 2]]);
      const to = assign(pts);
      const frames = sim.frames.map((f) => permute(f, to));
      const end = targetFrame();
      const from = frames[frames.length - 1];
      const steps = Math.round(polishMs / FRAME_MS);
      for (let s = 1; s <= steps; s++) {
        const k = smooth(s / steps);
        const f = new Float64Array(3 * N);
        for (let q = 0; q < 3 * N; q++) f[q] = from[q] + (end[q] - from[q]) * k;
        frames.push(f);
      }
      return { frames, jamFrame: sim.jammedAt, polishFrom: sim.frames.length - 1, radius: sim.radius };
    }

    /* ───────────── Damped Arrow–Hurwicz (a real primal-dual iteration) ───────────── */

    const PAIRS = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) PAIRS.push([i, j]);

    /**
     * maximize sum r  s.t.  g_ij = r_i + r_j - |c_i - c_j| <= 0, and r_i <= x_i <= 1 - r_i,
     * same for y. Primal: gradient steps on the augmented Lagrangian; dual: one multiplier
     * per pair and per wall, rising with the overlap and falling (to zero, never below) with
     * the gap. A weak pull toward the record (`anchor`, a rate per second) keeps it in the
     * record's basin; the record is a fixed point with or without it.
     * Returns frames plus each frame's pair and wall multipliers.
     */
    const AH_RHO = 2;

    function simulateAH(seed, { seconds = 6, steps = 8, lr = 0.07, rScale = 3, dual = 15, rho = AH_RHO, anchor = 0.5, spread = 0.12, swell = 0.6 } = {}) {
      const dt = FRAME_MS / 1000 / steps;
      const tau = dt * lr;
      const sigma = dual / lr;
      const rnd = mulberry32(seed);
      const z = new Float64Array(3 * N);
      PACKING_26.forEach(([x, y, r], i) => {
        const a = rnd() * Math.PI * 2;
        const d = spread * (0.4 + 0.6 * rnd());
        z[3 * i] = clamp(x + Math.cos(a) * d, 0.08, 0.92);
        z[3 * i + 1] = clamp(y + Math.sin(a) * d, 0.08, 0.92);
        z[3 * i + 2] = r * swell * (0.8 + 0.4 * rnd());
      });
      const target = targetFrame();
      const mu = new Float64Array(PAIRS.length);
      const wall = new Float64Array(4 * N);
      const grad = new Float64Array(3 * N);
      const frames = [];
      const duals = [];
      const walls = [];
      const total = Math.round((seconds * 1000) / FRAME_MS);
      for (let fr = 0; fr <= total; fr++) {
        frames.push(Float64Array.from(z));
        duals.push(Float32Array.from(mu));
        walls.push(Float32Array.from(wall));
        const pull = anchor * dt / tau; // a rate per second, like lr
        for (let s = 0; s < steps; s++) {
          grad.fill(0);
          for (let i = 0; i < N; i++) grad[3 * i + 2] = -1; // d(-sum r)/dr
          for (let p = 0; p < PAIRS.length; p++) {
            const [i, j] = PAIRS[p];
            const dx = z[3 * j] - z[3 * i];
            const dy = z[3 * j + 1] - z[3 * i + 1];
            const d = Math.hypot(dx, dy) || 1e-9;
            const gij = z[3 * i + 2] + z[3 * j + 2] - d;
            mu[p] = Math.max(0, mu[p] + tau * sigma * gij);
            const w = mu[p] + rho * Math.max(0, gij);
            if (w === 0) continue;
            const ux = dx / d;
            const uy = dy / d;
            grad[3 * i] += w * ux;
            grad[3 * i + 1] += w * uy;
            grad[3 * j] -= w * ux;
            grad[3 * j + 1] -= w * uy;
            grad[3 * i + 2] += w;
            grad[3 * j + 2] += w;
          }
          for (let i = 0; i < N; i++) {
            const x = z[3 * i];
            const y = z[3 * i + 1];
            const r = z[3 * i + 2];
            const gs = [r - x, r + x - 1, r - y, r + y - 1];
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let k = 0; k < 4; k++) {
              const q = 4 * i + k;
              wall[q] = Math.max(0, wall[q] + tau * sigma * gs[k]);
              const w = wall[q] + rho * Math.max(0, gs[k]);
              if (w === 0) continue;
              grad[3 * i] += w * dirs[k][0];
              grad[3 * i + 1] += w * dirs[k][1];
              grad[3 * i + 2] += w;
            }
          }
          for (let q = 0; q < 3 * N; q++) {
            const step = q % 3 === 2 ? tau * rScale : tau; // radii can take their own step
            z[q] -= step * (grad[q] + pull * (z[q] - target[q]));
          }
          for (let i = 0; i < N; i++) z[3 * i + 2] = Math.max(0.005, z[3 * i + 2]);
        }
      }
      return { frames, duals, walls };
    }

    /** The Arrow–Hurwicz panel: the iteration, with its last stretch blended exactly onto the record */
    function buildAH({ seed = 3, blendMs = 1500, ...opts } = {}) {
      const sim = simulateAH(seed, opts);
      const end = targetFrame();
      const n = sim.frames.length;
      const steps = Math.round(blendMs / FRAME_MS);
      let err = 0;
      for (let q = 0; q < 3 * N; q++) err = Math.max(err, Math.abs(sim.frames[n - 1][q] - end[q]));
      for (let s = 0; s < steps; s++) {
        const fr = n - steps + s;
        const k = smooth((s + 1) / steps);
        const f = sim.frames[fr];
        for (let q = 0; q < 3 * N; q++) f[q] += (end[q] - f[q]) * k;
      }
      // What a strict checker would accept: the same circles with any overlap trimmed off
      const valid = sim.frames.map((f) => sumOf(trim(Float64Array.from(f))));
      valid[n - 1] = PACKING_SUM;
      return { ...sim, err, valid };
    }

    /* ───────────── DC programming (illustrative iterates) ───────────── */

    /**
     * Shrink radii, pair by pair, until no two circles overlap and none crosses a wall (past
     * the record's own rounding, 1e-6)
     */
    function trim(f) {
      for (let it = 0; it < 200; it++) {
        let bad = false;
        for (let i = 0; i < N; i++) {
          const x = f[3 * i];
          const y = f[3 * i + 1];
          const lim = Math.min(x, 1 - x, y, 1 - y);
          if (f[3 * i + 2] > lim + 1e-6) {
            f[3 * i + 2] = Math.max(0.004, lim);
            bad = true;
          }
        }
        for (const [i, j] of PAIRS) {
          const d = Math.hypot(f[3 * j] - f[3 * i], f[3 * j + 1] - f[3 * i + 1]);
          const s = f[3 * i + 2] + f[3 * j + 2];
          if (s > d + 1e-6) {
            const k = d / s;
            f[3 * i + 2] *= k;
            f[3 * j + 2] *= k;
            bad = true;
          }
        }
        if (!bad) break;
      }
      return f;
    }

    /**
     * Iterates of a sequential-LP scheme, constructed: each one a fixed fraction closer to the
     * record (per-circle rates differ a little) plus a sideways zigzag that shrinks as it
     * goes, with the radii trimmed to a valid packing. The last iterate is the record.
     */
    function buildDCIterates(seed, { iters = 13, rate = 0.58, zig = 0.05, r0 = 0.03 } = {}) {
      const rnd = mulberry32(seed);
      const start = [];
      for (let n = 0, tries = 0; n < N && tries < 100000; tries++) {
        const px = 0.08 + 0.84 * rnd();
        const py = 0.08 + 0.84 * rnd();
        if (start.some(([x, y]) => (x - px) ** 2 + (y - py) ** 2 < 0.1 ** 2)) continue;
        start.push([px, py, r0 * (0.6 + 0.8 * rnd())]);
      }
      const to = assign(start);
      const s0 = new Float64Array(3 * N);
      start.forEach((c, i) => s0.set(c, 3 * to[i]));
      const end = targetFrame();
      const rates = Array.from({ length: N }, () => rate * (0.85 + 0.3 * rnd()));
      const phase = Array.from({ length: N }, () => (rnd() < 0.5 ? -1 : 1));
      const zigs = Array.from({ length: N }, () => zig * (0.4 + 0.6 * rnd()));
      const its = [trim(Float64Array.from(s0))];
      for (let k = 1; k <= iters; k++) {
        const f = new Float64Array(3 * N);
        for (let i = 0; i < N; i++) {
          const left = rates[i] ** k; // how much of the way is still to go
          const x0 = s0[3 * i];
          const y0 = s0[3 * i + 1];
          const dx = end[3 * i] - x0;
          const dy = end[3 * i + 1] - y0;
          const len = Math.hypot(dx, dy) || 1;
          const side = phase[i] * (k % 2 ? 1 : -1) * zigs[i] * left * Math.min(1, len / 0.1);
          f[3 * i] = end[3 * i] - dx * left + (-dy / len) * side;
          f[3 * i + 1] = end[3 * i + 1] - dy * left + (dx / len) * side;
          f[3 * i + 2] = end[3 * i + 2] - (end[3 * i + 2] - s0[3 * i + 2]) * left ** 0.8;
        }
        its.push(k === iters ? end : trim(f));
      }
      return its;
    }

    return { PACKING_SUM, N, FRAME_MS, PAIRS, AH_RHO, sumOf, buildJam, buildAH, buildDCIterates };
  })();

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
  const INK_RGB = INK.split(',').map(Number);
  const GOLD_RGB = GOLD.split(',').map(Number);
  /** Ink turning gold as k goes 0 → 1 */
  const inkToGold = (k, a) => {
    const c = INK_RGB.map((v, i) => Math.round(lerp(v, GOLD_RGB[i], k)));
    return `rgba(${c.join(', ')}, ${a})`;
  };
  /** The alpha each of n stacked copies needs so together they read as one at alpha a */
  const share = (a, n) => 1 - (1 - a) ** (1 / n);

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

  function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left' } = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.textAlign = 'left';
  }

  /**
   * The sum of radii, to seven places, with every digit in a cell of the same width so the
   * number doesn't shimmy as it counts.
   */
  function counter(ctx, value, x, y, { size = 12, color = ink(0.6), align = 'left', weight = 500 } = {}) {
    const str = value.toFixed(7);
    ctx.font = `${weight} ${size}px ${SANS}`;
    let cell = 0;
    for (const d of '0123456789') cell = Math.max(cell, ctx.measureText(d).width);
    const dot = ctx.measureText('.').width;
    const width = cell * (str.length - 1) + dot;
    let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    for (const ch of str) {
      const w = ch === '.' ? dot : cell;
      ctx.fillText(ch, cx + w / 2, y);
      cx += w;
    }
    ctx.textAlign = 'left';
    return width;
  }

  /* ───────────── The three methods, as players ───────────── */

  // Built once, on first use, and shared by every canvas
  let DATA = null;
  function data() {
    if (!DATA) {
      DATA = {
        jam: buildJam({ seed: 35 }),
        dc: buildDCIterates(2),
        ah: buildAH({ seed: 3 })
      };
    }
    return DATA;
  }

  /** A frame between the sampled ones */
  function sample(frames, ms) {
    const u = clamp(ms / FRAME_MS, 0, frames.length - 1);
    const i = Math.floor(u);
    const k = u - i;
    if (k === 0 || i >= frames.length - 1) return frames[Math.min(i, frames.length - 1)];
    const a = frames[i];
    const b = frames[i + 1];
    const f = new Float64Array(a.length);
    for (let q = 0; q < a.length; q++) f[q] = a[q] + (b[q] - a[q]) * k;
    return f;
  }

  const lerpFrame = (a, b, k) => {
    const f = new Float64Array(a.length);
    for (let q = 0; q < a.length; q++) f[q] = a[q] + (b[q] - a[q]) * k;
    return f;
  };

  /** Where circle i of frame f lands in the square R = { x, y, s } (y up, as in the unit square) */
  const cx = (f, i, R) => R.x + f[3 * i] * R.s;
  const cy = (f, i, R) => R.y + (1 - f[3 * i + 1]) * R.s;

  function jamming() {
    const { jam } = data();
    return {
      name: 'Lubachevsky–Stillinger',
      runMs: (jam.frames.length - 1) * FRAME_MS,
      at: (t) => ({ f: sample(jam.frames, t) }),
      value: (t, s) => sumOf(s.f)
    };
  }

  // DC: a jump every EVERY ms, each taking JUMP ms, then a hold at the new iterate
  function dcProgramming() {
    const its = data().dc;
    const START = 300;
    const EVERY = 430;
    const JUMP = 150;
    // The contact whose linearization is drawn: the big middle circle and the one below it
    const A = 10;
    const B = 16;
    return {
      name: 'DC programming',
      runMs: START + (its.length - 2) * EVERY + JUMP,
      value: (t, s) => sumOf(s.f),
      at(t) {
        if (t < START) return { f: its[0], line: its[0], lineK: span(t, 0, START), from: null };
        const j = Math.min(its.length - 2, Math.floor((t - START) / EVERY));
        const local = t - START - j * EVERY;
        const p = ease(clamp(local / JUMP, 0, 1));
        const f = p >= 1 ? its[j + 1] : lerpFrame(its[j], its[j + 1], p);
        const landed = local >= JUMP;
        return {
          f,
          // the previous iterate, fading after the landing
          from: its[j],
          fromK: landed ? 1 - span(local, JUMP, JUMP + 260) : 1,
          // the linearization: at the old iterate during the jump, re-drawn at the new one after
          line: landed ? its[j + 1] : its[j],
          lineK: landed ? span(local, JUMP, JUMP + 110) : 1
        };
      },
      extras(ctx, s, R, a, lw, fadeK = 1) {
        if (fadeK <= 0) return;
        if (s.from && s.fromK > 0) {
          ctx.lineWidth = lw * 0.8;
          ctx.strokeStyle = ink(0.24 * s.fromK * a);
          for (let i = 0; i < N; i++) {
            ctx.beginPath();
            ctx.arc(cx(s.from, i, R), cy(s.from, i, R), Math.max(1, s.from[3 * i + 2] * R.s), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        if (s.line && s.lineK > 0) {
          const f = s.line;
          const ax = f[3 * A];
          const ay = f[3 * A + 1];
          const bx = f[3 * B];
          const by = f[3 * B + 1];
          const d = Math.hypot(bx - ax, by - ay) || 1;
          const ux = (bx - ax) / d;
          const uy = (by - ay) / d;
          const gap = d - f[3 * A + 2] - f[3 * B + 2];
          const m = f[3 * A + 2] + gap / 2;
          const px = ax + ux * m;
          const py = ay + uy * m;
          const L = 0.2;
          ctx.save();
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = lw * 1.2;
          ctx.strokeStyle = ink(0.78 * s.lineK * a * fadeK);
          ctx.beginPath();
          ctx.moveTo(R.x + (px - uy * L) * R.s, R.y + (1 - (py + ux * L)) * R.s);
          ctx.lineTo(R.x + (px + uy * L) * R.s, R.y + (1 - (py - ux * L)) * R.s);
          ctx.stroke();
          ctx.restore();
        }
      }
    };
  }

  function arrowHurwicz() {
    const { ah } = data();
    const W_REF = 0.9; // about the peak; a contact at rest carries a fifth of this
    const valid = Array.from(ah.valid, (v) => Float64Array.of(v));
    return {
      name: 'Arrow–Hurwicz',
      runMs: (ah.frames.length - 1) * FRAME_MS,
      // Its circles overlap on the way, so it counts what a strict checker would accept
      value: (t) => sample(valid, t)[0],
      at(t) {
        const u = clamp(t / FRAME_MS, 0, ah.frames.length - 1);
        const i = Math.min(ah.frames.length - 2, Math.floor(u));
        const k = u - i;
        return { f: sample(ah.frames, t), mu: [ah.duals[i], ah.duals[i + 1], k], wall: [ah.walls[i], ah.walls[i + 1], k] };
      },
      // Contact pressure: a line between the centres (or to the wall), heavier as it rises
      extras(ctx, s, R, a, lw, fadeK = 1) {
        if (fadeK <= 0) return;
        const f = s.f;
        const [m0, m1, km] = s.mu;
        const [w0, w1, kw] = s.wall;
        ctx.lineCap = 'round';
        const line = (x0, y0, x1, y1, w) => {
          const k = Math.min(1, w / W_REF);
          if (k < 0.05) return;
          ctx.lineWidth = lw * (0.4 + 2 * k);
          ctx.strokeStyle = ink((0.05 + 0.5 * k ** 1.2) * a * fadeK);
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        };
        for (let p = 0; p < PAIRS.length; p++) {
          const [i, j] = PAIRS[p];
          const d = Math.hypot(f[3 * j] - f[3 * i], f[3 * j + 1] - f[3 * i + 1]);
          const g = f[3 * i + 2] + f[3 * j + 2] - d;
          const w = lerp(m0[p], m1[p], km) + AH_RHO * Math.max(0, g);
          line(cx(f, i, R), cy(f, i, R), cx(f, j, R), cy(f, j, R), w);
        }
        for (let i = 0; i < N; i++) {
          const x = f[3 * i];
          const y = f[3 * i + 1];
          const r = f[3 * i + 2];
          const gs = [r - x, r + x - 1, r - y, r + y - 1];
          const ends = [[0, y], [1, y], [x, 0], [x, 1]];
          for (let q = 0; q < 4; q++) {
            const w = lerp(w0[4 * i + q], w1[4 * i + q], kw) + AH_RHO * Math.max(0, gs[q]);
            line(cx(f, i, R), cy(f, i, R), R.x + ends[q][0] * R.s, R.y + (1 - ends[q][1]) * R.s, w);
          }
        }
        ctx.lineCap = 'butt';
      }
    };
  }

  /**
   * One method's square at time t (ms since it started; negative is before it starts).
   * goldK turns it gold as it settles; `alpha` is the whole panel's opacity and `copies` how
   * many identical panels will be stacked on this one (so a stack reads as a single one).
   */
  function drawSquare(ctx, R, m, t, { alpha = 1, lw = 1, copies = 1, extrasK = 1 } = {}) {
    const s = m.at(Math.max(0, t));
    const f = s.f;
    const goldK = span(t, m.runMs - 60, m.runMs + 340);
    const value = t >= m.runMs ? PACKING_SUM : m.value(Math.max(0, t), s);
    if (alpha <= 0) return { value, goldK };
    ctx.strokeStyle = ink(share(0.4, copies) * alpha);
    ctx.lineWidth = lw * 1.15;
    ctx.strokeRect(R.x + 0.5, R.y + 0.5, R.s - 1, R.s - 1);
    // Arrow–Hurwicz's circles push past the walls on the way; the square holds them
    ctx.save();
    ctx.beginPath();
    ctx.rect(R.x - lw, R.y - lw, R.s + 2 * lw, R.s + 2 * lw);
    ctx.clip();
    ctx.fillStyle = ink(share(0.06 + 0.03 * goldK, copies) * alpha);
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.arc(cx(f, i, R), cy(f, i, R), Math.max(1.1 * lw, f[3 * i + 2] * R.s), 0, Math.PI * 2);
      ctx.fill();
    }
    if (m.extras && extrasK > 0) m.extras(ctx, s, R, alpha * extrasK, lw, 1 - goldK);
    ctx.lineWidth = lw;
    ctx.strokeStyle = inkToGold(goldK, share(lerp(0.62, 0.9, goldK), copies) * alpha);
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.arc(cx(f, i, R), cy(f, i, R), Math.max(1.1 * lw, f[3 * i + 2] * R.s), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return { value, goldK };
  }

  const lerpRect = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), s: lerp(a.s, b.s, k) });

  /* ───────────── A · Side by side ───────────── */

  // The three methods at once, each in its own square under its name, with its sum of radii
  // counting underneath. Each turns gold as it lands; then the three squares slide together
  // and coincide, outline for outline.
  function createSideBySide(W, H, dpr) {
    const narrow = W < 520;
    const methods = [jamming(), dcProgramming(), arrowHurwicz()];
    const T0 = 450;
    const done = T0 + Math.max(...methods.map((m) => m.runMs)) + 400;
    const MERGE = done + 1500;
    const MERGE_MS = 1400;
    const LOOP = MERGE + MERGE_MS + 2600;
    let L;
    if (!narrow) {
      const s = 188;
      const gap = (W - 2 * 34 - 3 * s) / 2;
      const top = Math.round((H - (s + 62)) / 2) + 44;
      const S = 268;
      L = {
        panels: [0, 1, 2].map((k) => ({ x: 34 + k * (s + gap), y: top, s })),
        name: (R) => [R.x, R.y - 12, 'left'],
        count: (R) => [R.x, R.y + R.s + 22, 'left'],
        merged: { x: (W - S) / 2, y: (H - S) / 2 - 12, s: S },
        nameFont: `500 15px ${SERIF}`,
        countSize: 12
      };
      L.mergedCount = [L.merged.x, L.merged.y + S + 24, 'left'];
    } else {
      const s = 124;
      const rowH = 146;
      const top = Math.round((H - 3 * rowH) / 2) + 11;
      const S = 250;
      L = {
        panels: [0, 1, 2].map((k) => ({ x: 26, y: top + k * rowH, s })),
        name: (R) => [R.x + R.s + 18, R.y + R.s / 2 - 4, 'left'],
        count: (R) => [R.x + R.s + 18, R.y + R.s / 2 + 18, 'left'],
        merged: { x: (W - S) / 2, y: (H - S) / 2 - 16, s: S },
        nameFont: `500 15px ${SERIF}`,
        countSize: 12
      };
      L.mergedCount = [L.merged.x, L.merged.y + S + 26, 'left'];
    }
    const backdrop = makeBackdrop(W, H, dpr);
    return looping(LOOP, (ctx, t) => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(backdrop, 0, 0, W, H);
      const a = loopAlpha(t, LOOP, 400, 700);
      const mk = ease(span(t, MERGE, MERGE + MERGE_MS));
      const labels = 1 - span(t, MERGE, MERGE + 450);
      methods.forEach((m, k) => {
        const R = lerpRect(L.panels[k], L.merged, mk);
        const lw = R.s / L.panels[k].s > 1.6 ? 1.15 : 1;
        const out = drawSquare(ctx, R, m, t - T0, { alpha: a, copies: lerp(1, 3, mk), lw });
        if (labels > 0) {
          const [nx, ny, na] = L.name(L.panels[k]);
          text(ctx, m.name, nx, ny, { font: L.nameFont, color: ink(0.82 * a * labels), align: na });
        }
        // Each counter fades as the squares start to move; one comes back under the merged square
        const [px, py, pa] = L.count(L.panels[k]);
        const ca = labels;
        if (ca > 0) {
          const color = out.goldK > 0 ? inkToGold(out.goldK, lerp(0.55, 1, out.goldK) * a * ca) : ink(0.55 * a * ca);
          counter(ctx, out.value, px, py, { size: L.countSize, color, align: pa });
        }
      });
      const one = span(t, MERGE + MERGE_MS * 0.7, MERGE + MERGE_MS + 200);
      if (one > 0) counter(ctx, PACKING_SUM, L.mergedCount[0], L.mergedCount[1], { size: L.countSize, color: gold(a * one), align: L.mergedCount[2] });
    }, { still: done + 600 });
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

  return fitted(createSideBySide);
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

/* ───────────── DeepSeek-V3's architecture, zooming into MLA and DeepSeekMoE ───────────── */

// Figure 2 of the DeepSeek-V3 report in motion, extended to the whole model. A token goes up
// through the embedding and the transformer block (drawn once, with ghosts for the other 60);
// at Attention the camera dives in and the Multi-Head Latent Attention panel plays, then back
// out and into the Feed-Forward box for DeepSeekMoE; back out again, and the token climbs to
// the final RMSNorm, the output head and the next-token probabilities. Only c^KV and k^R are
// marked as cached. Its own helpers and its own fitted(), which draws a 680-wide design or a
// 360-wide one for phones, stay inside this scope.
const createDeepSeekArchitecture = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254';
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = (k) => 1 - (1 - k) ** 3;
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Rise over [a, a + inMs], hold, fall over [b - outMs, b] */
const pulse = (t, a, b, inMs = 300, outMs = 300) => Math.min(span(t, a, a + inMs), 1 - span(t, b - outMs, b));
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const INK_RGB = INK.split(',').map(Number);
const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes 0 → 1 */
const tint = (k, a) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], clamp(k, 0, 1)))).join(', ')}, ${a})`;
const serif = (size, italic = true, weight = 400) => `${italic ? 'italic ' : ''}${weight} ${size}px ${SERIF}`;
const sans = (size, weight = 400) => `${weight} ${size}px ${SANS}`;

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

/* Vectors */
const rms = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
const scaleV = (v, k) => v.map((x) => x * k);
const addV = (a, b) => a.map((x, i) => x + b[i]);
const lerpV = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const normV = (v) => scaleV(v, 1 / rms(v));
const matVec = (M, v) => M.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const randVec = (r, n, sd = 1) => Array.from({ length: n }, () => gauss(r) * sd);
const randMat = (r, rows, cols, sd) => Array.from({ length: rows }, () => randVec(r, cols, sd));
const silu = (x) => x / (1 + Math.exp(-x));

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

function text(ctx, str, x, y, { font = sans(11), color = ink(0.5), align = 'left', baseline = 'alphabetic', halo = 0 } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (halo) {
    ctx.save();
    ctx.strokeStyle = pageColor();
    ctx.lineWidth = halo;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * A short run of maths in Newsreader: an array of pieces, each a string or { t, sub, roman, a }.
 * A piece with sub is set smaller and lower; a sets that piece's own alpha (0–1, times color's).
 */
function rich(ctx, pieces, x, y, { size = 13, color = [INK, 0.7], align = 'left', italic = true } = {}) {
  const parts = pieces.map((p) => (typeof p === 'string' ? { t: p } : p));
  const fontOf = (p) => serif(p.sub ? size * 0.72 : size, italic && !p.roman);
  let total = 0;
  for (const p of parts) {
    ctx.font = fontOf(p);
    p.w = ctx.measureText(p.t).width + (p.sub ? 0.5 : 0);
    total += p.w;
  }
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const p of parts) {
    ctx.font = fontOf(p);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1] * (p.a ?? 1)})`;
    ctx.fillText(p.t, cx, y + (p.sub ? size * 0.22 : 0));
    cx += p.w;
  }
  return total;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/**
 * A vector drawn as a small bar chart: one signed bar per entry, up for positive, down for
 * negative, centred on (cx, cy). colorOf(i) can tint single bars.
 */
function glyph(ctx, vals, cx, cy, { pitch = 3, bw = 2, S = 6, clip = 16, color = blue(0.95), colorOf = null, alpha = 1, backing = 0, base = 0.25 } = {}) {
  if (alpha <= 0) return;
  const n = vals.length;
  const w = (n - 1) * pitch;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (backing) {
    ctx.save();
    ctx.globalAlpha *= backing;
    ctx.fillStyle = pageColor();
    rrect(ctx, cx - w / 2 - bw - 2, cy - clip - 2, w + bw * 2 + 4, clip * 2 + 4, 3);
    ctx.fill();
    ctx.restore();
  }
  if (base) {
    ctx.fillStyle = ink(base);
    ctx.fillRect(cx - w / 2 - bw / 2 - 1, cy - 0.35, w + bw + 2, 0.7);
  }
  for (let i = 0; i < n; i++) {
    const h = clamp(vals[i] * S, -clip, clip);
    const x = cx - w / 2 + i * pitch - bw / 2;
    ctx.fillStyle = colorOf ? colorOf(i) : color;
    if (h >= 0) ctx.fillRect(x, cy - h, bw, Math.max(h, 0.6));
    else ctx.fillRect(x, cy, bw, -h);
  }
  ctx.restore();
}

/** Piecewise-linear track through keyframes [t, value]; the first segment eases out */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return lerp(a, b, i === 1 ? easeOut(k) : k);
    }
  }
  return keys[keys.length - 1][1];
}

/* ═════════════ 1A · One token, 61 blocks ═════════════ */

// The residual stream is one line. Each of the 61 blocks reads from it twice and writes back:
// an arc above for attention (MLA), an arc below for the feed-forward (dense in the first three
// blocks, DeepSeekMoE in the other 58). A token's vector rides the line and the arcs light as it
// passes. After the last block, the final RMSNorm and the output head give the next token. Then
// the MTP branch: the last hidden state drops to a second line, meets the embedding of the true
// next token, passes one more block and the shared head, and predicts the token after that.
// Desktop runs left to right; phones run bottom to top, with the MTP line on the right.
let PAGE_CACHE = null;
const page = () => PAGE_CACHE || (PAGE_CACHE = pageColor());
const mixRGB = (a, b, k) => {
  const A = a.split(',').map(Number);
  const B = b.split(',').map(Number);
  return A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1)))).join(', ');
};
const easeOutBack = (k) => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2;

/** A small subset of TeX for labels: x^{KV}_{t} sets a superscript and a subscript after x */
function texParse(str) {
  const items = [];
  let i = 0;
  const group = () => {
    if (str[i] === '{') {
      const j = str.indexOf('}', i);
      const s = str.slice(i + 1, j);
      i = j + 1;
      return s;
    }
    return str[i++];
  };
  while (i < str.length) {
    const ch = str[i];
    if (ch === '^' || ch === '_') {
      i++;
      const s = group();
      const key = ch === '^' ? 'sup' : 'sub';
      const last = items[items.length - 1];
      if (last && last.script && !last[key]) last[key] = s;
      else items.push({ script: true, sup: key === 'sup' ? s : '', sub: key === 'sub' ? s : '' });
      continue;
    }
    let j = i;
    while (j < str.length && str[j] !== '^' && str[j] !== '_') j++;
    items.push({ t: str.slice(i, j) });
    i = j;
  }
  return items;
}

/** Draws a label with super- and subscripts, vertically centred on y; returns its width */
function tex(ctx, str, x, y, { size = 11, color = ink(0.7), align = 'left', weight = 400, measure = false } = {}) {
  const items = texParse(str);
  const fb = serif(size, true, weight);
  const fs = serif(size * 0.68, false);
  const fi = serif(size * 0.68, true);
  let w = 0;
  for (const it of items) {
    if (it.script) {
      ctx.font = fs;
      const a = it.sup ? ctx.measureText(it.sup).width : 0;
      ctx.font = fi;
      const b = it.sub ? ctx.measureText(it.sub).width : 0;
      it.w = Math.max(a, b) + size * 0.1;
    } else {
      ctx.font = fb;
      it.w = ctx.measureText(it.t).width;
    }
    w += it.w;
  }
  if (measure) return w;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const by = y + size * 0.32;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  for (const it of items) {
    if (it.script) {
      if (it.sup) {
        ctx.font = fs;
        ctx.fillText(it.sup, cx + size * 0.07, by - size * 0.42);
      }
      if (it.sub) {
        ctx.font = fi;
        ctx.fillText(it.sub, cx + size * 0.02, by + size * 0.24);
      }
    } else {
      ctx.font = fb;
      ctx.fillText(it.t, cx, by);
    }
    cx += it.w;
  }
  return w;
}

/** A polyline through corner points, inner corners rounded, with its length for drawing it on */
function poly(pts, rad = 0) {
  let P = pts.map((p) => [...p]);
  if (rad && pts.length > 2) {
    P = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const [nx, ny] = pts[i + 1];
      const d0 = Math.hypot(cx - px, cy - py);
      const d1 = Math.hypot(nx - cx, ny - cy);
      const rr = Math.min(rad, d0 / 2, d1 / 2);
      const a = [cx - ((cx - px) / d0) * rr, cy - ((cy - py) / d0) * rr];
      const b = [cx + ((nx - cx) / d1) * rr, cy + ((ny - cy) / d1) * rr];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        const v = 1 - u;
        P.push([v * v * a[0] + 2 * v * u * cx + u * u * b[0], v * v * a[1] + 2 * v * u * cy + u * u * b[1]]);
      }
    }
    P.push(pts[pts.length - 1]);
  }
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, cum, len: cum[cum.length - 1] };
}

function polyAt(E, k) {
  const s = clamp(k, 0, 1) * E.len;
  for (let i = 1; i < E.P.length; i++) {
    if (s <= E.cum[i] || i === E.P.length - 1) {
      const f = (s - E.cum[i - 1]) / (E.cum[i] - E.cum[i - 1] || 1);
      return [lerp(E.P[i - 1][0], E.P[i][0], f), lerp(E.P[i - 1][1], E.P[i][1], f)];
    }
  }
  return E.P[E.P.length - 1];
}

function strokePoly(ctx, E, k, style, width, dash = null) {
  if (k <= 0) return;
  const s = clamp(k, 0, 1) * E.len;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(E.P[0][0], E.P[0][1]);
  for (let i = 1; i < E.P.length; i++) {
    if (E.cum[i] <= s) ctx.lineTo(E.P[i][0], E.P[i][1]);
    else {
      const f = (s - E.cum[i - 1]) / (E.cum[i] - E.cum[i - 1] || 1);
      ctx.lineTo(lerp(E.P[i - 1][0], E.P[i][0], f), lerp(E.P[i - 1][1], E.P[i][1], f));
      break;
    }
  }
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function arrowEnd(ctx, E, style, width, size = 3.2) {
  const [x1, y1] = E.P[E.P.length - 1];
  const [x0, y0] = polyAt(E, Math.max(0, 1 - 3 / E.len));
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(x1 - size * Math.cos(a - 0.55), y1 - size * Math.sin(a - 0.55));
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - size * Math.cos(a + 0.55), y1 - size * Math.sin(a + 0.55));
  ctx.stroke();
}

/** An edge: faint when idle, drawn on in ink (or blue) as k goes 0 → 1, a dot riding its tip */
function link(ctx, E, k, px, { idle = 0.2, on = 0.72, rgb = INK, dash = null, arrow = true, dot = true, halo = false, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (halo) strokePoly(ctx, E, 1, page(), 4.5 * px);
  if (idle > 0) strokePoly(ctx, E, 1, ink(idle), px, dash);
  if (k > 0) strokePoly(ctx, E, k, `rgba(${rgb}, ${on})`, 1.35 * px, dash);
  if (arrow) arrowEnd(ctx, E, k >= 1 ? `rgba(${rgb}, ${on})` : ink(idle + 0.12), (k >= 1 ? 1.35 : 1) * px);
  if (dot && k > 0 && k < 1) {
    const [x, y] = polyAt(E, k);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A vector as a row of circles (the paper's notation); fill runs left to right; heads adds per-head copies behind */
function dotRow(ctx, cx, cy, n, { pitch = 9, r = 3.4, px = 1, fill = 0, rgbOf = () => INK, heads = 0, spread = 0, alpha = 1 } = {}) {
  const x0 = cx - ((n - 1) * pitch) / 2;
  for (let j = spread > 0 ? heads : 0; j >= 0; j--) {
    const d = j * spread * 2.6;
    const a = (j ? 0.55 / j : 1) * alpha;
    for (let i = 0; i < n; i++) {
      const f = clamp(fill * n - i, 0, 1);
      const rgb = rgbOf(i);
      const x = x0 + i * pitch + d;
      const y = cy - d;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = page();
      ctx.fill();
      if (f > 0) {
        ctx.fillStyle = `rgba(${rgb}, ${0.88 * f * a})`;
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${f > 0 ? rgb : INK}, ${lerp(0.42, 0.9, f) * a})`;
      ctx.lineWidth = px;
      ctx.stroke();
    }
  }
}

/** A box with centred lines of text; solid fills it with ink (shared expert), sel tints it blue (chosen routed expert) */
function nbox(ctx, x, y, w, h, { px = 1, k = 0, lines = [], size = 11, sub = null, subSize = 8.5, solid = 0, sel = 0, alpha = 1, r = 4, idle = 0.32, labelA = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  rrect(ctx, x - w / 2, y - h / 2, w, h, r);
  ctx.fillStyle = page();
  ctx.fill();
  if (solid) {
    ctx.fillStyle = ink(lerp(0.62, 0.86, k));
    ctx.fill();
  }
  if (sel) {
    ctx.fillStyle = blue(0.13 * sel);
    ctx.fill();
  }
  ctx.strokeStyle = sel ? tint(sel, lerp(idle, 0.95, Math.max(k, sel))) : ink(lerp(idle, 0.85, k));
  ctx.lineWidth = px * (1 + 0.35 * k);
  ctx.stroke();
  const tc = solid ? page() : sel ? tint(sel, lerp(0.62, 0.95, sel)) : ink(lerp(0.62, 0.9, k));
  const lh = size * 1.15;
  const subH = sub ? subSize * 1.35 : 0;
  let ty = y - (lines.length * lh + subH) / 2 + lh / 2;
  ctx.save();
  ctx.globalAlpha *= labelA;
  for (const L of lines) {
    tex(ctx, L, x, ty, { size, color: tc, align: 'center' });
    ty += lh;
  }
  if (sub) text(ctx, sub, x, ty - lh / 2 + subH / 2, { font: sans(subSize), color: ink(0.48), align: 'center', baseline: 'middle' });
  ctx.restore();
  ctx.restore();
}

/** ⊕ (add) or ⊗ (scale by a gating weight) */
function opMark(ctx, x, y, r, kind, { px = 1, k = 0, alpha = 1, rgb = INK } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = page();
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb}, ${lerp(0.5, 0.95, k)})`;
  ctx.lineWidth = px * (1.1 + 0.35 * k);
  ctx.stroke();
  const a = r * 0.52;
  ctx.beginPath();
  if (kind === '+') {
    ctx.moveTo(x - a, y);
    ctx.lineTo(x + a, y);
    ctx.moveTo(x, y - a);
    ctx.lineTo(x, y + a);
  } else {
    const b = a * 0.78;
    ctx.moveTo(x - b, y - b);
    ctx.lineTo(x + b, y + b);
    ctx.moveTo(x + b, y - b);
    ctx.lineTo(x - b, y + b);
  }
  ctx.stroke();
  ctx.restore();
}

/** RoPE: a small dial whose hand turns as the rotation is applied */
function ropeMark(ctx, x, y, ang, { px = 1, k = 0 } = {}) {
  const r = 4.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = page();
  ctx.fill();
  ctx.strokeStyle = ink(lerp(0.45, 0.9, k));
  ctx.lineWidth = px;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * Math.cos(ang), y + r * Math.sin(ang));
  ctx.lineWidth = px * 1.5;
  ctx.stroke();
}

/* ───────────── The whole model, with the block drawn once and ghosted ×L ───────────── */

const MODEL_FIG = (() => {
  const W = 290;
  const H = 524;
  const mx = 136;
  const rx = 46;
  const Y = { probs: 40, head: 70, fnorm: 108, top: 138, plus2: 166, ffn: 210, norm2: 258, plus1: 298, attn: 340, norm1: 388, bot: 428, emb: 468, tok: 508 };
  const BX = { head: [120, 30], fnorm: [120, 22], ffn: [110, 34], norm2: [110, 28], attn: [110, 30], norm1: [110, 28], emb: [110, 22] };
  const start = Y.tok - 9;
  const end = Y.probs + 2;
  const ax = (y) => start - y;
  const AT = { emb: ax(Y.emb), norm1: ax(Y.norm1), attn: ax(Y.attn), plus1: ax(Y.plus1), norm2: ax(Y.norm2), ffn: ax(Y.ffn), plus2: ax(Y.plus2), top: ax(Y.top), fnorm: ax(Y.fnorm), head: ax(Y.head), end: ax(end), res1: ax(418), res2: ax(282) };
  const half = (key) => BX[key][1] / 2;
  const seg = (y0, y1) => ({ E: poly([[mx, y0], [mx, y1]]), a0: ax(y0), a1: ax(y1) });
  const SEG = [
    seg(start, Y.emb + half('emb')),
    seg(Y.emb - half('emb'), Y.norm1 + half('norm1')),
    seg(Y.norm1 - half('norm1'), Y.attn + half('attn')),
    seg(Y.attn - half('attn'), Y.plus1 + 7),
    seg(Y.plus1 - 7, Y.norm2 + half('norm2')),
    seg(Y.norm2 - half('norm2'), Y.ffn + half('ffn')),
    seg(Y.ffn - half('ffn'), Y.plus2 + 7),
    seg(Y.plus2 - 7, Y.fnorm + half('fnorm')),
    seg(Y.fnorm - half('fnorm'), Y.head + half('head')),
    seg(Y.head - half('head'), end)
  ];
  const RES1 = poly([[mx, 418], [rx, 418], [rx, Y.plus1], [mx - 7, Y.plus1]], 7);
  const RES2 = poly([[mx, 282], [rx, 282], [rx, Y.plus2], [mx - 7, Y.plus2]], 7);
  const FRAME = [4, Y.top, 218, Y.bot - Y.top];
  const PROB = [0.14, 0.3, 0.1, 0.95, 0.24, 0.4, 0.12, 0.2, 0.07];
  const WORDS = ['The', 'cat', 'sat', 'on'];
  const rect = (key) => [mx - BX[key][0] / 2, Y[key] - BX[key][1] / 2, BX[key][0], BX[key][1]];

  /** st: the pulse's place along the spine and what has lit; see modelState */
  function draw(ctx, st, px, { alpha = 1, signposts = 0, hide = {}, compact = false } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const lab = (str, x, y, a = 0.55, size = 11, align = 'left') => tex(ctx, str, x, y, { size, color: ink(a), align });

    // Ghosts of the other 60 blocks, behind the one drawn in full
    for (let j = 2; j >= 1; j--) {
      const fl = st.ghost ? st.ghost(j) : 0;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = ink(0.16 + 0.05 * (2 - j) + 0.4 * fl);
      ctx.lineWidth = px;
      rrect(ctx, FRAME[0] + 7 * j, FRAME[1] - 7 * j, FRAME[2], FRAME[3], 8);
      ctx.fillStyle = page();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = ink(0.42);
    ctx.lineWidth = px;
    rrect(ctx, ...FRAME, 8);
    ctx.fillStyle = page();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    lab('Transformer Block', 12, Y.top + 13, 0.7, 11.5);
    // ×L, the count, and which feed-forward each block uses
    const cx0 = 242;
    tex(ctx, '×L', cx0, 238, { size: 16, color: ink(lerp(0.75, 0.95, st.climbK || 0)), weight: 500 });
    tex(ctx, 'L = 61', cx0, 257, { size: 11, color: ink(0.6) });
    text(ctx, '1–3 dense', cx0, 274, { font: sans(9.5), color: ink(0.5), baseline: 'middle' });
    text(ctx, '4–61 MoE', cx0, 288, { font: sans(9.5), color: ink(0.5), baseline: 'middle' });
    if (st.block) {
      text(ctx, `block ${st.block}`, cx0, 307, { font: sans(9.5, 500), color: ink(0.62), baseline: 'middle' });
      text(ctx, 'of 61', cx0, 319, { font: sans(9.5), color: ink(0.5), baseline: 'middle' });
    }

    // Residual connections around the left
    link(ctx, RES1, st.r1, px, { idle: 0.26, dot: st.r1 < 0.98 });
    link(ctx, RES2, st.r2, px, { idle: 0.26, dot: st.r2 < 0.98 });
    for (const [yc, k] of [[358, st.r1], [224, st.r2]]) {
      ctx.save();
      ctx.translate(rx - 8, yc);
      ctx.rotate(-Math.PI / 2);
      text(ctx, 'residual', 0, 0, { font: sans(9.5), color: ink(lerp(0.42, 0.65, k)), align: 'center', baseline: 'middle' });
      ctx.restore();
    }

    // The spine, lit up to the pulse
    for (const S of SEG) {
      const k = clamp((st.s - S.a0) / (S.a1 - S.a0), 0, 1);
      link(ctx, S.E, k, px, { idle: 0.3, dot: false });
    }
    if (st.pulseA > 0) {
      const y = start - st.s;
      ctx.fillStyle = page();
      ctx.beginPath();
      ctx.arc(mx, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink(0.92 * st.pulseA);
      ctx.beginPath();
      ctx.arc(mx, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stations
    const K = st.k || {};
    nbox(ctx, mx, Y.emb, ...BX.emb, { px, k: K.emb, lines: ['Embedding'] });
    nbox(ctx, mx, Y.norm1, ...BX.norm1, { px, k: K.norm1, lines: ['RMSNorm'], sub: 'pre-norm', subSize: 9 });
    if (!hide.attn) nbox(ctx, mx, Y.attn, ...BX.attn, { px, k: K.attn, lines: ['Attention'] });
    nbox(ctx, mx, Y.norm2, ...BX.norm2, { px, k: K.norm2, lines: ['RMSNorm'], sub: 'pre-norm', subSize: 9 });
    if (!hide.ffn) nbox(ctx, mx, Y.ffn, ...BX.ffn, { px, k: K.ffn, lines: ['Feed-Forward', 'Network'] });
    nbox(ctx, mx, Y.fnorm, ...BX.fnorm, { px, k: K.fnorm, lines: ['RMSNorm (final)'] });
    nbox(ctx, mx, Y.head, ...BX.head, { px, k: K.head, lines: ['Output Head'], sub: 'linear, softmax', subSize: 9 });
    opMark(ctx, mx, Y.plus1, 7, '+', { px, k: K.plus1 });
    opMark(ctx, mx, Y.plus2, 7, '+', { px, k: K.plus2 });
    text(ctx, 'add', mx + 12, Y.plus1 + 1, { font: sans(9.5), color: ink(0.48), baseline: 'middle' });
    text(ctx, 'add', mx + 12, Y.plus2 + 1, { font: sans(9.5), color: ink(0.48), baseline: 'middle' });
    lab('u_{t}', mx + 7, (Y.attn - half('attn') + Y.plus1 + 7) / 2, lerp(0.45, 0.75, K.plus1 || 0), 10.5);

    // Input tokens, the one in flight darker
    WORDS.forEach((w, i) => {
      const x = mx + (i - 2) * 36;
      const on = i === 2 ? st.tok || 0 : 0;
      text(ctx, w, x, Y.tok, { font: serif(13), color: ink(i === 2 ? lerp(0.5, 0.92, on) : 0.38), align: 'center', baseline: 'middle' });
    });
    text(ctx, 'input tokens', mx + 58, Y.tok + 1, { font: sans(9.5), color: ink(0.42), baseline: 'middle' });

    // Next-token probabilities
    const pk = st.probs || 0;
    PROB.forEach((v, i) => {
      const x = mx - 24 + i * 6;
      const hgt = v * 24 * ease(clamp(pk * 1.4 - i * 0.05, 0, 1));
      ctx.fillStyle = i === 3 ? tint(st.word || 0, lerp(0.45, 0.95, st.word || 0)) : ink(0.4);
      ctx.fillRect(x - 1.75, end - 2 - hgt, 3.5, hgt);
    });
    ctx.fillStyle = ink(0.3);
    ctx.fillRect(mx - 28, end - 2, 56, px);
    if (st.word) text(ctx, 'on', mx - 6, end - 2 - 24 - 9, { font: serif(12), color: blue(0.95 * st.word), align: 'center', baseline: 'middle' });
    text(ctx, 'next-token', mx - 34, end - 19, { font: sans(9.5), color: ink(0.45), align: 'right', baseline: 'middle' });
    text(ctx, 'probabilities', mx - 34, end - 7, { font: sans(9.5), color: ink(0.45), align: 'right', baseline: 'middle' });

    // Pointers to the two detail panels (3B's overview)
    if (signposts > 0) {
      ctx.save();
      ctx.globalAlpha *= signposts;
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = ink(0.35);
      ctx.lineWidth = px;
      ctx.beginPath();
      ctx.moveTo(mx + BX.attn[0] / 2 + 2, Y.attn);
      ctx.lineTo(300, Y.attn);
      ctx.moveTo(mx + BX.ffn[0] / 2 + 2, Y.ffn);
      ctx.lineTo(300, Y.ffn);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, compact ? 'MLA' : 'Multi-Head Latent Attention (MLA)', 306, Y.attn, { font: serif(12, true, 500), color: ink(0.7), baseline: 'middle' });
      text(ctx, 'DeepSeekMoE', 306, Y.ffn, { font: serif(12, true, 500), color: ink(0.7), baseline: 'middle' });
      ctx.restore();
    }
    ctx.restore();
  }

  return { W, H, Y, BX, mx, AT, rect, draw };
})();

/** Where the pulse is and what has lit, from a schedule of arrival times (ev) */
function modelState(t, ev) {
  const A = MODEL_FIG.AT;
  const keys = [[ev.tok, 0], [ev.emb, A.emb], [ev.norm1, A.norm1], [ev.attn, A.attn], [ev.attnOut, A.attn], [ev.plus1, A.plus1], [ev.norm2, A.norm2], [ev.ffn, A.ffn], [ev.ffnOut, A.ffn], [ev.plus2, A.plus2], [ev.top, A.top], [ev.climb1, A.top], [ev.fnorm, A.fnorm], [ev.head, A.head], [ev.probs, A.end]];
  let s = 0;
  if (t >= keys[keys.length - 1][0]) s = A.end;
  else {
    for (let i = 1; i < keys.length; i++) {
      if (t < keys[i][0]) {
        const [t0, a] = keys[i - 1];
        const [t1, b] = keys[i];
        s = t < t0 ? a : lerp(a, b, ease(span(t, t0, t1)));
        break;
      }
    }
  }
  const at = (a) => {
    for (let i = 1; i < keys.length; i++) if (keys[i][1] >= a && keys[i - 1][1] <= a) return lerp(keys[i - 1][0], keys[i][0], (a - keys[i - 1][1]) / (keys[i][1] - keys[i - 1][1] || 1));
    return keys[0][0];
  };
  const r1Start = at(A.res1);
  const r2Start = at(A.res2);
  const resid = (t0, tEnd) => (t < t0 ? 0 : t < tEnd - 350 ? 0.86 * ease(span(t, t0, t0 + 700)) : lerp(0.86 * ease(span(t, t0, t0 + 700)), 1, ease(span(t, tEnd - 350, tEnd))));
  const flash = (t0, after = 0.5) => Math.max(pulse(t, t0 - 120, t0 + 520, 120, 360), t > t0 ? after : 0);
  const live = (t0, t1) => (t >= t0 && t <= t1 ? 1 : flash(t0));
  const climbK = span(t, ev.top, ev.climb1);
  return {
    s,
    pulseA: span(t, ev.tok - 150, ev.tok + 150) * (1 - span(t, ev.probs - 150, ev.probs + 150)),
    tok: span(t, ev.tok - 200, ev.tok + 200),
    r1: resid(r1Start, ev.plus1),
    r2: resid(r2Start, ev.plus2),
    block: t < ev.norm1 ? 0 : Math.min(61, 1 + Math.floor(60 * ease(climbK))),
    climbK: pulse(t, ev.top, ev.climb1 + 300, 200, 400),
    ghost: (j) => (climbK > 0 && climbK < 1 ? Math.max(0, Math.sin(Math.PI * clamp(climbK * 2.2 - (j - 1) * 0.5, 0, 1))) : 0),
    probs: span(t, ev.probs - 100, ev.probs + 400),
    word: span(t, ev.word, ev.word + 300),
    k: {
      emb: flash(ev.emb),
      norm1: flash(ev.norm1),
      attn: live(ev.attn, ev.attnOut),
      plus1: flash(ev.plus1),
      norm2: flash(ev.norm2),
      ffn: live(ev.ffn, ev.ffnOut),
      plus2: flash(ev.plus2),
      fnorm: flash(ev.fnorm),
      head: flash(ev.head)
    }
  };
}

/* ───────────── Multi-Head Latent Attention ───────────── */

const MLA_FIG = (() => {
  const W = 360;
  const H = 294;
  const DUR = 5200;
  const r0 = 262;
  const r1 = 214;
  const r2 = 160;
  const r3 = 104;
  const X = { qC: 66, qR: 106, cQ: 86, kR: 193.5, kC: 258, v: 330, cKV: 294, cq: 86, ck: 222, mid: 180 };
  const hx = (i) => X.mid + (i - 3.5) * 9;
  const CQ = [70, 78, 86, 94, 102];
  const CK = [206, 214, 222, 230, 238];
  const E = {
    hQ: poly([[hx(1), r0 - 4], [hx(1), 248], [X.cQ, 248], [X.cQ, r1 + 5]], 5),
    hR: poly([[X.kR, r0 - 4], [X.kR, r1 + 5]]),
    hKV: poly([[hx(7), r0 - 4], [hx(7), 248], [X.cKV, 248], [X.cKV, r1 + 5]], 5),
    qC: poly([[X.cQ, r1 - 5], [X.cQ, r1 - 14], [X.qC, r1 - 14], [X.qC, r2 + 5]], 5),
    qR: poly([[X.cQ, r1 - 5], [X.cQ, r1 - 14], [X.qR, r1 - 14], [X.qR, r2 + 5]], 5),
    kC: poly([[X.cKV, r1 - 5], [X.cKV, r1 - 14], [X.kC, r1 - 14], [X.kC, r2 + 5]], 5),
    vC: poly([[X.cKV, r1 - 5], [X.cKV, r1 - 14], [X.v, r1 - 14], [X.v, r2 + 5]], 5),
    cqC: poly([[X.qC, r2 - 5], [X.qC, r3 + 16], [78, r3 + 16], [78, r3 + 5]], 4),
    cqR: poly([[X.qR, r2 - 5], [X.qR, r3 + 16], [98, r3 + 16], [98, r3 + 5]], 4),
    ckC: poly([[X.kC, r2 - 5], [X.kC, r3 + 16], [214, r3 + 16], [214, r3 + 5]], 4),
    ckR: poly([[X.kR, r1 - 5], [X.kR, r3 + 24], [234, r3 + 24], [234, r3 + 5]], 4),
    aq: poly([[X.cq, r3 - 5], [X.cq, 77]]),
    ak: poly([[X.ck, r3 - 5], [X.ck, 77]]),
    av: poly([[X.v, r2 - 5], [X.v, 77]]),
    out: poly([[X.mid, 57], [X.mid, 45]])
  };

  function draw(ctx, p, px, { alpha = 1, live = 0 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const S = (a, b) => span(p, a, b);
    const hF = S(0, 450);
    const e1 = S(450, 1100);
    const r1F = S(1050, 1300);
    const cached = ease(S(1350, 1750));
    const e2 = S(1800, 2400);
    const r2F = S(2350, 2600);
    const heads = ease(S(2450, 2900));
    const snap = S(2950, 3550);
    const snapped = S(3450, 3600);
    const e4 = S(3600, 3950);
    const fire = S(3850, 4450);
    const eo = S(4450, 4750);
    const uF = S(4700, 5050);
    const cachedRGB = mixRGB(INK, BLUE, cached);

    // Frame, title, legend
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = ink(0.28 + 0.3 * live);
    ctx.lineWidth = px;
    rrect(ctx, 0, 0, W, H, 8);
    ctx.fillStyle = page();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'Multi-Head Latent Attention (MLA)', 12, 16, { font: serif(12.5, true, 500), color: ink(0.85), baseline: 'middle' });
    const lw = tex(ctx, 'Cached During Inference', 350, 282, { size: 10.5, color: ink(lerp(0.5, 0.82, Math.max(cached * 0.4, pulse(p, 1350, 2600, 300, 500)))), align: 'right' });
    ctx.fillStyle = blue(0.9);
    ctx.beginPath();
    ctx.arc(350 - lw - 8, 282, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Edges
    for (const e of [E.hQ, E.hR, E.hKV]) link(ctx, e, e1, px);
    for (const e of [E.qC, E.qR, E.kC, E.vC]) link(ctx, e, e2, px);
    link(ctx, E.cqC, snap, px);
    link(ctx, E.cqR, snap, px);
    link(ctx, E.ckC, snap, px);
    link(ctx, E.ckR, snap, px, { halo: true });
    for (const e of [E.aq, E.ak, E.av]) link(ctx, e, e4, px);
    link(ctx, E.out, eo, px);
    ropeMark(ctx, X.kR, 238, -Math.PI / 2 + Math.PI * 1.5 * ease(S(550, 1100)), { px, k: Math.max(pulse(p, 500, 1300, 150, 300), e1 >= 1 ? 0.45 : 0) });
    ropeMark(ctx, X.qR, 183, -Math.PI / 2 + Math.PI * 1.5 * ease(S(1950, 2400)), { px, k: Math.max(pulse(p, 1900, 2600, 150, 300), e2 >= 1 ? 0.45 : 0) });

    // Multi-Head Attention
    ctx.save();
    rrect(ctx, 30, 58, 310, 18, 4);
    ctx.fillStyle = page();
    ctx.fill();
    if (fire > 0) {
      ctx.save();
      ctx.clip();
      ctx.fillStyle = ink(0.08 + 0.06 * pulse(p, 3850, 4700, 100, 400));
      ctx.fillRect(30, 58, 310 * ease(fire), 18);
      ctx.restore();
    }
    ctx.strokeStyle = ink(lerp(0.32, 0.85, fire));
    ctx.lineWidth = px * (1 + 0.35 * fire);
    rrect(ctx, 30, 58, 310, 18, 4);
    ctx.stroke();
    ctx.restore();
    tex(ctx, 'Multi-Head Attention', 180, 67, { size: 11.5, color: ink(lerp(0.6, 0.9, fire)), align: 'center' });
    tex(ctx, 'n_{h} = 128', 333, 67, { size: 9.5, color: ink(0.5), align: 'right' });

    // Vectors
    dotRow(ctx, X.mid, r0, 8, { px, fill: hF });
    dotRow(ctx, X.cQ, r1, 4, { px, fill: r1F });
    dotRow(ctx, X.kR, r1, 2, { px, pitch: 8, fill: r1F, rgbOf: () => cachedRGB });
    dotRow(ctx, X.cKV, r1, 3, { px, fill: r1F, rgbOf: () => cachedRGB });
    const per = { px, pitch: 8, r: 3, fill: r2F, heads: 2, spread: heads };
    dotRow(ctx, X.qC, r2, 3, per);
    dotRow(ctx, X.qR, r2, 2, per);
    dotRow(ctx, X.kC, r2, 3, per);
    dotRow(ctx, X.v, r2, 3, per);
    const cat = { px, pitch: 8, r: 3, fill: snapped, heads: 2, spread: heads };
    dotRow(ctx, X.cq, r3, 5, cat);
    dotRow(ctx, X.ck, r3, 5, { ...cat, rgbOf: (i) => (i >= 3 ? cachedRGB : INK) });
    // the concatenations snapping together
    if (snap > 0 && snapped < 1) {
      const fly = (sx, dx, i, rgb) => {
        const k = clamp(snap * 1.35 - i * 0.07, 0, 1);
        const x = lerp(sx, dx, easeOutBack(k));
        const y = lerp(r2, r3, easeOutBack(k));
        ctx.fillStyle = `rgba(${rgb}, 0.9)`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      };
      [58, 66, 74, 102, 110].forEach((sx, i) => fly(sx, CQ[i], i, INK));
      [250, 258, 266].forEach((sx, i) => fly(sx, CK[i], i, INK));
      [189.5, 197.5].forEach((sx, i) => fly(sx, CK[3 + i], 3 + i, cachedRGB));
    }
    dotRow(ctx, X.mid, 40, 8, { px, fill: uF });

    // Labels
    const L = (str, x, y, a, align = 'left', size = 11) => tex(ctx, str, x, y, { size, color: ink(lerp(0.48, 0.85, a)), align });
    L('Input Hidden h_{t}', 140, r0, hF, 'right');
    L('Latent', 66, r1 - 7, r1F, 'right');
    L('c^{Q}_{t}', 66, r1 + 8, r1F, 'right');
    L('k^{R}_{t}', 205, r1, r1F);
    L('Latent', 311, r1 - 7, r1F);
    L('c^{KV}_{t}', 311, r1 + 8, r1F);
    L('apply RoPE', 203, 238, e1, 'left', 10);
    L('apply RoPE', 114, 183, e2, 'left', 10);
    L('{q^{C}_{t,i}}', 54, r2, r2F, 'right');
    L('{q^{R}_{t,i}}', 122, r2, r2F);
    L('{k^{C}_{t,i}}', 244, r2, r2F, 'right');
    L('{v^{C}_{t,i}}', 316, r2, r2F, 'right');
    L('{[q^{C}_{t,i}; q^{R}_{t,i}]}', 114, r3, snapped, 'left', 10.5);
    L('{[k^{C}_{t,i}; k^{R}_{t}]}', 250, r3, snapped, 'left', 10.5);
    L('Output Hidden u_{t}', 142, 40, uF, 'right');
    ctx.restore();
  }

  return { W, H, DUR, draw };
})();

/* ───────────── DeepSeekMoE ───────────── */

const MOE_FIG = (() => {
  const W = 360;
  const H = 256;
  const DUR = 4500;
  const ux = (i) => 190 + (i - 3.5) * 9;
  const RX = [104, 140, 176, 212, 278, 318];
  const RL = ['1', '2', '3', '4', 'N_{r}−1', 'N_{r}'];
  const AFF = [0.36, 0.52, 0.94, 0.28, 0.84, 0.44];
  const SEL = [2, 4];
  const EY = 134;
  const BW = 30;
  const BH = 24;
  const BASE = 190;
  const BARH = 24;
  const SX = 40;
  const E = {
    uR: poly([[190, 238.5], [190, 224]]),
    uS: poly([[ux(0), 238.5], [ux(0), 231], [SX, 231], [SX, EY + BH / 2 + 1]], 6),
    rB: poly([[190, 204], [190, BASE + 2]]),
    d: SEL.map((i) => poly([[RX[i], BASE - AFF[i] * BARH - 3], [RX[i], EY + BH / 2 + 1]])),
    oa: SEL.map((i) => poly([[RX[i], EY - BH / 2], [RX[i], 110.5]])),
    ob: [poly([[RX[SEL[0]], 97.5], [RX[SEL[0]], 90], [190, 90], [190, 84.5]], 4), poly([[RX[SEL[1]], 97.5], [RX[SEL[1]], 78], [196.5, 78]], 6)],
    oS: poly([[SX, EY - BH / 2], [SX, 78], [183.5, 78]], 6),
    out: poly([[190, 71.5], [190, 52]])
  };

  function draw(ctx, p, px, { alpha = 1, live = 0 } = {}) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const S = (a, b) => span(p, a, b);
    const uF = S(0, 400);
    const eIn = S(400, 950);
    const on = S(900, 1200);
    const eRB = S(1100, 1300);
    const bar = (i) => ease(S(1250 + i * 70, 1650 + i * 70));
    const sel = ease(S(1850, 2150));
    const eD = S(2150, 2500);
    const selBox = ease(S(2450, 2750));
    const eOA = S(2750, 3050);
    const gate = Math.max(pulse(p, 2950, 3500, 150, 300), p > 3200 ? 0.55 : 0);
    const eOB = S(3200, 3500);
    const eS = S(2750, 3500);
    const plus = Math.max(pulse(p, 3450, 4000, 150, 300), p > 3700 ? 0.55 : 0);
    const eOut = S(3600, 3800);
    const hF = S(3750, 4100);

    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = ink(0.28 + 0.3 * live);
    ctx.lineWidth = px;
    rrect(ctx, 0, 0, W, H, 8);
    ctx.fillStyle = page();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, 'DeepSeekMoE', 12, 16, { font: serif(12.5, true, 500), color: ink(0.85), baseline: 'middle' });
    text(ctx, 'in blocks 4–61 (1–3 are dense)', 12, 31, { font: sans(9), color: ink(0.48), baseline: 'middle' });
    // legend: solid for shared, outline for routed
    const lg = (y, str, solid) => {
      const w = tex(ctx, str, 348, y, { size: 10.5, color: ink(0.62), align: 'right' });
      const x = 348 - w - 16;
      ctx.beginPath();
      ctx.rect(x, y - 4.5, 9, 9);
      if (solid) {
        ctx.fillStyle = ink(0.8);
        ctx.fill();
      } else {
        ctx.strokeStyle = ink(0.55);
        ctx.lineWidth = px;
        ctx.stroke();
      }
    };
    lg(14, 'Shared Expert, N_{s} = 1', true);
    lg(30, 'Routed Expert, N_{r} = 256', false);

    // Edges
    link(ctx, E.uR, eIn, px);
    link(ctx, E.uS, eIn, px);
    link(ctx, E.rB, eRB, px);
    E.d.forEach((e) => link(ctx, e, eD, px, { rgb: BLUE, dash: [3, 2.5], idle: 0.1, on: 0.9 }));
    E.oa.forEach((e) => link(ctx, e, eOA, px, { arrow: false }));
    E.ob.forEach((e) => link(ctx, e, eOB, px));
    link(ctx, E.oS, eS, px);
    link(ctx, E.out, eOut, px);
    SEL.forEach((i) => opMark(ctx, RX[i], 104, 6, 'x', { px, k: gate, rgb: mixRGB(INK, BLUE, selBox) }));
    opMark(ctx, 190, 78, 6.5, '+', { px, k: plus });

    // Experts
    nbox(ctx, SX, EY, BW, BH, { px, k: on, lines: ['1'], size: 10.5, solid: 1 });
    RX.forEach((x, i) => nbox(ctx, x, EY, BW, BH, { px, lines: [RL[i]], size: 10.5, sel: SEL.includes(i) ? selBox : 0 }));
    text(ctx, '…', 245, EY, { font: serif(14), color: ink(0.55), align: 'center', baseline: 'middle' });

    // Router and its scores
    nbox(ctx, 190, 214, 64, 20, { px, k: on, lines: ['Router'], size: 11 });
    ctx.fillStyle = ink(0.3);
    ctx.fillRect(92, BASE, 238, px);
    RX.forEach((x, i) => {
      const h = AFF[i] * BARH * bar(i);
      const chosen = SEL.includes(i);
      ctx.fillStyle = chosen ? tint(sel, lerp(0.45, 0.95, sel)) : ink(0.42);
      ctx.fillRect(x - 3.5, BASE - h, 7, h);
    });
    text(ctx, '…', 245, BASE - 7, { font: serif(14), color: ink(0.45), align: 'center', baseline: 'middle' });
    tex(ctx, 'Top-K_{r}', 86, 176, { size: 11, color: ink(lerp(0.5, 0.85, sel)), align: 'right' });
    tex(ctx, 'K_{r} = 8', 86, 191, { size: 9.5, color: ink(0.5), align: 'right' });

    // Vectors and labels
    dotRow(ctx, 190, 242, 8, { px, fill: uF });
    dotRow(ctx, 190, 48, 8, { px, fill: hF });
    tex(ctx, 'Input Hidden u_{t}', 152, 242, { size: 11, color: ink(lerp(0.48, 0.85, uF)), align: 'right' });
    tex(ctx, 'Output Hidden h′_{t}', 152, 48, { size: 11, color: ink(lerp(0.48, 0.85, hF)), align: 'right' });
    ctx.restore();
  }

  return { W, H, DUR, draw };
})();


// One thing on screen at a time. The whole model first; when the token reaches Attention the
// camera dives into the box, which opens into the MLA panel and plays; back out, up to the
// Feed-Forward box and into DeepSeekMoE; back out, and the token climbs the other 60 blocks to
// the final norm, the head and the next-token probabilities.
function createZoom(W, H, dpr) {
  const narrow = W < 520;
  const M = MODEL_FIG;
  const ev = { tok: 300, emb: 700, norm1: 1150, attn: 1550, zin1: [1650, 2900], mla0: 3000, zout1: [8300, 9550], attnOut: 9650, plus1: 10050, norm2: 10450, ffn: 10850, zin2: [10950, 12200], moe0: 12300, zout2: [16900, 18150], ffnOut: 18250, plus2: 18650, top: 18950, climb1: 20150, fnorm: 20550, head: 20950, probs: 21350, word: 21550 };
  const LOOP = 25200;
  const backdrop = makeBackdrop(W, H, dpr);
  const K = 0.42; // a panel's size in the model's coordinates
  const Zb = narrow ? Math.min(340 / M.W, (H - 20) / M.H) : Math.min(1, (H - 24) / M.H);
  const VB = { Z: Zb, cx: narrow ? M.W / 2 : M.mx + (W / 2 - 250) / Zb, cy: M.H / 2 };
  const target = (P) => Math.min(1.45, (W - 30) / P.W, (H - 30) / P.H);
  const anchors = {
    mla: { P: MLA_FIG, x: M.mx, y: M.Y.attn, box: M.rect('attn'), label: 'Attention', lines: ['Attention'] },
    moe: { P: MOE_FIG, x: M.mx, y: M.Y.ffn, box: M.rect('ffn'), label: 'Feed-Forward Network', lines: ['Feed-Forward', 'Network'] }
  };

  function camera(t) {
    const zin = (r) => ease(span(t, r[0], r[1]));
    let which = null;
    let u = 0;
    if (t >= ev.zin1[0] && t < ev.zin2[0]) {
      which = 'mla';
      u = t < ev.zout1[0] ? zin(ev.zin1) : 1 - zin(ev.zout1);
    } else if (t >= ev.zin2[0]) {
      which = 'moe';
      u = t < ev.zout2[0] ? zin(ev.zin2) : 1 - zin(ev.zout2);
    }
    if (!which || u <= 0) return { Z: VB.Z, cx: VB.cx, cy: VB.cy, which: null, u: 0 };
    const A = anchors[which];
    const Zt = target(A.P) / K;
    const Z = Math.exp(lerp(Math.log(VB.Z), Math.log(Zt), u));
    // the anchor's screen position glides to the centre while the scale grows
    const sx0 = W / 2 + (A.x - VB.cx) * VB.Z;
    const sy0 = H / 2 + (A.y - VB.cy) * VB.Z;
    const sx = lerp(sx0, W / 2, u);
    const sy = lerp(sy0, H / 2, u);
    return { Z, cx: A.x - (sx - W / 2) / Z, cy: A.y - (sy - H / 2) / Z, which, u };
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const cam = camera(t);
    const st = modelState(t, ev);
    const px = 1 / cam.Z;
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.Z, cam.Z);
    ctx.translate(-cam.cx, -cam.cy);

    const modelA = 1 - span(cam.u, 0.05, 0.4);
    M.draw(ctx, st, px, { alpha: modelA, signposts: narrow ? 0 : 1, hide: { attn: cam.which === 'mla', ffn: cam.which === 'moe' } });

    if (cam.which) {
      const A = anchors[cam.which];
      const pw = A.P.W * K;
      const ph = A.P.H * K;
      const m = ease(span(cam.u, 0.05, 0.62));
      const [bx, by, bw, bh] = A.box;
      const rx = lerp(bx, A.x - pw / 2, m);
      const ry = lerp(by, A.y - ph / 2, m);
      const rw = lerp(bw, pw, m);
      const rh = lerp(bh, ph, m);
      // the box opening into its panel
      ctx.save();
      ctx.globalAlpha *= 1 - span(cam.u, 0.6, 0.78);
      rrect(ctx, rx, ry, rw, rh, lerp(4, 8 * K, m));
      ctx.fillStyle = page();
      ctx.fill();
      ctx.strokeStyle = ink(lerp(0.85, 0.4, m));
      ctx.lineWidth = px * 1.3;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 1 - span(cam.u, 0, 0.3);
      A.lines.forEach((ln, i) => tex(ctx, ln, A.x, A.y + (i - (A.lines.length - 1) / 2) * 12.6, { size: 11, color: ink(0.9), align: 'center' }));
      ctx.restore();
      const panelA = span(cam.u, 0.36, 0.8);
      if (panelA > 0) {
        ctx.save();
        ctx.translate(A.x - pw / 2, A.y - ph / 2);
        ctx.scale(K, K);
        const p = cam.which === 'mla' ? t - ev.mla0 : t - ev.moe0;
        A.P.draw(ctx, p, px / K, { alpha: panelA, live: 1 });
        ctx.restore();
      }
    }
    ctx.restore();
  }, { still: 23600 });
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

  return fitted(createZoom);
})();

/* ───────────── DeepSeekMoE: routing, and load balancing without an auxiliary loss ───────────── */

// route · one MoE layer, token by token. The shared expert always runs, the router scores all
//         256 routed experts, the top 8 fire (at most 4 nodes per token) and their outputs are
//         summed by their gating weights.
// balance · auxiliary-loss-free load balancing, as a small simulation (16 experts, top 2): each
//         expert's bias is nudged down when it's overloaded and up when it's underloaded, which
//         changes which experts are picked and never their weights, until the load evens out.
// Their helpers and fitted() (a 680-wide design, or 360-wide on phones) stay inside this scope.
const DS_MOE = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254'; // DeepSeek's blue, as on the title card
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = (k) => 1 - (1 - k) ** 3;
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Rise over [a, a + inMs], hold, fall over [b - outMs, b] */
const pulse = (t, a, b, inMs = 300, outMs = 300) => Math.min(span(t, a, a + inMs), 1 - span(t, b - outMs, b));
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const INK_RGB = INK.split(',').map(Number);
const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes 0 → 1 */
const inkToBlue = (k, a) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], k))).join(', ')}, ${a})`;
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', baseline = 'alphabetic', halo = null } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const bezPoint = ([a, b, c, d], t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
  };
};

/** Stroke a cubic from k0 to k1 of the way along */
function strokeCurve(ctx, p, k0 = 0, k1 = 1, n = 32) {
  if (k1 <= k0) return;
  ctx.beginPath();
  for (let j = 0; j <= n; j++) {
    const q = bezPoint(p, lerp(k0, k1, j / n));
    if (j) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  }
  ctx.stroke();
}

/** A small open arrowhead at (x, y) pointing along angle a */
function arrowHead(ctx, x, y, a, size, color, width = 1.2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * Math.cos(a - 0.5), y - size * Math.sin(a - 0.5));
  ctx.lineTo(x, y);
  ctx.lineTo(x - size * Math.cos(a + 0.5), y - size * Math.sin(a + 0.5));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** A tick, drawn on as k goes 0 → 1 */
function tick(ctx, x, y, s, color, k = 1, width = 1.5) {
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

function dot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ───────────── 1A · Route: one MoE layer, token by token ───────────── */

// DeepSeek-V3's MoE layer at its real size: 1 shared expert and 256 routed experts (the 16 × 16
// grid), 8 routed experts per token. The router's affinity is a sigmoid of the token against
// each expert's centroid; the top 8 are kept and their scores normalized into weights, which
// set the line widths into the sum. The shared expert is the same size as one routed expert.
// The pick also keeps V3's node limit: the experts sit on 8 nodes of 32 (two grid rows each),
// a token may use at most 4 nodes, and nodes are ranked by the sum of their 2 best scores.
// Scores are drawn at random (seeded), so which experts win is illustrative.
const ROUTE = (() => {
  const NR = 256;
  const KR = 8;
  const NODES = 8;
  const M = 4;
  const WORDS = ['the', 'tide', 'came', 'in', 'at', 'dawn'];
  const r = seeded(2412);
  const per = NR / NODES;
  const tokens = WORDS.map(() => {
    const s = Array.from({ length: NR }, () => sigmoid(-3 + 1.4 * gauss(r)));
    const nodeScore = Array.from({ length: NODES }, (_, n) => {
      const best = s.slice(n * per, (n + 1) * per).sort((a, b) => b - a);
      return best.slice(0, KR / M).reduce((a, v) => a + v, 0);
    });
    const nodes = new Set([...nodeScore.keys()].sort((a, b) => nodeScore[b] - nodeScore[a]).slice(0, M));
    const top = [...s.keys()].filter((i) => nodes.has(Math.floor(i / per))).sort((a, b) => s[b] - s[a]).slice(0, KR);
    const sum = top.reduce((a, i) => a + s[i], 0);
    const g = new Map(top.map((i) => [i, s[i] / sum]));
    const lo = Math.min(...s);
    const hi = Math.max(...s);
    const heat = s.map((v) => ((v - lo) / (hi - lo)) ** 1.5);
    // Each top-8 expert's place in the sweep, so they turn blue in order of score
    const rank = new Map(top.map((i, k) => [i, k]));
    return { s, top, g, heat, rank, vec: Array.from({ length: 6 }, () => r()), out: Array.from({ length: 6 }, () => r()) };
  });
  return { NR, KR, WORDS, tokens };
})();

function createRoute(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);
  const { NR, KR, WORDS, tokens } = ROUTE;
  const P = 12;   // grid pitch
  const C = 9;    // expert cell
  const GS = 16 * P - (P - C);
  let L;
  if (!narrow) {
    const gy = Math.round(H / 2 - GS / 2 + 14);
    L = {
      tok: { x: 70, y: gy + GS / 2, dir: 'v' },
      word: [70, gy + GS / 2 + 44, 'center'],
      router: { x: 150, y: gy + GS / 2 },
      routerLabel: [150, gy + GS / 2 + 24, 'center'],
      grid: { x: 232, y: gy },
      shared: { x: 232 + Math.round(GS / 2 - C / 2), y: gy - 40 },
      sharedLabel: [232 + GS / 2, gy - 50, 'center'],
      gridLabel: [[232, gy + GS + 22, 'left', '256 routed experts']],
      topLabel: [232 + GS, gy + GS + 22, 'right'],
      sum: { x: 520, y: gy + GS / 2 },
      sumLabel: [520, gy + GS / 2 + 28, 'center'],
      out: { x: 604, y: gy + GS / 2, dir: 'v' },
      outLabel: [604, gy + GS / 2 + 40, 'center']
    };
  } else {
    const gx = Math.round(W / 2 - GS / 2);
    const gy = 138;
    L = {
      tok: { x: W / 2, y: 62, dir: 'h' },
      word: [W / 2, 42, 'center'],
      router: { x: W / 2, y: 100 },
      routerLabel: [W / 2 + 12, 104, 'left'],
      grid: { x: gx, y: gy },
      shared: { x: 30, y: 96 },
      sharedLabel: [44, 104, 'left'],
      gridLabel: [[gx + GS + 12, gy + GS / 2 - 8, 'left', '256'], [gx + GS + 12, gy + GS / 2 + 7, 'left', 'routed'], [gx + GS + 12, gy + GS / 2 + 22, 'left', 'experts']],
      topLabel: [gx + GS + 12, gy + GS / 2 + 44, 'left'],
      sum: { x: W / 2, y: gy + GS + 46 },
      sumLabel: [W / 2 + 16, gy + GS + 50, 'left'],
      out: { x: W / 2, y: gy + GS + 88, dir: 'h' },
      outLabel: [W / 2 + 30, gy + GS + 92, 'left']
    };
  }
  const cell = (i) => ({ x: L.grid.x + (i % 16) * P, y: L.grid.y + Math.floor(i / 16) * P });
  const centre = (i) => {
    const c = cell(i);
    return { x: c.x + C / 2, y: c.y + C / 2 };
  };
  const SH = { x: L.shared.x + C / 2, y: L.shared.y + C / 2 };
  const R = L.router;
  const S = L.sum;

  // Paths: token → router, router → each routed expert, expert → sum, and the shared expert's own
  const dispatch = (i) => {
    const c = centre(i);
    return narrow
      ? [{ x: R.x, y: R.y + 5 }, { x: R.x, y: R.y + 46 }, { x: c.x, y: c.y - 46 }, c]
      : [{ x: R.x + 5, y: R.y }, { x: R.x + 52, y: R.y }, { x: c.x - 52, y: c.y }, c];
  };
  const gather = (i) => {
    const c = centre(i);
    return narrow
      ? [c, { x: c.x, y: c.y + 56 }, { x: S.x, y: S.y - 44 }, { x: S.x, y: S.y - 8 }]
      : [c, { x: c.x + 64, y: c.y }, { x: S.x - 56, y: S.y }, { x: S.x - 8, y: S.y }];
  };
  const tokEdge = narrow ? { x: L.tok.x - 24, y: L.tok.y } : { x: L.tok.x, y: L.tok.y - 24 };
  const toShared = narrow
    ? [tokEdge, { x: SH.x + 30, y: L.tok.y }, { x: SH.x, y: SH.y - 34 }, { x: SH.x, y: SH.y - 6 }]
    : [tokEdge, { x: L.tok.x, y: SH.y }, { x: SH.x - 70, y: SH.y }, { x: SH.x - 6, y: SH.y }];
  const fromShared = narrow
    ? [{ x: SH.x, y: SH.y + 6 }, { x: SH.x, y: S.y + 10 }, { x: S.x - 50, y: S.y }, { x: S.x - 8, y: S.y }]
    : [{ x: SH.x + 6, y: SH.y }, { x: S.x, y: SH.y }, { x: S.x, y: S.y - 50 }, { x: S.x, y: S.y - 8 }];
  const toRouter = narrow
    ? [{ x: L.tok.x, y: L.tok.y + 5 }, { x: L.tok.x, y: L.tok.y + 15 }, { x: R.x, y: R.y - 15 }, { x: R.x, y: R.y - 5 }]
    : [{ x: L.tok.x + 5, y: L.tok.y }, { x: L.tok.x + 30, y: L.tok.y }, { x: R.x - 30, y: R.y }, { x: R.x - 5, y: R.y }];
  const toOut = narrow
    ? [{ x: S.x, y: S.y + 8 }, { x: S.x, y: S.y + 16 }, { x: L.out.x, y: L.out.y - 14 }, { x: L.out.x, y: L.out.y - 5 }]
    : [{ x: S.x + 8, y: S.y }, { x: S.x + 30, y: S.y }, { x: L.out.x - 30, y: L.out.y }, { x: L.out.x - 5, y: L.out.y }];

  // Timeline: the first token slowly, the rest quicker
  const T0 = 300;
  const FIRST = 3800;
  const NEXT = 2500;
  const starts = WORDS.map((_, k) => (k ? T0 + FIRST + (k - 1) * NEXT : T0));
  const durs = WORDS.map((_, k) => (k ? NEXT : FIRST));
  const END = T0 + FIRST + (WORDS.length - 1) * NEXT;
  const LOOP = END + 1800;
  // Phases, as fractions of a token's time
  const PH = { in: [0, 0.1], route: [0.06, 0.2], shared: [0.06, 0.42], sweep: [0.2, 0.44], pick: [0.42, 0.54], send: [0.5, 0.66], fire: [0.64, 0.72], back: [0.7, 0.84], out: [0.82, 0.89], fade: [0.94, 1] };

  /** The token's (or output's) hidden vector, six cells along dir */
  function vector(ctx, at, vals, alpha, color = (a) => ink(a)) {
    for (let j = 0; j < 6; j++) {
      const o = (j - 2.5) * 7;
      const x = at.dir === 'v' ? at.x : at.x + o;
      const y = at.dir === 'v' ? at.y + o : at.y;
      ctx.fillStyle = color((0.15 + 0.7 * vals[j]) * alpha);
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
    }
  }

  function travelDot(ctx, p, k, color, r = 2.4) {
    if (k <= 0 || k >= 1) return;
    const q = bezPoint(p, ease(k));
    dot(ctx, q.x, q.y, r, color);
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    const a = loopAlpha(t, LOOP, 400, 700);
    ctx.save();
    ctx.globalAlpha = a;

    // Which token is in the layer, and how far through it is
    let k = WORDS.length - 1;
    for (let j = 0; j < WORDS.length; j++) if (t < starts[j] + durs[j]) { k = j; break; }
    const tk = tokens[k];
    const u = t < starts[0] ? 0 : (t - starts[k]) / durs[k];
    const ph = (name) => span(u, PH[name][0], PH[name][1]);
    const fade = t > END ? 0 : 1 - ph('fade');
    const live = t < END;

    // Lines, under the experts
    ctx.lineCap = 'round';
    ctx.strokeStyle = ink(0.28 * fade);
    ctx.lineWidth = 1;
    strokeCurve(ctx, toRouter, 0, live ? ease(ph('route')) : 0);
    strokeCurve(ctx, toShared, 0, live ? ease(span(u, 0.06, 0.22)) : 0);
    strokeCurve(ctx, fromShared, 0, live ? ease(ph('back')) : 0);
    strokeCurve(ctx, toOut, 0, live ? ease(ph('out')) : 0);
    if (live) {
      for (const i of tk.top) {
        const w = 0.4 + 9 * tk.g.get(i);
        ctx.lineWidth = w;
        ctx.strokeStyle = blue(0.55 * fade);
        strokeCurve(ctx, dispatch(i), 0, ease(ph('send')));
        ctx.strokeStyle = blue(0.4 * fade);
        strokeCurve(ctx, gather(i), 0, ease(ph('back')));
      }
    }

    // The 256 routed experts
    const sweep = ph('sweep');
    const pick = ph('pick');
    const fire = ph('fire');
    for (let i = 0; i < NR; i++) {
      const c = cell(i);
      let fill = ink(0.075);
      // Experts earlier tokens used keep a faint tint
      let used = 0;
      for (let j = 0; j < k; j++) if (tokens[j].g.has(i)) used = 1;
      if (t >= END && tk.g.has(i)) used = 1;
      if (used) fill = blue(0.2);
      ctx.fillStyle = fill;
      ctx.fillRect(c.x, c.y, C, C);
      if (!live) continue;
      // The router's sweep: each expert darkens with its score as the wave passes
      const col = i % 16;
      const row = Math.floor(i / 16);
      const at = narrow ? row / 15 : col / 15;
      const wave = span(sweep, at * 0.55, at * 0.55 + 0.25);
      const front = sweep > 0 && sweep < 1 ? Math.max(0, 1 - Math.abs(sweep - at * 0.55 - 0.08) / 0.09) : 0;
      const chosen = tk.g.has(i);
      const heat = (0.85 * tk.heat[i] * wave + 0.16 * front) * (1 - (chosen ? 0 : pick)) * fade;
      if (heat > 0.002) {
        ctx.fillStyle = ink(heat);
        ctx.fillRect(c.x, c.y, C, C);
      }
      if (chosen) {
        const b = span(pick, tk.rank.get(i) * 0.06, tk.rank.get(i) * 0.06 + 0.5) * fade;
        if (b > 0) {
          const grow = 1 + 0.35 * Math.sin(Math.PI * fire) * fade;
          const e = (C * grow - C) / 2;
          ctx.fillStyle = blue(b);
          ctx.fillRect(c.x - e, c.y - e, C + 2 * e, C + 2 * e);
        }
      }
    }

    // The shared expert: same size as one routed expert, and every token uses it
    const shFire = live ? Math.sin(Math.PI * span(u, 0.36, 0.5)) : 0;
    const se = 1.6 * shFire;
    ctx.fillStyle = ink(0.78);
    ctx.fillRect(L.shared.x - se, L.shared.y - se, C + 2 * se, C + 2 * se);

    // Router, sum, token and output
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = ink(0.55);
    ctx.beginPath();
    ctx.arc(R.x, R.y, 5, 0, TAU);
    ctx.stroke();
    if (live) dot(ctx, R.x, R.y, 2.2, ink(0.7 * Math.sin(Math.PI * span(u, 0.16, 0.42))));
    ctx.beginPath();
    ctx.arc(S.x, S.y, 8, 0, TAU);
    ctx.strokeStyle = ink(0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(S.x - 4, S.y);
    ctx.lineTo(S.x + 4, S.y);
    ctx.moveTo(S.x, S.y - 4);
    ctx.lineTo(S.x, S.y + 4);
    ctx.stroke();

    const wIn = t < starts[0] ? 0 : Math.min(ph('in') * 1, 1);
    if (live) {
      vector(ctx, L.tok, tk.vec, wIn * fade);
      vector(ctx, L.out, tk.out, ph('out') * fade);
    }

    // Pulses
    if (live) {
      travelDot(ctx, toRouter, span(u, 0.06, 0.18), ink(0.7));
      travelDot(ctx, toShared, span(u, 0.08, 0.38), ink(0.7));
      travelDot(ctx, fromShared, span(u, 0.7, 0.82), ink(0.7));
      for (const i of tk.top) {
        travelDot(ctx, dispatch(i), span(u, 0.52, 0.66), blue(0.95), 2.2);
        travelDot(ctx, gather(i), span(u, 0.7, 0.82), blue(0.95), 2.2);
      }
      travelDot(ctx, toOut, span(u, 0.82, 0.89), ink(0.7));
    }

    // Labels
    const lab = `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`;
    if (live) text(ctx, WORDS[k], L.word[0], L.word[1], { font: `500 ${narrow ? 16 : 17}px ${SERIF}`, color: ink(0.85 * wIn * fade), align: L.word[2] });
    text(ctx, 'router', L.routerLabel[0], L.routerLabel[1], { font: lab, color: ink(0.55), align: L.routerLabel[2], halo: PAGE });
    text(ctx, 'shared expert', L.sharedLabel[0], L.sharedLabel[1], { font: lab, color: ink(0.55), align: L.sharedLabel[2], halo: PAGE });
    for (const [x, y, al, s] of L.gridLabel) text(ctx, s, x, y, { font: lab, color: ink(0.55), align: al });
    const topA = live ? pick * fade : 0;
    if (topA > 0) text(ctx, `top ${KR}`, L.topLabel[0], L.topLabel[1], { font: `500 11px ${SANS}`, color: blue(0.9 * topA), align: L.topLabel[2] });
    text(ctx, 'weighted sum', L.sumLabel[0], L.sumLabel[1], { font: lab, color: ink(0.45), align: L.sumLabel[2], halo: PAGE });
    if (live) text(ctx, 'output', L.outLabel[0], L.outLabel[1], { font: lab, color: ink(0.55 * ph('out') * fade), align: L.outLabel[2] });
    ctx.restore();
  }, { still: starts[2] + durs[2] * 0.92 });
}

/* ───────────── 1B · Balance: the bias, step by step ───────────── */

// A small simulation of the auxiliary-loss-free strategy, run once: 16 routed experts, top 2,
// 2,048 tokens a step drawn around a skewed mean so a few experts start out popular. Each
// step routes every token by sigmoid score plus bias, counts each expert's load, then moves
// every bias by a fixed step γ: down if the expert took more than an even share, up if less.
// The bias only decides the top-k; it never enters the weights. Sizes and γ are illustrative
// (DeepSeek-V3: 256 experts, top 8, γ = 0.001).
const BALANCE = (() => {
  const NE = 16;
  const K = 2;
  const T = 2048;
  const STEPS = 60;
  const GAMMA = 0.005;
  const D = 6;
  const r = seeded(11);
  const E = Array.from({ length: NE }, () => Array.from({ length: D }, () => gauss(r)));
  const mu = Array.from({ length: D }, () => gauss(r) * 0.5);
  const even = (K * T) / NE;
  const b = new Float64Array(NE);
  const loads = [];
  const bias = [Array.from(b)];
  const s = new Float64Array(NE);
  const u = new Float64Array(D);
  for (let st = 0; st < STEPS; st++) {
    const load = new Float64Array(NE);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < D; j++) u[j] = mu[j] + gauss(r);
      for (let i = 0; i < NE; i++) {
        let dotp = 0;
        for (let j = 0; j < D; j++) dotp += E[i][j] * u[j];
        s[i] = sigmoid(dotp / Math.sqrt(D));
      }
      // Top K by score + bias
      let first = -1;
      let second = -1;
      for (let i = 0; i < NE; i++) {
        const v = s[i] + b[i];
        if (first < 0 || v > s[first] + b[first]) {
          second = first;
          first = i;
        } else if (second < 0 || v > s[second] + b[second]) second = i;
      }
      load[first]++;
      load[second]++;
    }
    loads.push(Array.from(load, (l) => l / even));
    for (let i = 0; i < NE; i++) b[i] += GAMMA * Math.sign(even - load[i]);
    bias.push(Array.from(b));
  }
  const bmax = Math.max(...bias.flat().map(Math.abs));
  return { NE, K, STEPS, GAMMA, loads, bias, bmax };
})();

function createBalance(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);
  const { NE, STEPS, loads, bias, bmax } = BALANCE;
  let L;
  if (!narrow) {
    L = { x0: 140, x1: 630, base: 228, unit: 46, cap: 3.3, bz: 300, bpx: 34, barW: 13, title: null, loadLabel: [40, 150], biasLabel: [40, 304], evenLabel: [638, 0, 'left'], step: [630, 40], note: [630, 360, 'right'] };
  } else {
    L = { x0: 62, x1: 340, base: 270, unit: 50, cap: 3.3, bz: 352, bpx: 32, barW: 9, title: [20, 52], loadLabel: null, biasLabel: [20, 356], evenLabel: [20, 0, 'left'], step: [340, 52], note: [20, 430, 'left'] };
  }
  const pitch = (L.x1 - L.x0) / NE;
  const X = (i) => L.x0 + (i + 0.5) * pitch;
  const evenY = L.base - L.unit;
  const bScale = L.bpx / bmax;

  // Step times: the first three slow enough to read, then a time-lapse
  const T0 = 500;
  const durs = Array.from({ length: STEPS }, (_, s) => (s === 0 ? 3000 : s === 1 ? 1500 : s === 2 ? 1100 : Math.max(85, 700 * 0.8 ** (s - 3))));
  const starts = [];
  let acc = T0;
  for (const d of durs) {
    starts.push(acc);
    acc += d;
  }
  const END = acc;
  const LOOP = END + 3200;
  const over = loads[0].indexOf(Math.max(...loads[0]));
  const under = loads[0].indexOf(Math.min(...loads[0]));

  function state(t) {
    if (t < T0) return { s: 0, k: 0, bk: 0, d: durs[0] };
    let s = STEPS - 1;
    for (let j = 0; j < STEPS; j++) if (t < starts[j] + durs[j]) { s = j; break; }
    const k = span(t, starts[s], starts[s] + durs[s] * 0.5);
    const bk = span(t, starts[s] + durs[s] * 0.6, starts[s] + durs[s] * 0.95);
    return { s, k, bk, d: durs[s] };
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    const a = loopAlpha(t, LOOP, 400, 700);
    ctx.save();
    ctx.globalAlpha = a;
    const { s, k, bk, d } = state(t);
    const slow = d > 600;
    const lab = `italic 400 ${narrow ? 12.5 : 13}px ${SERIF}`;
    const intro = span(t, 200, 700);

    // Baselines
    ctx.strokeStyle = ink(0.25 * intro);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L.x0 - 4, L.base + 0.5);
    ctx.lineTo(L.x1 + 4, L.base + 0.5);
    ctx.stroke();
    ctx.strokeStyle = ink(0.16 * intro);
    ctx.beginPath();
    ctx.moveTo(L.x0 - 4, L.bz + 0.5);
    ctx.lineTo(L.x1 + 4, L.bz + 0.5);
    ctx.stroke();

    // The step-1 loads stay behind as outlines once the time-lapse starts
    const ghost = span(t, starts[3], starts[3] + 600);
    if (ghost > 0) {
      ctx.strokeStyle = ink(0.2 * ghost);
      ctx.lineWidth = 1;
      for (let i = 0; i < NE; i++) {
        const h = Math.min(L.cap, loads[0][i]) * L.unit;
        ctx.strokeRect(Math.round(X(i) - L.barW / 2) + 0.5, L.base - h + 0.5, L.barW - 1, h);
      }
    }

    // Load bars, easing from the last step's loads to this step's; the part over an even share darker
    const grow = ease(k);
    for (let i = 0; i < NE; i++) {
      const prev = s === 0 ? 0 : loads[s - 1][i];
      const v = lerp(prev, loads[s][i], s === 0 ? grow : easeOut(k));
      const h = Math.min(L.cap, v) * L.unit;
      const x = Math.round(X(i) - L.barW / 2);
      const under = Math.min(h, L.unit);
      ctx.fillStyle = ink(0.24);
      ctx.fillRect(x, L.base - under, L.barW, under);
      if (h > L.unit) {
        ctx.fillStyle = ink(0.72);
        ctx.fillRect(x, L.base - h, L.barW, h - L.unit);
      }
    }

    // The even share
    const evenA = span(t, starts[0] + 900, starts[0] + 1400);
    if (evenA > 0) {
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = ink(0.55 * evenA);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(L.x0 - 4, evenY + 0.5);
      ctx.lineTo(lerp(L.x0 - 4, L.x1 + 4, ease(evenA)), evenY + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      const ex = L.evenLabel[0];
      text(ctx, 'even', ex, evenY + (narrow ? -6 : 4), { font: lab, color: ink(0.55 * evenA), align: L.evenLabel[2] });
    }

    // Biases: stems from zero, nudged by γ at the end of each step
    for (let i = 0; i < NE; i++) {
      const bv = lerp(bias[s][i], bias[s + 1][i], ease(bk));
      const y = L.bz - bv * bScale;
      ctx.strokeStyle = blue(0.85);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(i), L.bz);
      ctx.lineTo(X(i), y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      dot(ctx, X(i), y, 2.2, blue(0.95));
      // On the slow steps, a chevron shows which way each bias is about to move
      const dir = Math.sign(bias[s + 1][i] - bias[s][i]);
      if (slow && dir && t > starts[s]) {
        const ca = pulse(t, starts[s] + d * 0.5, starts[s] + d, 200, 250);
        if (ca > 0) {
          const cy = y - dir * 9;
          ctx.strokeStyle = blue(0.9 * ca);
          ctx.lineWidth = 1.3;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(X(i) - 3.5, cy + dir * 2.5);
          ctx.lineTo(X(i), cy - dir * 1.5);
          ctx.lineTo(X(i) + 3.5, cy + dir * 2.5);
          ctx.stroke();
        }
      }
    }

    // Step 1: name the most and least loaded experts
    const name = Math.min(span(t, starts[0] + 1200, starts[0] + 1600), 1 - span(t, starts[2], starts[2] + 500));
    // Centred over a column, but kept inside the frame
    const fit = (str, x, font) => {
      ctx.font = font;
      const w = ctx.measureText(str).width;
      return clamp(x, 16 + w / 2, W - 16 - w / 2);
    };
    if (name > 0) {
      const ho = Math.min(L.cap, loads[s][over]) * L.unit;
      text(ctx, 'overloaded', fit('overloaded', X(over), lab), L.base - ho - 8, { font: lab, color: ink(0.7 * name), align: 'center', halo: PAGE });
      text(ctx, 'underloaded', fit('underloaded', X(under), lab), L.base - 10, { font: lab, color: ink(0.7 * name), align: 'center', halo: PAGE });
    }
    if (ghost > 0) {
      const h = Math.min(L.cap, loads[0][over]) * L.unit;
      const f = `400 10px ${SANS}`;
      text(ctx, 'step 1', fit('step 1', X(over), f), L.base - h - 6, { font: f, color: ink(0.45 * ghost), align: 'center' });
    }

    // Labels
    if (L.loadLabel) text(ctx, 'expert load', L.loadLabel[0], L.loadLabel[1], { font: lab, color: ink(0.6 * intro) });
    if (L.title) text(ctx, 'expert load', L.title[0], L.title[1], { font: lab, color: ink(0.6 * intro) });
    text(ctx, 'bias', L.biasLabel[0], L.biasLabel[1], { font: lab, color: blue(0.9 * intro) });
    text(ctx, 'the bias moves the pick, never the weights', L.note[0], L.note[1], { font: `italic 400 ${narrow ? 12 : 12.5}px ${SERIF}`, color: ink(0.45 * intro), align: L.note[2] });
    if (t >= T0) text(ctx, `step ${s + 1}`, L.step[0], L.step[1], { font: `500 11px ${SANS}`, color: ink(0.55), align: 'right' });
    ctx.restore();
  }, { still: END + 1200 });
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
  return { route: fitted(createRoute), balance: fitted(createBalance) };
})();

/* ───────────── Inside a DeepSeek block: RMSNorm and SwiGLU ───────────── */

// rmsnorm · a vector divided by its root mean square until it meets the ±1 guides (the mean
//           isn't subtracted), then scaled entry by entry by the learned gains.
// swiglu  · the gate and up projections side by side, SiLU on the gate, the two multiplied column
//           by column, and W₂ back down to the model's width. Its input is rmsnorm's output.
// Their helpers and fitted() (a 680-wide design, or 360-wide on phones) stay inside this scope.
const DS_BLOCK = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254';
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = (k) => 1 - (1 - k) ** 3;
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Rise over [a, a + inMs], hold, fall over [b - outMs, b] */
const pulse = (t, a, b, inMs = 300, outMs = 300) => Math.min(span(t, a, a + inMs), 1 - span(t, b - outMs, b));
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const INK_RGB = INK.split(',').map(Number);
const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes 0 → 1 */
const tint = (k, a) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], clamp(k, 0, 1)))).join(', ')}, ${a})`;
const serif = (size, italic = true, weight = 400) => `${italic ? 'italic ' : ''}${weight} ${size}px ${SERIF}`;
const sans = (size, weight = 400) => `${weight} ${size}px ${SANS}`;

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

/* Vectors */
const rms = (v) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
const scaleV = (v, k) => v.map((x) => x * k);
const addV = (a, b) => a.map((x, i) => x + b[i]);
const lerpV = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const normV = (v) => scaleV(v, 1 / rms(v));
const matVec = (M, v) => M.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const randVec = (r, n, sd = 1) => Array.from({ length: n }, () => gauss(r) * sd);
const randMat = (r, rows, cols, sd) => Array.from({ length: rows }, () => randVec(r, cols, sd));
const silu = (x) => x / (1 + Math.exp(-x));

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

function text(ctx, str, x, y, { font = sans(11), color = ink(0.5), align = 'left', baseline = 'alphabetic', halo = 0 } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (halo) {
    ctx.save();
    ctx.strokeStyle = pageColor();
    ctx.lineWidth = halo;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

/**
 * A short run of maths in Newsreader: an array of pieces, each a string or { t, sub, roman, a }.
 * A piece with sub is set smaller and lower; a sets that piece's own alpha (0–1, times color's).
 */
function rich(ctx, pieces, x, y, { size = 13, color = [INK, 0.7], align = 'left', italic = true } = {}) {
  const parts = pieces.map((p) => (typeof p === 'string' ? { t: p } : p));
  const fontOf = (p) => serif(p.sub ? size * 0.72 : size, italic && !p.roman);
  let total = 0;
  for (const p of parts) {
    ctx.font = fontOf(p);
    p.w = ctx.measureText(p.t).width + (p.sub ? 0.5 : 0);
    total += p.w;
  }
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (const p of parts) {
    ctx.font = fontOf(p);
    ctx.fillStyle = `rgba(${color[0]}, ${color[1] * (p.a ?? 1)})`;
    ctx.fillText(p.t, cx, y + (p.sub ? size * 0.22 : 0));
    cx += p.w;
  }
  return total;
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/**
 * A vector drawn as a small bar chart: one signed bar per entry, up for positive, down for
 * negative, centred on (cx, cy). colorOf(i) can tint single bars.
 */
function glyph(ctx, vals, cx, cy, { pitch = 3, bw = 2, S = 6, clip = 16, color = blue(0.95), colorOf = null, alpha = 1, backing = 0, base = 0.25 } = {}) {
  if (alpha <= 0) return;
  const n = vals.length;
  const w = (n - 1) * pitch;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (backing) {
    ctx.save();
    ctx.globalAlpha *= backing;
    ctx.fillStyle = pageColor();
    rrect(ctx, cx - w / 2 - bw - 2, cy - clip - 2, w + bw * 2 + 4, clip * 2 + 4, 3);
    ctx.fill();
    ctx.restore();
  }
  if (base) {
    ctx.fillStyle = ink(base);
    ctx.fillRect(cx - w / 2 - bw / 2 - 1, cy - 0.35, w + bw + 2, 0.7);
  }
  for (let i = 0; i < n; i++) {
    const h = clamp(vals[i] * S, -clip, clip);
    const x = cx - w / 2 + i * pitch - bw / 2;
    ctx.fillStyle = colorOf ? colorOf(i) : color;
    if (h >= 0) ctx.fillRect(x, cy - h, bw, Math.max(h, 0.6));
    else ctx.fillRect(x, cy, bw, -h);
  }
  ctx.restore();
}

/** Piecewise-linear track through keyframes [t, value]; the first segment eases out */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return lerp(a, b, i === 1 ? easeOut(k) : k);
    }
  }
  return keys[keys.length - 1][1];
}

/* ═════════════ 1A · One token, 61 blocks ═════════════ */

// The residual stream is one line. Each of the 61 blocks reads from it twice and writes back:
// an arc above for attention (MLA), an arc below for the feed-forward (dense in the first three
// blocks, DeepSeekMoE in the other 58). A token's vector rides the line and the arcs light as it
// passes. After the last block, the final RMSNorm and the output head give the next token. Then
// the MTP branch: the last hidden state drops to a second line, meets the embedding of the true
// next token, passes one more block and the shared head, and predicts the token after that.
// Desktop runs left to right; phones run bottom to top, with the MTP line on the right.
let PAGE_CACHE = null;
const page = () => PAGE_CACHE || (PAGE_CACHE = pageColor());
const mixRGB = (a, b, k) => {
  const A = a.split(',').map(Number);
  const B = b.split(',').map(Number);
  return A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1)))).join(', ');
};
const easeOutBack = (k) => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2;

/** A small subset of TeX for labels: x^{KV}_{t} sets a superscript and a subscript after x */
function texParse(str) {
  const items = [];
  let i = 0;
  const group = () => {
    if (str[i] === '{') {
      const j = str.indexOf('}', i);
      const s = str.slice(i + 1, j);
      i = j + 1;
      return s;
    }
    return str[i++];
  };
  while (i < str.length) {
    const ch = str[i];
    if (ch === '^' || ch === '_') {
      i++;
      const s = group();
      const key = ch === '^' ? 'sup' : 'sub';
      const last = items[items.length - 1];
      if (last && last.script && !last[key]) last[key] = s;
      else items.push({ script: true, sup: key === 'sup' ? s : '', sub: key === 'sub' ? s : '' });
      continue;
    }
    let j = i;
    while (j < str.length && str[j] !== '^' && str[j] !== '_') j++;
    items.push({ t: str.slice(i, j) });
    i = j;
  }
  return items;
}

/** Draws a label with super- and subscripts, vertically centred on y; returns its width */
function tex(ctx, str, x, y, { size = 11, color = ink(0.7), align = 'left', weight = 400, measure = false } = {}) {
  const items = texParse(str);
  const fb = serif(size, true, weight);
  const fs = serif(size * 0.68, false);
  const fi = serif(size * 0.68, true);
  let w = 0;
  for (const it of items) {
    if (it.script) {
      ctx.font = fs;
      const a = it.sup ? ctx.measureText(it.sup).width : 0;
      ctx.font = fi;
      const b = it.sub ? ctx.measureText(it.sub).width : 0;
      it.w = Math.max(a, b) + size * 0.1;
    } else {
      ctx.font = fb;
      it.w = ctx.measureText(it.t).width;
    }
    w += it.w;
  }
  if (measure) return w;
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const by = y + size * 0.32;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  for (const it of items) {
    if (it.script) {
      if (it.sup) {
        ctx.font = fs;
        ctx.fillText(it.sup, cx + size * 0.07, by - size * 0.42);
      }
      if (it.sub) {
        ctx.font = fi;
        ctx.fillText(it.sub, cx + size * 0.02, by + size * 0.24);
      }
    } else {
      ctx.font = fb;
      ctx.fillText(it.t, cx, by);
    }
    cx += it.w;
  }
  return w;
}

/** A polyline through corner points, inner corners rounded, with its length for drawing it on */
function poly(pts, rad = 0) {
  let P = pts.map((p) => [...p]);
  if (rad && pts.length > 2) {
    P = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1];
      const [cx, cy] = pts[i];
      const [nx, ny] = pts[i + 1];
      const d0 = Math.hypot(cx - px, cy - py);
      const d1 = Math.hypot(nx - cx, ny - cy);
      const rr = Math.min(rad, d0 / 2, d1 / 2);
      const a = [cx - ((cx - px) / d0) * rr, cy - ((cy - py) / d0) * rr];
      const b = [cx + ((nx - cx) / d1) * rr, cy + ((ny - cy) / d1) * rr];
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        const v = 1 - u;
        P.push([v * v * a[0] + 2 * v * u * cx + u * u * b[0], v * v * a[1] + 2 * v * u * cy + u * u * b[1]]);
      }
    }
    P.push(pts[pts.length - 1]);
  }
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, cum, len: cum[cum.length - 1] };
}

function polyAt(E, k) {
  const s = clamp(k, 0, 1) * E.len;
  for (let i = 1; i < E.P.length; i++) {
    if (s <= E.cum[i] || i === E.P.length - 1) {
      const f = (s - E.cum[i - 1]) / (E.cum[i] - E.cum[i - 1] || 1);
      return [lerp(E.P[i - 1][0], E.P[i][0], f), lerp(E.P[i - 1][1], E.P[i][1], f)];
    }
  }
  return E.P[E.P.length - 1];
}

function strokePoly(ctx, E, k, style, width, dash = null) {
  if (k <= 0) return;
  const s = clamp(k, 0, 1) * E.len;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(E.P[0][0], E.P[0][1]);
  for (let i = 1; i < E.P.length; i++) {
    if (E.cum[i] <= s) ctx.lineTo(E.P[i][0], E.P[i][1]);
    else {
      const f = (s - E.cum[i - 1]) / (E.cum[i] - E.cum[i - 1] || 1);
      ctx.lineTo(lerp(E.P[i - 1][0], E.P[i][0], f), lerp(E.P[i - 1][1], E.P[i][1], f));
      break;
    }
  }
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

function arrowEnd(ctx, E, style, width, size = 3.2) {
  const [x1, y1] = E.P[E.P.length - 1];
  const [x0, y0] = polyAt(E, Math.max(0, 1 - 3 / E.len));
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(x1 - size * Math.cos(a - 0.55), y1 - size * Math.sin(a - 0.55));
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - size * Math.cos(a + 0.55), y1 - size * Math.sin(a + 0.55));
  ctx.stroke();
}

/** An edge: faint when idle, drawn on in ink (or blue) as k goes 0 → 1, a dot riding its tip */
function link(ctx, E, k, px, { idle = 0.2, on = 0.72, rgb = INK, dash = null, arrow = true, dot = true, halo = false, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (halo) strokePoly(ctx, E, 1, page(), 4.5 * px);
  if (idle > 0) strokePoly(ctx, E, 1, ink(idle), px, dash);
  if (k > 0) strokePoly(ctx, E, k, `rgba(${rgb}, ${on})`, 1.35 * px, dash);
  if (arrow) arrowEnd(ctx, E, k >= 1 ? `rgba(${rgb}, ${on})` : ink(idle + 0.12), (k >= 1 ? 1.35 : 1) * px);
  if (dot && k > 0 && k < 1) {
    const [x, y] = polyAt(E, k);
    ctx.fillStyle = `rgba(${rgb}, 1)`;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A vector as a row of circles (the paper's notation); fill runs left to right; heads adds per-head copies behind */
function dotRow(ctx, cx, cy, n, { pitch = 9, r = 3.4, px = 1, fill = 0, rgbOf = () => INK, heads = 0, spread = 0, alpha = 1 } = {}) {
  const x0 = cx - ((n - 1) * pitch) / 2;
  for (let j = spread > 0 ? heads : 0; j >= 0; j--) {
    const d = j * spread * 2.6;
    const a = (j ? 0.55 / j : 1) * alpha;
    for (let i = 0; i < n; i++) {
      const f = clamp(fill * n - i, 0, 1);
      const rgb = rgbOf(i);
      const x = x0 + i * pitch + d;
      const y = cy - d;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = page();
      ctx.fill();
      if (f > 0) {
        ctx.fillStyle = `rgba(${rgb}, ${0.88 * f * a})`;
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${f > 0 ? rgb : INK}, ${lerp(0.42, 0.9, f) * a})`;
      ctx.lineWidth = px;
      ctx.stroke();
    }
  }
}

/** A box with centred lines of text; solid fills it with ink (shared expert), sel tints it blue (chosen routed expert) */
function nbox(ctx, x, y, w, h, { px = 1, k = 0, lines = [], size = 11, sub = null, subSize = 8.5, solid = 0, sel = 0, alpha = 1, r = 4, idle = 0.32, labelA = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  rrect(ctx, x - w / 2, y - h / 2, w, h, r);
  ctx.fillStyle = page();
  ctx.fill();
  if (solid) {
    ctx.fillStyle = ink(lerp(0.62, 0.86, k));
    ctx.fill();
  }
  if (sel) {
    ctx.fillStyle = blue(0.13 * sel);
    ctx.fill();
  }
  ctx.strokeStyle = sel ? tint(sel, lerp(idle, 0.95, Math.max(k, sel))) : ink(lerp(idle, 0.85, k));
  ctx.lineWidth = px * (1 + 0.35 * k);
  ctx.stroke();
  const tc = solid ? page() : sel ? tint(sel, lerp(0.62, 0.95, sel)) : ink(lerp(0.62, 0.9, k));
  const lh = size * 1.15;
  const subH = sub ? subSize * 1.35 : 0;
  let ty = y - (lines.length * lh + subH) / 2 + lh / 2;
  ctx.save();
  ctx.globalAlpha *= labelA;
  for (const L of lines) {
    tex(ctx, L, x, ty, { size, color: tc, align: 'center' });
    ty += lh;
  }
  if (sub) text(ctx, sub, x, ty - lh / 2 + subH / 2, { font: sans(subSize), color: ink(0.48), align: 'center', baseline: 'middle' });
  ctx.restore();
  ctx.restore();
}

/** ⊕ (add) or ⊗ (scale by a gating weight) */
function opMark(ctx, x, y, r, kind, { px = 1, k = 0, alpha = 1, rgb = INK } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = page();
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb}, ${lerp(0.5, 0.95, k)})`;
  ctx.lineWidth = px * (1.1 + 0.35 * k);
  ctx.stroke();
  const a = r * 0.52;
  ctx.beginPath();
  if (kind === '+') {
    ctx.moveTo(x - a, y);
    ctx.lineTo(x + a, y);
    ctx.moveTo(x, y - a);
    ctx.lineTo(x, y + a);
  } else {
    const b = a * 0.78;
    ctx.moveTo(x - b, y - b);
    ctx.lineTo(x + b, y + b);
    ctx.moveTo(x + b, y - b);
    ctx.lineTo(x - b, y + b);
  }
  ctx.stroke();
  ctx.restore();
}

/** RoPE: a small dial whose hand turns as the rotation is applied */
function ropeMark(ctx, x, y, ang, { px = 1, k = 0 } = {}) {
  const r = 4.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = page();
  ctx.fill();
  ctx.strokeStyle = ink(lerp(0.45, 0.9, k));
  ctx.lineWidth = px;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + r * Math.cos(ang), y + r * Math.sin(ang));
  ctx.lineWidth = px * 1.5;
  ctx.stroke();
}

/* ═════════════ RMSNorm and SwiGLU, each on its own ═════════════ */

/**
 * 2A's vector and its RMSNorm, shared by the two standalone figures so RMSNorm's output is
 * exactly SwiGLU's input. Same seed and draw order as 2A, so the values match it too.
 */
function normExample() {
  const n = 12;
  const r = seeded(29);
  const x = randVec(r, n, 1.25).map((v) => clamp(v + 0.55, -2.6, 3.1));
  const g = Array.from({ length: n }, () => 0.6 + r() * 0.85);
  const xr = rms(x);
  const xg = x.map((v, i) => (v / xr) * g[i]);
  return { n, r, x, g, xr, xg, mean: x.reduce((s, v) => s + v, 0) / n };
}

/** A number drawn with every digit in a cell of the same width, so it doesn't shimmy as it counts */
function digits(ctx, str, x, y, { font = sans(11, 500), color = ink(0.6), align = 'left' } = {}) {
  ctx.font = font;
  let cell = 0;
  for (const d of '0123456789') cell = Math.max(cell, ctx.measureText(d).width);
  const wOf = (ch) => (ch >= '0' && ch <= '9' ? cell : ctx.measureText(ch).width);
  const width = [...str].reduce((s, ch) => s + wOf(ch), 0);
  let cx = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const ch of str) {
    const w = wOf(ch);
    ctx.fillText(ch, cx + w / 2, y);
    cx += w;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return width;
}

/* ───────────── RMSNorm ───────────── */

// One vector, large. Its root mean square appears as a pair of blue dashed lines with the value
// beside them; the vector is divided by it, the lines close in on the ±1 guides and the value
// counts down to 1.00. A dotted line marks the mean, which scales along with everything and is
// never moved to zero. Then each entry is multiplied by its own learned gain, left to right.
// Twelve entries and every value are illustrative; the arithmetic is exact.
function createRMSNorm(W, H, dpr) {
  const narrow = W < 520;
  const { n, x, g, xr, mean } = normExample();
  const T = { x: 300, rms: 1300, mean: 2000, div: 2700, gain: 4300, scale: 4800 };
  const LOOP = 10000;
  const backdrop = makeBackdrop(W, H, dpr);
  const LY = narrow
    ? { title: [18, 28], cx: 176, cy: 228, pitch: 21, bw: 12, S: 32, gainY: 96, gainS: 17, guide: [44, 308], formula: [180, 382], def: [180, 411], note: [180, 435], fsize: 19, dsize: 13 }
    : { title: [40, 40], cx: 320, cy: 202, pitch: 26, bw: 14, S: 30, gainY: 86, gainS: 16, guide: [156, 484], formula: [320, 322], def: [320, 351], note: null, fsize: 20, dsize: 13.5 };
  const w = (n - 1) * LY.pitch;
  const left = LY.cx - w / 2 - LY.bw / 2;
  const right = LY.cx + w / 2 + LY.bw / 2;
  const barX = (i) => LY.cx - w / 2 + i * LY.pitch;

  function dashedPair(ctx, k, color, dash, x0, x1) {
    ctx.save();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const s of [1, -1]) {
      const y = Math.round(LY.cy - s * k * LY.S) + 0.5;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP);

    const grow = ease(span(t, T.x, T.x + 700));
    const div = ease(span(t, T.div, T.div + 1200));
    const scaleNow = lerp(1, 1 / xr, div);
    const gk = (i) => ease(span(t, T.scale + i * 80, T.scale + i * 80 + 420));
    const vals = x.map((v, i) => v * scaleNow * grow * lerp(1, g[i], gk(i)));
    const [g0, g1] = LY.guide;

    // ±1: where the RMS lines are headed
    const gA = span(t, T.x, T.x + 400);
    dashedPair(ctx, 1, ink(0.3 * gA), [2, 3], g0, g1);
    text(ctx, '1', g1 + 7, LY.cy - LY.S, { font: sans(10.5), color: ink(0.45 * gA), baseline: 'middle' });
    text(ctx, '−1', g1 + 7, LY.cy + LY.S, { font: sans(10.5), color: ink(0.45 * gA), baseline: 'middle' });

    // The mean, scaled along with the vector and never subtracted
    const meanK = pulse(t, T.mean, T.scale + 300, 350, 450);
    if (meanK > 0) {
      const y = Math.round(LY.cy - mean * scaleNow * LY.S) + 0.5;
      ctx.save();
      ctx.setLineDash([1, 3]);
      ctx.strokeStyle = ink(0.55 * meanK);
      ctx.beginPath();
      ctx.moveTo(g0, y);
      ctx.lineTo(right + 4, y);
      ctx.stroke();
      ctx.restore();
      if (narrow) text(ctx, 'mean', g0 - 4, y, { font: sans(10), color: ink(0.6 * meanK), align: 'right', baseline: 'middle' });
      else {
        text(ctx, 'mean', g0 - 6, y - 7, { font: sans(10.5), color: ink(0.6 * meanK), align: 'right', baseline: 'middle' });
        text(ctx, 'not subtracted', g0 - 6, y + 7, { font: sans(10.5), color: ink(0.45 * meanK), align: 'right', baseline: 'middle' });
      }
    }

    // The vector; while its gain is applied, an entry and its gain light together
    const lit = (i) => gk(i) > 0.02 && gk(i) < 0.98;
    glyph(ctx, vals, LY.cx, LY.cy, { pitch: LY.pitch, bw: LY.bw, S: LY.S, clip: 200, colorOf: (i) => (lit(i) ? blue(0.95) : ink(0.78)), base: 0.35 });

    // RMS: the pair of lines and the value, live as the vector is divided
    const rmsK = pulse(t, T.rms, T.scale + 500, 400, 500);
    if (rmsK > 0) {
      const open = ease(span(t, T.rms, T.rms + 600));
      const level = xr * scaleNow * open;
      dashedPair(ctx, level, blue(0.9 * rmsK), [5, 3], g0 - 6, g1 + 2);
      const y = LY.cy - level * LY.S;
      const value = (xr * scaleNow).toFixed(2);
      if (narrow) {
        text(ctx, 'rms', g1 + 20, y - 7, { font: serif(12.5), color: blue(0.95 * rmsK), baseline: 'middle' });
        digits(ctx, value, g1 + 20, y + 7, { font: sans(10.5, 500), color: blue(0.95 * rmsK) });
      } else {
        text(ctx, 'rms', g1 + 26, y, { font: serif(13.5), color: blue(0.95 * rmsK), baseline: 'middle' });
        digits(ctx, value, g1 + 50, y, { font: sans(11.5, 500), color: blue(0.95 * rmsK) });
      }
    }

    // Learned gains: thin bars above, one per entry
    const gnA = pulse(t, T.gain, LOOP - 900, 350, 600);
    if (gnA > 0) {
      for (let i = 0; i < n; i++) {
        const hgt = g[i] * LY.gainS * ease(span(t, T.gain + i * 25, T.gain + 300 + i * 25));
        ctx.fillStyle = lit(i) ? blue(1) : blue(0.55 + 0.3 * (gk(i) > 0.98 ? 0 : 1));
        ctx.fillRect(barX(i) - 1.25, LY.gainY - hgt, 2.5, hgt);
      }
      ctx.fillStyle = ink(0.25 * gnA);
      ctx.fillRect(left - 2, LY.gainY, right - left + 4, 0.75);
      text(ctx, 'g', left - 12, LY.gainY - 6, { font: serif(15), color: blue(0.95 * gnA), align: 'right', baseline: 'middle' });
      if (!narrow) text(ctx, 'learned, one per entry', right + 10, LY.gainY - 6, { font: sans(10.5), color: ink(0.45 * gnA), baseline: 'middle' });
    }

    // The formula, term by term, and the RMS it divides by
    const fa = (t0) => lerp(0.22, 1, span(t, t0, t0 + 400));
    rich(ctx, [{ t: 'x', a: fa(T.x) }, { t: ' ÷ rms(x)', a: fa(T.div) }, { t: ' ⊙ g', a: fa(T.scale) }], LY.formula[0], LY.formula[1], { size: LY.fsize, color: [INK, 0.85], align: 'center' });
    const dA = span(t, T.rms, T.rms + 500);
    if (dA > 0) {
      ctx.font = serif(LY.dsize);
      const def = 'rms(x) = √mean(x²) = ';
      const w1 = ctx.measureText(def).width;
      ctx.font = sans(LY.dsize - 2, 500);
      const w2 = ctx.measureText(xr.toFixed(2)).width;
      const x0 = LY.def[0] - (w1 + w2) / 2;
      text(ctx, def, x0, LY.def[1], { font: serif(LY.dsize), color: ink(0.55 * dA), baseline: 'middle' });
      digits(ctx, xr.toFixed(2), x0 + w1, LY.def[1], { font: sans(LY.dsize - 2, 500), color: blue(0.9 * dA) });
    }
    if (LY.note) text(ctx, 'no mean is subtracted', LY.note[0], LY.note[1], { font: sans(10.5), color: ink(0.45 * span(t, T.mean, T.mean + 400)), align: 'center', baseline: 'middle' });
    text(ctx, 'RMSNorm', LY.title[0], LY.title[1], { font: serif(narrow ? 16 : 17, true, 500), color: ink(0.85), baseline: 'middle' });
    ctx.restore();
  }, { still: 4100 });
}

/* ───────────── SwiGLU ───────────── */

// RMSNorm's output goes in. W₁ and W₃ project it up to the hidden size (gate and up rows), SiLU
// bends the gate (its curve is drawn beside, each gate value landing on it), and the gate and
// up rows are multiplied column by column into the row between them. W₂ projects the product
// back down to the model's width. The size labels are a dense FFN's (blocks 1 to 3); the bar
// counts (12 and 20) and every value are illustrative, the arithmetic exact.
function createSwiGLU(W, H, dpr) {
  const narrow = W < 520;
  const ex = normExample();
  const { n, r, xg } = ex;
  const m = 20;
  const W1 = randMat(r, m, n, 1.24 / Math.sqrt(n));
  const W3 = randMat(r, m, n, 1.24 / Math.sqrt(n));
  const W2 = randMat(r, n, m, 1.1 / Math.sqrt(m));
  const a = matVec(W1, xg);
  const b = matVec(W3, xg);
  const sa = a.map(silu);
  const p = sa.map((v, i) => v * b[i]);
  const out = matVec(W2, p);
  const T = { x: 300, proj: 1100, silu: 2300, mul: 3700, down: 5700 };
  const MUL_MS = 1800;
  const LOOP = 11400;
  const backdrop = makeBackdrop(W, H, dpr);

  const LY = narrow
    ? {
        title: [18, 26], formula: [18, 50], fsize: 13.5,
        X: { cx: 150, cy: 104, pitch: 7.5, bw: 4.6, S: 14, clip: 28 }, xLab: [100, 104, 'right'], xDim: [200, 104, 'left'],
        rows: { cx: 180, pitch: 13, bw: 7.5 }, gate: { cy: 194, S: 12, clip: 24 }, prod: { cy: 270, S: 17, clip: 24 }, up: { cy: 346, S: 12, clip: 24 },
        plot: [262, 330, 70, 122], O: { cx: 190, cy: 432, pitch: 7.5, bw: 4.6, S: 14, clip: 24 }, oLab: [136, 432, 'right'], oDim: null,
        note: [180, 470, 'center']
      }
    : {
        title: [36, 34], formula: [36, 60], fsize: 15,
        X: { cx: 76, cy: 206, pitch: 6.5, bw: 4, S: 17, clip: 44 }, xLab: [76, 152, 'center'], xDim: [76, 262, 'center'],
        rows: { cx: 296, pitch: 9, bw: 5.2 }, gate: { cy: 112, S: 14, clip: 30 }, prod: { cy: 206, S: 20, clip: 30 }, up: { cy: 300, S: 14, clip: 30 },
        plot: [404, 492, 74, 146], O: { cx: 562, cy: 206, pitch: 6.5, bw: 4, S: 17, clip: 44 }, oLab: [562, 152, 'center'], oDim: [562, 262, 'center'],
        note: [36, 364, 'left']
      };
  const R = LY.rows;
  const rw = (m - 1) * R.pitch;
  const rLeft = R.cx - rw / 2 - R.bw / 2;
  const rRight = R.cx + rw / 2 + R.bw / 2;
  const colX = (i) => R.cx - rw / 2 + i * R.pitch;
  const xw = (spec, k) => (k - 1) * spec.pitch + spec.bw;
  const X = LY.X;
  const O = LY.O;

  // Connectors
  const E = narrow
    ? {
        w1: poly([[X.cx, X.cy + X.clip + 2], [X.cx, LY.gate.cy - LY.gate.clip - 6]]),
        w3: poly([[X.cx - 24, X.cy + X.clip + 2], [X.cx - 24, X.cy + X.clip + 16], [24, X.cy + X.clip + 16], [24, LY.up.cy], [rLeft - 6, LY.up.cy]], 10),
        w2: poly([[rRight + 6, LY.prod.cy], [340, LY.prod.cy], [340, O.cy], [O.cx + xw(O, n) / 2 + 6, O.cy]], 12)
      }
    : {
        w1: poly([[X.cx + xw(X, n) / 2 + 4, X.cy], [150, X.cy], [150, LY.gate.cy], [rLeft - 8, LY.gate.cy]], 16),
        w3: poly([[X.cx + xw(X, n) / 2 + 4, X.cy], [150, X.cy], [150, LY.up.cy], [rLeft - 8, LY.up.cy]], 16),
        w2: poly([[rRight + 8, LY.prod.cy], [O.cx - xw(O, n) / 2 - 8, O.cy]])
      };

  function siluPlot(ctx, k, gateK) {
    if (k <= 0) return;
    const [x0, x1, y0, y1] = LY.plot;
    const X0 = -4;
    const X1 = 3;
    const Y0 = -0.6;
    const Y1 = 3;
    const px = (u) => lerp(x0, x1, (u - X0) / (X1 - X0));
    const py = (v) => lerp(y1, y0, (v - Y0) / (Y1 - Y0));
    ctx.save();
    ctx.globalAlpha *= k;
    ctx.strokeStyle = ink(0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, Math.round(py(0)) + 0.5);
    ctx.lineTo(x1, Math.round(py(0)) + 0.5);
    ctx.moveTo(Math.round(px(0)) + 0.5, y0);
    ctx.lineTo(Math.round(px(0)) + 0.5, y1);
    ctx.stroke();
    // y = x, faint, for comparison
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = ink(0.18);
    ctx.beginPath();
    ctx.moveTo(px(Y0), py(Y0));
    ctx.lineTo(px(X1), py(X1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = blue(0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const u = lerp(X0, X1, i / 60);
      if (i) ctx.lineTo(px(u), py(silu(u)));
      else ctx.moveTo(px(u), py(silu(u)));
    }
    ctx.stroke();
    // each gate value, landing on the curve as it is bent
    for (let i = 0; i < m; i++) {
      const kk = gateK(i);
      if (kk <= 0) continue;
      const u = clamp(a[i], X0, X1);
      ctx.fillStyle = ink(0.75 * Math.min(1, kk * 2));
      ctx.beginPath();
      ctx.arc(px(u), py(lerp(u, silu(u), kk)), 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    text(ctx, 'SiLU', (x0 + x1) / 2, y0 - 10, { font: serif(narrow ? 12.5 : 13.5), color: blue(0.95), align: 'center', baseline: 'middle' });
    ctx.restore();
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP);
    const fa = (t0) => lerp(0.22, 1, span(t, t0, t0 + 400));

    text(ctx, 'SwiGLU', LY.title[0], LY.title[1], { font: serif(narrow ? 16 : 17, true, 500), color: ink(0.85), baseline: 'middle' });
    rich(ctx, [
      { t: 'W', a: fa(T.down) }, { t: '2', sub: true, a: fa(T.down) }, { t: '( ', a: fa(T.down) },
      { t: 'SiLU(', a: fa(T.silu) }, { t: 'W', a: fa(T.proj) }, { t: '1', sub: true, a: fa(T.proj) }, { t: 'x', a: fa(T.x) }, { t: ')', a: fa(T.silu) },
      { t: ' ⊙ ', a: fa(T.mul) }, { t: 'W', a: fa(T.proj) }, { t: '3', sub: true, a: fa(T.proj) }, { t: 'x', a: fa(T.x) }, { t: ' )', a: fa(T.down) }
    ], LY.formula[0], LY.formula[1] + 5, { size: LY.fsize, color: [INK, 0.82], align: 'left' });

    // The input
    const xk = (i) => ease(span(t, T.x + i * 30, T.x + 450 + i * 30));
    glyph(ctx, xg.map((v, i) => v * xk(i)), X.cx, X.cy, { ...X, color: ink(0.78), base: 0.35 });
    const lab = (str, [lx, ly, al], a, font = serif(narrow ? 13 : 14)) => text(ctx, str, lx, ly, { font, color: ink(a), align: al, baseline: 'middle' });
    lab('x', LY.xLab, 0.7 * span(t, T.x, T.x + 300));
    lab('7,168', LY.xDim, 0.45 * span(t, T.x, T.x + 300), sans(10));

    // W₁ and W₃: up to the hidden size
    const pk = span(t, T.proj, T.proj + 600);
    const pIn = span(t, T.proj - 250, T.proj);
    link(ctx, E.w1, pk, 1, { idle: 0.12, on: 0.4, alpha: pIn });
    link(ctx, E.w3, pk, 1, { idle: 0.12, on: 0.4, alpha: pIn });
    const pA = span(t, T.proj + 300, T.proj + 700);
    if (narrow) {
      rich(ctx, ['W', { t: '1', sub: true }], X.cx + 8, (X.cy + X.clip + LY.gate.cy - LY.gate.clip) / 2 + 4, { size: 13, color: [INK, 0.62 * pA] });
      rich(ctx, ['W', { t: '3', sub: true }], 30, (LY.prod.cy + LY.up.cy) / 2 + 4, { size: 13, color: [INK, 0.62 * pA] });
    } else {
      rich(ctx, ['W', { t: '1', sub: true }], 158, (X.cy + LY.gate.cy) / 2 + 4, { size: 14, color: [INK, 0.62 * pA] });
      rich(ctx, ['W', { t: '3', sub: true }], 158, (X.cy + LY.up.cy) / 2 + 4, { size: 14, color: [INK, 0.62 * pA] });
    }
    const rk = (i) => ease(span(t, T.proj + 350 + i * 22, T.proj + 750 + i * 22));
    const gateK = (i) => ease(span(t, T.silu + 350 + i * 45, T.silu + 750 + i * 45));
    const sweep = (t - T.mul) / MUL_MS;
    const col = sweep >= 0 && sweep < 1 ? Math.floor(sweep * m) : -1;
    const done = (i) => (sweep >= 1 ? 1 : sweep < 0 ? 0 : i < col ? 1 : i === col ? ease(sweep * m - col) : 0);

    // The column being multiplied, a light band across the three rows
    if (col >= 0) {
      ctx.fillStyle = blue(0.1);
      ctx.fillRect(colX(col) - R.pitch / 2 + 0.5, LY.gate.cy - LY.gate.clip - 4, R.pitch - 1, LY.up.cy + LY.up.clip + 4 - (LY.gate.cy - LY.gate.clip - 4));
    }
    const rowGlyph = (vals, spec, colorOf, alpha = 1) => glyph(ctx, vals, R.cx, spec.cy, { pitch: R.pitch, bw: R.bw, S: spec.S, clip: spec.clip, colorOf, alpha, base: 0.3 });
    const bending = (i) => gateK(i) > 0.02 && gateK(i) < 0.98;
    rowGlyph(a.map((v, i) => lerp(v, sa[i], gateK(i)) * rk(i)), LY.gate, (i) => (i === col || bending(i) ? blue(1) : ink(0.78)), span(t, T.proj + 300, T.proj + 500));
    rowGlyph(b.map((v, i) => v * rk(i)), LY.up, (i) => (i === col ? blue(1) : ink(0.78)), span(t, T.proj + 300, T.proj + 500));
    rowGlyph(p.map((v, i) => v * done(i)), LY.prod, (i) => (i === col ? blue(1) : ink(0.78)), span(t, T.mul - 300, T.mul));
    const rowLab = (str, spec, a, font) => text(ctx, str, R.cx, spec.cy + spec.clip + (narrow ? 9 : 10), { font, color: ink(a), align: 'center', baseline: 'middle' });
    rowLab('gate, 18,432', LY.gate, 0.48 * pA, sans(10));
    rowLab('up, 18,432', LY.up, 0.48 * pA, sans(10));
    rowLab('SiLU(gate) ⊙ up', LY.prod, 0.62 * span(t, T.mul - 300, T.mul), serif(narrow ? 12.5 : 13));
    siluPlot(ctx, span(t, T.silu, T.silu + 350), gateK);

    // W₂: back down to the model's width
    const dk = span(t, T.down, T.down + 500);
    link(ctx, E.w2, dk, 1, { idle: 0.12, on: 0.4, alpha: span(t, T.down - 250, T.down) });
    const dA = span(t, T.down + 200, T.down + 600);
    if (narrow) rich(ctx, ['W', { t: '2', sub: true }], 334, (LY.up.cy + LY.up.clip + O.cy) / 2 + 4, { size: 13, color: [INK, 0.62 * dA], align: 'right' });
    else rich(ctx, ['W', { t: '2', sub: true }], (rRight + O.cx - xw(O, n) / 2) / 2, LY.prod.cy - 12, { size: 14, color: [INK, 0.62 * dA], align: 'center' });
    const ok = (i) => ease(span(t, T.down + 350 + i * 35, T.down + 750 + i * 35));
    glyph(ctx, out.map((v, i) => v * ok(i)), O.cx, O.cy, { ...O, color: blue(0.95), alpha: span(t, T.down + 300, T.down + 500), base: 0.35 });
    if (LY.oDim) {
      lab('output', LY.oLab, 0.7 * dA);
      lab('7,168', LY.oDim, 0.45 * dA, sans(10));
    } else {
      text(ctx, '7,168', LY.oLab[0], LY.oLab[1], { font: sans(10), color: ink(0.45 * dA), align: 'right', baseline: 'middle' });
      ctx.font = sans(10);
      lab('output', [LY.oLab[0] - ctx.measureText('7,168').width - 6, LY.oLab[1], 'right'], 0.7 * dA);
    }
    text(ctx, 'sizes of a dense FFN; each MoE expert is 7,168 → 2,048 → 7,168', LY.note[0], LY.note[1], { font: sans(narrow ? 9 : 10), color: ink(0.42 * span(t, T.proj, T.proj + 600)), align: LY.note[2], baseline: 'middle' });
    ctx.restore();
  }, { still: 8600 });
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
  return { rmsnorm: fitted(createRMSNorm), swiglu: fitted(createSwiGLU) };
})();

/* ───────────── Multi-Head Latent Attention and its compressed cache ───────────── */

// squares · MLA counted to scale, one square per 64 numbers: the hidden state (7,168) compresses
//           into the latent c^KV (512), and every head's keys and values (128 heads × 128 each)
//           are recovered from it; the latent is what stays in the cache.
// memory  · one layer's worth of memory filled two ways: every head's keys and values (32,768 a
//           token) fill it after 4 tokens, the latent and rotary key (576 a token) after 227.
// Sizes are DeepSeek-V3's (report §4.2). Helpers and fitted() stay inside this scope.
const DS_MLA = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254';
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;

// DeepSeek-V3 (arXiv 2412.19437, section 4.2)
const D_MODEL = 7168;
const N_HEADS = 128;
const D_HEAD = 128;
const D_C = 512;
const D_ROPE = 64;
const MHA_PER_TOKEN = 2 * N_HEADS * D_HEAD;   // 32,768
const MLA_PER_TOKEN = D_C + D_ROPE;           // 576
const SQUARE = 64;                            // numbers per square in the squares figures

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeIn = (k) => k * k * k;
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** 0 → 1 → 0 over [a, b] */
const bump = (t, a, b) => Math.sin(Math.PI * span(t, a, b));
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const INK_RGB = INK.split(',').map(Number);
const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes 0 → 1 */
const inkToBlue = (k, a) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], k))).join(', ')}, ${a})`;
const fmt = (n) => n.toLocaleString('en-US');

// Seeded randomness, so each loop plays out the same way every time
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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', halo = 0 } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  if (halo) {
    ctx.save();
    ctx.strokeStyle = pageColor();
    ctx.lineWidth = halo;
    ctx.lineJoin = 'round';
    ctx.strokeText(str, x, y);
    ctx.restore();
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
}

/**
 * A symbol with a script, as in the paper: an italic letter and an upright superscript
 * (c^KV, W^DKV). Returns its width.
 */
function symbol(ctx, base, sup, x, y, { size = 14, color = ink(0.6), align = 'left', halo = 0 } = {}) {
  const fBase = `italic 400 ${size}px ${SERIF}`;
  const fSup = `400 ${Math.round(size * 0.64 * 10) / 10}px ${SERIF}`;
  ctx.font = fBase;
  const wb = ctx.measureText(base).width;
  ctx.font = fSup;
  const ws = ctx.measureText(sup).width;
  const w = wb + 1 + ws;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  text(ctx, base, x0, y, { font: fBase, color, halo });
  text(ctx, sup, x0 + wb + 1, y - size * 0.4, { font: fSup, color, halo });
  return w;
}

function arrow(ctx, x0, y0, x1, y1, { color = ink(0.3), head = 5 } = {}) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
  ctx.stroke();
}

/** A point on the quadratic curve from p0 through control c to p1 */
const quad = (p0, c, p1, k) => ({
  x: (1 - k) ** 2 * p0.x + 2 * (1 - k) * k * c.x + k * k * p1.x,
  y: (1 - k) ** 2 * p0.y + 2 * (1 - k) * k * c.y + k * k * p1.y
});

/* ───────────── MLA · A  Counted in squares ───────────── */

// One square is 64 numbers, so every block is to scale: the hidden state is 7,168 / 64 = 112
// squares, the latent 512 / 64 = 8, and the keys and values 2 × 128 heads × 128 / 64 = 512
// (each head's key is 2 squares and its value 2). The squares fly from the hidden state into
// the latent and back out to every head; which source square goes where is only for show,
// since every output of a projection reads all of its input.
function createSquares(W, H, dpr) {
  const narrow = W < 520;
  const LOOP = 14500;
  const P = 7;                      // square pitch
  const T = 6;                      // square size
  const HEAD = 2 * P - 1 + 3;       // a head's two squares, then a wider gap to the next head
  const HEADS_PER_ROW = 8;
  const blockW = HEADS_PER_ROW * HEAD - 3;
  const blockH = (N_HEADS / HEADS_PER_ROW) * P - 1;
  const nH = D_MODEL / SQUARE;      // 112
  const nC = D_C / SQUARE;          // 8
  const backdrop = makeBackdrop(W, H, dpr);
  const rand = seeded(11);

  // Where each block sits, and how its squares are laid out
  const L = narrow
    ? {
      h: { x: 131, y: 76, cols: 14 },
      c: { x: 152, y: 204, cols: 8 },
      k: { x: 46, y: 300 },
      v: { x: 189, y: 300 }
    }
    : {
      h: { x: 50, y: 142, cols: 8 },
      c: { x: 232, y: 163, cols: 1 },
      k: { x: 382, y: 69 },
      v: { x: 382, y: 199 }
    };

  const hSq = Array.from({ length: nH }, (_, i) => ({
    x: L.h.x + (i % L.h.cols) * P,
    y: L.h.y + Math.floor(i / L.h.cols) * P,
    a: 0.32 + 0.3 * rand()
  }));
  const cSq = Array.from({ length: nC }, (_, i) => ({
    x: L.c.x + (i % L.c.cols) * P,
    y: L.c.y + Math.floor(i / L.c.cols) * P
  }));
  const headSquares = (B) => {
    const out = [];
    for (let h = 0; h < N_HEADS; h++) {
      for (let t = 0; t < 2; t++) {
        out.push({ h, x: B.x + (h % HEADS_PER_ROW) * HEAD + t * P, y: B.y + Math.floor(h / HEADS_PER_ROW) * P, a: 0.3 + 0.28 * rand() });
      }
    }
    return out;
  };
  const kSq = headSquares(L.k);
  const vSq = headSquares(L.v);

  // The script: fold in, then unfold, then dim everything but the latent
  const M = {
    hIn: [250, 1250],
    fold: 1700,         // first square leaves the hidden state
    foldEach: 11,
    fly: 760,
    unfold: 4300,
    unfoldEach: 17,
    flyOut: 680,
    labels: 3300,
    keep: [9600, 10500],
    out: LOOP - 600
  };

  // Fold: the squares nearest the latent leave first; each latent square takes 14 of them
  const fold = hSq
    .map((s, i) => ({ s, i, order: (narrow ? 7 - Math.floor(i / L.h.cols) : L.h.cols - 1 - (i % L.h.cols)) + rand() * 1.6 }))
    .sort((p, q) => p.order - q.order);
  fold.forEach((f, rank) => {
    f.start = M.fold + rank * M.foldEach;
    f.to = (f.i * 3 + Math.floor(f.i / 8)) % nC;
    f.bend = (rand() - 0.5) * 26;
  });
  const foldDone = M.fold + (nH - 1) * M.foldEach + M.fly;
  // When each latent square takes its last piece
  const cFull = new Array(nC).fill(0);
  for (const f of fold) cFull[f.to] = Math.max(cFull[f.to], f.start + M.fly);

  // Unfold: head by head; each square leaves from one latent square, chosen to look mixed
  const unfold = [];
  [kSq, vSq].forEach((list, which) => {
    list.forEach((sq, j) => {
      unfold.push({ sq, start: M.unfold + sq.h * M.unfoldEach + (j % 2) * 40 + which * 90, from: (j * 5 + sq.h) % nC, bend: (rand() - 0.5) * 30 });
    });
  });
  const unfoldDone = M.unfold + (N_HEADS - 1) * M.unfoldEach + 130 + M.flyOut;

  const sq = (ctx, x, y, color, s = 1) => {
    ctx.fillStyle = color;
    const d = (T * (1 - s)) / 2;
    ctx.fillRect(x + d, y + d, T * s, T * s);
  };
  const centre = (s) => ({ x: s.x + T / 2, y: s.y + T / 2 });

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP);

    const keep = ease(span(t, ...M.keep));

    // The hidden state arrives, then empties into the latent, leaving a faint trace
    for (const f of fold) {
      const s = f.s;
      const k = (s.y - L.h.y) / (L.h.cols === 8 ? 14 * P : 8 * P);
      const shown = easeOut(span(t, M.hIn[0] + k * 700, M.hIn[0] + k * 700 + 300));
      const left = span(t, f.start, f.start + 120);
      sq(ctx, s.x, s.y, ink(lerp(s.a, 0.1, left) * shown), lerp(0.5, 1, shown));
    }

    // The latent fills as its squares arrive
    const filled = new Array(nC).fill(0);
    for (const f of fold) if (t >= f.start + M.fly) filled[f.to]++;
    for (let i = 0; i < nC; i++) {
      const k = filled[i] / (nH / nC);
      const pop = 1 + 0.25 * bump(t, cFull[i], cFull[i] + 260);
      const outline = 0.14 * (1 - k);
      if (outline > 0) {
        ctx.strokeStyle = blue(outline + 0.08 * span(t, M.fold - 300, M.fold));
        ctx.lineWidth = 1;
        ctx.strokeRect(cSq[i].x + 0.5, cSq[i].y + 0.5, T - 1, T - 1);
      }
      if (k > 0) sq(ctx, cSq[i].x, cSq[i].y, blue(0.2 + 0.8 * k), Math.min(1.25, pop));
    }

    // Keys and values, head by head, dimming at the end (they can be rebuilt from the latent)
    for (const u of unfold) {
      const landed = t >= u.start + M.flyOut;
      if (!landed) {
        // faint place-holders show where every head will go
        const ghost = 0.05 * span(t, M.unfold - 900, M.unfold - 200);
        if (ghost > 0) sq(ctx, u.sq.x, u.sq.y, ink(ghost));
        continue;
      }
      const fresh = 1 - span(t, u.start + M.flyOut, u.start + M.flyOut + 500);
      sq(ctx, u.sq.x, u.sq.y, ink(lerp(u.sq.a + 0.25 * fresh, 0.07, keep)));
    }

    // Squares in flight
    for (const f of fold) {
      const k = span(t, f.start, f.start + M.fly);
      if (k <= 0 || k >= 1) continue;
      const p0 = centre(f.s);
      const p1 = centre(cSq[f.to]);
      const c = { x: (p0.x + p1.x) / 2 + (narrow ? f.bend : 0), y: (p0.y + p1.y) / 2 + (narrow ? 0 : f.bend) };
      const p = quad(p0, c, p1, ease(k));
      const s = lerp(1, 0.7, Math.sin(Math.PI * k));
      ctx.fillStyle = inkToBlue(ease(k), lerp(f.s.a + 0.15, 0.9, k));
      ctx.fillRect(p.x - (T * s) / 2, p.y - (T * s) / 2, T * s, T * s);
    }
    for (const u of unfold) {
      const k = span(t, u.start, u.start + M.flyOut);
      if (k <= 0 || k >= 1) continue;
      const p0 = centre(cSq[u.from]);
      const p1 = centre(u.sq);
      const c = { x: (p0.x + p1.x) / 2 + (narrow ? u.bend : 0), y: (p0.y + p1.y) / 2 + (narrow ? 0 : u.bend) };
      const p = quad(p0, c, p1, ease(k));
      const s = lerp(0.6, 1, k);
      ctx.fillStyle = inkToBlue(1 - ease(k), lerp(0.85, u.sq.a + 0.25, k));
      ctx.fillRect(p.x - (T * s) / 2, p.y - (T * s) / 2, T * s, T * s);
    }

    // Labels
    const la = (a, b) => easeOut(span(t, a, b));
    const hA = la(M.hIn[0], M.hIn[0] + 500);
    const cA = la(foldDone - 600, foldDone);
    const kvA = la(unfoldDone - 900, unfoldDone - 200);
    const arrowA = (a) => 0.3 * a;
    const lab = `italic 400 ${narrow ? 13.5 : 14}px ${SERIF}`;
    const num = `400 11px ${SANS}`;
    const cBox = { x0: cSq[0].x, y0: cSq[0].y, x1: cSq[nC - 1].x + T, y1: cSq[nC - 1].y + T };
    const hBox = { x0: L.h.x, y0: L.h.y, x1: hSq[nH - 1].x + T, y1: hSq[nH - 1].y + T };
    const kBox = { x0: L.k.x, y0: L.k.y, x1: L.k.x + blockW, y1: L.k.y + blockH };
    const vBox = { x0: L.v.x, y0: L.v.y, x1: L.v.x + blockW, y1: L.v.y + blockH };
    const keyA = 1 - 0.55 * keep;

    if (narrow) {
      const hx = (hBox.x0 + hBox.x1) / 2;
      text(ctx, 'hidden state', hx, hBox.y0 - 13, { font: lab, color: ink(0.6 * hA), align: 'center' });
      text(ctx, fmt(D_MODEL), hBox.x1 + 10, (hBox.y0 + hBox.y1) / 2 + 4, { font: num, color: ink(0.45 * hA) });
      const ax = W / 2;
      if (cA > 0 || t > M.fold) {
        const a = la(M.fold - 200, M.fold + 300);
        arrow(ctx, ax, hBox.y1 + 12, ax, cBox.y0 - 12, { color: ink(arrowA(a)) });
        symbol(ctx, 'W', 'DKV', ax + 9, (hBox.y1 + cBox.y0) / 2 + 4, { size: 13, color: ink(0.5 * a) });
      }
      symbol(ctx, 'c', 'KV', cBox.x0 - 10, cBox.y1 + 1, { size: 15, color: blue(0.95 * cA), align: 'right' });
      text(ctx, fmt(D_C), cBox.x1 + 10, cBox.y1, { font: num, color: blue(0.85 * cA) });
      const ua = la(M.unfold - 300, M.unfold + 200);
      if (ua > 0) {
        arrow(ctx, cBox.x0 + 14, cBox.y1 + 12, (kBox.x0 + kBox.x1) / 2 + 12, kBox.y0 - 26, { color: ink(arrowA(ua) * keyA) });
        arrow(ctx, cBox.x1 - 14, cBox.y1 + 12, (vBox.x0 + vBox.x1) / 2 - 12, vBox.y0 - 26, { color: ink(arrowA(ua) * keyA) });
        symbol(ctx, 'W', 'UK', (cBox.x0 + kBox.x0) / 2 + 6, (cBox.y1 + kBox.y0) / 2 + 2, { size: 13, color: ink(0.5 * ua * keyA), align: 'right' });
        symbol(ctx, 'W', 'UV', (cBox.x1 + vBox.x1) / 2 - 6, (cBox.y1 + vBox.y0) / 2 + 2, { size: 13, color: ink(0.5 * ua * keyA) });
      }
      text(ctx, 'keys', (kBox.x0 + kBox.x1) / 2, kBox.y0 - 10, { font: lab, color: ink(0.6 * kvA * keyA), align: 'center' });
      text(ctx, 'values', (vBox.x0 + vBox.x1) / 2, vBox.y0 - 10, { font: lab, color: ink(0.6 * kvA * keyA), align: 'center' });
      text(ctx, `128 heads · ${fmt(N_HEADS * D_HEAD)}`, (kBox.x0 + kBox.x1) / 2, kBox.y1 + 19, { font: num, color: ink(0.45 * kvA * keyA), align: 'center' });
      text(ctx, `128 heads · ${fmt(N_HEADS * D_HEAD)}`, (vBox.x0 + vBox.x1) / 2, vBox.y1 + 19, { font: num, color: ink(0.45 * kvA * keyA), align: 'center' });
    } else {
      const hx = (hBox.x0 + hBox.x1) / 2;
      text(ctx, 'hidden state', hx, hBox.y0 - 13, { font: lab, color: ink(0.6 * hA), align: 'center' });
      text(ctx, fmt(D_MODEL), hx, hBox.y1 + 21, { font: num, color: ink(0.45 * hA), align: 'center' });
      const cy = (cBox.y0 + cBox.y1) / 2;
      const a = la(M.fold - 200, M.fold + 300);
      arrow(ctx, hBox.x1 + 14, cy, cBox.x0 - 14, cy, { color: ink(arrowA(a)) });
      symbol(ctx, 'W', 'DKV', (hBox.x1 + cBox.x0) / 2, cy - 9, { size: 13, color: ink(0.5 * a), align: 'center', halo: 4 });
      const cx = (cBox.x0 + cBox.x1) / 2;
      symbol(ctx, 'c', 'KV', cx, cBox.y0 - 12, { size: 15, color: blue(0.95 * cA), align: 'center' });
      text(ctx, fmt(D_C), cx, cBox.y1 + 21, { font: num, color: blue(0.85 * cA), align: 'center' });
      const ua = la(M.unfold - 300, M.unfold + 200);
      const kMid = (kBox.y0 + kBox.y1) / 2;
      const vMid = (vBox.y0 + vBox.y1) / 2;
      arrow(ctx, cBox.x1 + 16, cy - 10, kBox.x0 - 16, kMid + 8, { color: ink(arrowA(ua) * keyA) });
      arrow(ctx, cBox.x1 + 16, cy + 10, vBox.x0 - 16, vMid - 8, { color: ink(arrowA(ua) * keyA) });
      symbol(ctx, 'W', 'UK', (cBox.x1 + kBox.x0) / 2 - 4, (cy + kMid) / 2 - 10, { size: 13, color: ink(0.5 * ua * keyA), align: 'center', halo: 4 });
      symbol(ctx, 'W', 'UV', (cBox.x1 + vBox.x0) / 2 - 4, (cy + vMid) / 2 + 22, { size: 13, color: ink(0.5 * ua * keyA), align: 'center', halo: 4 });
      const lx = kBox.x1 + 16;
      text(ctx, 'keys', lx, kMid - 2, { font: lab, color: ink(0.6 * kvA * keyA) });
      text(ctx, `128 heads · ${fmt(N_HEADS * D_HEAD)}`, lx, kMid + 14, { font: num, color: ink(0.45 * kvA * keyA) });
      text(ctx, 'values', lx, vMid - 2, { font: lab, color: ink(0.6 * kvA * keyA) });
      text(ctx, `128 heads · ${fmt(N_HEADS * D_HEAD)}`, lx, vMid + 14, { font: num, color: ink(0.45 * kvA * keyA) });
    }

    // The one kept: a ring round the latent, and the word
    if (keep > 0) {
      ctx.strokeStyle = blue(0.7 * keep);
      ctx.lineWidth = 1;
      const pad = 4.5;
      ctx.beginPath();
      ctx.roundRect(cBox.x0 - pad, cBox.y0 - pad, cBox.x1 - cBox.x0 + 2 * pad, cBox.y1 - cBox.y0 + 2 * pad, 3);
      ctx.stroke();
      if (narrow) text(ctx, 'kept in the cache', W / 2, cBox.y1 + 30, { font: `italic 400 13px ${SERIF}`, color: blue(0.9 * keep), align: 'center' });
      else text(ctx, 'kept in the cache', (cBox.x0 + cBox.x1) / 2, cBox.y1 + 40, { font: `italic 400 13px ${SERIF}`, color: blue(0.9 * keep), align: 'center' });
    }

    // Key: one square is 64 numbers
    const kx = narrow ? 30 : 50;
    const ky = narrow ? H - 30 : H - 38;
    const keyAlpha = hA;
    sq(ctx, kx, ky - T + 0.5, ink(0.45 * keyAlpha));
    text(ctx, `= ${SQUARE} numbers`, kx + T + 6, ky, { font: num, color: ink(0.45 * keyAlpha) });

    ctx.restore();
  }, { still: 8600 });
}

/* ───────────── Cache · B  Same memory ───────────── */

// Two equal blocks of memory, 2,048 squares of 64 numbers each, filling from the bottom as
// tokens arrive. A token takes 512 squares when every head's keys and values are kept
// (32,768 / 64) and 9 when only the latent is (8 for the latent, 1 for the small rotary key).
// The first fills after 4 tokens; the second holds 227, with 5 squares to spare. The size of
// the blocks is arbitrary; the counts in them follow from the paper's dimensions.
function createMemory(W, H, dpr) {
  const narrow = W < 520;
  const COLS = narrow ? 32 : 64;
  const ROWS = 2048 / COLS;
  const CELLS = COLS * ROWS;
  const MHA_SQ = MHA_PER_TOKEN / SQUARE;   // 512
  const MLA_SQ = MLA_PER_TOKEN / SQUARE;   // 9
  const NMHA = Math.floor(CELLS / MHA_SQ); // 4
  const NMLA = Math.floor(CELLS / MLA_SQ); // 227
  const P = 4.4;
  const S = 3.4;
  const fw = COLS * P - (P - S);
  const fh = ROWS * P - (P - S);
  const backdrop = makeBackdrop(W, H, dpr);
  const A = narrow ? { x: 32, y: 116 } : { x: 46, y: 118 };
  const B = narrow ? { x: W - 32 - fw, y: 116 } : { x: W - 46 - fw, y: 118 };

  // When each token arrives: the first four together, then the latent alone, faster and faster
  const T0 = 700;
  const EVERY = 1050;
  const mhaAt = Array.from({ length: NMHA }, (_, n) => T0 + n * EVERY);
  const mlaAt = [];
  let at = T0;
  let gap = EVERY;
  for (let n = 0; n < NMLA; n++) {
    mlaAt.push(at);
    if (n >= NMHA - 1) gap = Math.max(17, gap * 0.72);
    at += gap;
  }
  const mlaDone = mlaAt[NMLA - 1] + 200;
  const LOOP = Math.round(mlaDone + 3400);
  const WRITE_MHA = 620;

  // Cell k, filling from the bottom row up, left to right
  const cellXY = (F, k) => ({ x: F.x + (k % COLS) * P, y: F.y + fh - S - Math.floor(k / COLS) * P });

  function frame(ctx, F, t, perToken, arrivals, colorFor, writeMs) {
    // empty memory
    ctx.fillStyle = ink(0.045);
    for (let k = 0; k < CELLS; k++) {
      const p = cellXY(F, k);
      ctx.fillRect(p.x, p.y, S, S);
    }
    let count = 0;
    for (let n = 0; n < arrivals.length; n++) {
      const t0 = arrivals[n];
      if (t < t0) break;
      count++;
      const age = t - t0;
      const ms = writeMs(n);
      const wrote = ms ? Math.floor(perToken * span(age, 0, ms)) : perToken;
      for (let q = 0; q < wrote; q++) {
        const k = n * perToken + q;
        const p = cellXY(F, k);
        ctx.fillStyle = colorFor(n, q, age);
        ctx.fillRect(p.x, p.y, S, S);
      }
    }
    return count;
  }

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP);

    const nA = frame(ctx, A, t, MHA_SQ, mhaAt, (n, q, age) => {
      const fresh = 1 - span(age, WRITE_MHA, WRITE_MHA + 900);
      return ink((n % 2 ? 0.25 : 0.42) + 0.2 * fresh);
    }, () => WRITE_MHA);
    // the latent writes square by square while it keeps pace, then all at once
    const nB = frame(ctx, B, t, MLA_SQ, mlaAt, (n, q, age) => {
      const fresh = 1 - span(age, 200, n < NMHA ? 1000 : 500);
      const base = n % 2 ? 0.7 : 0.9;
      return blue(Math.min(1, base + 0.12 * fresh));
    }, (n) => (n < NMHA ? 220 : 0));

    // Frames, names and counts
    const la = easeOut(span(t, 200, 800));
    const lab = `italic 400 ${narrow ? 14 : 15}px ${SERIF}`;
    const num = `400 11px ${SANS}`;
    const big = `500 ${narrow ? 17 : 19}px ${SERIF}`;
    const fullA = span(t, mhaAt[NMHA - 1] + WRITE_MHA, mhaAt[NMHA - 1] + WRITE_MHA + 400);
    const fullB = span(t, mlaDone, mlaDone + 400);
    for (const [F, full] of [[A, fullA], [B, fullB]]) {
      ctx.strokeStyle = ink(0.16 + 0.22 * full);
      ctx.lineWidth = 1;
      ctx.strokeRect(F.x - 3.5, F.y - 3.5, fw + 7, fh + 7);
    }
    const head = (F, name, per, color, numColor) => {
      if (narrow) {
        text(ctx, name, F.x - 3, F.y - 30, { font: lab, color });
        text(ctx, per, F.x - 3, F.y - 13, { font: num, color: numColor });
      } else {
        text(ctx, name, F.x - 3, F.y - 14, { font: lab, color });
        text(ctx, per, F.x + fw + 3, F.y - 14, { font: num, color: numColor, align: 'right' });
      }
    };
    head(A, 'every head', `${fmt(MHA_PER_TOKEN)} a token`, ink(0.62 * la), ink(0.45 * la));
    head(B, 'latent', `${fmt(MLA_PER_TOKEN)} a token`, blue(0.95 * la), blue(0.85 * la));
    const countY = A.y + fh + (narrow ? 30 : 32);
    const tokens = (k) => `${k} token${k === 1 ? '' : 's'}`;
    if (nA) text(ctx, tokens(nA), A.x - 3, countY, { font: big, color: ink(0.82 * la) });
    if (nB) text(ctx, tokens(nB), B.x - 3, countY, { font: big, color: blue(0.95 * la) });
    if (fullA > 0) text(ctx, 'full', narrow ? A.x - 3 : A.x + fw + 3, narrow ? countY + 18 : countY, { font: num, color: ink(0.5 * fullA), align: narrow ? 'left' : 'right' });
    if (fullB > 0) text(ctx, 'full', narrow ? B.x - 3 : B.x + fw + 3, narrow ? countY + 18 : countY, { font: num, color: blue(0.8 * fullB), align: narrow ? 'left' : 'right' });

    // What the two blocks share, and the unit
    const ty = narrow ? 52 : 58;
    text(ctx, 'the same memory, per layer', narrow ? 29 : W / 2, ty, { font: `italic 400 ${narrow ? 14 : 15}px ${SERIF}`, color: ink(0.55 * la), align: narrow ? 'left' : 'center' });
    const kx = narrow ? W - 29 - 76 : W / 2 - 38;
    const ky = narrow ? ty : H - 34;
    ctx.fillStyle = ink(0.42 * la);
    ctx.fillRect(kx, ky - S - 1, S, S);
    text(ctx, `= ${SQUARE} numbers`, kx + S + 5, ky, { font: num, color: ink(0.45 * la) });

    ctx.restore();
  }, { still: Math.round(mlaDone + 1600) });
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

  return { squares: fitted(createSquares), memory: fitted(createMemory) };
})();

/* ───────────── Training: the loss over 10 billion tokens ───────────── */

// loss · the mini model's training run: training loss, validation loss and the MTP module's
//        loss, with the learning-rate schedule under them. The view opens on the first billion
//        tokens (the loss starts at 10.98, beside a uniform guess's ln 49,152 = 10.80), then
//        pulls back to the whole run.
// Every value is measured: the arrays are the run's metrics.csv, reduced by the script in
// drafts/deepseek-animations/training (training and MTP loss as means over 100 steps, 20 over the
// first 4,000; validation at each evaluation). The learning rate is the schedule's own formula,
// which matches the logged values. Helpers and fitted() stay inside this scope.
const DS_TRAIN = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254';
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const commas = (n) => Math.round(n).toLocaleString('en-US');

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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', baseline = 'alphabetic', halo = null } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function dot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function hline(ctx, x0, x1, y, color, dash = null) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x0, Math.round(y) + 0.5);
  ctx.lineTo(x1, Math.round(y) + 0.5);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

/* ───────────── The run ───────────── */

// 38,147 optimizer steps of 262,144 tokens: 10.0 billion tokens.
const RUN = (() => {
  const STEPS = 38147;
  const B = 262144 / 1e9;   // billions of tokens per step
  const WARMUP = 500;
  const DECAY = 30000;      // the step the cosine decay starts at
  const LR_MIN = 3e-5;
  const PEAK = 3e-4;        // the learning rate after warm-up
  /** The schedule in the training config: linear warm-up, constant, cosine decay to the minimum */
  const lrAt = (step) => (step <= WARMUP
    ? LR_MIN + ((PEAK - LR_MIN) * (step - 1)) / WARMUP
    : step <= DECAY
      ? PEAK
      : LR_MIN + (PEAK - LR_MIN) * 0.5 * (1 + Math.cos((Math.PI * (step - DECAY)) / (STEPS - DECAY))));

  // Loss × 1000. EARLY and EARLY_MTP: means over 20 steps, steps 1 to 4,000.
  // TRAIN and MTP: means over 100 steps. VAL: every 500 steps, and once more at the last step.
  const EARLY = [
    10277, 9280, 8600, 7984, 7464, 7113, 6869, 6691, 6549, 6425, 6310, 6201, 6113, 6003, 5928, 5875, 5819, 5756, 5691, 5619, 5571, 5524,
    5455, 5421, 5372, 5304, 5244, 5205, 5203, 5121, 5093, 5053, 5015, 5013, 4958, 4939, 4894, 4860, 4834, 4806, 4791, 4760, 4738, 4722,
    4700, 4685, 4657, 4643, 4633, 4598, 4571, 4576, 4534, 4535, 4535, 4521, 4493, 4443, 4463, 4445, 4440, 4402, 4375, 4396, 4377, 4359,
    4368, 4327, 4336, 4308, 4324, 4294, 4274, 4261, 4241, 4224, 4206, 4199, 4211, 4195, 4172, 4160, 4123, 4129, 4128, 4119, 4103, 4095,
    4069, 4080, 4029, 4056, 4051, 4045, 4039, 4028, 4009, 3997, 4002, 3987, 3984, 3973, 3985, 3973, 3945, 3964, 3956, 3929, 3953, 3932,
    3915, 3914, 3920, 3927, 3892, 3903, 3891, 3900, 3893, 3885, 3873, 3868, 3864, 3860, 3865, 3843, 3862, 3843, 3828, 3820, 3820, 3816,
    3818, 3814, 3820, 3806, 3806, 3814, 3790, 3797, 3787, 3777, 3797, 3792, 3786, 3782, 3796, 3778, 3756, 3769, 3749, 3783, 3771, 3747,
    3757, 3750, 3735, 3713, 3746, 3721, 3756, 3743, 3746, 3719, 3724, 3719, 3700, 3714, 3709, 3708, 3689, 3706, 3709, 3698, 3690, 3699,
    3693, 3698, 3678, 3687, 3700, 3692, 3670, 3673, 3684, 3672, 3655, 3660, 3647, 3655, 3674, 3661, 3654, 3675, 3661, 3650, 3665, 3654,
    3637, 3651
  ];
  const EARLY_MTP = [
    10587, 9604, 8823, 8163, 7623, 7279, 7046, 6870, 6730, 6609, 6496, 6393, 6310, 6207, 6135, 6087, 6032, 5972, 5909, 5840, 5795, 5748,
    5685, 5656, 5612, 5546, 5490, 5455, 5450, 5377, 5350, 5314, 5276, 5279, 5229, 5209, 5167, 5134, 5107, 5082, 5067, 5036, 5015, 5001,
    4980, 4964, 4935, 4921, 4912, 4878, 4849, 4857, 4812, 4813, 4817, 4804, 4775, 4727, 4746, 4729, 4727, 4690, 4661, 4684, 4668, 4654,
    4666, 4627, 4638, 4615, 4631, 4604, 4590, 4581, 4567, 4555, 4543, 4541, 4558, 4545, 4522, 4513, 4481, 4493, 4490, 4484, 4473, 4466,
    4443, 4458, 4401, 4432, 4435, 4428, 4421, 4415, 4393, 4381, 4397, 4383, 4375, 4363, 4375, 4362, 4332, 4359, 4347, 4320, 4338, 4322,
    4303, 4308, 4310, 4316, 4290, 4294, 4281, 4295, 4290, 4274, 4262, 4255, 4258, 4248, 4256, 4227, 4250, 4227, 4215, 4199, 4206, 4198,
    4202, 4199, 4201, 4195, 4190, 4193, 4170, 4177, 4161, 4150, 4171, 4168, 4161, 4151, 4170, 4153, 4128, 4141, 4122, 4157, 4139, 4114,
    4126, 4117, 4104, 4080, 4113, 4085, 4122, 4108, 4114, 4088, 4094, 4085, 4061, 4077, 4076, 4070, 4053, 4070, 4067, 4054, 4051, 4058,
    4052, 4056, 4036, 4045, 4053, 4049, 4025, 4029, 4037, 4026, 4007, 4012, 3997, 4011, 4026, 4015, 4009, 4028, 4014, 4003, 4018, 3999,
    3984, 3998
  ];
  const TRAIN = [
    8721, 6729, 6111, 5752, 5469, 5215, 5026, 4867, 4742, 4643, 4550, 4473, 4398, 4340, 4279, 4207, 4143, 4093, 4044, 4005, 3972, 3947,
    3913, 3894, 3866, 3839, 3818, 3803, 3788, 3776, 3761, 3733, 3738, 3710, 3698, 3691, 3684, 3658, 3665, 3651, 3636, 3623, 3624, 3607,
    3602, 3601, 3589, 3586, 3577, 3563, 3556, 3548, 3535, 3536, 3531, 3530, 3527, 3507, 3506, 3500, 3491, 3480, 3488, 3474, 3480, 3462,
    3461, 3461, 3444, 3443, 3451, 3433, 3431, 3431, 3421, 3421, 3415, 3412, 3404, 3406, 3400, 3398, 3390, 3393, 3398, 3385, 3376, 3378,
    3382, 3368, 3369, 3371, 3378, 3356, 3366, 3355, 3356, 3358, 3357, 3344, 3352, 3344, 3342, 3331, 3346, 3331, 3338, 3328, 3326, 3329,
    3325, 3316, 3328, 3325, 3315, 3309, 3303, 3293, 3297, 3294, 3292, 3292, 3293, 3294, 3281, 3287, 3282, 3288, 3271, 3281, 3270, 3278,
    3275, 3269, 3268, 3255, 3261, 3267, 3257, 3259, 3256, 3247, 3253, 3258, 3258, 3252, 3248, 3246, 3251, 3248, 3239, 3239, 3238, 3243,
    3240, 3236, 3225, 3226, 3229, 3225, 3228, 3228, 3222, 3227, 3221, 3214, 3225, 3223, 3213, 3221, 3222, 3204, 3217, 3212, 3223, 3224,
    3222, 3212, 3227, 3220, 3216, 3213, 3217, 3211, 3216, 3209, 3207, 3204, 3202, 3203, 3200, 3196, 3202, 3197, 3196, 3202, 3196, 3209,
    3192, 3190, 3196, 3184, 3196, 3196, 3184, 3193, 3189, 3178, 3178, 3178, 3187, 3183, 3186, 3177, 3181, 3176, 3180, 3188, 3182, 3182,
    3180, 3175, 3181, 3177, 3179, 3174, 3187, 3174, 3186, 3166, 3183, 3183, 3193, 3189, 3184, 3180, 3188, 3172, 3176, 3173, 3175, 3181,
    3177, 3172, 3179, 3172, 3166, 3177, 3168, 3174, 3171, 3157, 3175, 3169, 3164, 3159, 3176, 3166, 3171, 3159, 3160, 3158, 3157, 3163,
    3162, 3163, 3167, 3167, 3161, 3162, 3166, 3167, 3163, 3168, 3157, 3155, 3154, 3151, 3156, 3152, 3152, 3158, 3158, 3155, 3145, 3151,
    3148, 3147, 3175, 3163, 3164, 3155, 3168, 3162, 3159, 3165, 3161, 3164, 3156, 3156, 3152, 3164, 3166, 3162, 3154, 3148, 3164, 3150,
    3154, 3149, 3154, 3145, 3154, 3150, 3150, 3159, 3149, 3145, 3143, 3144, 3140, 3134, 3135, 3126, 3141, 3139, 3140, 3131, 3132, 3133,
    3120, 3130, 3117, 3118, 3116, 3104, 3111, 3109, 3112, 3102, 3093, 3107, 3110, 3091, 3094, 3084, 3098, 3096, 3089, 3089, 3081, 3076,
    3079, 3078, 3074, 3070, 3071, 3066, 3076, 3071, 3062, 3070, 3056, 3066, 3056, 3052, 3058, 3050, 3046, 3060, 3047, 3053, 3051, 3045,
    3044, 3041, 3053, 3049, 3046, 3045, 3041, 3049
  ];
  const MTP = [
    8960, 6907, 6308, 5968, 5699, 5464, 5290, 5140, 5020, 4922, 4830, 4756, 4686, 4640, 4595, 4548, 4500, 4465, 4423, 4394, 4361, 4337,
    4305, 4287, 4256, 4223, 4201, 4185, 4162, 4149, 4132, 4100, 4105, 4074, 4059, 4049, 4038, 4011, 4018, 4000, 3984, 3970, 3968, 3951,
    3943, 3941, 3927, 3925, 3913, 3898, 3891, 3881, 3866, 3866, 3863, 3857, 3855, 3833, 3832, 3826, 3816, 3803, 3811, 3795, 3802, 3783,
    3782, 3781, 3762, 3762, 3770, 3750, 3749, 3748, 3736, 3737, 3728, 3726, 3718, 3720, 3714, 3713, 3703, 3706, 3712, 3697, 3687, 3689,
    3692, 3677, 3678, 3680, 3688, 3666, 3675, 3663, 3664, 3664, 3664, 3651, 3658, 3652, 3648, 3637, 3651, 3635, 3643, 3632, 3629, 3632,
    3629, 3619, 3632, 3628, 3617, 3611, 3605, 3595, 3601, 3594, 3595, 3594, 3595, 3594, 3582, 3587, 3582, 3589, 3570, 3582, 3570, 3579,
    3575, 3568, 3567, 3553, 3559, 3566, 3557, 3556, 3553, 3545, 3551, 3556, 3555, 3548, 3544, 3542, 3548, 3544, 3534, 3535, 3532, 3537,
    3534, 3531, 3520, 3520, 3525, 3521, 3521, 3521, 3516, 3520, 3514, 3507, 3520, 3514, 3506, 3513, 3514, 3495, 3508, 3501, 3512, 3513,
    3512, 3501, 3518, 3510, 3504, 3503, 3506, 3500, 3503, 3497, 3493, 3492, 3490, 3491, 3488, 3482, 3488, 3484, 3483, 3489, 3483, 3495,
    3479, 3477, 3482, 3470, 3483, 3482, 3468, 3478, 3473, 3463, 3464, 3462, 3472, 3467, 3472, 3461, 3466, 3460, 3463, 3472, 3466, 3465,
    3463, 3459, 3464, 3460, 3462, 3458, 3471, 3457, 3468, 3449, 3465, 3465, 3474, 3470, 3465, 3461, 3470, 3453, 3458, 3453, 3456, 3461,
    3457, 3452, 3458, 3453, 3446, 3458, 3448, 3455, 3450, 3436, 3454, 3448, 3443, 3439, 3456, 3445, 3449, 3437, 3439, 3437, 3436, 3442,
    3442, 3441, 3445, 3447, 3438, 3440, 3445, 3445, 3442, 3447, 3435, 3434, 3432, 3429, 3436, 3430, 3430, 3436, 3436, 3433, 3422, 3428,
    3425, 3424, 3453, 3440, 3441, 3434, 3446, 3441, 3439, 3444, 3439, 3442, 3436, 3433, 3430, 3442, 3443, 3440, 3432, 3426, 3441, 3427,
    3432, 3425, 3432, 3423, 3430, 3427, 3426, 3436, 3425, 3422, 3420, 3419, 3418, 3412, 3411, 3403, 3418, 3415, 3418, 3408, 3409, 3411,
    3397, 3408, 3393, 3396, 3392, 3381, 3389, 3387, 3390, 3380, 3371, 3385, 3388, 3369, 3372, 3361, 3376, 3373, 3367, 3368, 3360, 3354,
    3358, 3356, 3352, 3348, 3350, 3344, 3354, 3351, 3341, 3348, 3335, 3345, 3334, 3331, 3337, 3328, 3325, 3338, 3326, 3332, 3330, 3324,
    3324, 3320, 3333, 3329, 3325, 3324, 3321, 3329
  ];
  const VAL = [
    5353, 4601, 4236, 3990, 3858, 3757, 3688, 3637, 3592, 3554, 3521, 3495, 3473, 3445, 3425, 3407, 3392, 3373, 3362, 3347, 3337, 3325,
    3313, 3303, 3295, 3289, 3284, 3274, 3267, 3264, 3252, 3252, 3240, 3236, 3229, 3224, 3217, 3214, 3210, 3204, 3200, 3198, 3195, 3188,
    3187, 3183, 3184, 3175, 3170, 3169, 3165, 3162, 3158, 3160, 3156, 3150, 3148, 3148, 3145, 3140, 3140, 3134, 3130, 3124, 3114, 3104,
    3095, 3085, 3075, 3066, 3056, 3048, 3041, 3036, 3032, 3029, 3029
  ];

  const mid20 = (i) => i * 20 + 10.5;
  const mid100 = (i) => i * 100 + Math.min(100, STEPS - i * 100) / 2 + 0.5;
  const coarse = (vals, from = 0) => vals.slice(from).map((v, i) => [mid100(from + i), v / 1000]);
  const fine = (vals) => vals.map((v, i) => [mid20(i), v / 1000]);
  const evals = (vals) => vals.map((v, i) => [i < vals.length - 1 ? (i + 1) * 500 : STEPS, v / 1000]);

  return {
    STEPS,
    B,
    DECAY,
    lrAt,
    first: 10.975,                 // the loss at step 1
    uniform: Math.log(49152),      // guessing uniformly over the vocabulary
    train: [[1, 10.975], ...fine(EARLY), ...coarse(TRAIN, 40)],
    mtp: [...fine(EARLY_MTP), ...coarse(MTP, 40)],
    val: evals(VAL)
  };
})();

/** Stroke [step, value] points up to step `upTo`, ending exactly there. */
function trace(ctx, pts, X, Y, upTo) {
  ctx.beginPath();
  let prev = null;
  for (const p of pts) {
    if (p[0] > upTo) {
      if (prev) ctx.lineTo(X(upTo), Y(lerp(prev[1], p[1], (upTo - prev[0]) / (p[0] - prev[0]))));
      break;
    }
    if (prev) ctx.lineTo(X(p[0]), Y(p[1]));
    else ctx.moveTo(X(p[0]), Y(p[1]));
    prev = p;
  }
  ctx.stroke();
}

/** The learning rate up to step `upTo` as [step, rate] points, with the bends where the schedule has them. */
function ratePoints(upTo) {
  const { STEPS, DECAY, lrAt } = RUN;
  const keys = [1, 500, DECAY];
  for (let k = 1; k <= 32; k++) keys.push(DECAY + ((STEPS - DECAY) * k) / 32);
  return [...keys.filter((s) => s < upTo), upTo].map((s) => [s, lrAt(s)]);
}

/** A learning-rate strip: the line with a faint fill under it, between the baseline s1 and the top s0. */
function rateStrip(ctx, pts, X, sy, s1) {
  if (pts.length < 2) return;
  ctx.beginPath();
  pts.forEach(([s, v], i) => (i ? ctx.lineTo(X(s), sy(v)) : ctx.moveTo(X(s), sy(v))));
  ctx.strokeStyle = ink(0.6);
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineTo(X(pts[pts.length - 1][0]), s1);
  ctx.lineTo(X(pts[0][0]), s1);
  ctx.closePath();
  ctx.fillStyle = ink(0.06);
  ctx.fill();
}

/* ───────────── Loss ───────────── */

function createLoss(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);
  const { STEPS, B, DECAY, train, mtp, val, first, uniform } = RUN;
  // x0..x1, y0..y1: the loss plot. s0..s1: the learning-rate strip. legend: [right edge, y in the opening view, y in the full view, row height]
  const L = narrow
    ? { x0: 40, x1: 330, y0: 76, y1: 300, s0: 346, s1: 390, ticks: 408, readout: [330, 50], legend: [324, 130, 92, 17], xa: [0, 0.5, 1], xb: [0, 5, 10] }
    : { x0: 64, x1: 632, y0: 46, y1: 246, s0: 282, s1: 324, ticks: 342, readout: [632, 30], legend: [624, 96, 62, 18], xa: [0, 0.25, 0.5, 0.75, 1], xb: [0, 2, 4, 6, 8, 10] };
  // The opening view is the first billion tokens at full height; the full view is the whole run, close in on the loss
  const OPEN = { x1: 1, y0: 3.4, y1: 11.4 };
  const FULL = { x1: STEPS * B, y0: 2.9, y1: 3.9 };
  const Y_OPEN = [4, 6, 8, 10];
  const Y_FULL = [3, 3.2, 3.4, 3.6, 3.8];
  const S_OPEN = Math.round(1 / B); // the step that reaches a billion tokens

  const T_DRAW = 600;    // the first billion tokens draw in, slowly at first
  const T_OPEN = 3900;
  const T_PULL = 4700;   // the view pulls back
  const T_FULL = 6300;   // the rest of the run draws in
  const T_END = 11500;
  const T_DONE = 12200;
  const LOOP = 16200;
  const stepsAt = (t) => (t < T_OPEN ? S_OPEN * span(t, T_DRAW, T_OPEN) ** 2.2 : lerp(S_OPEN, STEPS, span(t, T_FULL, T_END)));

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP, 400, 700);
    const intro = span(t, 200, 700);
    const c = ease(span(t, T_PULL, T_FULL));
    const opening = (1 - span(c, 0, 0.3)) * intro; // the opening view's marks leave first, the full view's arrive last
    const full = span(c, 0.7, 1) * intro;
    const win = { x1: lerp(OPEN.x1, FULL.x1, c), y0: lerp(OPEN.y0, FULL.y0, c), y1: lerp(OPEN.y1, FULL.y1, c) };
    const X = (step) => L.x0 + ((step * B) / win.x1) * (L.x1 - L.x0);
    const Y = (v) => L.y1 - ((v - win.y0) / (win.y1 - win.y0)) * (L.y1 - L.y0);
    const sy = (v) => L.s1 - (v / 3.3e-4) * (L.s1 - L.s0);
    const S = Math.max(1, stepsAt(t));
    const done = span(t, T_END, T_DONE);
    const num = `400 10px ${SANS}`;
    const lab = `italic 400 ${narrow ? 12 : 13}px ${SERIF}`;

    // The stretch where the learning rate decays, tying the strip below to the dip above
    const band = span(S, DECAY, DECAY + 1200) * c;
    if (band > 0) {
      ctx.fillStyle = ink(0.045 * band);
      ctx.fillRect(X(DECAY), L.y0, L.x1 - X(DECAY), L.s1 - L.y0);
    }

    // Axes: the opening view's ticks leave as the view starts to pull back, and the full view's arrive as it settles
    const yTicks = (vals, a, digits) => {
      for (const v of vals) {
        const y = Y(v);
        if (a <= 0 || y < L.y0 - 1 || y > L.y1 + 1) continue;
        hline(ctx, L.x0, L.x1, y, ink(0.08 * a));
        text(ctx, v.toFixed(digits), L.x0 - 8, y + 3.5, { font: num, color: ink(0.45 * a), align: 'right' });
      }
    };
    const xTicks = (vals, a) => {
      for (const v of vals) {
        const x = L.x0 + (v / win.x1) * (L.x1 - L.x0);
        if (a <= 0 || x > L.x1 + 1) continue;
        text(ctx, v ? `${v}B` : '0', x, L.ticks, { font: num, color: ink(0.45 * a), align: 'center' });
      }
    };
    yTicks(Y_OPEN, opening, 0);
    yTicks(Y_FULL, full, 1);
    xTicks(L.xa, opening);
    xTicks(L.xb, full);
    hline(ctx, L.x0 - 4, L.x1 + 4, L.y1, ink(0.25 * intro));
    hline(ctx, L.x0 - 4, L.x1 + 4, L.s1, ink(0.16 * intro));

    // Where a uniform guess would score, and where the run starts
    const guide = opening;
    if (guide > 0) {
      hline(ctx, L.x0, L.x1, Y(uniform), ink(0.4 * guide), [2, 4]);
      text(ctx, narrow ? 'a uniform guess, 10.80' : 'a uniform guess over 49,152 tokens, 10.80', L.x1, Y(uniform) - 6, { font: lab, color: ink(0.55 * guide), align: 'right' });
      const started = span(t, T_DRAW + 300, T_DRAW + 800) * opening;
      text(ctx, 'starts at 10.98', X(1) + 14, Y(first) + 20, { font: lab, color: ink(0.7 * started) });
    }

    // The curves
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0 - 3, L.y0 - 6, L.x1 - L.x0 + 6, L.y1 - L.y0 + 7);
    ctx.clip();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = blue(0.9);
    ctx.lineWidth = 1.3;
    trace(ctx, mtp, X, Y, S);
    ctx.strokeStyle = ink(0.42);
    ctx.lineWidth = 1.1;
    trace(ctx, train, X, Y, S);
    const r = lerp(2.3, 1.6, c);
    for (const [s, v] of val) {
      if (s > S) break;
      dot(ctx, X(s), Y(v), r, ink(0.88));
    }
    if (guide > 0) dot(ctx, X(1), Y(first), 2.6, ink(0.88 * guide));
    ctx.restore();

    // Where each ends
    if (done > 0) {
      const vEnd = val[val.length - 1][1];
      const mEnd = mtp[mtp.length - 2][1];
      const f = `500 11px ${SANS}`;
      if (narrow) {
        text(ctx, vEnd.toFixed(2), L.x1 - 2, Y(vEnd) + 17, { font: f, color: ink(0.85 * done), align: 'right', halo: PAGE });
        text(ctx, mEnd.toFixed(2), L.x1 - 2, Y(mEnd) + 17, { font: f, color: blue(0.95 * done), align: 'right', halo: PAGE });
      } else {
        text(ctx, vEnd.toFixed(2), L.x1 + 7, Y(vEnd) + 4, { font: f, color: ink(0.85 * done) });
        text(ctx, mEnd.toFixed(2), L.x1 + 7, Y(mEnd) + 4, { font: f, color: blue(0.95 * done) });
      }
    }

    // Legend, in the empty corner of whichever view is showing
    const [lx, lyOpen, lyFull, lh] = L.legend;
    const ly = lerp(lyOpen, lyFull, c);
    const rows = [
      ['training loss', ink(0.55 * intro), 'line', ink(0.42 * intro)],
      ['validation loss', ink(0.8 * intro), 'dot', ink(0.88 * intro)],
      [narrow ? 'the token after next' : 'the token after next (MTP)', blue(0.9 * intro), 'line', blue(0.9 * intro)]
    ];
    rows.forEach(([str, color, mark, markColor], i) => {
      const y = ly + i * lh;
      text(ctx, str, lx, y, { font: lab, color, align: 'right' });
      ctx.font = lab;
      const left = lx - ctx.measureText(str).width;
      if (mark === 'dot') dot(ctx, left - 15, y - 4, 2, markColor);
      else {
        ctx.strokeStyle = markColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(left - 24, y - 4);
        ctx.lineTo(left - 7, y - 4);
        ctx.stroke();
      }
    });

    // The learning rate under it
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0 - 1, L.s0 - 6, L.x1 - L.x0 + 2, L.s1 - L.s0 + 6);
    ctx.clip();
    rateStrip(ctx, ratePoints(S), X, sy, L.s1);
    ctx.restore();
    text(ctx, 'learning rate', L.x1, L.s0 - 7, { font: lab, color: ink(0.6 * intro), align: 'right' });
    text(ctx, '0.0003', L.x0, L.s0 - 7, { font: num, color: ink(0.5 * span(S, 420, 700)) });
    if (band > 0) text(ctx, narrow ? 'decay' : 'cosine decay', X(DECAY) + 6, L.s1 - 6, { font: `italic 400 12px ${SERIF}`, color: ink(0.55 * band) });

    if (t >= T_DRAW) {
      const tokens = S * B;
      text(ctx, `step ${commas(S)} · ${tokens.toFixed(tokens < 1 ? 2 : 1)}B tokens`, L.readout[0], L.readout[1], { font: `500 11px ${SANS}`, color: ink(0.55), align: 'right' });
    }
    ctx.restore();
  }, { still: T_DONE + 800 });
}

/* ───────────── Fine-tuning ───────────── */

// 3,124 optimizer steps of 262,144 tokens, two passes over smol-smoltalk: 819 million tokens.
const SFT = (() => {
  const STEPS = 3124;
  const M = 262144 / 1e6;   // millions of tokens per step
  const PASS = 1562;        // the last step of the first pass over the data
  const WARMUP = 100;
  const DECAY = 500;        // the step the cosine decay starts at
  const LR_MIN = 3e-5;
  const PEAK = 3e-4;        // the learning rate after warm-up
  /** The schedule in the fine-tuning config: linear warm-up, constant, cosine decay to the minimum */
  const lrAt = (step) => (step <= WARMUP
    ? LR_MIN + ((PEAK - LR_MIN) * (step - 1)) / WARMUP
    : step <= DECAY
      ? PEAK
      : LR_MIN + (PEAK - LR_MIN) * 0.5 * (1 + Math.cos((Math.PI * (step - DECAY)) / (STEPS - DECAY))));

  // Loss × 1000. EARLY and EARLY_MTP: means over 10 steps, steps 1 to 400.
  // TRAIN and MTP: means over 50 steps. VAL: every 250 steps, and once more at the last step.
  const EARLY = [
    2710, 2444, 2256, 2220, 2161, 2087, 2061, 2014, 2034, 1971, 1956, 1932, 1950, 1983, 1955, 1954, 1953, 1884, 1921, 1890, 1851, 1817,
    1882, 1839, 1882, 1788, 1844, 1819, 1818, 1819, 1863, 1850, 1767, 1807, 1812, 1828, 1771, 1816, 1802, 1873
  ];
  const EARLY_MTP = [
    3112, 2827, 2636, 2577, 2497, 2418, 2378, 2328, 2349, 2287, 2254, 2226, 2245, 2276, 2250, 2244, 2243, 2165, 2201, 2170, 2131, 2094,
    2162, 2114, 2158, 2060, 2117, 2094, 2093, 2086, 2134, 2119, 2034, 2078, 2081, 2101, 2034, 2083, 2069, 2141
  ];
  const TRAIN = [
    2358, 2034, 1955, 1920, 1854, 1818, 1820, 1818, 1794, 1759, 1776, 1749, 1771, 1717, 1734, 1750, 1728, 1710, 1703, 1705, 1716, 1686,
    1676, 1673, 1684, 1683, 1674, 1647, 1667, 1664, 1672, 1637, 1617, 1596, 1617, 1570, 1558, 1569, 1565, 1581, 1545, 1549, 1555, 1550,
    1523, 1531, 1564, 1532, 1527, 1521, 1521, 1533, 1512, 1505, 1497, 1519, 1522, 1535, 1490, 1504, 1526, 1531, 1496
  ];
  const MTP = [
    2730, 2352, 2250, 2205, 2132, 2090, 2089, 2086, 2060, 2020, 2038, 2006, 2030, 1973, 1991, 2006, 1982, 1962, 1956, 1958, 1967, 1936,
    1926, 1923, 1935, 1935, 1923, 1894, 1913, 1911, 1920, 1885, 1867, 1850, 1872, 1824, 1811, 1822, 1821, 1839, 1800, 1804, 1811, 1806,
    1779, 1787, 1822, 1788, 1781, 1780, 1776, 1791, 1768, 1763, 1756, 1779, 1782, 1795, 1745, 1761, 1786, 1791, 1752
  ];
  const VAL = [
    1850, 1771, 1724, 1697, 1664, 1640, 1616, 1599, 1583, 1570, 1562, 1556, 1554
  ];

  const mid10 = (i) => i * 10 + 5.5;
  const mid50 = (i) => i * 50 + Math.min(50, STEPS - i * 50) / 2 + 0.5;
  const coarse = (vals, from = 0) => vals.slice(from).map((v, i) => [mid50(from + i), v / 1000]);
  const fine = (vals) => vals.map((v, i) => [mid10(i), v / 1000]);
  const evals = (vals) => vals.map((v, i) => [i < vals.length - 1 ? (i + 1) * 250 : STEPS, v / 1000]);

  return {
    STEPS,
    M,
    PASS,
    WARMUP,
    DECAY,
    lrAt,
    first: 2.982,                  // the loss at step 1, from the pretrained weights
    // the opening view's lines, 10-step means for the first 400 steps, and the full view's, 50-step means throughout
    train: [[1, 2.982], ...fine(EARLY), ...coarse(TRAIN, 8)],
    mtp: [[1, 3.283], ...fine(EARLY_MTP), ...coarse(MTP, 8)],
    trainFull: [[1, 2.982], ...coarse(TRAIN)],
    mtpFull: [[1, 3.283], ...coarse(MTP)],
    val: evals(VAL)
  };
})();

/** The fine-tuning learning rate up to step `upTo` as [step, rate] points. */
function sftRatePoints(upTo) {
  const { STEPS, WARMUP, DECAY, lrAt } = SFT;
  const keys = [1, WARMUP + 1, DECAY];
  for (let k = 1; k <= 32; k++) keys.push(DECAY + ((STEPS - DECAY) * k) / 32);
  return [...keys.filter((s) => s < upTo), upTo].map((s) => [s, lrAt(s)]);
}

function createSft(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);
  const { STEPS, M, PASS, DECAY, train, mtp, trainFull, mtpFull, val, first } = SFT;
  // x0..x1, y0..y1: the loss plot. s0..s1: the learning-rate strip. legend: [right edge, y in the opening view, y in the full view, row height]
  const L = narrow
    ? { x0: 40, x1: 330, y0: 76, y1: 300, s0: 346, s1: 390, ticks: 408, readout: [330, 50], legend: [324, 130, 92, 17], xa: [0, 50, 100], xb: [0, 400, 800] }
    : { x0: 64, x1: 632, y0: 46, y1: 246, s0: 282, s1: 324, ticks: 342, readout: [632, 30], legend: [624, 96, 62, 18], xa: [0, 25, 50, 75, 100], xb: [0, 200, 400, 600, 800] };
  // The opening view is the first 400 steps at full height; the full view is the whole run, close in on the loss
  const S_OPEN = 400;
  const OPEN = { x1: S_OPEN * M, y0: 1.6, y1: 3.4 };
  const FULL = { x1: STEPS * M, y0: 1.35, y1: 2.2 };
  const Y_OPEN = [2, 2.5, 3];
  const Y_FULL = [1.4, 1.6, 1.8, 2];

  const T_DRAW = 600;    // the first 400 steps draw in, slowly at first
  const T_OPEN = 3600;
  const T_PULL = 4400;   // the view pulls back
  const T_FULL = 6000;   // the rest of the run draws in
  const T_END = 10800;
  const T_DONE = 11500;
  const LOOP = 15500;
  const stepsAt = (t) => (t < T_OPEN ? S_OPEN * span(t, T_DRAW, T_OPEN) ** 2.2 : lerp(S_OPEN, STEPS, span(t, T_FULL, T_END)));

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP, 400, 700);
    const intro = span(t, 200, 700);
    const c = ease(span(t, T_PULL, T_FULL));
    const opening = (1 - span(c, 0, 0.3)) * intro; // the opening view's marks leave first, the full view's arrive last
    const full = span(c, 0.7, 1) * intro;
    const win = { x1: lerp(OPEN.x1, FULL.x1, c), y0: lerp(OPEN.y0, FULL.y0, c), y1: lerp(OPEN.y1, FULL.y1, c) };
    const X = (step) => L.x0 + ((step * M) / win.x1) * (L.x1 - L.x0);
    const Y = (v) => L.y1 - ((v - win.y0) / (win.y1 - win.y0)) * (L.y1 - L.y0);
    const sy = (v) => L.s1 - (v / 3.3e-4) * (L.s1 - L.s0);
    const S = Math.max(1, stepsAt(t));
    const done = span(t, T_END, T_DONE);
    const num = `400 10px ${SANS}`;
    const lab = `italic 400 ${narrow ? 12 : 13}px ${SERIF}`;

    // Axes: the opening view's ticks leave as the view starts to pull back, and the full view's arrive as it settles
    const yTicks = (vals, a) => {
      for (const v of vals) {
        const y = Y(v);
        if (a <= 0 || y < L.y0 - 1 || y > L.y1 + 1) continue;
        hline(ctx, L.x0, L.x1, y, ink(0.08 * a));
        text(ctx, v.toFixed(1), L.x0 - 8, y + 3.5, { font: num, color: ink(0.45 * a), align: 'right' });
      }
    };
    const xTicks = (vals, a) => {
      for (const v of vals) {
        const x = L.x0 + (v / win.x1) * (L.x1 - L.x0);
        if (a <= 0 || x > L.x1 + 1) continue;
        text(ctx, v ? `${v}M` : '0', x, L.ticks, { font: num, color: ink(0.45 * a), align: 'center' });
      }
    };
    yTicks(Y_OPEN, opening);
    yTicks(Y_FULL, full);
    xTicks(L.xa, opening);
    xTicks(L.xb, full);
    hline(ctx, L.x0 - 4, L.x1 + 4, L.y1, ink(0.25 * intro));
    hline(ctx, L.x0 - 4, L.x1 + 4, L.s1, ink(0.16 * intro));

    // Where the second pass over the same conversations starts
    const pass = span(S, PASS - 60, PASS + 140) * c;
    if (pass > 0) {
      const x = Math.round(X(PASS)) + 0.5;
      ctx.strokeStyle = ink(0.32 * pass);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, L.y0);
      ctx.lineTo(x, L.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'first pass', x - 8, L.y1 - 9, { font: lab, color: ink(0.55 * pass), align: 'right' });
      text(ctx, 'second pass', x + 8, L.y1 - 9, { font: lab, color: ink(0.55 * pass) });
    }

    // Where the run starts: the pretrained model, on conversations it has never seen
    if (opening > 0) {
      const started = span(t, T_DRAW + 300, T_DRAW + 800) * opening;
      text(ctx, 'starts at 2.98', X(1) + (narrow ? 44 : 64), Y(first) - 2, { font: lab, color: ink(0.7 * started) });
    }

    // The curves
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0 - 3, L.y0 - 6, L.x1 - L.x0 + 6, L.y1 - L.y0 + 7);
    ctx.clip();
    ctx.lineJoin = 'round';
    // The finer lines hand over to the coarser ones as the view pulls back, where 10-step means would only add jitter
    const coarser = span(c, 0.25, 0.75);
    const line = (pts, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      trace(ctx, pts, X, Y, S);
    };
    if (coarser < 1) {
      line(mtp, blue(0.9 * (1 - coarser)), 1.3);
      line(train, ink(0.42 * (1 - coarser)), 1.1);
    }
    if (coarser > 0) {
      line(mtpFull, blue(0.9 * coarser), 1.3);
      line(trainFull, ink(0.42 * coarser), 1.1);
    }
    const r = lerp(2.3, 2, c);
    for (const [s, v] of val) {
      if (s > S) break;
      dot(ctx, X(s), Y(v), r, ink(0.88));
    }
    if (opening > 0) dot(ctx, X(1), Y(first), 2.6, ink(0.88 * opening));
    ctx.restore();

    // Where validation ends
    if (done > 0) {
      const vEnd = val[val.length - 1][1];
      const f = `500 11px ${SANS}`;
      if (narrow) text(ctx, vEnd.toFixed(2), L.x1 - 2, Y(vEnd) - 9, { font: f, color: ink(0.85 * done), align: 'right', halo: PAGE });
      else text(ctx, vEnd.toFixed(2), L.x1 + 7, Y(vEnd) + 4, { font: f, color: ink(0.85 * done) });
    }

    // Legend, in the empty corner of whichever view is showing
    const [lx, lyOpen, lyFull, lh] = L.legend;
    const ly = lerp(lyOpen, lyFull, c);
    const rows = [
      ['training loss', ink(0.55 * intro), 'line', ink(0.42 * intro)],
      ['validation loss', ink(0.8 * intro), 'dot', ink(0.88 * intro)],
      [narrow ? 'the token after next' : 'the token after next (MTP)', blue(0.9 * intro), 'line', blue(0.9 * intro)]
    ];
    rows.forEach(([str, color, mark, markColor], i) => {
      const y = ly + i * lh;
      text(ctx, str, lx, y, { font: lab, color, align: 'right' });
      ctx.font = lab;
      const left = lx - ctx.measureText(str).width;
      if (mark === 'dot') dot(ctx, left - 15, y - 4, 2, markColor);
      else {
        ctx.strokeStyle = markColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(left - 24, y - 4);
        ctx.lineTo(left - 7, y - 4);
        ctx.stroke();
      }
    });

    // The learning rate under it
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0 - 1, L.s0 - 6, L.x1 - L.x0 + 2, L.s1 - L.s0 + 6);
    ctx.clip();
    rateStrip(ctx, sftRatePoints(S), X, sy, L.s1);
    ctx.restore();
    text(ctx, 'learning rate', L.x1, L.s0 - 7, { font: lab, color: ink(0.6 * intro), align: 'right' });
    text(ctx, '0.0003', L.x0, L.s0 - 7, { font: num, color: ink(0.5 * span(S, 90, 150)) });
    const decay = span(S, DECAY + 150, DECAY + 500) * full;
    if (decay > 0) text(ctx, narrow ? 'decay' : 'cosine decay', X(DECAY) + 8, L.s1 - 6, { font: `italic 400 12px ${SERIF}`, color: ink(0.55 * decay) });

    if (t >= T_DRAW) text(ctx, `step ${commas(S)} · ${commas(S * M)}M tokens`, L.readout[0], L.readout[1], { font: `500 11px ${SANS}`, color: ink(0.55), align: 'right' });
    ctx.restore();
  }, { still: T_DONE + 800 });
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

  return { loss: fitted(createLoss), sft: fitted(createSft) };
})();

/* ───────────── Multi-token prediction: the MTP module beside the main model ───────────── */

// towers · the paper's Figure 3 with DeepSeek-V3's depth, D = 1. The main model reads t1..t4 and
//          predicts t2..t5. The MTP module takes the main model's final hidden state at each
//          position, joins it with the embedding of the next true token (RMSNorm both,
//          concatenate, project), runs one transformer block and predicts t3..t6, through the
//          same embedding and output head. The two losses add (the MTP one weighted by λ), and
//          at inference the module is dropped. The words are the section's own example sentence.
// Its helpers and fitted() (a 680-wide design, or 360-wide on phones) stay inside this scope.
const DS_MTP = (() => {
const INK = '28, 25, 23';

const BLUE = '77, 107, 254'; // DeepSeek's blue, as on the title card

const SERIF = 'Newsreader, Georgia, serif';

const SANS = 'Inter, sans-serif';

const FEATHER = 28;

const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const lerp = (a, b, k) => a + (b - a) * k;

const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
/** Rise over [a, a + inMs], hold, fall over [b - outMs, b] */

const pulse = (t, a, b, inMs = 300, outMs = 300) => Math.min(span(t, a, a + inMs), 1 - span(t, b - outMs, b));

const ink = (a) => `rgba(${INK}, ${a})`;

const blue = (a = 1) => `rgba(${BLUE}, ${a})`;

const INK_RGB = INK.split(',').map(Number);

const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes 0 → 1 */

const inkToBlue = (k, a) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], k))).join(', ')}, ${a})`;

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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', baseline = 'alphabetic', halo = null } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (halo) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

const bezPoint = ([a, b, c, d], t) => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y
  };
};

/** Stroke a cubic from k0 to k1 of the way along */
function strokeCurve(ctx, p, k0 = 0, k1 = 1, n = 32) {
  if (k1 <= k0) return;
  ctx.beginPath();
  for (let j = 0; j <= n; j++) {
    const q = bezPoint(p, lerp(k0, k1, j / n));
    if (j) ctx.lineTo(q.x, q.y);
    else ctx.moveTo(q.x, q.y);
  }
  ctx.stroke();
}

/** A small open arrowhead at (x, y) pointing along angle a */
function arrowHead(ctx, x, y, a, size, color, width = 1.2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - size * Math.cos(a - 0.5), y - size * Math.sin(a - 0.5));
  ctx.lineTo(x, y);
  ctx.lineTo(x - size * Math.cos(a + 0.5), y - size * Math.sin(a + 0.5));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function dot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

const MTP_WORDS = ['the', 'cat', 'sat', 'on', 'the', 'mat'];

function createTowers(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);
  const words = MTP_WORDS;
  let L;
  if (!narrow) {
    const pitch = 52;
    L = {
      pitch,
      A: 190,
      B: 490,
      half: 2 * pitch + 6,
      title: 36,
      sub: 53,
      loss: 78,
      target: 104,
      head: [140, 20],
      stack: [196, 92],
      combine: [258, 28],
      block: [200, 40],
      emb: [314, 20],
      input: 356,
      pad: 10,
      wordPx: 15,
      boxPx: 12.5
    };
  } else {
    const pitch = 32;
    L = {
      pitch,
      A: 88,
      B: 272,
      half: 2 * pitch + 2,
      pad: 5,
      title: 36,
      sub: 52,
      loss: 80,
      target: 110,
      head: [146, 20],
      stack: [208, 120],
      combine: [286, 32],
      block: [212, 48],
      emb: [382, 20],
      input: 430,
      wordPx: 12,
      boxPx: 11.5
    };
  }
  const colX = (cx, j) => cx + (j - 1.5) * L.pitch;
  const box = (cx, [y, h]) => ({ x: cx - L.half, y, w: 2 * L.half, h });
  const BX = {
    embA: box(L.A, L.emb),
    embB: box(L.B, L.emb),
    stack: box(L.A, L.stack),
    combine: box(L.B, L.combine),
    block: box(L.B, L.block),
    headA: box(L.A, L.head),
    headB: box(L.B, L.head)
  };
  const gapX = (L.A + L.half + L.B - L.half) / 2;

  // Timeline (ms)
  const M = { inA: [500, 900], embA: [900, 1300], stack: [1300, 2300], up: [2300, 2700], tgtA: [2700, 3000], bus: [2300, 3400], inB: [2100, 2500], embB: [2500, 2900], comb: [3400, 3700], toBlock: [3700, 4000], block: [4000, 4500], upB: [4500, 4900], tgtB: [4900, 5200], loss: [5500, 6000], drop: [8000, 8700], infer: [8900, 11400] };
  const LOOP = 13200;

  function boxDraw(ctx, b, label, { color = ink, lit = 0, alpha = 1, dashed = false, stack = false } = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (stack) {
      for (let j = 2; j >= 1; j--) {
        rrect(ctx, b.x + 0.5 + j * 4, b.y + 0.5 - j * 4, b.w - 1, b.h - 1, 5);
        ctx.fillStyle = PAGE;
        ctx.fill();
        ctx.strokeStyle = color(0.22);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    rrect(ctx, b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 5);
    ctx.fillStyle = PAGE;
    ctx.fill();
    if (lit > 0) {
      ctx.fillStyle = color(0.035 * lit);
      ctx.fill();
    }
    ctx.setLineDash(dashed ? [3, 3] : []);
    ctx.strokeStyle = color(0.42 + 0.22 * Math.min(1, lit));
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 0.5, { font: `italic 400 ${L.boxPx}px ${SERIF}`, color: color(0.7), align: 'center', baseline: 'middle' });
    ctx.restore();
  }

  /** Dots rising (or falling) in each column between two heights */
  function columns(ctx, cx, y0, y1, k, color, only = null) {
    if (k <= 0 || k >= 1) return;
    for (let j = 0; j < 4; j++) {
      if (only !== null && j !== only) continue;
      const x = colX(cx, j);
      const y = lerp(y0, y1, ease(k));
      const yt = lerp(y0, y1, ease(Math.max(0, k - 0.12)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.globalAlpha *= 0.45;
      ctx.beginPath();
      ctx.moveTo(x, yt);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalAlpha /= 0.45;
      ctx.lineCap = 'butt';
      dot(ctx, x, y, 2.6, color);
    }
  }

  function arrows(ctx, cx, y0, y1, color, k = 1, only = null) {
    if (k <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      if (only !== null && j !== only) continue;
      const x = colX(cx, j);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, lerp(y0, y1, k));
      ctx.stroke();
    }
  }

  // The main model's last hidden states, to the module: right across the gap, then down into "combine"
  const busY = L.head[0] + L.head[1] + (L.stack[0] - 8 - (L.head[0] + L.head[1])) / 2;
  const busPath = [
    { x: L.A + L.half - 8, y: busY },
    { x: gapX + 30, y: busY },
    { x: gapX - 10, y: BX.combine.y + BX.combine.h / 2 },
    { x: BX.combine.x, y: BX.combine.y + BX.combine.h / 2 }
  ];

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    const a = loopAlpha(t, LOOP, 400, 700);
    ctx.save();
    ctx.globalAlpha = a;
    const sp = (n) => span(t, M[n][0], M[n][1]);
    const drop = ease(sp('drop'));
    const mtpA = 1 - 0.82 * drop;       // the module, fading at inference
    const train = 1 - drop;              // training-only marks
    const titleF = `500 ${narrow ? 14 : 15}px ${SERIF}`;
    const subF = `italic 400 ${narrow ? 11.5 : 12.5}px ${SERIF}`;

    // Shared links between the twin embeddings and the twin heads
    for (const [p, q] of [[BX.embA, BX.embB], [BX.headA, BX.headB]]) {
      const y = p.y + p.h / 2;
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = ink(0.4 * mtpA);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x + p.w, y + 0.5);
      ctx.lineTo(q.x, y + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'shared', gapX, y - 6, { font: `italic 400 ${narrow ? 10.5 : 11.5}px ${SERIF}`, color: ink(0.5 * mtpA), align: 'center' });
    }

    // Static linework: input → embedding, embedding → stack/combine, stack → head, block → head
    const yIn = L.input - L.wordPx - 2;
    arrows(ctx, L.A, yIn, BX.embA.y + BX.embA.h + 3, ink(0.2));
    arrows(ctx, L.A, BX.embA.y - 2, BX.stack.y + BX.stack.h + 2, ink(0.2));
    arrows(ctx, L.A, BX.stack.y - 8, BX.headA.y + BX.headA.h + 2, ink(0.2));
    arrows(ctx, L.A, BX.headA.y - 2, L.target + 6, ink(0.2));
    ctx.save();
    ctx.globalAlpha *= mtpA;
    arrows(ctx, L.B, yIn, BX.embB.y + BX.embB.h + 3, ink(0.2));
    arrows(ctx, L.B, BX.embB.y - 2, BX.combine.y + BX.combine.h + 2, ink(0.2));
    arrows(ctx, L.B, BX.combine.y - 2, BX.block.y + BX.block.h + 2, blue(0.3));
    arrows(ctx, L.B, BX.block.y - 2, BX.headB.y + BX.headB.h + 2, blue(0.3));
    arrows(ctx, L.B, BX.headB.y - 2, L.target + 6, ink(0.2));
    ctx.strokeStyle = blue(0.45);
    ctx.lineWidth = 1.2;
    strokeCurve(ctx, busPath);
    arrowHead(ctx, busPath[3].x - 1, busPath[3].y, 0, 5, blue(0.6));
    ctx.restore();

    // Frames around each tower, as in the paper
    const frame = (cx, color, alpha, dashed) => {
      ctx.save();
      ctx.globalAlpha *= alpha;
      rrect(ctx, cx - L.half - L.pad + 0.5, L.head[0] - 14 + 0.5, 2 * L.half + 2 * L.pad, L.emb[0] + L.emb[1] + 10 - (L.head[0] - 14), 8);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };
    frame(L.A, ink(0.16), 1);
    frame(L.B, blue(0.45), mtpA);

    // Boxes
    const litStack = pulse(t, M.stack[0], M.stack[1], 200, 300);
    boxDraw(ctx, BX.embA, 'embedding', { lit: pulse(t, M.embA[0], M.embA[1] + 200, 150, 250) });
    boxDraw(ctx, BX.stack, '61 transformer blocks', { lit: litStack, stack: true });
    boxDraw(ctx, BX.headA, 'output head', { lit: pulse(t, M.up[0] + 200, M.tgtA[1], 150, 250) + pulse(t, M.infer[0] + 1500, M.infer[0] + 2100, 150, 250) });
    boxDraw(ctx, BX.embB, 'embedding', { lit: pulse(t, M.embB[0], M.embB[1] + 200, 150, 250), alpha: mtpA, dashed: drop > 0.5 });
    boxDraw(ctx, BX.combine, 'combine', { color: blue, lit: pulse(t, M.comb[0], M.comb[1] + 200, 150, 250), alpha: mtpA, dashed: drop > 0.5 });
    boxDraw(ctx, BX.block, '1 transformer block', { color: blue, lit: pulse(t, M.block[0], M.block[1], 150, 250), alpha: mtpA, dashed: drop > 0.5 });
    boxDraw(ctx, BX.headB, 'output head', { lit: pulse(t, M.upB[0] + 200, M.tgtB[1], 150, 250), alpha: mtpA, dashed: drop > 0.5 });

    // A band of light climbing the 61 blocks
    if (litStack > 0) {
      const k = span(t, M.stack[0], M.stack[1]);
      const y = lerp(BX.stack.y + BX.stack.h - 6, BX.stack.y + 6, ease(k));
      ctx.fillStyle = ink(0.035 * litStack);
      ctx.fillRect(BX.stack.x + 2, y - 6, BX.stack.w - 4, 12);
    }

    // Inputs and targets
    const wF = `400 ${L.wordPx}px ${SERIF}`;
    for (let j = 0; j < 4; j++) {
      const inA = 0.3 + 0.55 * span(t, M.inA[0] - 300, M.inA[0]);
      text(ctx, words[j], colX(L.A, j), L.input, { font: wF, color: ink(inA), align: 'center' });
      text(ctx, words[j + 1], colX(L.B, j), L.input, { font: wF, color: ink((0.3 + 0.55 * span(t, M.inB[0] - 300, M.inB[0])) * mtpA), align: 'center' });
      // Targets: shown faintly, and lit when a prediction lands on them
      const ta = lerp(0.22, 0.85, span(t, M.tgtA[0], M.tgtA[1]));
      text(ctx, words[j + 1], colX(L.A, j), L.target, { font: wF, color: ink(ta * train), align: 'center' });
      const tb = span(t, M.tgtB[0], M.tgtB[1]);
      text(ctx, words[j + 2], colX(L.B, j), L.target, { font: wF, color: inkToBlue(tb, lerp(0.22, 0.95, tb) * train), align: 'center' });
    }

    // Inference: the main model alone predicts the next token
    if (drop > 0) {
      const inf = span(t, M.infer[0], M.infer[1]);
      const ia = (1 - span(t, LOOP - 1200, LOOP - 700)) * span(t, M.infer[0] + 1900, M.infer[0] + 2300);
      text(ctx, words[4], colX(L.A, 3), L.target, { font: wF, color: ink(0.85 * ia), align: 'center' });
      text(ctx, 'dropped at inference', L.B, BX.block.y - 14, { font: subF, color: ink(0.6 * drop), align: 'center', halo: PAGE });
      void inf;
    }

    // Pulses
    columns(ctx, L.A, yIn, BX.embA.y + BX.embA.h, sp('inA'), ink(0.75));
    columns(ctx, L.A, BX.embA.y, BX.stack.y + BX.stack.h, sp('embA'), ink(0.75));
    columns(ctx, L.A, BX.stack.y - 8, L.target + 6, sp('up'), ink(0.75));
    columns(ctx, L.B, yIn, BX.embB.y + BX.embB.h, sp('inB'), ink(0.75));
    columns(ctx, L.B, BX.embB.y, BX.combine.y + BX.combine.h, sp('embB'), ink(0.75));
    columns(ctx, L.B, BX.combine.y, BX.block.y + BX.block.h, sp('toBlock'), blue(0.95));
    columns(ctx, L.B, BX.block.y, L.target + 6, sp('upB'), blue(0.95));
    // The hidden states cross as a short train of four
    const busK = sp('bus');
    if (busK > 0 && busK < 1) {
      for (let j = 0; j < 4; j++) {
        const kk = clamp(busK * 1.3 - j * 0.1, 0, 1);
        if (kk > 0 && kk < 1) {
          const q = bezPoint(busPath, ease(kk));
          dot(ctx, q.x, q.y, 2.3, blue(0.95));
        }
      }
    }
    // Inference pass: up the main tower, and only the last position goes on to the head
    const inf0 = M.infer[0];
    columns(ctx, L.A, yIn, BX.embA.y + BX.embA.h, span(t, inf0, inf0 + 400), ink(0.75));
    columns(ctx, L.A, BX.embA.y, BX.stack.y + BX.stack.h, span(t, inf0 + 400, inf0 + 800), ink(0.75));
    if (t > inf0 + 800 && t < inf0 + 1500) {
      const k = span(t, inf0 + 800, inf0 + 1500);
      const y = lerp(BX.stack.y + BX.stack.h - 6, BX.stack.y + 6, ease(k));
      ctx.fillStyle = ink(0.035);
      ctx.fillRect(BX.stack.x + 2, y - 6, BX.stack.w - 4, 12);
    }
    columns(ctx, L.A, BX.stack.y - 8, L.target + 6, span(t, inf0 + 1500, inf0 + 1950), ink(0.75), 3);

    // Titles
    text(ctx, 'main model', L.A, L.title, { font: titleF, color: ink(0.85), align: 'center' });
    text(ctx, narrow ? 'the next token' : 'predicts the next token', L.A, L.sub, { font: subF, color: ink(0.5), align: 'center' });
    text(ctx, 'MTP module', L.B, L.title, { font: titleF, color: blue(0.95 * mtpA), align: 'center' });
    text(ctx, narrow ? 'one token further' : 'predicts one token further', L.B, L.sub, { font: subF, color: ink(0.5 * mtpA), align: 'center' });

    // The losses add
    const lk = sp('loss') * train;
    if (lk > 0) {
      const ly = L.target - L.wordPx - 2;
      const pa = [{ x: colX(L.A, 3) + 16, y: ly + 6 }, { x: gapX - 14, y: ly + 6 }, { x: gapX - 4, y: L.loss + 10 }, { x: gapX - 2, y: L.loss + 4 }];
      const pb = [{ x: colX(L.B, 0) - 16, y: ly + 6 }, { x: gapX + 14, y: ly + 6 }, { x: gapX + 4, y: L.loss + 10 }, { x: gapX + 2, y: L.loss + 4 }];
      ctx.lineWidth = 1;
      ctx.strokeStyle = ink(0.45);
      strokeCurve(ctx, pa, 0, ease(lk));
      ctx.strokeStyle = blue(0.6);
      strokeCurve(ctx, pb, 0, ease(lk));
      text(ctx, 'loss', gapX, L.loss - 2, { font: subF, color: ink(0.7 * span(lk, 0.6, 1)), align: 'center' });
    }
    ctx.restore();
  }, { still: 6800 });
}

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

  return { towers: fitted(createTowers) };
})();

/* ───────────── RoPE: the rotating pairs, and a score that only sees the offset ───────────── */

// dials · DeepSeek-V3's 32 rotating pairs as dials (θ_i = 10000^(−2i/64)), a position track and
//         the score against the offset m − n. The same vector is the query and the key (unit
//         length in every pair, an illustrative choice), so the angle between the hands in pair
//         i is exactly (m − n)·θ_i and the score is (1/32) Σ cos((m − n)·θ_i). Both tokens slide
//         along the sequence together, then the key falls back so the offset grows, they slide
//         again, and the offset closes back to where it began.
// Its helpers and fitted() (a 680-wide design, or 360-wide on phones) stay inside this scope.
const DS_ROPE = (() => {
const INK = '28, 25, 23';

const BLUE = '77, 107, 254';     // DeepSeek's blue, as on the title card

const SERIF = 'Newsreader, Georgia, serif';

const SANS = 'Inter, sans-serif';

const FEATHER = 28;

const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const lerp = (a, b, k) => a + (b - a) * k;
/** How far t is through [a, b], from 0 to 1 */

const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

const easeSine = (k) => 0.5 - 0.5 * Math.cos(Math.PI * k);

const ink = (a) => `rgba(${INK}, ${a})`;

const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
/** An angle folded into (−π, π] */

const wrap = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);

// RoFormer: θ_i = base^(−2i/d) for the d/2 pairs. DeepSeek-V3 rotates a 64-d part of each
// query and key (d_h^R = 64, section 4.2 of the report), and its released config sets
// rope_theta to 10000, so there are 32 pairs and θ_0 = 1 rad per token down to θ_31 ≈ 1.3e-4.
const ROPE_D = 64;

const ROPE_BASE = 10000;

const THETA = Array.from({ length: ROPE_D / 2 }, (_, i) => ROPE_BASE ** (-2 * i / ROPE_D));

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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', halo = null } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  if (halo) {
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = halo;
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

/**
 * A symbol in italic serif with TeX-style scripts: "k^R", "W^{UK}", "q^C_{t,i}". Runs in
 * backticks are set upright ("`=` 3"). Returns the width.
 */
function parseMath(str) {
  const out = [];
  let i = 0;
  const group = () => {
    if (str[i] === '{') {
      const j = str.indexOf('}', i);
      const g = str.slice(i + 1, j);
      i = j + 1;
      return g;
    }
    return str[i++];
  };
  let base = '';
  let upright = false;
  const flush = () => {
    if (base) out.push({ kind: 'base', text: base, upright });
    base = '';
  };
  while (i < str.length) {
    const ch = str[i];
    if (ch === '`') {
      flush();
      upright = !upright;
      i++;
    } else if (ch === '^' || ch === '_') {
      flush();
      i++;
      out.push({ kind: ch === '^' ? 'sup' : 'sub', text: group() });
    } else {
      base += ch;
      i++;
    }
  }
  flush();
  return out;
}

function mathText(ctx, str, x, y, { size = 14, color = ink(0.8), align = 'left', weight = 400, halo = null, measure = false } = {}) {
  const parts = parseMath(str);
  const fb = (p) => `${p.upright ? '' : 'italic '}${weight} ${size}px ${SERIF}`;
  const fs = `italic ${weight} ${size * 0.66}px ${SERIF}`;
  // Lay out: a sup and a sub after the same base share an x
  const items = [];
  let cx = 0;
  let scriptX = null;
  let scriptW = 0;
  for (const p of parts) {
    if (p.kind === 'base') {
      if (scriptX !== null) {
        cx = scriptX + scriptW;
        scriptX = null;
        scriptW = 0;
      }
      const w = textWidth(ctx, p.text, fb(p));
      items.push({ ...p, x: cx, dy: 0, font: fb(p) });
      cx += w;
    } else {
      if (scriptX === null) scriptX = cx + size * 0.04;
      const w = textWidth(ctx, p.text, fs);
      items.push({ ...p, x: scriptX, dy: p.kind === 'sup' ? -size * 0.38 : size * 0.22, font: fs });
      scriptW = Math.max(scriptW, w);
    }
  }
  if (scriptX !== null) cx = scriptX + scriptW;
  const width = cx;
  if (measure) return width;
  const x0 = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  ctx.textAlign = 'left';
  for (const it of items) {
    ctx.font = it.font;
    if (halo) {
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = halo;
      ctx.strokeText(it.text, x0 + it.x, y + it.dy);
    }
    ctx.fillStyle = color;
    ctx.fillText(it.text, x0 + it.x, y + it.dy);
  }
  return width;
}

/** Canvas angle for a maths angle (counter-clockwise, y up) */
const px = (x, r, a) => x + r * Math.cos(a);

const py = (y, r, a) => y - r * Math.sin(a);

/**
 * One rotating pair as a clock face: the key's hand in ink, the query's in blue, and the
 * angle between them as a short arc.
 */
function dial(ctx, x, y, r, aq, ak, { alpha = 1, arc = true, face = 0.16, lw = 1 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = ink(face);
  ctx.lineWidth = 1;
  ctx.stroke();
  if (arc) {
    const d = wrap(aq - ak);
    if (Math.abs(d) > 0.01) {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, -ak, -(ak + d), d > 0);
      ctx.strokeStyle = blue(0.45);
      ctx.lineWidth = 1.5 * lw;
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(px(x, r * 0.84, ak), py(y, r * 0.84, ak));
  ctx.strokeStyle = ink(0.72);
  ctx.lineWidth = 1.3 * lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(px(x, r * 0.84, aq), py(y, r * 0.84, aq));
  ctx.strokeStyle = blue(0.95);
  ctx.lineWidth = 1.6 * lw;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 1.6 * lw, 0, TAU);
  ctx.fillStyle = ink(0.75);
  ctx.fill();
  ctx.restore();
}

/** Piecewise keyframes [t, ...values], eased between */
function keyed(KEYS, t, easing = easeSine) {
  for (let j = 1; j < KEYS.length; j++) {
    const [t1, ...b] = KEYS[j];
    if (t <= t1) {
      const [t0, ...a] = KEYS[j - 1];
      const k = easing(span(t, t0, t1));
      return a.map((v, q) => lerp(v, b[q], k));
    }
  }
  return KEYS[KEYS.length - 1].slice(1);
}

function createDials(W, H, dpr) {
  const narrow = W < 520;
  const POS = 64;
  const KEYS = [
    [0, 6, 3], [900, 6, 3], [6900, 54, 51], [7800, 54, 51], [9700, 54, 31],
    [10600, 54, 31], [16600, 26, 3], [17500, 26, 3], [19400, 6, 3], [20000, 6, 3]
  ];
  const LOOP = 20000;
  const rnd = seeded(7);
  const PHI = THETA.map(() => rnd() * TAU);
  const score = (D) => THETA.reduce((s, th) => s + Math.cos(D * th), 0) / THETA.length;

  const L = narrow
    ? { tx0: 26, tx1: 334, ty: 64, gx: 44, gy: 128, gap: 39, r: 14, cx0: 52, cx1: 328, cy0: 314, cy1: 432, cols: 8 }
    : { tx0: 44, tx1: 636, ty: 76, gx: 74, gy: 156, gap: 46, r: 17, cx0: 462, cx1: 636, cy0: 158, cy1: 316, cols: 8 };
  const X = (p) => lerp(L.tx0, L.tx1, p / (POS - 1));
  const dialAt = (i) => ({ x: L.gx + (i % L.cols) * L.gap, y: L.gy + Math.floor(i / L.cols) * L.gap });
  const S0 = 0.4;
  const S1 = 1.0;
  const CX = (d) => lerp(L.cx0, L.cx1, d / (POS - 1));
  const CY = (s) => lerp(L.cy1, L.cy0, (s - S0) / (S1 - S0));

  const backdrop = makeBackdrop(W, H, dpr, (g) => {
    // The track: one tick per position
    g.lineWidth = 1;
    g.strokeStyle = ink(0.22);
    g.beginPath();
    g.moveTo(L.tx0, L.ty + 0.5);
    g.lineTo(L.tx1, L.ty + 0.5);
    g.stroke();
    for (let p = 0; p < POS; p++) {
      const x = Math.round(X(p)) + 0.5;
      const major = p % 8 === 0;
      g.strokeStyle = ink(major ? 0.3 : 0.13);
      g.beginPath();
      g.moveTo(x, L.ty - (major ? 4 : 2.5));
      g.lineTo(x, L.ty + (major ? 4 : 2.5));
      g.stroke();
    }
    text(g, '0', L.tx0, L.ty + 18, { font: `400 10px ${SANS}`, color: ink(0.4), align: 'center' });
    text(g, '63', L.tx1, L.ty + 18, { font: `400 10px ${SANS}`, color: ink(0.4), align: 'center' });
    text(g, 'position', L.tx1, L.ty - 14, { font: `italic 400 ${narrow ? 12 : 12.5}px ${SERIF}`, color: ink(0.45), align: 'right' });

    // The score against the offset: axes and the curve
    g.strokeStyle = ink(0.22);
    g.beginPath();
    g.moveTo(L.cx0, L.cy1 + 0.5);
    g.lineTo(L.cx1, L.cy1 + 0.5);
    g.moveTo(L.cx0 - 0.5, L.cy1);
    g.lineTo(L.cx0 - 0.5, L.cy0 - 6);
    g.stroke();
    g.strokeStyle = ink(0.07);
    g.beginPath();
    for (const s of [0.6, 0.8, 1.0]) {
      g.moveTo(L.cx0, Math.round(CY(s)) + 0.5);
      g.lineTo(L.cx1, Math.round(CY(s)) + 0.5);
    }
    g.stroke();
    g.strokeStyle = ink(0.55);
    g.lineWidth = 1.25;
    g.lineJoin = 'round';
    g.beginPath();
    for (let d = 0; d <= POS - 1; d += 0.25) {
      const x = CX(d);
      const y = CY(score(d));
      if (d) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    const f10 = `400 10px ${SANS}`;
    text(g, '0', L.cx0, L.cy1 + 15, { font: f10, color: ink(0.4), align: 'center' });
    text(g, '63', L.cx1, L.cy1 + 15, { font: f10, color: ink(0.4), align: 'center' });
    text(g, '1', L.cx0 - 7, CY(1) + 3.5, { font: f10, color: ink(0.4), align: 'right' });
    text(g, '0.6', L.cx0 - 7, CY(0.6) + 3.5, { font: f10, color: ink(0.4), align: 'right' });
    mathText(g, 'm − n', (L.cx0 + L.cx1) / 2, L.cy1 + 17, { size: 13, color: ink(0.55), align: 'center' });
    mathText(g, 'q · k', L.cx0 + 8, L.cy0 - 10, { size: 13, color: ink(0.55) });

    // Which pair is which
    const last = dialAt(31);
    const first = dialAt(0);
    text(g, 'pair 0', first.x - L.r, first.y - L.r - 8, { font: `400 10px ${SANS}`, color: ink(0.42) });
    text(g, 'pair 31', last.x + L.r, last.y + L.r + 15, { font: `400 10px ${SANS}`, color: ink(0.42), align: 'right' });
    text(g, 'fast', first.x + L.r + 2 + textWidth(g, 'pair 0 ', `400 10px ${SANS}`) - L.r - 2, first.y - L.r - 8, { font: `italic 400 11px ${SERIF}`, color: ink(0.4) });
    text(g, 'slow', last.x - L.r - 2 - textWidth(g, 'pair 31 ', `400 10px ${SANS}`) + L.r + 2, last.y + L.r + 15, { font: `italic 400 11px ${SERIF}`, color: ink(0.4), align: 'right' });
  });

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    const [m, n] = keyed(KEYS, t);
    const D = m - n;

    // The two tokens on the track, and the offset between them
    const xm = X(m);
    const xn = X(n);
    const by = L.ty - 13;
    ctx.strokeStyle = ink(0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xn, by + 4);
    ctx.lineTo(xn, by);
    ctx.lineTo(xm, by);
    ctx.lineTo(xm, by + 4);
    ctx.stroke();
    mathText(ctx, `m − n \`=\` ${Math.round(D)}`, (xm + xn) / 2, by - 7, { size: 13, color: ink(0.7), align: 'center' });
    ctx.beginPath();
    ctx.arc(xn, L.ty + 0.5, 4, 0, TAU);
    ctx.fillStyle = ink(0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(xm, L.ty + 0.5, 4.5, 0, TAU);
    ctx.fillStyle = blue(1);
    ctx.fill();
    mathText(ctx, 'n', xn, L.ty + 19, { size: 14, color: ink(0.8), align: 'center', halo: pageColor() });
    mathText(ctx, 'm', xm, L.ty + 19, { size: 14, color: blue(1), align: 'center', halo: pageColor() });

    // The 32 pairs: query hand at φ + mθ, key hand at φ + nθ
    for (let i = 0; i < THETA.length; i++) {
      const { x, y } = dialAt(i);
      dial(ctx, x, y, L.r, PHI[i] + m * THETA[i], PHI[i] + n * THETA[i]);
    }

    // Where the pair is on the score curve
    const sx = CX(D);
    const sy = CY(score(D));
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = blue(0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy + 6);
    ctx.lineTo(sx, L.cy1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, TAU);
    ctx.fillStyle = blue(1);
    ctx.fill();
    text(ctx, score(D).toFixed(3), sx + 8, sy - 8, { font: `500 11px ${SANS}`, color: blue(1), halo: pageColor() });
  }, { still: 4200 });
}

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

  return { dials: fitted(createDials) };
})();

/* ───────────── The mini model: its parameters to scale, and twelve questions ───────────── */

// stack · Mini DeepSeek-V3 drawn to scale, with one square for each routed expert (1,376,256
//         parameters). The embedding table, the dense block, eleven MoE blocks, the LM head and
//         the MTP module stack up while the count runs to 212.6M. Then the MTP module is set
//         aside and a token goes up: what it uses turns blue, two routed experts in each MoE
//         block, 108.2M in all. A second token picks other experts and the count stays put.
//         The counts are the model's own, summed from its parameters. Which experts light up
//         is made up.
// dots ·  twelve easy questions, twenty replies each, from the pretrained and from the
//         fine-tuned checkpoint. A blue dot is a right answer: 33 of 240, then 78 of 240.
//         The counts were graded by reading the replies (drafts/deepseek-animations/results).
// Helpers and fitted() (a 680-wide design, or 360-wide on phones) stay inside this scope.
const DS_MINI = (() => {
const INK = '28, 25, 23';
const BLUE = '77, 107, 254';
const SERIF = 'Newsreader, Georgia, serif';
const SANS = 'Inter, sans-serif';
const FEATHER = 28;
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOut = (k) => 1 - (1 - k) ** 3;
/** How far t is through [a, b], from 0 to 1 */
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ink = (a) => `rgba(${INK}, ${a})`;
const blue = (a = 1) => `rgba(${BLUE}, ${a})`;
const INK_RGB = INK.split(',').map(Number);
const BLUE_RGB = BLUE.split(',').map(Number);
/** Ink turning blue as k goes from 0 to 1, at the given opacity */
const toBlue = (k, alpha) => `rgba(${INK_RGB.map((v, i) => Math.round(lerp(v, BLUE_RGB[i], k))).join(', ')}, ${alpha})`;
const millions = (n) => `${(n / 1e6).toFixed(1)}M`;

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

function text(ctx, str, x, y, { font = `400 11px ${SANS}`, color = ink(0.5), align = 'left', baseline = 'alphabetic' } = {}) {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function dot(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

/* ───────────── The stack, to scale ───────────── */

// Parameter counts, summed from the model's own tensors
const P = { embed: 25165824, head: 25165824, mla: 639232, dense: 4718592, expert: 1376256, router: 4096, norms: 1024, finalNorm: 512, combine: 525312 };
const DENSE_BLOCK = P.mla + P.dense + P.norms;                    //   5,358,848
const MOE_BLOCK = P.mla + 9 * P.expert + P.router + P.norms;      //  13,030,656
const MOE_USED = P.mla + 3 * P.expert + P.router + P.norms;       //   4,773,120: the shared expert and two of the eight routed
const MTP_MODULE = MOE_BLOCK + P.combine;                         //  13,555,968
const MOE_BLOCKS = 11;
const MAIN = P.embed + DENSE_BLOCK + MOE_BLOCKS * MOE_BLOCK + P.finalNorm + P.head;   // 199,028,224
const USED = P.embed + DENSE_BLOCK + MOE_BLOCKS * MOE_USED + P.finalNorm + P.head;    // 108,195,328

function createStack(W, H, dpr) {
  const narrow = W < 520;
  const PAGE = pageColor();
  const backdrop = makeBackdrop(W, H, dpr);

  // One routed expert is a square of side s, and every other piece has the area its parameters give it
  const s = narrow ? 16 : 22;
  const g = narrow ? 2 : 2.5;
  const gg = narrow ? 5 : 6;
  const pitch = s + (narrow ? 3 : 4);
  const rowW = 2 * (s + gg) + 8 * s + 7 * g;
  const barH = ((P.embed / P.expert) * s * s) / rowW;
  const x0 = narrow ? 104 : 80;
  const top = narrow ? 146 : 58;
  const yRows = top + barH + (narrow ? 21 : 26);
  const rowY = (i) => yRows + (11 - i) * pitch;        // block i + 1, counted from the bottom
  const yEmbed = rowY(0) + s + 8;
  const xShared = x0 + s + gg;
  const xRouted = xShared + s + gg;
  const mlaH = (P.mla / P.expert) * s;
  const denseW = (P.dense / P.expert) * s;
  const combineW = (P.combine / P.expert) * s;
  const M = narrow ? { x: x0, y: 108 } : { x: 372, y: 70 };   // where the MTP module's row sits
  const R = 372;                                              // the wide layout's column of numbers
  const rad = narrow ? 1.5 : 2;

  // Which two routed experts each of the two tokens gets, block by block (for show)
  const rand = seeded(11);
  const pickTwo = () => {
    const a = Math.floor(rand() * 8);
    let b = Math.floor(rand() * 7);
    if (b >= a) b += 1;
    return [a, b];
  };
  const PICKS = [0, 1].map(() => Array.from({ length: MOE_BLOCKS }, pickTwo));

  const T = { embed: 700, dense: 1500, moe: 2200, each: 300, head: 5600, mtp: 6900, aside: 8900 };
  // A token's way up: stage 0 is the embedding table, 1 to 12 the blocks, 13 the LM head
  const PASS = [{ at: 9800, lead: 450, dt: 230 }, { at: 14400, lead: 320, dt: 150 }];
  const stageAt = (p, k) => PASS[p].at + (k ? PASS[p].lead + (k - 1) * PASS[p].dt : 0);
  const passEnd = (p) => stageAt(p, 13) + 420;
  const LOOP = 19800;
  const stageY = (k) => (k === 0 ? yEmbed + barH / 2 : k === 13 ? top + barH / 2 : rowY(k - 1) + s / 2);

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP, 400, 700);

    const lit = (p, k) => ease(span(t, stageAt(p, k), stageAt(p, k) + 280));
    const built = (at, ms = 520) => easeOut(span(t, at, at + ms));
    const aside = ease(span(t, T.aside, T.aside + 700));
    const serif = (px) => `italic 400 ${px}px ${SERIF}`;
    const small = `400 ${narrow ? 9.5 : 10}px ${SANS}`;

    /** One piece: it rises into place as k goes to 1, and turns blue with b */
    const piece = (x, y, w, h, k, b = 0, idle = 0.13, on = 0.92) => {
      if (k <= 0) return;
      rrect(ctx, x, y + (1 - k) * 7, w, h, rad);
      if (b < 1) {
        ctx.fillStyle = ink(idle * (1 - b) * k);
        ctx.fill();
      }
      if (b > 0) {
        ctx.fillStyle = blue(on * b * k);
        ctx.fill();
      }
    };

    /** The embedding table or the LM head: a bar with its name and its count inside */
    const bar = (y, name, k, b) => {
      piece(x0, y, rowW, barH, k, b);
      if (k <= 0) return;
      const ty = y + (1 - k) * 7 + barH / 2 + 4;
      for (const [color, a] of [[ink(0.62), 1 - b], [PAGE, b]]) {
        if (a <= 0) continue;
        ctx.save();
        ctx.globalAlpha *= a * k;
        text(ctx, name, x0 + 10, ty, { font: serif(narrow ? 12 : 13), color });
        text(ctx, millions(P.embed), x0 + rowW - 10, ty - 0.5, { font: small, color, align: 'right' });
        ctx.restore();
      }
    };

    /** A MoE block's row at (x, y): MLA, the shared expert, the eight routed experts */
    const moeRow = (x, y, at, colorOf) => {
      piece(x, y + (s - mlaH) / 2, s, mlaH, built(at, 260), colorOf('mla').b, colorOf('mla').idle);
      piece(x + s + gg, y, s, s, built(at + 40, 260), colorOf('shared').b, colorOf('shared').idle);
      for (let j = 0; j < 8; j++) {
        const c = colorOf(j);
        piece(x + 2 * (s + gg) + j * (s + g), y, s, s, built(at + 80 + j * 22, 260), c.b, c.idle, c.on ?? 0.92);
      }
    };

    // The main model, from the bottom up
    const kEmbed = built(T.embed);
    const kDense = built(T.dense);
    const kHead = built(T.head);
    bar(yEmbed, 'embedding table', kEmbed, lit(0, 0));
    piece(x0, rowY(0) + (s - mlaH) / 2, s, mlaH, kDense, lit(0, 1));
    piece(xShared, rowY(0), denseW, s, built(T.dense + 60), lit(0, 1));
    let total = P.embed * kEmbed + DENSE_BLOCK * kDense + (P.finalNorm + P.head) * kHead;
    let used = P.embed * lit(0, 0) + DENSE_BLOCK * lit(0, 1) + (P.finalNorm + P.head) * lit(0, 13);
    for (let i = 0; i < MOE_BLOCKS; i++) {
      const at = T.moe + i * T.each;
      const a1 = lit(0, i + 2);
      const a2 = lit(1, i + 2);
      const idle = lerp(0.13, 0.06, a1);
      moeRow(x0, rowY(i + 1), at, (j) => {
        if (typeof j !== 'number') return { b: a1, idle: 0.13 };
        const first = PICKS[0][i].includes(j);
        const second = PICKS[1][i].includes(j);
        if (first && second) return { b: a1, idle };
        // The first token's experts stay faintly blue once the second token has picked its own
        if (first) return { b: a1, idle, on: lerp(0.92, 0.24, a2) };
        if (second) return { b: a2, idle };
        return { b: 0, idle };
      });
      total += MOE_BLOCK * built(at, T.each);
      used += MOE_USED * a1;
    }
    bar(top, 'LM head', kHead, lit(0, 13));

    // What the rows hold, over the top block
    const heads = span(t, T.moe + 10 * T.each, T.moe + 11 * T.each + 300);
    if (heads > 0) {
      const y = yRows - 8;
      text(ctx, 'MLA', x0 + s, y, { font: small, color: ink(0.5 * heads), align: 'right' });
      text(ctx, 'shared', xShared, y, { font: small, color: ink(0.5 * heads) });
      text(ctx, '8 routed experts', xRouted + (8 * s + 7 * g) / 2, y, { font: small, color: ink(0.5 * heads), align: 'center' });
    }
    if (kDense > 0) {
      const x = xShared + denseW + 9;
      const y = rowY(0) + s / 2 + 4;
      text(ctx, 'dense FFN', x, y, { font: serif(12), color: ink(0.55 * kDense) });
      ctx.font = serif(12);
      text(ctx, millions(P.dense), x + ctx.measureText('dense FFN').width + 7, y - 0.5, { font: small, color: ink(0.42 * kDense) });
      text(ctx, 'block 1', x0 - 16, y - 0.5, { font: small, color: ink(0.42 * kDense), align: 'right' });
    }
    const k12 = built(T.moe + 10 * T.each);
    if (k12 > 0) text(ctx, 'block 12', x0 - 16, rowY(11) + s / 2 + 3.5, { font: small, color: ink(0.42 * k12), align: 'right' });

    // The MTP module: one more MoE block and the projection that joins its two inputs
    const kMtp = built(T.mtp, 700);
    if (kMtp > 0) {
      ctx.save();
      ctx.globalAlpha *= lerp(1, 0.42, aside);
      moeRow(M.x, M.y, T.mtp + 100, () => ({ b: 0, idle: 0.13 }));
      piece(M.x + rowW + gg, M.y, combineW, s, built(T.mtp + 400, 260));
      rrect(ctx, M.x - 7, M.y - 7, rowW + gg + combineW + 14, s + 14, 5);
      ctx.strokeStyle = ink(0.3 * kMtp);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const right = M.x + rowW + gg + combineW + 7;
      text(ctx, 'MTP module', M.x - 7, M.y - 14, { font: serif(13), color: ink(lerp(0.7, 0.45, aside) * kMtp) });
      text(ctx, millions(MTP_MODULE), right, M.y - 14, { font: small, color: ink(0.45 * kMtp * (1 - aside)), align: 'right' });
      text(ctx, 'skipped at inference', right, M.y - 14, { font: serif(12), color: ink(0.6 * aside), align: 'right' });
      total += MTP_MODULE * kMtp;
    }

    // The token on its way up, beside the stack
    for (let p = 0; p < 2; p++) {
      if (t < PASS[p].at - 300 || t > passEnd(p) + 200) continue;
      let y = yEmbed + barH + 16;
      let a = span(t, PASS[p].at - 300, PASS[p].at);
      for (let k = 0; k <= 13; k++) {
        const from = k ? stageY(k - 1) : yEmbed + barH + 16;
        const start = k ? stageAt(p, k - 1) + 60 : PASS[p].at - 300;
        const end = stageAt(p, k) + 60;
        if (t >= start) y = lerp(from, stageY(k), ease(span(t, start, end)));
      }
      if (t > stageAt(p, 13) + 60) {
        const out = span(t, stageAt(p, 13) + 60, passEnd(p) + 200);
        y = lerp(stageY(13), top - 14, out);
        a = 1 - out;
      }
      dot(ctx, x0 - 8, y, 2.8, ink(0.8 * a));
    }

    // The two counts
    const shown = span(t, T.embed, T.embed + 300);
    const usedShown = span(t, T.aside + 300, T.aside + 800);
    if (narrow) {
      text(ctx, millions(total), 34, 54, { font: `500 22px ${SANS}`, color: ink(0.8 * shown) });
      text(ctx, 'parameters', 34, 72, { font: serif(13), color: ink(0.6 * shown) });
      text(ctx, millions(used), 190, 54, { font: `500 22px ${SANS}`, color: blue(0.95 * usedShown) });
      text(ctx, 'active per token', 190, 72, { font: serif(13), color: ink(0.6 * usedShown) });
    } else {
      text(ctx, millions(total), R, 224, { font: `500 28px ${SANS}`, color: ink(0.8 * shown) });
      text(ctx, 'parameters', R, 245, { font: serif(14), color: ink(0.6 * shown) });
      const main = span(t, T.head + 500, T.head + 900);
      const plus = span(t, T.mtp + 700, T.mtp + 1100);
      text(ctx, `${millions(MAIN)} in the main model`, R, 268, { font: `400 10.5px ${SANS}`, color: ink(0.5 * main) });
      text(ctx, `${millions(MTP_MODULE)} in the MTP module`, R, 284, { font: `400 10.5px ${SANS}`, color: ink(0.5 * plus) });
      text(ctx, millions(used), R, 352, { font: `500 28px ${SANS}`, color: blue(0.95 * usedShown) });
      text(ctx, 'active per token', R, 373, { font: serif(14), color: ink(0.6 * usedShown) });
      const two = span(t, stageAt(0, 2) + 200, stageAt(0, 2) + 700);
      text(ctx, '2 of the 8 routed experts in each MoE block', R, 396, { font: `400 10.5px ${SANS}`, color: ink(0.5 * two) });
    }

    // One square, for scale
    const key = span(t, T.moe, T.moe + 500);
    if (key > 0) {
      const kx = narrow ? 126 : R;
      const ky = narrow ? 464 : 452;
      rrect(ctx, kx, ky - 8.5, 9, 9, 1.5);
      ctx.fillStyle = ink(0.3 * key);
      ctx.fill();
      text(ctx, `= ${millions(P.expert)} parameters`, kx + 15, ky, { font: `400 10.5px ${SANS}`, color: ink(0.5 * key) });
    }
    ctx.restore();
  }, { still: passEnd(0) + 500 });
}

/* ───────────── Twelve questions, twenty replies each ───────────── */

// [question, right answers of 20 from the pretrained checkpoint, from the fine-tuned one]
const FACTS = [
  ['capital of France', 10, 20],
  ['capital of Japan', 9, 18],
  ['capital of Italy', 2, 14],
  ['largest planet', 1, 9],
  ['formula for water', 3, 4],
  ['opposite of hot', 1, 3],
  ['2 + 2', 0, 3],
  ['days in a week', 0, 2],
  ['planet we live on', 3, 2],
  ['who wrote Romeo and Juliet', 3, 1],
  ['blue + yellow', 0, 1],
  ['legs on a spider', 1, 1]
];
const REPLIES = 20;

function createDots(W, H, dpr) {
  const narrow = W < 520;
  const backdrop = makeBackdrop(W, H, dpr);
  // xs: where each checkpoint's dots start. label: the questions' right edge (left edge on phones)
  const L = narrow
    ? { xs: [36, 196], pitch: 7, r: 2.6, y0: 70, row: 31.5, label: 36, head: 44, total: 456 }
    : { xs: [218, 438], pitch: 9.6, r: 3.3, y0: 76, row: 21.5, label: 198, head: 48, total: 348 };
  const NAMES = ['pretrained', 'after SFT'];
  const T = [900, 4300];      // when each checkpoint's dots start to fill
  const ROW = 170;            // from one question to the next
  const DOT = 22;             // from one reply to the next
  const T_DONE = T[1] + 11 * ROW + REPLIES * DOT;
  const LOOP = 12400;
  const width = (REPLIES - 1) * L.pitch;
  const dotsY = (q) => L.y0 + q * L.row + (narrow ? 13 : 0);

  return looping(LOOP, (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = loopAlpha(t, LOOP, 400, 700);
    const intro = span(t, 150, 650);
    const serif = (px) => `italic 400 ${px}px ${SERIF}`;
    const num = `400 ${narrow ? 9 : 9.5}px ${SANS}`;

    FACTS.forEach(([question], q) => {
      if (narrow) text(ctx, question, L.label - 2.5, L.y0 + q * L.row, { font: serif(12), color: ink(0.62 * intro) });
      else text(ctx, question, L.label, dotsY(q) + 4, { font: serif(12.5), color: ink(0.62 * intro), align: 'right' });
    });

    for (let c = 0; c < 2; c++) {
      const x = L.xs[c];
      const started = span(t, T[c] - 300, T[c]);
      text(ctx, NAMES[c], narrow ? x - 2.5 : x + width / 2, L.head, { font: `500 ${narrow ? 12 : 12.5}px ${SANS}`, color: ink(lerp(0.4, 0.75, started) * intro), align: narrow ? 'left' : 'center' });
      let right = 0;
      FACTS.forEach((fact, q) => {
        const count = fact[c + 1];
        const at = T[c] + q * ROW;
        for (let j = 0; j < REPLIES; j++) {
          const k = j < count ? easeOut(span(t, at + j * DOT, at + j * DOT + 200)) : 0;
          const pop = 1 + 0.45 * Math.sin(Math.PI * k) * (k < 1 ? 1 : 0);
          if (k < 1) dot(ctx, x + j * L.pitch, dotsY(q), L.r, ink(0.11 * (1 - k) * intro));
          if (k > 0) dot(ctx, x + j * L.pitch, dotsY(q), L.r * pop, blue(0.92 * k * intro));
          right += k >= 0.5 ? 1 : 0;
        }
        const counted = span(t, at + Math.max(count, 3) * DOT, at + Math.max(count, 3) * DOT + 250);
        if (counted > 0) text(ctx, String(count), x + width + (narrow ? 7 : 10), dotsY(q) + 3.2, { font: num, color: ink(0.42 * counted) });
      });
      if (started > 0) {
        const tx = narrow ? x - 2.5 : x + width / 2;
        const label = `${right} of ${FACTS.length * REPLIES}`;
        ctx.font = `500 ${narrow ? 12 : 12.5}px ${SANS}`;
        const w = ctx.measureText(label).width;
        ctx.font = serif(12.5);
        const w2 = ctx.measureText(' right').width;
        const left = narrow ? tx : tx - (w + w2) / 2;
        text(ctx, label, left, L.total, { font: `500 ${narrow ? 12 : 12.5}px ${SANS}`, color: toBlue(right ? 1 : 0, 0.9 * started) });
        text(ctx, ' right', left + w, L.total, { font: serif(12.5), color: ink(0.6 * started) });
      }
    }

    if (!narrow) text(ctx, '20 replies to each question', L.label, L.total, { font: serif(12.5), color: ink(0.5 * intro), align: 'right' });
    ctx.restore();
  }, { still: T_DONE + 600 });
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

  return { stack: fitted(createStack), dots: fitted(createDots) };
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
  methods: createPackingMethods,
  islands: createIslands,
  reading: createReading,
  'research-map': createResearchMap,
  'ds-architecture': createDeepSeekArchitecture,
  'ds-moe-route': DS_MOE.route,
  'ds-moe-balance': DS_MOE.balance,
  'ds-rmsnorm': DS_BLOCK.rmsnorm,
  'ds-swiglu': DS_BLOCK.swiglu,
  'ds-mla-squares': DS_MLA.squares,
  'ds-cache-memory': DS_MLA.memory,
  'ds-rope-dials': DS_ROPE.dials,
  'ds-mtp-towers': DS_MTP.towers,
  'ds-train-loss': DS_TRAIN.loss,
  'ds-sft-loss': DS_TRAIN.sft,
  'ds-mini-stack': DS_MINI.stack,
  'ds-fact-dots': DS_MINI.dots
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
