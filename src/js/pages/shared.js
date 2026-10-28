/** Markup shared across pages: escaping, dates, the header, post rows and title cards. */

import { SITE } from '../site-data.js';
import { postPath, showsFullText } from '../writings.js';

const NAV = [
  { label: 'Home', path: '/' },
  { label: 'Work', path: '/work' },
  { label: 'Builds', path: '/projects' },
  { label: 'Archive', path: '/archive' },
  { label: 'Writings', path: '/writings' }
];

const SHORT_MONTHS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
const MONTH_ONLY = /^\d{4}-\d{2}$/;

export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** Stop "(YC F25)"-style asides from breaking across lines. */
export function keepParensTogether(html) {
  return html.replace(/\(([^)]*)\)/g, '<span class="nowrap">($1)</span>');
}

/** Dates are "2026-09-19" or month-only "2026-10". */
function parseDate(dateStr) {
  const d = new Date(`${MONTH_ONLY.test(dateStr) ? `${dateStr}-01` : dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "September 19, 2026", or "October 2026" for a month-only date. */
export function formatPostDate(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', MONTH_ONLY.test(dateStr)
    ? { year: 'numeric', month: 'long' }
    : { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Press-style short date: "Jan. 2026". */
export function formatListDate(dateStr) {
  const d = parseDate(dateStr);
  return d ? `${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}` : dateStr;
}

export function renderNav(currentPath) {
  const items = NAV.map(({ label, path }) => {
    const onBlogAlias = path === '/writings' && (currentPath === '/blog' || currentPath.startsWith('/blog/'));
    const active = path === currentPath || (path !== '/' && currentPath.startsWith(`${path}/`)) || onBlogAlias;
    // data-text reserves the bold width, so the nav doesn't shift when a link turns active
    return `<a href="${path}" data-route class="nav-link${active ? ' active' : ''}" data-text="${label}">${label}</a>`;
  }).join('');

  return `
    <header class="site-header">
      <div class="header-inner">
        <div class="header-left">
          <img src="/assets/pictures/profile-beach.jpg" alt="${SITE.name}" class="site-avatar" width="104" height="104" loading="eager" decoding="async">
          <h1 class="site-name"><a href="/" data-route class="name-link">${SITE.name}</a></h1>
        </div>
      </div>
      <nav class="site-nav" aria-label="Main navigation">
        ${items}
      </nav>
    </header>
  `;
}

/** A post in a list: linked title, then its date (or "Coming soon") and summary. */
export function renderPostListItem(post) {
  const when = post.comingSoon
    ? `<span class="writing-list-date">Coming soon${showsFullText(post) ? ' · local preview' : ''}</span>`
    : `<time class="writing-list-date" datetime="${post.date}">${formatListDate(post.date)}</time>`;
  return `
    <article class="project-item writing-list-item">
      <div class="writing-list-header">
        <p class="project-title"><a href="${postPath(post)}" data-route>${escapeHtml(post.title)}</a></p>
        ${when}
      </div>
      ${post.summary ? `<p class="project-detail">${escapeHtml(post.summary)}</p>` : ''}
    </article>
  `;
}

/**
 * A title card (src/js/title-card.js mounts the animation). `controls` adds the
 * pause button; `minimal` drops the canvas text, for small thumbnails.
 */
export function renderTitleCard(hero, { controls = true, minimal = false } = {}) {
  return `
    <div class="title-card" data-title-card data-background="${hero.background || 'life'}"${minimal ? ' data-minimal="true"' : ''}>
      <canvas aria-hidden="true"></canvas>
      <div class="title-card-text">
        <p class="title-card-word">${escapeHtml(hero.title)}</p>
        ${hero.subtitle ? `<p class="title-card-sub">${escapeHtml(hero.subtitle)}</p>` : ''}
      </div>
      ${controls ? `<button type="button" class="title-card-toggle" data-hero-toggle data-paused="false" aria-label="Pause animation">
        <svg class="icon-pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
        <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
      </button>` : ''}
    </div>
  `;
}
