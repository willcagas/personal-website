import { SITE } from '../site-data.js';
import { getResearchPosts } from '../writings.js';
import { escapeHtml, renderPostListItem } from './shared.js';

/** A card's picture. Videos loop silently, and hold on their poster for reduced motion. */
function renderMedia({ video, poster, image, logo, background, chat }) {
  if (video) {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return `<video src="${video}" poster="${poster}" muted loop playsinline preload="metadata"${still ? '' : ' autoplay'} aria-hidden="true"></video>`;
  }
  if (logo) return `<span class="build-logo" style="background: ${background};"><img src="${logo}" alt="" loading="lazy" decoding="async"></span>`;
  if (chat) {
    return `
      <span class="build-chat" aria-hidden="true">
        <span class="build-chat-ask">${escapeHtml(chat.ask)}</span>
        <span class="build-chat-call">${escapeHtml(chat.call)}</span>
        <span class="build-chat-reply">${escapeHtml(chat.reply)}</span>
      </span>
    `;
  }
  return `<img src="${image}" alt="" loading="lazy" decoding="async">`;
}

/** Builds: a card per project (picture, name and year, a line, a stat), then papers. */
export function renderProjects() {
  const projects = SITE.projects.map(({ title, url, year, detail, stat, media }) => `
    <a class="build-card" href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="build-shot">${renderMedia(media)}</span>
      <span class="build-head">
        <span class="build-title">${escapeHtml(title)}</span>
        ${year ? `<span class="build-year">${year}</span>` : ''}
      </span>
      <span class="build-detail">${escapeHtml(detail)}</span>
      <span class="build-stat">${escapeHtml(stat)}</span>
    </a>
  `).join('');
  const papers = getResearchPosts().map(renderPostListItem).join('');

  return `
    <section class="panel panel-projects page-content">
      <p class="section-kicker">BUILDS</p>
      <div class="build-grid">
        ${projects}
      </div>
    </section>

    <section class="panel page-content">
      <p class="section-kicker">PAPERS</p>
      <div class="projects-list">
        ${papers || '<p class="blog-soon">No papers yet.</p>'}
      </div>
    </section>
  `;
}
