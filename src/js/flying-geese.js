/** Every 30 seconds (while the tab is visible) a goose flies across the screen from a random edge. */

const SPRITE = '/assets/goose-sprite.png';
const INTERVAL_MS = 30000;
const SPAWN_OFFSET = 150; // start just off screen
const CULL_MARGIN = 300; // wider than the spawn offset, so a new goose isn't culled at once

let geese = [];
let animating = false;
let lastTime = 0;

function animate(timestamp) {
  if (geese.length === 0) {
    animating = false;
    lastTime = 0;
    return;
  }
  // Speeds are per 60fps frame; scale by elapsed time so faster screens don't fly faster
  const timeScale = lastTime ? (timestamp - lastTime) / 16.666 : 0;
  lastTime = timestamp;

  geese = geese.filter((goose) => {
    goose.x += goose.vx * timeScale;
    goose.y += goose.vy * timeScale;
    goose.el.style.left = `${goose.x}px`;
    goose.el.style.top = `${goose.y}px`;
    const gone = goose.x < -CULL_MARGIN || goose.x > window.innerWidth + CULL_MARGIN
      || goose.y < -CULL_MARGIN || goose.y > window.innerHeight + CULL_MARGIN;
    if (gone) goose.el.remove();
    return !gone;
  });
  requestAnimationFrame(animate);
}

function launch() {
  const { innerWidth: w, innerHeight: h } = window;
  const spread = (Math.random() - 0.5) * Math.PI / 2; // ±45° off straight across
  const side = Math.floor(Math.random() * 4);
  const [x, y, heading] = [
    [Math.random() * w, -SPAWN_OFFSET, Math.PI / 2], // top
    [w + SPAWN_OFFSET, Math.random() * h, Math.PI], // right
    [Math.random() * w, h + SPAWN_OFFSET, -Math.PI / 2], // bottom
    [-SPAWN_OFFSET, Math.random() * h, 0] // left
  ][side];
  const angle = heading + spread;
  const speed = 5 + Math.random() * 5;

  const el = document.createElement('div');
  el.className = 'flying-goose';
  el.setAttribute('aria-hidden', 'true');
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  // Flip vertically when heading left, so the goose isn't upside down
  el.style.transform = `rotate(${angle}rad) scaleY(${Math.cos(angle) < 0 ? -1 : 1})`;
  const img = document.createElement('img');
  img.className = 'goose-spritesheet';
  img.src = SPRITE;
  img.alt = 'Flying Goose';
  el.appendChild(img);
  document.body.appendChild(el);

  geese.push({ el, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
  if (!animating) {
    animating = true;
    requestAnimationFrame(animate);
  }
}

export function initFlyingGeese() {
  setInterval(() => {
    if (!document.hidden) launch();
  }, INTERVAL_MS);
}
