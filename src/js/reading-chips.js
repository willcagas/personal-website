/** A post's reading list: a chip per paper; choosing one opens a card with its first page and a line on it. */
export function initReadingChips(root) {
  root.querySelectorAll('[data-reading-chips]').forEach((box) => {
    const card = box.querySelector('.reading-card');
    const chips = [...box.querySelectorAll('.fav-chip')];
    const show = (chip) => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      card.innerHTML = box.querySelector(`template[data-card="${chip.dataset.paper}"]`).innerHTML;
    };
    box.addEventListener('click', (ev) => {
      const chip = ev.target.closest('.fav-chip');
      if (chip) show(chip);
    });
    if (chips.length) show(chips[0]);
  });
}
