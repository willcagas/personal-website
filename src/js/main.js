/**
 * Entry point. Mounts the site-wide background, footer and header once, then
 * routes between pages: each navigation renders the page's markup into
 * #content-root and wires up whatever on it is interactive.
 */

import { Router } from './router.js';
import { initGameOfLife } from './game-of-life.js';
import { initRangeFooter } from './range-footer.js';
import { initFlyingGeese } from './flying-geese.js';
import { initTitleCard } from './title-card.js';
import { mountArticleFigures } from './article-figures.js';
import { initPostPage } from './post-page.js';
import { initPhotoCarousel } from './photo-carousel.js';
import { initPostPreviews } from './post-preview.js';
import { renderNav } from './pages/shared.js';
import { renderHome } from './pages/home.js';
import { renderWork } from './pages/work.js';
import { renderProjects } from './pages/projects.js';
import { renderArchive } from './pages/archive.js';
import { renderWritings, renderWritingPost } from './pages/writings.js';

/** A /prefix/:slug route. */
const postRoute = (prefix) => ({
  match: (path) => new RegExp(`^${prefix}/[^/]+/?$`).test(path),
  render: (path) => renderWritingPost(path.slice(prefix.length + 1).replace(/\/$/, ''))
});

const ROUTES = [
  { path: '/', render: renderHome },
  { path: '/work', render: renderWork },
  { path: '/projects', render: renderProjects },
  { path: '/archive', render: renderArchive },
  { path: '/writings', render: renderWritings },
  postRoute('/writings'),
  // Old /blog links
  { path: '/blog', render: renderWritings },
  postRoute('/blog')
];

function init() {
  const main = document.querySelector('main');
  const root = main?.querySelector('#content-root');
  if (!root) return;

  initGameOfLife();
  initRangeFooter();
  initFlyingGeese();

  const header = document.createElement('div');
  header.id = 'site-header-wrapper';
  main.insertBefore(header, main.firstChild);

  const router = new Router(ROUTES, (route, path) => {
    header.innerHTML = renderNav(path);

    root.classList.remove('page-fade-in');
    root.innerHTML = route.render(path);
    void root.offsetHeight; // restart the fade-in
    root.classList.add('page-fade-in');

    // Hash links scroll once the post has rendered
    if (!location.hash) window.scrollTo(0, 0);

    initPhotoCarousel(root);
    initTitleCard();
    initPostPreviews(root);
    mountArticleFigures(null);
    initPostPage(root);
  });
  router.resolve();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
