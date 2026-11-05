/**
 * Link previews for posts.
 *
 * Chat apps and social sites build a link's preview from the page's <meta> tags
 * without running its JavaScript, so on this single-page site every link would
 * preview as the homepage. For each public post this writes
 * share/<section>/<slug>.html, a copy of index.html whose preview tags carry the
 * post's title, summary and title card, and routes the post's address to it in
 * vercel.json. It's the same app, so visitors see no difference.
 *
 * Title cards are rendered to assets/og/<slug>-<hash>.png (1200×630) by headless
 * Firefox. The hash follows the post's hero, so a new title or background gets a
 * new image, and a new URL that chat apps haven't cached.
 *
 *   node scripts/share-pages.mjs           write the pages, rendering any missing cards
 *   node scripts/share-pages.mjs --cards   render every card again too
 *
 * Run it after adding a post, changing a post's title, summary or hero, or editing index.html.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { getBlogPosts, getResearchPosts, postPath } from '../src/js/writings.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.wcagas.com';
const START = /^ *<!-- Link preview\b.*-->\n/m;
const END = /^ *<!-- \/Link preview -->\n/m;

// A card is laid out at a hero's width (title-card.js sizes labels for 680px) at
// the preview's 1.91:1, then scaled up to the preview's 1200×630
const CARD = { width: 680, height: 357, scale: 1200 / 680 };
const IMAGE = { width: 1200, height: 630 };
const HOLD_MS = 8000; // how long the animation runs before the capture

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const posts = [...getBlogPosts(), ...getResearchPosts()];
const template = readFileSync(join(ROOT, 'index.html'), 'utf8');
const start = template.match(START);
const end = template.match(END);
if (!start || !end) throw new Error('index.html has lost its <!-- Link preview --> markers');
const head = template.slice(0, start.index + start[0].length);
const tail = template.slice(end.index);
const siteTag = (key) => template.match(new RegExp(`property="${key}" content="([^"]*)"`))[1];

/** The image a post previews with: its title card, or the site's own. */
function cardFor(post) {
  if (post.hero?.kind !== 'title-card') {
    return {
      url: siteTag('og:image'),
      width: siteTag('og:image:width'),
      height: siteTag('og:image:height'),
      alt: siteTag('og:image:alt')
    };
  }
  const hash = createHash('sha1').update(JSON.stringify(post.hero)).digest('hex').slice(0, 8);
  return {
    file: `assets/og/${post.slug}-${hash}.png`,
    url: `${ORIGIN}/assets/og/${post.slug}-${hash}.png`,
    width: IMAGE.width,
    height: IMAGE.height,
    alt: post.hero.title
  };
}

function previewTags(post, card) {
  return [
    ['name', 'description', post.summary],
    ['property', 'og:type', 'article'],
    ['property', 'og:site_name', 'William Cagas'],
    ['property', 'og:url', ORIGIN + postPath(post)],
    ['property', 'og:title', post.title],
    ['property', 'og:description', post.summary],
    ['property', 'og:image', card.url],
    ['property', 'og:image:width', card.width],
    ['property', 'og:image:height', card.height],
    ['property', 'og:image:alt', card.alt],
    ['name', 'twitter:card', 'summary_large_image']
  ].map(([attr, key, value]) => `    <meta ${attr}="${key}" content="${esc(value)}">\n`).join('');
}

/* ───────────── Rendering the cards ───────────── */

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/** A page that is just the post's title card, filling the window. */
const cardPage = (slug) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap">
<link rel="stylesheet" href="/src/styles/main.css">
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; }
  .title-card {
    width: ${CARD.width}px;
    height: ${CARD.height}px;
    aspect-ratio: auto;
    border-radius: 0;
    transform: scale(${CARD.scale});
    transform-origin: 0 0;
  }
</style>
</head>
<body>
<img alt="" src="/__hold" style="position: absolute; width: 1px; height: 1px; opacity: 0">
<script type="module">
  import { getWriting } from '/src/js/writings.js';
  import { renderTitleCard } from '/src/js/pages/shared.js';
  import { createTitleCard } from '/src/js/title-card.js';
  // Headless Firefox captures at 1x, so the canvas gets the pixels for the scaled-up
  // card, and measures itself unscaled, as it would on the page
  window.devicePixelRatio = ${CARD.scale};
  const measure = Element.prototype.getBoundingClientRect;
  HTMLCanvasElement.prototype.getBoundingClientRect = function () {
    const r = measure.call(this);
    return new DOMRect(r.x / ${CARD.scale}, r.y / ${CARD.scale}, r.width / ${CARD.scale}, r.height / ${CARD.scale});
  };
  document.body.insertAdjacentHTML('afterbegin', renderTitleCard(getWriting(${JSON.stringify(slug)}).hero, { controls: false }));
  createTitleCard(document.querySelector('[data-title-card]'));
</script>
</body>
</html>`;

/** Serves the site, the card page, and a request that holds the page's load event (and so the capture). */
function serve(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__hold') return setTimeout(() => res.writeHead(204).end(), HOLD_MS);
  if (url.pathname === '/__card') {
    return res.writeHead(200, { 'content-type': TYPES['.html'] }).end(cardPage(url.searchParams.get('slug')));
  }
  const file = join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
}

function findFirefox() {
  return [
    process.env.FIREFOX,
    '/Applications/Firefox.app/Contents/MacOS/firefox',
    '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
    '/usr/bin/firefox'
  ].find((p) => p && existsSync(p));
}

const pngSize = (file) => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

async function renderCards(todo) {
  const firefox = findFirefox();
  if (!firefox) throw new Error('Rendering title cards needs Firefox (or set FIREFOX to its binary)');
  const server = createServer(serve);
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address();
  try {
    for (const post of todo) {
      const { file, width, height } = cardFor(post);
      const out = join(ROOT, file);
      mkdirSync(dirname(out), { recursive: true });
      const profile = mkdtempSync(join(tmpdir(), 'og-card-'));
      try {
        await promisify(execFile)(firefox, [
          '--headless', '-no-remote', '-profile', profile,
          `--window-size=${IMAGE.width},${IMAGE.height}`,
          '--screenshot', out, `http://127.0.0.1:${port}/__card?slug=${encodeURIComponent(post.slug)}`
        ], { timeout: 60000 });
      } finally {
        rmSync(profile, { recursive: true, force: true });
      }
      const [w, h] = pngSize(out);
      if (w !== width || h !== height) {
        rmSync(out);
        throw new Error(`${file} came out ${w}×${h}, not ${width}×${height}`);
      }
      console.log(`rendered ${file}`);
    }
  } finally {
    server.close();
  }
}

/* ───────────── Writing it all out ───────────── */

const withCards = posts.filter((p) => cardFor(p).file);
await renderCards(process.argv.includes('--cards') ? withCards : withCards.filter((p) => !existsSync(join(ROOT, cardFor(p).file))));

// Drop cards left over from an earlier hero (or a post that's gone)
const keep = new Set(withCards.map((p) => cardFor(p).file));
const ogDir = join(ROOT, 'assets/og');
if (existsSync(ogDir)) {
  for (const name of readdirSync(ogDir)) {
    if (!keep.has(`assets/og/${name}`)) rmSync(join(ogDir, name));
  }
}

rmSync(join(ROOT, 'share'), { recursive: true, force: true });
const rewrites = posts.map((post) => {
  const page = `/share${postPath(post)}.html`;
  mkdirSync(dirname(join(ROOT, page)), { recursive: true });
  writeFileSync(join(ROOT, page), head + previewTags(post, cardFor(post)) + tail);
  console.log(`wrote ${page.slice(1)}`);
  return { source: postPath(post), destination: page };
});

// The posts' rewrites go ahead of the catch-all that serves the app everywhere else
const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
config.rewrites = [...rewrites, ...config.rewrites.filter((r) => !r.destination.startsWith('/share/'))];
writeFileSync(join(ROOT, 'vercel.json'), `${JSON.stringify(config, null, 2)}\n`);
console.log(`routed ${rewrites.length} posts in vercel.json`);
