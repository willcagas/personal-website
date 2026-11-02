/** Hovering a favourites chip floats a bigger copy of its cover beside the pointer. */

let floater = null;

/** Call after every navigation; removes the cover left from the last page. */
export function initCoverFollow(root) {
  floater?.remove();
  floater = null;
  if (!window.matchMedia('(hover: hover)').matches) return; // touch: a tap just opens the link

  const chips = root.querySelectorAll('.fav-chip');
  if (!chips.length) return;
  const el = document.createElement('img');
  el.className = 'cover-follow';
  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  floater = el;

  // Just right of the pointer, or left of it near the window's right edge, and never off the top or bottom
  const place = (x, y) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = x + 18 + w > window.innerWidth - 8 ? x - 18 - w : x + 18;
    const top = Math.min(Math.max(8, y - h / 2), window.innerHeight - h - 8);
    el.style.transform = `translate(${left}px, ${top}px)`;
  };

  chips.forEach((chip) => {
    chip.addEventListener('mouseenter', (ev) => {
      el.src = chip.querySelector('.fav-chip-thumb').src;
      el.classList.toggle('is-square', chip.classList.contains('fav-chip--square'));
      place(ev.clientX, ev.clientY);
      el.classList.add('is-open');
    });
    chip.addEventListener('mousemove', (ev) => place(ev.clientX, ev.clientY));
    chip.addEventListener('mouseleave', () => el.classList.remove('is-open'));
    chip.addEventListener('click', () => el.classList.remove('is-open'));
  });
}
