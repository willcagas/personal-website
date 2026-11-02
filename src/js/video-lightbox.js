/** Clicking a video thumbnail plays it in a pop-up over the page. */

let closeOpen = null;

/** Call after every navigation; closes a video left playing on the last page. */
export function initVideoLightbox(root) {
  closeOpen?.(false);
  closeOpen = null;
  root.querySelectorAll('.video-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => open(thumb));
  });
}

function open(thumb) {
  closeOpen?.(false);
  const { videoSrc, videoTitle, videoCaption } = thumb.dataset;
  const page = document.querySelector('main');

  const box = document.createElement('div');
  box.className = 'video-lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', videoTitle);
  box.innerHTML = `
    <div class="video-lightbox-box">
      <button type="button" class="video-lightbox-close" aria-label="Close video">×</button>
      <div class="video-lightbox-frame"></div>
      <p class="video-lightbox-caption"></p>
    </div>
  `;
  const frame = document.createElement('iframe');
  frame.src = videoSrc;
  frame.title = videoTitle;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  box.querySelector('.video-lightbox-frame').appendChild(frame);
  box.querySelector('.video-lightbox-caption').textContent = videoCaption;

  // Removing the iframe is what stops the video
  const close = (refocus = true) => {
    document.removeEventListener('keydown', onKey);
    box.remove();
    document.documentElement.classList.remove('has-video-lightbox');
    if (page) page.inert = false;
    closeOpen = null;
    if (refocus) thumb.focus({ preventScroll: true });
  };
  const onKey = (ev) => {
    if (ev.key === 'Escape') close();
  };
  box.addEventListener('click', (ev) => {
    if (ev.target === box || ev.target.closest('.video-lightbox-close')) close();
  });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(box);
  document.documentElement.classList.add('has-video-lightbox');
  if (page) page.inert = true;
  box.querySelector('.video-lightbox-close').focus({ preventScroll: true });
  closeOpen = close;
}
