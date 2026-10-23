/**
 * Archive photo carousel: arrow buttons (and ←/→ keys) move by one photo and
 * wrap around seamlessly. Clones bookend the strip ([clones][originals][clones]);
 * `offset` n…n+maxIndex addresses the originals, and a wrap animates into the
 * neighbouring clones before snapping back without a transition.
 */

const SLIDE = 'transform 0.35s ease';

export function initPhotoCarousel(root) {
  const nav = root.querySelector('.photo-carousel-nav');
  const inner = nav?.querySelector('.photo-strip-inner');
  const strip = nav?.querySelector('.photo-strip');
  const prevBtn = nav?.querySelector('.photo-nav-prev');
  const nextBtn = nav?.querySelector('.photo-nav-next');
  const originals = inner ? [...inner.querySelectorAll('.photo-carousel-item')] : [];
  const n = originals.length;
  if (!inner || !strip || !prevBtn || !nextBtn || n === 0) return;

  const setNavHidden = (hidden) => {
    for (const btn of [prevBtn, nextBtn]) {
      btn.disabled = hidden;
      if (hidden) btn.setAttribute('aria-hidden', 'true');
      else btn.removeAttribute('aria-hidden');
    }
  };
  if (n === 1) {
    setNavHidden(true);
    return;
  }

  const lead = document.createDocumentFragment();
  const trail = document.createDocumentFragment();
  for (const el of originals) {
    lead.appendChild(el.cloneNode(true));
    trail.appendChild(el.cloneNode(true));
  }
  inner.insertBefore(lead, inner.firstChild);
  inner.appendChild(trail);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let offset = n;
  let pendingWrap = null;
  let wrapTimer = null;
  let busy = false;

  // How many photos fit at once comes from CSS (--photo-slides-visible)
  const visibleCount = () => {
    const k = parseInt(getComputedStyle(strip).getPropertyValue('--photo-slides-visible'), 10);
    return Number.isFinite(k) && k >= 1 ? Math.min(k, n) : 1;
  };
  const maxIndex = () => Math.max(0, n - visibleCount());
  const step = () => {
    const [a, b] = inner.children;
    return Math.max(1, Math.round(b.getBoundingClientRect().left - a.getBoundingClientRect().left));
  };

  const apply = (instant) => {
    const snap = instant || reduceMotion;
    inner.style.transition = snap ? 'none' : SLIDE;
    inner.style.transform = `translate3d(${-offset * step()}px, 0, 0)`;
    if (snap) {
      void inner.offsetHeight; // commit the jump before restoring the transition
      inner.style.transition = reduceMotion ? 'none' : SLIDE;
    }
  };

  // Keep the arrows level with the middle of the photos (captions vary in height)
  const centerArrows = () => {
    const frame = inner.children[offset]?.querySelector('.photo-carousel-frame');
    const frameRect = frame?.getBoundingClientRect();
    if (!frameRect || frameRect.height < 2) return;
    const y = frameRect.top - nav.getBoundingClientRect().top + frameRect.height / 2;
    nav.style.setProperty('--photo-nav-center', `${Math.round(y * 10) / 10}px`);
  };

  const finishWrap = () => {
    if (!pendingWrap) return;
    offset = pendingWrap === 'forward' ? n : n + maxIndex();
    pendingWrap = null;
    apply(true);
  };

  const wrap = (direction, by) => {
    pendingWrap = direction;
    offset += by;
    apply(false);
    // Fallback in case transitionend never fires (e.g. the tab is hidden mid-slide)
    wrapTimer = setTimeout(() => {
      wrapTimer = null;
      finishWrap();
      busy = false;
    }, 450);
  };

  inner.addEventListener('transitionend', (e) => {
    if (e.target !== inner || e.propertyName !== 'transform') return;
    clearTimeout(wrapTimer);
    wrapTimer = null;
    finishWrap();
    busy = false;
  });

  const go = (delta) => {
    const max = maxIndex();
    if (max === 0 || busy) return;

    if (reduceMotion) {
      const logical = offset - n;
      offset = n + (delta === 1 ? (logical >= max ? 0 : logical + 1) : (logical <= 0 ? max : logical - 1));
      apply(true);
      return;
    }

    busy = true;
    if (delta === 1) {
      if (offset < n + max) {
        offset += 1;
        apply(false);
      } else {
        wrap('forward', visibleCount());
      }
    } else if (offset > n) {
      offset -= 1;
      apply(false);
    } else {
      wrap('backward', -visibleCount());
    }
  };

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  strip.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    go(e.key === 'ArrowRight' ? 1 : -1);
  });

  const remeasure = () => {
    pendingWrap = null;
    clearTimeout(wrapTimer);
    wrapTimer = null;
    busy = false;
    offset = n + Math.max(0, Math.min(maxIndex(), offset - n));
    setNavHidden(maxIndex() === 0);
    centerArrows();
    apply(true);
  };
  new ResizeObserver(remeasure).observe(strip);
  inner.querySelectorAll('.photo-carousel-img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', remeasure, { once: true });
  });
  requestAnimationFrame(() => {
    remeasure();
    requestAnimationFrame(remeasure);
  });
}
