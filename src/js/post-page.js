/**
 * Fills in a post page after it renders: loads the markdown, shows the read
 * time, mounts live figures and reading lists, builds the contents sidebar and
 * typesets math.
 */

import { getWriting, loadWritingBody } from './writings.js';
import { renderMarkdown, typesetMath, addHeadingIds } from './markdown.js';
import { mountArticleFigures } from './article-figures.js';
import { initReadingChips } from './reading-chips.js';
import { initCoverFollow } from './cover-follow.js';
import { escapeHtml } from './pages/shared.js';

let tocCleanup = null;
let tocFocus = null;

/** Minutes to read, from the words in the markdown (ignoring math, code, link targets and HTML tags). */
function readingMinutes(markdown, wpm = 220) {
  const text = markdown
    .replace(/<[^>]+>/g, ' ')
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
      tocFocus?.(id);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

/**
 * The contents sidebar: the post's headings (Overview first), highlighting the
 * last one scrolled past. A heading jumped to stays highlighted while the page
 * scrolls to it, even when the next heading sits just below it or the page
 * ends before it can reach the top.
 */
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

  // While a jump scrolls the page, the highlight holds on its target
  let locked = false;
  let idle = null;
  let frame = 0;
  const unlock = () => {
    locked = false;
    clearTimeout(idle);
  };

  const update = () => {
    if (locked) return;
    const root = document.documentElement;
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
      setActive(headings[headings.length - 1].id);
      return;
    }
    const line = Math.min(window.innerHeight * 0.3, 200);
    let current = headings[0];
    for (const h of headings) {
      if (h.getBoundingClientRect().top > line) break;
      current = h;
    }
    setActive(current.id);
  };

  const onScroll = () => {
    if (locked) {
      clearTimeout(idle);
      idle = setTimeout(unlock, 160);
      return;
    }
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  // Wheel, touch or keys mean the reader has taken over from the jump
  const onReader = () => {
    if (locked) unlock();
  };

  tocFocus = (id) => {
    if (!links.some((link) => link.dataset.tocLink === id)) return;
    setActive(id);
    locked = true;
    clearTimeout(idle);
    idle = setTimeout(unlock, 400); // in case the page doesn't need to scroll at all
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  ['wheel', 'touchstart', 'keydown'].forEach((type) => window.addEventListener(type, onReader, { passive: true }));
  tocCleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    ['wheel', 'touchstart', 'keydown'].forEach((type) => window.removeEventListener(type, onReader));
    cancelAnimationFrame(frame);
    clearTimeout(idle);
    tocFocus = null;
  };
  update();
  smoothAnchors(tocEl);
}

/** Call after every navigation; does nothing off post pages. */
export async function initPostPage(root) {
  tocCleanup?.();
  tocCleanup = null;
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
    initReadingChips(body);
    initCoverFollow(body);
    buildToc(article, body);
    smoothAnchors(body);

    await typesetMath(body);
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = document.getElementById(id);
      if (target) {
        tocFocus?.(id);
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch (err) {
    console.error('Failed to render post:', err);
    body.innerHTML = '<p class="blog-soon">Failed to load post content.</p>';
  }
}
