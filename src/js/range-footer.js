/**
 * Range footer — an engraved mountain range across the bottom of every page.
 *
 * Static ink-on-paper drawing: a faint far range, a near range whose shaded
 * faces get diagonal hatching and layered contour strokes, and a crisp ridge
 * line. The range is filled with the page colour so it sits in front of the
 * Game of Life background; the sky above it stays transparent. A fixed seed
 * keeps the same range on every load, redrawn to fit on resize.
 */

const INK = '28, 25, 23';
const SEED = 1859; // On the Origin of Species

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function draw(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const W = rect.width;
  const H = rect.height;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  const paper = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim() || '#fdfaf6';
  const r = rng(SEED);
  const s = Math.min(1, H / 170);
  const BASE = H;
  const TOP = H * 0.1;
  const yOf = (f) => BASE - f * (BASE - TOP);

  // Peaks laid out by position along the page, so the range keeps its shape as it stretches
  const count = Math.max(6, Math.round(W / 150));
  const peaks = [];
  for (let i = 0; i < count; i++) {
    peaks.push({ x: (i + 0.15 + r() * 0.7) / count, h: 0.3 + r() * 0.34, w: (26 + r() * 34) * s });
  }
  for (let k = 0; k < Math.max(1, Math.round(count / 7)); k++) {
    peaks[Math.floor(r() * count)].h = 0.82 + r() * 0.12;
  }
  const far = Array.from({ length: count + 2 }, (_, i) => ({ x: (i - 0.5 + r()) / count, h: 0.42 + r() * 0.32, w: (48 + r() * 40) * s }));
  const score = (x, ps, base) => {
    let v = base;
    for (const p of ps) v = Math.max(v, p.h * Math.exp(-((x - p.x * W) ** 2) / (2 * p.w * p.w)));
    return v + 0.012 * Math.sin(x * 0.09) + 0.008 * Math.sin(x * 0.23 + 1);
  };
  const ridge = (x) => yOf(score(x, peaks, 0.08));
  const farRidge = (x) => yOf(score(x, far, 0.22) * 0.8) - 4;

  // Far range, faint, with a few receding strokes
  g.lineWidth = 1;
  for (let k = 0; k < 7; k++) {
    g.strokeStyle = `rgba(${INK}, ${k ? 0.045 - k * 0.005 : 0.18})`;
    g.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = farRidge(x) + k * 7 * s;
      if (x) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
  }
  // Fill under the far range so the background doesn't show through the mountains
  g.fillStyle = paper;
  g.globalCompositeOperation = 'destination-over';
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 3) g.lineTo(x, farRidge(x));
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';

  // Near range occludes the far one
  g.fillStyle = paper;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 2) g.lineTo(x, ridge(x));
  g.lineTo(W, H);
  g.closePath();
  g.fill();
  g.save();
  g.clip();
  for (let k = 1; k < 16; k++) {
    g.strokeStyle = `rgba(${INK}, ${0.1 * (1 - k / 16) ** 1.5})`;
    g.lineWidth = 0.8;
    g.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const y = ridge(x) + k * 6.5 * s;
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
    const depth = (18 + 90 * Math.min(1, slope)) * s;
    for (let d = 4; d < depth; d += 4.5) {
      g.strokeStyle = `rgba(${INK}, ${0.32 * (1 - d / depth) ** 1.2})`;
      g.beginPath();
      g.moveTo(x, ridge(x) + d);
      g.lineTo(x - 5, ridge(x) + d + 6);
      g.stroke();
    }
  }
  g.restore();

  g.strokeStyle = `rgba(${INK}, 0.8)`;
  g.lineWidth = 1.3;
  g.beginPath();
  for (let x = 0; x <= W; x += 2) {
    if (x) g.lineTo(x, ridge(x));
    else g.moveTo(x, ridge(x));
  }
  g.stroke();
}

/** Draw the footer range and keep it fitted to the page width. */
export function initRangeFooter() {
  const canvas = document.querySelector('[data-range-footer] canvas');
  if (!canvas) return;
  let lastW = 0;
  new ResizeObserver(() => {
    const w = canvas.getBoundingClientRect().width;
    if (Math.abs(w - lastW) < 1) return;
    lastW = w;
    draw(canvas);
  }).observe(canvas);
}
