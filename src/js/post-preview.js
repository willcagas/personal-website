/** Hovering a [data-post-preview] link floats a live copy of that post's title card. */

import { getWriting } from './writings.js';
import { createTitleCard } from './title-card.js';
import { renderTitleCard } from './pages/shared.js';

let closeOpen = null;

/** Call after every navigation; closes any preview left from the last page. */
export function initPostPreviews(root) {
  closeOpen?.(true);
  closeOpen = null;
  if (!window.matchMedia('(hover: hover)').matches) return; // touch: a tap just opens the post

  root.querySelectorAll('[data-post-preview]').forEach((link) => {
    const post = getWriting(link.dataset.postPreview);
    if (post?.hero?.kind !== 'title-card') return;
    let el = null;
    let card = null;
    let showTimer = null;
    let hideTimer = null;

    const close = (now = false) => {
      clearTimeout(showTimer);
      if (!el) return;
      const node = el;
      const mounted = card;
      el = null;
      card = null;
      node.classList.remove('is-open');
      setTimeout(() => {
        mounted?.destroy();
        node.remove();
      }, now ? 0 : 200);
    };

    const open = () => {
      clearTimeout(hideTimer);
      if (el) return;
      showTimer = setTimeout(() => {
        el = document.createElement('div');
        el.className = 'post-preview';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = renderTitleCard(post.hero, { controls: false });
        document.body.appendChild(el);
        // Below the link, kept on screen; above it if there's no room underneath
        const r = link.getBoundingClientRect();
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        el.style.left = `${Math.min(Math.max(12, r.left), window.innerWidth - w - 12)}px`;
        el.style.top = `${r.bottom + 10 + h > window.innerHeight - 12 ? r.top - 10 - h : r.bottom + 10}px`;
        card = createTitleCard(el.querySelector('[data-title-card]'));
        requestAnimationFrame(() => el?.classList.add('is-open'));
      }, 120);
    };

    const scheduleClose = () => {
      clearTimeout(showTimer);
      hideTimer = setTimeout(() => close(), 80);
    };

    link.addEventListener('mouseenter', open);
    link.addEventListener('focus', open);
    link.addEventListener('mouseleave', scheduleClose);
    link.addEventListener('blur', scheduleClose);
    link.addEventListener('click', () => close(true));
    closeOpen = close;
  });
}
