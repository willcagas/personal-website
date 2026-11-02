import { SITE } from '../site-data.js';
import ARCHIVE from '../archive-data.js';
import { escapeHtml } from './shared.js';

/** Press: a row per story with its photo, the outlet and headline, then the date. */
function renderPress(stories) {
  if (!stories?.length) return '';
  const rows = stories.map(({ outlet, url, title, date, image, imagePosition }) => `
    <a class="press-row" href="${url}" target="_blank" rel="noopener noreferrer">
      <span class="press-row-photo">${image ? `<img src="${image}" alt="" loading="lazy" decoding="async"${imagePosition ? ` style="object-position: ${imagePosition};"` : ''}>` : ''}</span>
      <span class="press-row-text">
        <span class="press-row-outlet">${escapeHtml(outlet)}</span>
        <span class="press-row-title">${escapeHtml(title)}</span>
      </span>
      ${date ? `<span class="press-row-date">${date}</span>` : ''}
    </a>
  `).join('');
  return `
    <section class="panel panel-press page-content">
      <p class="section-kicker">PRESS</p>
      <div class="press-rows">
        ${rows}
      </div>
    </section>
  `;
}

/** The carousel's markup; src/js/photo-carousel.js makes it scroll. */
function renderPhotos(photos) {
  if (!photos?.length) return '';
  const slides = photos.map(({ image, caption, objectPosition }) => `
    <figure class="photo-carousel-item">
      <div class="photo-carousel-frame">
        <img src="${image}" alt="${escapeHtml(caption)}" class="photo-carousel-img"${objectPosition ? ` style="object-position: ${objectPosition};"` : ''} loading="eager" decoding="async">
      </div>
      <figcaption class="photo-carousel-caption">${escapeHtml(caption)}</figcaption>
    </figure>
  `).join('');
  return `
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
  `;
}

/** Video thumbnails; src/js/video-lightbox.js plays one in a pop-up when it's clicked, so no player loads until then. */
function renderVideos(videos) {
  if (!videos?.length) return '';
  const items = videos.map(({ type, title, videoId, embedSrc, caption, thumbnail }) => {
    const src = type === 'youtube' ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : embedSrc;
    return `
      <button type="button" class="video-thumb" data-video-src="${src}" data-video-title="${escapeHtml(title)}" data-video-caption="${escapeHtml(caption)}" aria-label="Play ${escapeHtml(title)}">
        <span class="video-thumb-frame">
          ${thumbnail ? `<img src="${thumbnail}" alt="" loading="lazy" decoding="async">` : ''}
          <span class="video-thumb-play" aria-hidden="true"></span>
        </span>
        <span class="video-thumb-caption">${escapeHtml(caption)}</span>
      </button>
    `;
  }).join('');
  return `
      <div class="video-thumbs">
        ${items}
      </div>
  `;
}

/** Photos and videos under one heading: the photo carousel, then the videos. */
function renderMedia(photos, videos) {
  const media = renderPhotos(photos) + renderVideos(videos);
  if (!media.trim()) return '';
  return `
    <section class="panel panel-media page-content">
      <p class="section-kicker">MEDIA</p>
      ${media}
    </section>
  `;
}

/**
 * Where I've been: a dot map (src/js/places-map.js draws it), then a chip per country.
 * Hovering or focusing a chip picks out that country's pins and names its cities, which
 * are also in the chip's label for screen readers.
 */
function renderPlaces(places) {
  if (!places?.length) return '';
  const cityCount = places.reduce((n, p) => n + p.cities.length, 0);
  const continents = [...new Set(places.map((p) => p.continent))];
  // A city-state (Vatican City) is listed once, not as "Vatican City: Vatican City"
  const label = (p) => (p.cities.length === 1 && p.cities[0].name === p.country ? p.country : `${p.country}: ${p.cities.map((c) => c.name).join(', ')}`);
  const chips = places.map((p, i) => `
    <button type="button" class="places-country" data-country="${i}" aria-label="${escapeHtml(label(p))}">
      ${escapeHtml(p.country)}${p.cities.length > 1 ? `<span class="places-country-count" aria-hidden="true">${p.cities.length}</span>` : ''}
    </button>
  `).join('');
  return `
    <section class="panel panel-places page-content">
      <p class="section-kicker">TRAVELS</p>
      <div class="places-map" data-places-map>
        <canvas aria-hidden="true"></canvas>
        <p class="places-tip" aria-hidden="true"></p>
      </div>
      <p class="places-stats">
        <span><b>${cityCount}</b> cities</span>
        <span><b>${places.length}</b> countries</span>
        <span><b>${continents.length}</b> continents</span>
        <span class="places-key places-key--home">Home</span>
        <span class="places-key">Visited</span>
      </p>
      <div class="places-countries">${chips}</div>
    </section>
  `;
}

/** A line of title chips per group (Shows, Movies, Books, Music), each with a tiny cover; src/js/cover-follow.js shows it bigger on hover. */
function renderFavourites(groups) {
  const rows = groups.filter((g) => g.items.length).map((group) => `
    <div class="favourites-row">
      <p class="favourites-label">${escapeHtml(group.title)}</p>
      <div class="favourites-chips">
        ${group.items.map((item) => `
          <a class="fav-chip${group.shape === 'square' ? ' fav-chip--square' : ''}" href="${item.url}" target="_blank" rel="noopener noreferrer">
            <img class="fav-chip-thumb" src="${item.poster}" alt="" loading="lazy" decoding="async">
            <span>${escapeHtml(item.title)}</span>
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
    ${renderPress(SITE.press)}
    ${renderMedia(ARCHIVE.photos, ARCHIVE.videos)}
    ${renderFavourites(ARCHIVE.favourites)}
    ${renderPlaces(ARCHIVE.places)}
  `;
}
