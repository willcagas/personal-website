import { SITE } from '../site-data.js';
import { getBlogPosts, getWriting } from '../writings.js';
import { escapeHtml, keepParensTogether, renderTitleCard } from './shared.js';

const DARWIN_POST = 'thesis-labs-internship';

/** "Darwin" opens the internship post (with a hover preview of its title card), or the company site without it. */
function darwinLink() {
  const post = getWriting(DARWIN_POST);
  return post
    ? `<a href="/writings/${post.slug}" data-route data-post-preview="${post.slug}">Darwin</a>`
    : '<a href="https://darwinrobotics.ai/" target="_blank" rel="noopener noreferrer">Darwin</a>';
}

/** The newest post with a title card, as a row that opens it. */
function renderLatest() {
  const post = getBlogPosts().find((p) => p.hero?.kind === 'title-card');
  if (!post) return '';
  return `
    <section class="panel panel-latest page-content">
      <p class="section-kicker">LATEST</p>
      <a class="latest-row" href="/writings/${post.slug}" data-route>
        <div class="latest-thumb">${renderTitleCard(post.hero, { controls: false, minimal: true })}</div>
        <div class="latest-text">
          <p class="latest-title">${keepParensTogether(escapeHtml(post.title))}</p>
          ${post.summary ? `<p class="latest-sub">${escapeHtml(post.summary)}</p>` : ''}
        </div>
        <span class="latest-arrow" aria-hidden="true">→</span>
      </a>
    </section>
  `;
}

function renderLinks() {
  return SITE.links.map(({ name, url, icon }) => `
    <a href="${url}" target="_blank" rel="noopener noreferrer" class="social-list-link" aria-label="${name}">
      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${icon}.svg" alt="${name}" class="social-logo">
      <span>${name}</span>
    </a>
  `).join('');
}

export function renderHome() {
  const { university } = SITE;
  return `
    <section class="panel panel-meta page-content">
      <p class="section-kicker">ABOUT</p>
      <div class="meta-section">
        <p class="about-bio">I'm a Software Engineering student at the <a href="${university.url}" target="_blank" rel="noopener noreferrer">${university.name}</a> interested in applied AI, health/bio tech, and full-stack web/app/game development.</p>
        <p class="about-bio">Previously, I was a Member of Technical Staff (Intern) at ${darwinLink()} (formerly Thesis) in San Francisco, working on autonomous AI R&D systems for scientific discovery.</p>
      </div>
    </section>

    ${renderLatest()}

    <section class="panel panel-socials page-content">
      <p class="section-kicker">LINKS</p>
      <div class="social-list">
        ${renderLinks()}
      </div>
    </section>
  `;
}
