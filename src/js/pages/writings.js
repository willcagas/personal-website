import { SITE } from '../site-data.js';
import { getBlogPosts, getWriting, showsFullText } from '../writings.js';
import { escapeHtml, keepParensTogether, formatPostDate, renderPostListItem, renderTitleCard } from './shared.js';

export function renderWritings() {
  const posts = getBlogPosts().map(renderPostListItem).join('');
  return `
    <section class="panel page-content">
      <p class="section-kicker">BLOG</p>
      <div class="projects-list">
        ${posts || '<p class="blog-soon">No posts yet.</p>'}
      </div>
    </section>
  `;
}

function renderHero(hero) {
  if (hero?.kind !== 'title-card') return '';
  return `<figure class="blog-hero">${renderTitleCard(hero)}</figure>`;
}

/** Details beside an Overview paragraph, under the hero. */
function renderOverview(overview) {
  if (!overview) return '';
  const details = overview.details.map(({ label, value, note }) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${keepParensTogether(escapeHtml(value))}${note ? `<span class="post-overview-note">${escapeHtml(note)}</span>` : ''}</dd>
    </div>`).join('');
  return `
    <section class="post-overview" aria-label="Overview">
      <div class="post-overview-details">
        <h2 class="post-overview-label">Details</h2>
        <dl>${details}
        </dl>
      </div>
      <div class="post-overview-text">
        <h2 class="post-overview-label" id="overview">Overview</h2>
        <p>${escapeHtml(overview.text)}</p>
      </div>
    </section>
  `;
}

/**
 * A post's page. The body is filled in by src/js/post-page.js; a coming-soon
 * post (away from localhost) shows "Coming soon" in its place instead.
 */
export function renderWritingPost(slug) {
  const post = getWriting(slug);
  if (!post) {
    return `
      <section class="panel page-content">
        <p class="section-kicker">WRITINGS</p>
        <p class="blog-soon">Not found.</p>
        <p><a href="/writings" data-route class="blog-back">← Writings</a></p>
      </section>
    `;
  }

  const teaser = !showsFullText(post);
  const back = post.section === 'research'
    ? '<a href="/projects" data-route class="blog-back">← Builds</a>'
    : '<a href="/writings" data-route class="blog-back">← Writings</a>';

  return `
    <article class="panel page-content blog-post blog-post-layout" data-blog-slug="${escapeHtml(post.slug)}"${teaser ? ' data-teaser="true"' : ''}>
      <div class="blog-post-main">
        ${back}
        <header class="blog-post-header">
          <h1 class="blog-post-title">${keepParensTogether(escapeHtml(post.title))}</h1>
          <p class="blog-post-meta">
            <span class="blog-post-author">${escapeHtml(post.authors || SITE.name)}</span>
            <span class="blog-post-meta-sep" aria-hidden="true">·</span>
            <time class="blog-post-date" datetime="${post.date}">${formatPostDate(post.date)}</time>
            ${teaser ? '' : `<span class="blog-post-meta-sep" aria-hidden="true">·</span>
            <span class="blog-post-readtime" data-blog-readtime>…</span>`}
          </p>
        </header>
        ${renderHero(post.hero)}
        ${renderOverview(post.overview)}
        <div class="blog-post-body" data-blog-body>${teaser ? '<p class="post-coming-soon">Coming soon</p>' : ''}</div>
      </div>
      <aside class="blog-toc" data-blog-toc hidden aria-label="Contents"></aside>
    </article>
  `;
}
