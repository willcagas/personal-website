/**
 * The Archive's map of places: the world drawn as dots, the countries I've been to
 * darker, and a pin for each place. Pins pop in outward from home the first time the
 * map scrolls into view; hovering one shows its name.
 *
 * Land dots come from /assets/places/world-dots.json: Natural Earth's 1:110m countries
 * (via world-atlas) sampled on a 2-degree grid, each dot tagged with its country.
 */

import ARCHIVE from './archive-data.js';

const DOTS_URL = '/assets/places/world-dots.json';
const TOP = 84; // the map runs from 84°N
const SPAN = 142; // down to 58°S
const LAND = '#d9d2c6';
const BEEN = '#958c7f';
const FOCUS = '#4a443d';
const PIN = '#e0a43a';
const HOME = '#1c1917';
const RING = '#fdfaf6';

let dots = null;
let teardown = null;

const loadDots = () => {
  dots ??= fetch(DOTS_URL).then((res) => {
    if (!res.ok) throw new Error(`${DOTS_URL}: ${res.status}`);
    return res.json();
  });
  return dots;
};

/** Call after every navigation; draws the map if the page has one. */
export function initPlacesMap(root) {
  teardown?.();
  teardown = null;
  const box = root.querySelector('[data-places-map]');
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const tip = box.querySelector('.places-tip');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cancelled = false;
  let raf = 0;

  loadDots().then((world) => {
    if (cancelled) return;
    const mapName = (p) => p.map || p.country;
    const been = new Set(world.countries.flatMap((name, i) => (ARCHIVE.places.some((p) => mapName(p) === name) ? [i] : [])));

    // Every place, home first, then the rest by distance from home so the pins spread outward
    const places = ARCHIVE.places.flatMap((p) => p.cities.map((c) => ({ ...c, country: p.country, home: !!p.home })));
    const home = places.find((p) => p.home) || places[0];
    places.sort((a, b) => (b.home - a.home) || (Math.hypot(a.lon - home.lon, a.lat - home.lat) - Math.hypot(b.lon - home.lon, b.lat - home.lat)));

    let W = 0;
    let H = 0;
    let ctx = null;
    let shown = reduceMotion ? Infinity : 0; // how far through the pop-in we are, in ms
    let focus = null; // the country whose chip is hovered
    const xy = (lon, lat) => [((lon + 180) / 360) * W, ((TOP - lat) / SPAN) * H];

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const pitch = W / 180;
      const s = Math.max(1, pitch * 0.62);
      for (const [lon, lat, k] of world.dots) {
        const [x, y] = xy(lon, lat);
        ctx.fillStyle = focus && world.countries[k] === mapName(focus) ? FOCUS : been.has(k) ? BEEN : LAND;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      const r = Math.max(2.6, W / 210);
      // Home pins last, so they sit on top of the nearby ones; with a country picked, the rest fade
      [...places].reverse().forEach((p) => {
        const i = places.indexOf(p);
        const t = Math.min(1, Math.max(0, (shown - i * 45) / 320));
        if (t <= 0) return;
        const grow = 1 + 0.6 * Math.sin(Math.PI * t) * (1 - t); // a little overshoot
        const [x, y] = xy(p.lon, p.lat);
        ctx.globalAlpha = focus && p.country !== focus.country ? 0.25 : 1;
        ctx.beginPath();
        ctx.arc(x, y, (p.home ? r * 1.25 : r) * t * grow, 0, Math.PI * 2);
        ctx.fillStyle = p.home ? HOME : PIN;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = RING;
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    };

    const showTip = (text, x, y) => {
      tip.textContent = text;
      const half = tip.offsetWidth / 2;
      tip.style.left = `${Math.min(Math.max(half, x), W - half)}px`;
      tip.style.top = `${y}px`;
      tip.classList.add('is-open');
    };

    const resize = () => {
      W = box.clientWidth;
      H = (W * SPAN) / 360;
      const scale = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * scale);
      canvas.height = Math.round(H * scale);
      ctx = canvas.getContext('2d');
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      draw();
    };

    const popIn = () => {
      const start = performance.now();
      const end = places.length * 45 + 320;
      const step = (now) => {
        shown = now - start;
        draw();
        if (shown < end && !cancelled) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(box);
    resize();

    let io = null;
    if (shown !== Infinity) {
      io = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        popIn();
      }, { threshold: 0.3 });
      io.observe(box);
    }

    // Name the pin nearest the pointer, along with any it overlaps (Rome and Vatican City, Surigao and Siargao)
    const hover = (ev) => {
      const rect = box.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const dist = (p) => {
        const [x, y] = xy(p.lon, p.lat);
        return Math.hypot(x - mx, y - my);
      };
      const nearest = places.reduce((a, b) => (dist(b) < dist(a) ? b : a));
      if (dist(nearest) > 9) {
        tip.classList.remove('is-open');
        return;
      }
      const [x, y] = xy(nearest.lon, nearest.lat);
      const near = places.filter((p) => {
        const [px, py] = xy(p.lon, p.lat);
        return Math.hypot(px - x, py - y) < 2.5;
      });
      const countries = [...new Set(near.map((p) => p.country))];
      showTip(countries.map((country) => {
        const names = near.filter((p) => p.country === country && p.name !== country).map((p) => p.name);
        return names.length ? `${names.join(', ')}, ${country}` : country;
      }).join(' · '), x, y);
    };
    const leave = () => tip.classList.remove('is-open');
    box.addEventListener('pointermove', hover);
    box.addEventListener('pointerdown', hover);
    box.addEventListener('pointerleave', leave);

    // A country chip picks out its country: land darker, other pins faded, its cities named above its pins
    const chips = [...root.querySelectorAll('.places-country')];
    const pick = (i) => {
      focus = i === null ? null : ARCHIVE.places[i];
      chips.forEach((chip, k) => chip.classList.toggle('is-on', k === i));
      draw();
      if (!focus) {
        tip.classList.remove('is-open');
        return;
      }
      const pins = places.filter((p) => p.country === focus.country).map((p) => [p, ...xy(p.lon, p.lat)]);
      const x = pins.reduce((n, [, px]) => n + px, 0) / pins.length;
      const y = Math.min(...pins.map(([, , py]) => py));
      const names = focus.cities.map((c) => c.name).filter((n) => n !== focus.country);
      showTip(names.length ? names.join(', ') : focus.country, x, y);
    };
    chips.forEach((chip, i) => {
      chip.addEventListener('mouseenter', () => pick(i));
      chip.addEventListener('focus', () => pick(i));
      chip.addEventListener('mouseleave', () => pick(null));
      chip.addEventListener('blur', () => pick(null));
      chip.addEventListener('click', () => pick(focus === ARCHIVE.places[i] ? null : i)); // touch: tap to toggle
    });

    teardown = () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
    };
  }).catch(() => {
    box.hidden = true; // the list underneath still says where
  });

  teardown = () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
