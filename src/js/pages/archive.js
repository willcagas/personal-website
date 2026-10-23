import { SITE } from '../site-data.js';
import ARCHIVE from '../archive-data.js';
import { escapeHtml } from './shared.js';

function renderPress() {
  return SITE.press.map(({ outlet, url, title, date }) => `
    <div class="press-item">
      <p class="press-outlet">
        <a href="${url}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(title)}">${outlet}</a>
      </p>
      ${date ? `<span class="press-date">${date}</span>` : ''}
    </div>
  `).join('');
}

/** The carousel's markup; src/js/photo-carousel.js makes it scroll. */
function renderPhotos(photos) {
  if (!photos.length) return '';
  const slides = photos.map(({ image, caption, objectPosition }) => `
    <figure class="photo-carousel-item">
      <div class="photo-carousel-frame">
        <img src="${image}" alt="${escapeHtml(caption)}" class="photo-carousel-img"${objectPosition ? ` style="object-position: ${objectPosition};"` : ''} loading="eager" decoding="async">
      </div>
      <figcaption class="photo-carousel-caption">${escapeHtml(caption)}</figcaption>
    </figure>
  `).join('');
  return `
    <section class="panel panel-photos page-content">
      <p class="section-kicker">PHOTOS</p>
      <div class="photo-carousel">
        <div class="photo-carousel-nav" role="group" aria-label="Photo gallery">
          <button type="button" class="photo-nav photo-nav-prev" aria-label="Previous photo"><span class="photo-nav-icon" aria-hidden="true">‹</span></button>
          <div class="photo-strip" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Photos">
            <div class="photo-strip-inner">
              ${slides}
            </div>
          </div>
          <button type="button" class="photo-nav photo-nav-next" aria-label="Next photo"><span class="photo-nav-icon" aria-hidden="true">›</span></button>
        </div>
      </div>
    </section>
  `;
}

function renderVideos(videos) {
  if (!videos.length) return '';
  const items = videos.map(({ type, title, videoId, embedSrc, caption }) => {
    const embed = type === 'youtube'
      ? `<iframe src="https://www.youtube.com/embed/${videoId}" title="${escapeHtml(title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>`
      : `<iframe src="${embedSrc}" title="${escapeHtml(title)}" frameborder="0" allowfullscreen class="video-iframe"></iframe>`;
    return `
      <div class="video-item">
        <div class="video-frame">
          ${embed}
        </div>
        <p class="video-caption">${escapeHtml(caption)}</p>
      </div>
    `;
  }).join('');
  return `
    <section class="panel panel-videos page-content">
      <p class="section-kicker">VIDEOS</p>
      <div class="videos-list">
        ${items}
      </div>
    </section>
  `;
}

/** A Letterboxd-style poster row per group (Shows, Movies, Books, Music). */
function renderFavourites(groups) {
  const rows = groups.filter((g) => g.items.length).map((group) => `
    <div class="favourites-group">
      <p class="subsection-title">${escapeHtml(group.title)}</p>
      <div class="poster-grid${group.shape === 'square' ? ' poster-grid--square' : ''}">
        ${group.items.map((item) => `
          <a class="poster-item" href="${item.url}" target="_blank" rel="noopener noreferrer">
            <div class="poster-frame">
              <img src="${item.poster}" alt="${escapeHtml(item.title)} poster" loading="lazy" decoding="async">
            </div>
            <p class="poster-title">${escapeHtml(item.title)}</p>
            ${item.subtitle ? `<p class="poster-subtitle">${escapeHtml(item.subtitle)}</p>` : ''}
          </a>
        `).join('')}
      </div>
    </div>
  `).join('');
  if (!rows) return '';
  return `
    <section class="panel panel-favourites page-content">
      <p class="section-kicker">FAVOURITES</p>
      ${rows}
    </section>
  `;
}

export function renderArchive() {
  return `
    <section class="panel panel-press page-content">
      <p class="section-kicker">PRESS</p>
      <div class="press-list">
        ${renderPress()}
      </div>
    </section>
    ${renderPhotos(ARCHIVE.photos)}
    ${renderVideos(ARCHIVE.videos)}
    ${renderFavourites(ARCHIVE.favourites)}
  `;
}
