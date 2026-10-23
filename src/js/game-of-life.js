/**
 * Game of Life — an evolutionary research field.
 *
 * Conway's B3/S23 automaton as a picture of autonomous research: gliders
 * drift up and to the right (the hill-climb), fresh soup is seeded
 * continuously (new experiments), and every so often a live cluster makes a
 * breakthrough and flashes. Cells grow fitter (darker) toward the right. The
 * search never stabilises and never stops.
 *
 * Zero dependencies. Pauses offscreen / in hidden tabs.
 */

const CELL = 9;             // CSS px per cell
const STEP_MS = 150;        // one Conway generation (calmer than real-time)
const PAD = 7;              // overscan cells so the grid's hard edge sits off-screen
const FADE = 30;            // CSS px of soft fade at the visible border
const GROUND_CLEAR = 16;    // CSS px above the footer mountains where no cell lives
const SPAWN_GAP = 24;       // CSS px above the footer mountains that new patterns start clear of
const SOUP_DENSITY = 0.42;

const rand = (a, b) => a + Math.random() * (b - a);

let activeInstance = null;

class GameOfLife {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ground = document.querySelector('[data-range-footer]');
    this.wallRow = Infinity;
    this.spawnRow = Infinity;
    // A still frame doesn't tick, so clear the ground and redraw as the mountains scroll in
    this.onScroll = () => {
      this.applyWall();
      this.draw(0);
    };
    if (this.reduceMotion) window.addEventListener('scroll', this.onScroll, { passive: true });

    this.rafId = null;
    this.visible = true;
    this.lastTs = 0;
    this.stepAccum = 0;
    this.ticks = 0;
    this.cols = 0;
    this.rows = 0;
    this.grid = new Uint8Array(0);
    this.next = new Uint8Array(0);
    this.bright = new Float32Array(0);
    this.flash = new Float32Array(0);

    this.readTheme();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]?.isIntersecting ?? true;
      if (this.visible) this.start();
    }, { threshold: 0 });
    this.io.observe(canvas);

    this.onVisibility = () => {
      if (!document.hidden && this.visible) this.start();
    };
    document.addEventListener('visibilitychange', this.onVisibility);

    this.start();
  }

  readTheme() {
    // The site is cream in every mode, so use the light palette.
    this.colors = {
      ink: '42, 46, 56',   // #2a2e38
      glow: '40, 90, 210'  // a discovery burns blue
    };
  }

  idx(c, r) {
    return r * this.cols + c;
  }

  // column/row inside the visible interior for a 0..1 fraction
  ix(f) {
    return PAD + Math.floor(f * (this.cols - 2 * PAD));
  }

  // New patterns start at least SPAWN_GAP px above the mountains, whole footprint
  // included: soups and gliders reach 2 rows below the row they're anchored on
  iy(f) {
    const limit = Math.min(this.rows - PAD, this.spawnRow - 2);
    return PAD + Math.floor(f * Math.max(6, limit - PAD + 1));
  }

  /**
   * Last grid row lying entirely `px` or more above the footer mountains. The
   * canvas is fixed to the viewport while the range scrolls with the page, so
   * this moves as you scroll.
   */
  rowAbove(px) {
    if (!this.ground) return Infinity;
    const groundY = this.ground.getBoundingClientRect().top - this.canvas.getBoundingClientRect().top;
    return Math.floor((groundY - px - this.offY) / CELL) - 1;
  }

  /** Nothing lives at or below the wall; cells there die like any other. */
  applyWall() {
    this.wallRow = Math.max(0, this.rowAbove(GROUND_CLEAR) + 1); // first row that must stay empty
    this.spawnRow = this.rowAbove(SPAWN_GAP);
    if (this.wallRow >= this.rows) return;
    const from = this.wallRow * this.cols;
    this.grid.fill(0, from);
    if (this.reduceMotion) this.bright.fill(0, from);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.w = rect.width;
    this.h = rect.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.h * this.dpr));
    this.s = Math.max(0.7, Math.min(1.25, this.w / 1200));
    this.rebuild();
    if (this.reduceMotion) this.settle();
    this.draw(16);
  }

  rebuild() {
    // Overscan by PAD on every side so the grid's hard edge is off-screen
    this.cols = Math.max(1, Math.ceil(this.w / CELL)) + 2 * PAD;
    this.rows = Math.max(1, Math.ceil(this.h / CELL)) + 2 * PAD;
    this.offX = -PAD * CELL;
    this.offY = -PAD * CELL;
    const len = this.cols * this.rows;
    this.grid = new Uint8Array(len);
    this.next = new Uint8Array(len);
    this.bright = new Float32Array(len);
    this.flash = new Float32Array(len);
    this.applyWall();

    // Scatter initial clusters across the visible interior
    const blobs = Math.max(6, (len / 1150) | 0);
    for (let i = 0; i < blobs; i++) {
      this.seedSoup(
        this.ix(rand(0.02, 0.95)),
        this.iy(rand(0.05, 0.95)),
        4 + ((Math.random() * 3) | 0),
        4 + ((Math.random() * 3) | 0)
      );
    }
    for (let i = 0; i < 4; i++) {
      this.seedGlider(this.ix(rand(0.05, 0.4)), this.iy(rand(0.55, 0.9)));
    }
    this.estPop = len * 0.1;
  }

  /** For a static frame: let the soup settle so it shows real structures. */
  settle() {
    for (let i = 0; i < 40; i++) this.tick();
    this.bright.set(this.grid);
  }

  seedSoup(c0, r0, w, h) {
    for (let r = r0; r < r0 + h; r++) {
      for (let c = c0; c < c0 + w; c++) {
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) continue;
        if (Math.random() < SOUP_DENSITY) this.grid[this.idx(c, r)] = 1;
      }
    }
  }

  /** A glider oriented to travel up and to the right (the hill-climb). */
  seedGlider(c0, r0) {
    const cells = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 1]];
    for (const [dr, dc] of cells) {
      const c = c0 + dc;
      const r = r0 + dr;
      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.grid[this.idx(c, r)] = 1;
    }
  }

  inject() {
    if (Math.random() < 0.4) {
      // A glider launched from the lower-left, climbing toward the frontier
      this.seedGlider(this.ix(rand(0.02, 0.5)), this.iy(rand(0.5, 0.95)));
    } else {
      // A soup blob, biased lower-left so the search flows up and right
      const c0 = this.ix(rand(0, 1) ** 1.4);
      const r0 = this.iy(1 - rand(0, 1) ** 1.4);
      this.seedSoup(c0 - 2, r0 - 2, 5, 5);
    }
  }

  /** Light up a live cluster, preferring the upper-right frontier. */
  breakthrough() {
    const { cols, rows, grid, flash } = this;
    let best = -1;
    let bestScore = -1;
    for (let k = 0; k < 48; k++) {
      const c = this.ix(Math.random());
      const r = this.iy(Math.random());
      if (!grid[this.idx(c, r)]) continue;
      const score = c / cols + (1 - r / rows) + Math.random() * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = this.idx(c, r);
      }
    }
    if (best < 0) return;
    const cc = best % cols;
    const rr = (best / cols) | 0;
    const R = 3;
    for (let dr = -R; dr <= R; dr++) {
      for (let dc = -R; dc <= R; dc++) {
        const c = cc + dc;
        const r = rr + dr;
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        // Soft-edged disc so the glow falls off toward the rim
        const d = (dc * dc + dr * dr) / (R * R);
        if (d <= 1) flash[this.idx(c, r)] = Math.max(flash[this.idx(c, r)], 1 - d * 0.6);
      }
    }
  }

  tick() {
    const { cols, rows, grid, next } = this;
    const len = cols * rows;
    // Bounded grid: cells past the edge count as dead
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
            n += grid[rr * cols + cc];
          }
        }
        const i = r * cols + c;
        next[i] = grid[i] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    }
    this.grid = next;
    this.next = grid;
    this.ticks++;
    this.applyWall();

    // Keep the field lively without overcrowding it
    if (this.ticks % 12 === 0) {
      let pop = 0;
      for (let i = 0; i < len; i++) pop += this.grid[i];
      this.estPop = pop;
      if (pop < len * 0.02) for (let i = 0; i < 4; i++) this.inject();
    }
    if (this.ticks % 7 === 0 && this.estPop < len * 0.09) this.inject();

    // A breakthrough at the frontier every few seconds
    if (this.ticks % 22 === 0) this.breakthrough();
  }

  draw(dt) {
    if (!this.cols) return;
    const { ctx, cols, rows, grid, bright, flash, w: W, h: H, colors } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ease = Math.min(1, dt / 190); // gentle pulse, not a hard toggle
    const decay = Math.min(1, dt / 720);
    const sz = Math.max(2, CELL - 2);

    const inner = cols - 2 * PAD;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        bright[i] += (grid[i] - bright[i]) * ease;
        if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - decay);
        const b = bright[i];
        if (b < 0.03) continue;
        const x = c * CELL + this.offX + (CELL - sz) / 2;
        const y = r * CELL + this.offY + (CELL - sz) / 2;
        if (x + sz < 0 || x > W || y + sz < 0 || y > H) continue;
        // Soft-fade the outermost band so nothing clips at the border
        const edge = Math.max(0, Math.min(1, x / FADE, (W - x) / FADE, y / FADE, (H - y) / FADE));
        if (edge <= 0) continue;
        const fit = 0.5 + 0.45 * ((c - PAD) / inner); // right = fitter
        const lit = flash[i];
        if (lit > 0.12) {
          // A discovery: the cluster burns bright and glows
          const a = Math.min(1, edge * (0.4 + 0.6 * lit)).toFixed(3);
          ctx.save();
          ctx.shadowBlur = 18 * this.s * lit;
          ctx.shadowColor = `rgba(${colors.glow}, ${a})`;
          ctx.fillStyle = `rgba(${colors.glow}, ${a})`;
          ctx.fillRect(x, y, sz, sz);
          ctx.restore();
        } else {
          const a = Math.min(1, b * fit * edge).toFixed(3);
          ctx.fillStyle = `rgba(${colors.ink}, ${a})`;
          ctx.fillRect(x, y, sz, sz);
        }
      }
    }
  }

  start() {
    if (this.rafId !== null || this.reduceMotion || this.destroyed) return;
    this.lastTs = 0;
    const loop = (ts) => {
      this.rafId = null;
      if (this.destroyed || !this.visible || document.hidden) return;
      const dt = this.lastTs ? Math.min(64, ts - this.lastTs) : 16;
      this.lastTs = ts;

      this.stepAccum += dt;
      let guard = 0;
      while (this.stepAccum >= STEP_MS && guard < 4) {
        this.tick();
        this.stepAccum -= STEP_MS;
        guard++;
      }
      this.draw(dt);
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
    window.removeEventListener('scroll', this.onScroll);
  }
}

/**
 * Mount (or remount) the visualization on the current page.
 * Safe to call on every navigation; cleans up the previous instance.
 */
export function initGameOfLife() {
  if (activeInstance) {
    activeInstance.destroy();
    activeInstance = null;
  }
  const canvas = document.getElementById('game-of-life-canvas');
  if (!canvas) return;
  activeInstance = new GameOfLife(canvas);
}
