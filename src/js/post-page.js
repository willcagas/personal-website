/**
 * Fills in a post page after it renders: loads the markdown, shows the read
 * time, mounts live figures, builds the contents sidebar and typesets math.
 */

import { getWriting, loadWritingBody } from './writings.js';
import { renderMarkdown, typesetMath, addHeadingIds } from './markdown.js';
import { mountArticleFigures } from './article-figures.js';
import { escapeHtml } from './pages/shared.js';

let tocObserver = null;

/** Minutes to read, from the words in the markdown (ignoring math, code and link targets). */
function readingMinutes(markdown, wpm = 220) {
  const text = markdown
    .replace(/\$\$[\s\S]+?\$\$/g, ' ')
    .replace(/\$[^$\n]+?\$/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.round(words / wpm));
}

/** Smooth-scroll same-page (#id) links instead of jumping. */
function smoothAnchors(root) {
  root.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      history.replaceState(null, '', `#${id}`);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/** The contents sidebar: the post's headings (Overview first), highlighting the one in view. */
function buildToc(article, body) {
  const tocEl = article.querySelector('[data-blog-toc]');
  if (!tocEl) return;

  // The Overview block sits above the body; list it first, as a section
  const overview = article.querySelector('#overview');
  const headings = [...(overview ? [overview] : []), ...body.querySelectorAll('h2, h3, h4')]
    .filter((h) => h.textContent.trim() && !/^contents$/i.test(h.textContent.trim()));
  if (headings.length < 2) {
    tocEl.hidden = true;
    return;
  }

  // h2/h3 are entries; h4s nest under the entry before them
  const items = [];
  let group = null;
  for (const heading of headings) {
    const level = heading === overview ? 3 : Number(heading.tagName.slice(1));
    const entry = { id: heading.id, text: heading.textContent.trim(), level, children: [] };
    if (level <= 3) items.push((group = entry));
    else if (group) group.children.push(entry);
    else items.push(entry);
  }
  const renderItem = (item) => `
    <li class="blog-toc-item" data-toc-level="${item.level}">
      <a href="#${item.id}" class="blog-toc-link" data-toc-link="${item.id}">${escapeHtml(item.text)}</a>
      ${item.children.length ? `<ul class="blog-toc-sublist">${item.children.map(renderItem).join('')}</ul>` : ''}
    </li>
  `;

  tocEl.hidden = false;
  tocEl.innerHTML = `
    <p class="blog-toc-kicker">Contents</p>
    <nav class="blog-toc-nav">
      <ul class="blog-toc-list">
        ${items.map(renderItem).join('')}
      </ul>
    </nav>
  `;

  const links = [...tocEl.querySelectorAll('[data-toc-link]')];
  const setActive = (id) => links.forEach((link) => link.classList.toggle('active', link.dataset.tocLink === id));
  setActive(links[0].dataset.tocLink);

  tocObserver = new IntersectionObserver((entries) => {
    const topmost = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (topmost?.target.id) setActive(topmost.target.id);
  }, { rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] });
  headings.forEach((h) => tocObserver.observe(h));
  smoothAnchors(tocEl);
}

/** Call after every navigation; does nothing off post pages. */
export async function initPostPage(root) {
  tocObserver?.disconnect();
  tocObserver = null;
  const main = document.querySelector('main');
  main?.classList.remove('main-wide');

  const article = root.querySelector('[data-blog-slug]');
  const body = article?.querySelector('[data-blog-body]');
  if (!body || !getWriting(article.dataset.blogSlug)) return;

  main?.classList.add('main-wide');
  if (article.dataset.teaser === 'true') return; // the article text isn't published yet

  try {
    const markdown = await loadWritingBody(article.dataset.blogSlug);
    const readEl = article.querySelector('[data-blog-readtime]');
    if (readEl) readEl.textContent = `${readingMinutes(markdown)} min read`;

    body.innerHTML = await renderMarkdown(markdown);
    addHeadingIds(body);
    mountArticleFigures(body);
    buildToc(article, body);
    smoothAnchors(body);

    await typesetMath(body);
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error('Failed to render post:', err);
    body.innerHTML = '<p class="blog-soon">Failed to load post content.</p>';
  }
}
