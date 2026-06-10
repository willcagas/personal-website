/**
 * Hill Climb — a tiny recursive self-improvement visualization.
 *
 * A wireframe loss landscape rendered in 2.5D on a <canvas>. An agent
 * performs stochastic hill climbing: it samples nearby points and moves
 * uphill. When it stalls on a local optimum it "self-improves" — the next
 * generation searches wider, samples more, and restarts biased toward the
 * best basin found so far. When it reaches the global peak (the frontier),
 * the landscape regenerates and the loop continues.
 *
 * Zero dependencies. Theme-aware. Pauses offscreen / in hidden tabs.
 */

const GRID_N = 40;          // terrain mesh resolution
const Z_SCALE = 0.45;       // vertical exaggeration of terrain
const TILT = 0.34;          // y-flattening for the 2.5D projection
const VISIBLE_R = 1.2;      // radius beyond which the rim fade hides the mesh
const ROT_SPEED = 0.00009;  // radians per ms
const FRONTIER_EPS = 0.985; // fraction of global max that counts as "frontier"
const STUCK_LIMIT = 70;     // failed samples before declaring a local optimum
const CHART_MAX = 260;      // max samples kept in the compounding score curve

let activeInstance = null;

function makeTerrain(rng) {
  // Sum of random gaussian peaks + gentle ripple over [-1, 1]^2
  const peaks = [];
  const peakCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < peakCount; i++) {
    peaks.push({
      cx: (rng() * 2 - 1) * 0.8,
      cy: (rng() * 2 - 1) * 0.8,
      amp: 0.35 + rng() * 0.65,
      sigma: 0.18 + rng() * 0.25
    });
  }
  const ripple = { fx: 2 + rng() * 2, fy: 2 + rng() * 2, amp: 0.015 + rng() * 0.02 };

  const height = (x, y) => {
    let h = 0;
    for (const p of peaks) {
      const dx = x - p.cx;
      const dy = y - p.cy;
      h += p.amp * Math.exp(-(dx * dx + dy * dy) / (2 * p.sigma * p.sigma));
    }
    h += ripple.amp * Math.sin(x * ripple.fx * Math.PI) * Math.cos(y * ripple.fy * Math.PI);
    return h;
  };

  // Sample the mesh and locate the global max
  const grid = new Float32Array((GRID_N + 1) * (GRID_N + 1));
  let maxH = -Infinity;
  let maxPos = { x: 0, y: 0 };
  for (let j = 0; j <= GRID_N; j++) {
    for (let i = 0; i <= GRID_N; i++) {
      const x = (i / GRID_N) * 2 - 1;
      const y = (j / GRID_N) * 2 - 1;
      const h = height(x, y);
      grid[j * (GRID_N + 1) + i] = h;
      if (h > maxH) {
        maxH = h;
        maxPos = { x, y };
      }
    }
  }

  return { height, grid, maxH, maxPos };
}

class HillClimb {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.hud = hud;
    this.ctx = canvas.getContext('2d');
    this.rng = Math.random;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.rafId = null;
    this.visible = true;
    this.lastTs = 0;
    this.angle = 0.7;

    this.gen = 1;          // search restarts (drives self-improvement widening)
    this.directive = 1;    // research directives = distinct landscapes solved
    this.iter = 0;
    this.frontierHold = 0; // ms remaining of "frontier reached" celebration

    this.readTheme();
    this.themeQuery = window.matchMedia('(prefers-color-scheme: light)');
    this.onThemeChange = () => this.readTheme();
    this.themeQuery.addEventListener('change', this.onThemeChange);

    this.resetWorld();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.start();
    }, { threshold: 0.05 });
    this.io.observe(canvas);

    this.onVisibility = () => {
      if (!document.hidden && this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    if (this.reduceMotion) {
      // Pre-run the search so the static frame still tells the story
      for (let i = 0; i < 900; i++) this.stepAgent();
      this.draw();
    } else {
      this.start();
    }
  }

  readTheme() {
    const light = window.matchMedia('(prefers-color-scheme: light)').matches;
    this.colors = light
      ? {
        line: 'rgba(0, 0, 0, 0.10)',
        lineHigh: 'rgba(0, 0, 0, 0.30)',
        trail: '23, 23, 23',
        agent: '#171717',
        accent: '#b8860b',
        accentSoft: 'rgba(184, 134, 11, 0.55)',
        marker: 'rgba(0, 0, 0, 0.45)'
      }
      : {
        line: 'rgba(255, 255, 255, 0.07)',
        lineHigh: 'rgba(255, 255, 255, 0.28)',
        trail: '212, 212, 212',
        agent: '#f5f5f5',
        accent: '#FFCE1A',
        accentSoft: 'rgba(255, 206, 26, 0.55)',
        marker: 'rgba(255, 255, 255, 0.45)'
      };
  }

  resetWorld() {
    this.terrain = makeTerrain(this.rng);
    this.best = null;       // best point found this world: {x, y, h}
    this.pulses = [];       // expanding rings at local optima
    this.scoreHistory = []; // monotonic best-score per experiment (this directive)
    this.computeLayout();
    this.spawnAgent(true);
  }

  /**
   * Fit the terrain into the canvas for any rotation angle. As the mesh
   * spins, a point at radius r sweeps yr ∈ [-r, r], so its projected
   * height v = yr * TILT - z * Z_SCALE is bounded per point; take the
   * extremes over the whole grid (plus the frontier marker) and solve for
   * the scale and vertical center that keep everything inside the frame.
   */
  computeLayout() {
    if (!this.w || !this.terrain) return;
    const { grid, maxH, maxPos } = this.terrain;
    const pad = 8;
    let vMin = Infinity;
    let vMax = -Infinity;
    for (let j = 0; j <= GRID_N; j++) {
      for (let i = 0; i <= GRID_N; i++) {
        const x = (i / GRID_N) * 2 - 1;
        const y = (j / GRID_N) * 2 - 1;
        const r = Math.hypot(x, y);
        if (r > VISIBLE_R) continue; // fully hidden by the rim fade
        const z = grid[j * (GRID_N + 1) + i];
        vMin = Math.min(vMin, -r * TILT - z * Z_SCALE);
        vMax = Math.max(vMax, r * TILT - z * Z_SCALE);
      }
    }
    // Frontier diamond hovers above the peak; keep it in frame too
    const fr = Math.hypot(maxPos.x, maxPos.y);
    vMin = Math.min(vMin, -fr * TILT - (maxH + 0.18) * Z_SCALE);

    // Horizontal bound only needs to cover the visible (unfaded) radius
    const scaleX = (this.w / 2 - pad) / (Math.SQRT2 * 0.9);
    const scaleY = (this.h - 2 * pad) / (vMax - vMin);
    this.scale = Math.min(scaleX, scaleY);
    this.cy = this.h / 2 - ((vMin + vMax) / 2) * this.scale;
    this.vMid = (vMin + vMax) / 2;
    this.vSpan = vMax - vMin;
  }

  spawnAgent(fresh) {
    let x, y;
    if (!fresh && this.best && this.rng() < 0.5) {
      // Self-improvement: restart biased toward the best basin found so far
      x = this.best.x + (this.rng() * 2 - 1) * 0.5;
      y = this.best.y + (this.rng() * 2 - 1) * 0.5;
    } else {
      x = this.rng() * 2 - 1;
      y = this.rng() * 2 - 1;
    }
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));

    this.agent = {
      x, y,
      h: this.terrain.height(x, y),
      // Each generation searches a bit wider and samples a bit more
      sigma: 0.05 + Math.min(0.06, this.gen * 0.004),
      samples: Math.min(7, 2 + Math.floor(this.gen / 2)),
      stuck: 0
    };
    this.trail = [{ x, y, h: this.agent.h }];
  }

  /** One hill-climbing attempt: sample candidates, move to the best uphill one. */
  stepAgent() {
    if (this.frontierHold > 0) return;
    const a = this.agent;
    const t = this.terrain;
    this.iter++;

    let bestCand = null;
    for (let s = 0; s < a.samples; s++) {
      const ang = this.rng() * Math.PI * 2;
      const r = a.sigma * (0.4 + this.rng());
      const cx = Math.max(-1, Math.min(1, a.x + Math.cos(ang) * r));
      const cy = Math.max(-1, Math.min(1, a.y + Math.sin(ang) * r));
      const ch = t.height(cx, cy);
      if (ch > a.h && (!bestCand || ch > bestCand.h)) {
        bestCand = { x: cx, y: cy, h: ch };
      }
    }

    if (bestCand) {
      a.x = bestCand.x;
      a.y = bestCand.y;
      a.h = bestCand.h;
      a.stuck = 0;
      this.trail.push({ x: a.x, y: a.y, h: a.h });
      if (this.trail.length > 90) this.trail.shift();
      if (!this.best || a.h > this.best.h) {
        this.best = { x: a.x, y: a.y, h: a.h };
      }
    } else {
      a.stuck++;
    }

    // Record the compounding score — best-so-far normalized to the frontier.
    // Stays flat on plateaus, steps up on improvement: a staircase toward 1.0.
    const norm = this.best ? Math.max(0, Math.min(1, this.best.h / t.maxH)) : 0;
    this.scoreHistory.push(norm);
    if (this.scoreHistory.length > CHART_MAX) {
      // Decimate by 2 so the full arc stays visible while bounded in memory
      const next = [];
      for (let k = 0; k < this.scoreHistory.length; k += 2) next.push(this.scoreHistory[k]);
      this.scoreHistory = next;
    }

    // Reached the frontier: celebrate, then regenerate the landscape
    if (a.h >= t.maxH * FRONTIER_EPS) {
      this.best = { x: a.x, y: a.y, h: a.h };
      this.pulses.push({ x: a.x, y: a.y, h: a.h, age: 0, frontier: true });
      this.frontierHold = this.reduceMotion ? 0 : 2200;
      if (this.reduceMotion) this.advanceGeneration(true);
      return;
    }

    // Stalled on a local optimum: mark it and self-improve
    if (a.stuck > STUCK_LIMIT) {
      this.pulses.push({ x: a.x, y: a.y, h: a.h, age: 0, frontier: false });
      this.advanceGeneration(false);
    }
  }

  advanceGeneration(newWorld) {
    this.gen++;
    if (newWorld) {
      this.directive++;
      this.resetWorld();
    } else {
      this.spawnAgent(false);
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.dpr = dpr;
    this.w = rect.width;
    this.h = rect.height;
    this.computeLayout();
    if (this.reduceMotion) this.draw();
  }

  project(x, y, z) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const xr = x * cos - y * sin;
    const yr = x * sin + y * cos;
    return {
      x: this.w / 2 + xr * this.scale,
      y: this.cy + (yr * TILT - z * Z_SCALE) * this.scale
    };
  }

  draw() {
    const ctx = this.ctx;
    if (!this.w) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const { grid, maxH, maxPos } = this.terrain;
    const c = this.colors;

    // Terrain mesh — lines brighten with elevation
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const at = (i, j) => grid[j * (GRID_N + 1) + i];
    const drawPolyline = (points, avgH) => {
      const tNorm = Math.max(0, Math.min(1, avgH / maxH));
      ctx.strokeStyle = c.line;
      ctx.globalAlpha = 0.55 + tNorm * 0.45;
      ctx.beginPath();
      for (let k = 0; k < points.length; k++) {
        const p = points[k];
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    const step = 2; // draw every other mesh line; keeps it airy
    for (let j = 0; j <= GRID_N; j += step) {
      const pts = [];
      let sum = 0;
      for (let i = 0; i <= GRID_N; i++) {
        const x = (i / GRID_N) * 2 - 1;
        const y = (j / GRID_N) * 2 - 1;
        const z = at(i, j);
        sum += z;
        pts.push(this.project(x, y, z));
      }
      drawPolyline(pts, sum / (GRID_N + 1));
    }
    for (let i = 0; i <= GRID_N; i += step) {
      const pts = [];
      let sum = 0;
      for (let j = 0; j <= GRID_N; j++) {
        const x = (i / GRID_N) * 2 - 1;
        const y = (j / GRID_N) * 2 - 1;
        const z = at(i, j);
        sum += z;
        pts.push(this.project(x, y, z));
      }
      drawPolyline(pts, sum / (GRID_N + 1));
    }

    // Soft radial fade so the mesh dissolves at the rim instead of
    // ending in a hard rectangular edge
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const fadeCx = this.w / 2;
    const fadeCy = this.cy + this.vMid * this.scale;
    const fadeR = Math.SQRT2 * this.scale;
    const ratio = (this.vSpan / 2) / Math.SQRT2;
    ctx.translate(fadeCx, fadeCy);
    ctx.scale(1, Math.max(0.2, ratio));
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, fadeR);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.58, 'rgba(0,0,0,0)');
    fade.addColorStop(0.88, 'rgba(0,0,0,1)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(-fadeR, -fadeR, fadeR * 2, fadeR * 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';

    // Frontier marker: faint diamond hovering over the global max
    const fp = this.project(maxPos.x, maxPos.y, maxH + 0.12);
    ctx.strokeStyle = c.marker;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(fp.x, fp.y - 4.5);
    ctx.lineTo(fp.x + 4.5, fp.y);
    ctx.lineTo(fp.x, fp.y + 4.5);
    ctx.lineTo(fp.x - 4.5, fp.y);
    ctx.closePath();
    ctx.stroke();

    // Pulses at local optima / the frontier
    this.pulses = this.pulses.filter((p) => p.age < 1);
    for (const p of this.pulses) {
      const pp = this.project(p.x, p.y, p.h);
      const r = 3 + p.age * (p.frontier ? 42 : 22);
      ctx.strokeStyle = p.frontier ? c.accentSoft : `rgba(${c.trail}, ${0.5 * (1 - p.age)})`;
      ctx.lineWidth = p.frontier ? 1.6 : 1.2;
      ctx.globalAlpha = 1 - p.age;
      ctx.beginPath();
      ctx.ellipse(pp.x, pp.y, r, r * TILT, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Agent trail — smoothed through segment midpoints, fading with age
    if (this.trail.length > 2) {
      const pts = this.trail.map((t) => this.project(t.x, t.y, t.h));
      ctx.lineWidth = 1.4;
      for (let k = 1; k < pts.length - 1; k++) {
        const m0 = { x: (pts[k - 1].x + pts[k].x) / 2, y: (pts[k - 1].y + pts[k].y) / 2 };
        const m1 = { x: (pts[k].x + pts[k + 1].x) / 2, y: (pts[k].y + pts[k + 1].y) / 2 };
        const alpha = (k / pts.length) * 0.7;
        ctx.strokeStyle = `rgba(${c.trail}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(m0.x, m0.y);
        ctx.quadraticCurveTo(pts[k].x, pts[k].y, m1.x, m1.y);
        ctx.stroke();
      }
    }

    // Best-so-far marker
    if (this.best) {
      const bp = this.project(this.best.x, this.best.y, this.best.h);
      ctx.fillStyle = c.accentSoft;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Agent — glowing dot
    const ap = this.project(this.agent.x, this.agent.y, this.agent.h);
    const glowR = this.frontierHold > 0 ? 14 : 9;
    const glow = ctx.createRadialGradient(ap.x, ap.y, 0, ap.x, ap.y, glowR);
    glow.addColorStop(0, c.accentSoft);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.frontierHold > 0 ? c.accent : c.agent;
    ctx.beginPath();
    ctx.arc(ap.x, ap.y, 2.6, 0, Math.PI * 2);
    ctx.fill();

    this.drawScoreChart();
    this.updateHud();
  }

  /**
   * Inset eval-score sparkline. The best-so-far score compounds upward
   * across experiments toward a dashed Frontier line; on a breakthrough
   * it turns gold.
   */
  drawScoreChart() {
    const ctx = this.ctx;
    const c = this.colors;
    const hist = this.scoreHistory;
    const breakthrough = this.frontierHold > 0;

    const cw = Math.min(150, this.w * 0.38);
    const ch = 40;
    const x0 = 14;
    const y0 = 16;
    const labelCol = `rgba(${c.trail}, 0.5)`;

    ctx.font = '9px "SF Mono", "Menlo", "Consolas", monospace';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = labelCol;
    ctx.textAlign = 'left';
    ctx.fillText('EVAL SCORE', x0, y0 - 5);
    ctx.textAlign = 'right';
    ctx.fillStyle = breakthrough ? c.accent : labelCol;
    ctx.fillText(breakthrough ? 'BREAKTHROUGH' : 'FRONTIER', x0 + cw, y0 - 5);
    ctx.textAlign = 'left';

    // Frontier target line (score = 1.0)
    ctx.strokeStyle = breakthrough ? c.accentSoft : c.marker;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + cw, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Baseline (score = 0)
    ctx.strokeStyle = `rgba(${c.trail}, 0.18)`;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ch);
    ctx.lineTo(x0 + cw, y0 + ch);
    ctx.stroke();

    if (hist.length > 1) {
      ctx.strokeStyle = breakthrough ? c.accent : `rgba(${c.trail}, 0.85)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < hist.length; k++) {
        const x = x0 + (k / (hist.length - 1)) * cw;
        const y = y0 + ch - hist[k] * ch;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Leading marker at the current score
      const lx = x0 + cw;
      const ly = y0 + ch - hist[hist.length - 1] * ch;
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateHud() {
    if (!this.hud) return;
    const t = this.terrain;
    const best = this.best ? this.best.h / t.maxH : 0;
    const status = this.frontierHold > 0
      ? 'breakthrough · new directive'
      : (this.agent.stuck > STUCK_LIMIT * 0.6 ? 'self-improving search…' : 'climbing to frontier');
    this.hud.textContent =
      `directive ${String(this.directive).padStart(2, '0')} · experiments ${this.iter.toLocaleString('en-US')} · score ${(best).toFixed(3)} / 1.000 · ${status}`;
  }

  start() {
    if (this.rafId !== null || this.reduceMotion || this.destroyed) return;
    this.lastTs = 0;
    const loop = (ts) => {
      this.rafId = null;
      if (this.destroyed || !this.visible || document.hidden) return;
      if (!this.lastTs) this.lastTs = ts;
      const dt = Math.min(64, ts - this.lastTs);
      this.lastTs = ts;

      this.angle += ROT_SPEED * dt;
      for (const p of this.pulses) p.age += dt / 1100;

      if (this.frontierHold > 0) {
        this.frontierHold -= dt;
        if (this.frontierHold <= 0) {
          this.frontierHold = 0;
          this.advanceGeneration(true);
        }
      } else {
        // ~30 search steps per second keeps the climb legible
        this.stepAccum = (this.stepAccum || 0) + dt;
        while (this.stepAccum >= 33) {
          this.stepAccum -= 33;
          this.stepAgent();
        }
      }

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
    this.themeQuery.removeEventListener('change', this.onThemeChange);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}

/**
 * Mount (or remount) the visualization on the current page.
 * Safe to call on every navigation; cleans up the previous instance.
 */
export function initHillClimb() {
  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }
  const canvas = document.getElementById('hill-climb-canvas');
  if (!canvas) return;
  const hud = document.getElementById('hill-climb-hud');
  activeInstance = new HillClimb(canvas, hud);
}
