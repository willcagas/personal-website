import { SITE } from '../site-data.js';
import ARCHIVE from '../archive-data.js';
import { escapeHtml } from './shared.js';

// Where the stories come from, for the line under the masthead
const PRESS_DATELINE = 'Hamilton · Waterloo';

/** A small newspaper front page: the lead story large on the left, the rest down the side, the first of those with its photo. */
function renderPress(stories) {
  if (!stories.length) return '';
  const lead = stories.find((s) => s.lead) || stories[0];
  const rest = stories.filter((s) => s !== lead);
  const years = stories.map((s) => Number(s.date?.match(/\d{4}/)?.[0])).filter(Boolean);
  const span = [...new Set([Math.min(...years), Math.max(...years)])].filter(Number.isFinite).join('–');
  const photo = ({ image, imagePosition }) => (image ? `
    <span class="press-front-photo">
      <img src="${image}" alt="" loading="lazy" decoding="async"${imagePosition ? ` style="object-position: ${imagePosition};"` : ''}>
    </span>` : '');
  const story = (s, withPhoto) => `
    <a class="press-front-story" href="${s.url}" target="_blank" rel="noopener noreferrer">
      ${withPhoto ? photo(s) : ''}
      <span class="press-front-kicker">${escapeHtml(s.outlet)}${s.date ? ` · ${s.date}` : ''}</span>
      <span class="press-front-title">${escapeHtml(s.title)}</span>
    </a>
  `;
  return `
    <section class="panel panel-press page-content">
      <p class="section-kicker">PRESS</p>
      <div class="press-front">
        <p class="press-front-mast">In the Press</p>
        <p class="press-front-dateline">
          <span>${stories.length} ${stories.length === 1 ? 'story' : 'stories'}</span>
          <span>${PRESS_DATELINE}</span>
          <span>${span}</span>
        </p>
        <div class="press-front-grid">
          <div class="press-front-lead">${story(lead, true)}</div>
          ${rest.length ? `<div class="press-front-side">${rest.map((s, i) => story(s, i === 0)).join('')}</div>` : ''}
        </div>
      </div>
    </section>
  `;
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

/** Video thumbnails; src/js/video-lightbox.js plays one in a pop-up when it's clicked, so no player loads until then. */
function renderVideos(videos) {
  if (!videos.length) return '';
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
    <section class="panel panel-videos page-content">
      <p class="section-kicker">VIDEOS</p>
      <div class="video-thumbs">
        ${items}
      </div>
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
    ${renderFavourites(ARCHIVE.favourites)}
    ${renderPhotos(ARCHIVE.photos)}
    ${renderVideos(ARCHIVE.videos)}
    ${renderPress(SITE.press)}
  `;
}
