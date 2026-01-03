/**
 * Archive Section Component
 * 
 * Displays photos in a horizontal carousel and videos in a grid layout.
 */

class ArchiveSection {
  constructor() {
    this.photos = [
      {
        image: "/assets/pictures/se-2030.JPG",
        caption: "Most cracked builders in Canada (i.e. Waterloo SE '30)",
        objectPosition: "0% 100%"
      },
      {
        image: "/assets/pictures/bts-news.jpg",
        caption: "Behind-the-scenes Global News interview ft. my family",
        objectPosition: "0% 40%"
      },
      {
        image: "/assets/pictures/sf-2025.png",
        caption: "Hack Club's Undercity hackathon at GitHub HQ in SF"
      },
      {
        image: "/assets/pictures/loo-park.jpg",
        caption: "Views from Waterloo Park, Waterloo, Canada"
      },
      {
        image: "/assets/pictures/dev-the-future.JPG",
        caption: "Panelist at the semiannual Apple x DevTheFuture conference",
        objectPosition: "70% 40%"
      },
      {
        image: "/assets/pictures/hamiltonians.jpg",
        caption: "Favourite Hamiltonians"
      },
      {
        image: "/assets/pictures/accv.jpg",
        caption: "Presenting research at ACCV 2024 in Hanoi, Vietnam"
      },
      {
        image: "/assets/pictures/hammerhacks.JPEG",
        caption: "Organizing team for HammerHacks, Hamilton's first high school hackathon"
      },
      {
        image: "/assets/pictures/code-in-place.jpg",
        caption: "First class teaching for Stanford Code in Place"
      },
      {
        image: "/assets/pictures/robotics.jpg",
        caption: "Winners of the FRC Ontario District Niagara College Event",
        objectPosition: "40% 40%"
      },
    ];

    this.videos = [
      {
        title: "Global News Interview",
        type: "iframe",
        embedSrc: "https://globalnews.ca/video/embed/11330376/",
        caption: "Global News interview about AcneCura"
      },
      {
        title: "HammerHacks Recap",
        type: "youtube",
        videoId: "Jb-2RpDonEs",
        caption: "HammerHacks recap video"
      }
    ];
  }

  render() {
    return `
      <section id="archive" class="archive-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Archive</h2>
          </div>
          
          <!-- Photos Carousel -->
          <div class="archive-photos">
            <div class="carousel-container">
              <button class="carousel-btn carousel-btn-prev" id="carousel-prev" aria-label="Previous photo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <div class="carousel-wrapper">
                <div class="carousel-track" id="carousel-track">
                   ${this.photos.map((photo, index) => `
                     <figure class="carousel-item ${index === 0 ? 'carousel-item-active' : ''}">
                       <img src="${photo.image}" alt="" class="carousel-image" loading="${index < 4 ? 'eager' : 'lazy'}" style="${photo.objectPosition ? `object-position: ${photo.objectPosition} !important;` : ''}" onload="this.classList.add('loaded');" onerror="this.classList.add('loaded');">
                       <figcaption class="carousel-caption">${photo.caption}</figcaption>
                     </figure>
                   `).join('')}
                </div>
              </div>
              <button class="carousel-btn carousel-btn-next" id="carousel-next" aria-label="Next photo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
            <div class="carousel-indicators" id="carousel-indicators">
              ${this.photos.map((_, index) => `
                <button class="carousel-indicator ${index === 0 ? 'carousel-indicator-active' : ''}" data-index="${index}" aria-label="Go to photo ${index + 1}"></button>
              `).join('')}
            </div>
          </div>

          <!-- Videos Grid -->
          <div class="archive-videos">
            <div class="videos-grid">
              ${this.videos.map(video => `
                <figure class="video-item">
                  <div class="video-wrapper">
                    ${video.type === "youtube" ? `
                      <iframe 
                        src="https://www.youtube.com/embed/${video.videoId}" 
                        title="${video.title}"
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        loading="lazy"
                        class="video-iframe">
                      </iframe>
                    ` : `
                      <iframe 
                        src="${video.embedSrc}" 
                        title="${video.title}"
                        frameborder="0" 
                        allowfullscreen
                        scrolling="no"
                        loading="lazy"
                        class="video-iframe">
                      </iframe>
                    `}
                  </div>
                  <figcaption class="video-caption">${video.title}</figcaption>
                </figure>
              `).join('')}
            </div>
          </div>

          <!-- Webring Widget -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 4rem;">
            <a href="https://se30webring.com?from=https://wcagas.com&dir=prev" style="text-decoration: none; color: #FFCE1A; font-size: 1.5rem; line-height: 1; display: flex; align-items: center;">←</a>
            <a href="https://se30webring.com" target="_blank" style="text-decoration: none; display: flex; align-items: center;">
              <img src="https://se30webring.com/assets/icon-yellow.svg" alt="SE '30 Webring" style="width: 32px; height: 32px;" />
            </a>
            <a href="https://se30webring.com?from=https://wcagas.com&dir=next" style="text-decoration: none; color: #FFCE1A; font-size: 1.5rem; line-height: 1; display: flex; align-items: center;">→</a>
          </div>
        </div>
      </section>
    `;
  }

  init() {
    const track = document.getElementById('carousel-track');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const indicatorsContainer = document.getElementById('carousel-indicators');
    
    if (!track || !prevBtn || !nextBtn) return;

    let currentIndex = 0;
    const totalItems = this.photos.length;

    const isMobile = () => window.innerWidth < 640;

    const updateCarousel = () => {
      const mobile = isMobile();
      const items = document.querySelectorAll('.carousel-item');
      const indicators = document.querySelectorAll('.carousel-indicator');
      
      // Calculate the actual width of one item including gap
      if (items.length > 0) {
        const firstItem = items[0];
        const itemRect = firstItem.getBoundingClientRect();
        const gap = 24; // spacing-xl = 1.5rem = 24px (assuming 16px base)
        const itemWidth = itemRect.width;
        
        if (mobile) {
          // On mobile: move by one item width + gap
          const movePixels = currentIndex * (itemWidth + gap);
          track.style.transform = `translateX(-${movePixels}px)`;
        } else {
          // On desktop: move by one item width + gap (showing 2 at a time)
          const movePixels = currentIndex * (itemWidth + gap);
          track.style.transform = `translateX(-${movePixels}px)`;
        }
      } else {
        // Fallback to percentage if items not ready
        track.style.transform = mobile 
          ? `translateX(-${currentIndex * 100}%)`
          : `translateX(-${currentIndex * 50}%)`;
      }
      
      // Update active states
      items.forEach((item, index) => {
        if (mobile) {
          // On mobile: only current item is active
          item.classList.toggle('carousel-item-active', index === currentIndex);
        } else {
          // On desktop: current and next item are active
          const isVisible = index === currentIndex || index === currentIndex + 1;
          item.classList.toggle('carousel-item-active', isVisible);
        }
      });
      
      // Update indicators
      indicators.forEach((indicator, index) => {
        indicator.classList.toggle('carousel-indicator-active', index === currentIndex);
      });

      // Update button states
      if (mobile) {
        // On mobile: disable next when at last item
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= totalItems - 1;
      } else {
        // On desktop: disable next when showing last 2 items
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= totalItems - 2;
      }
    };

    // Previous button
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    // Next button
    nextBtn.addEventListener('click', () => {
      const mobile = isMobile();
      const maxIndex = mobile ? totalItems - 1 : totalItems - 2;
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    });

    // Indicator buttons
    indicatorsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('carousel-indicator')) {
        currentIndex = parseInt(e.target.dataset.index);
        updateCarousel();
      }
    });

    // Keyboard navigation
    track.addEventListener('keydown', (e) => {
      const mobile = isMobile();
      const maxIndex = mobile ? totalItems - 1 : totalItems - 2;
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      } else if (e.key === 'ArrowRight' && currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    });

    // Touch/swipe support for mobile
    let startX = 0;
    let isDragging = false;

    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isDragging = true;
    });

    track.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
    });

    track.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        const mobile = isMobile();
        const maxIndex = mobile ? totalItems - 1 : totalItems - 2;
        if (diff > 0 && currentIndex < maxIndex) {
          // Swipe left - next
          currentIndex++;
          updateCarousel();
        } else if (diff < 0 && currentIndex > 0) {
          // Swipe right - previous
          currentIndex--;
          updateCarousel();
        }
      }
    });

    // Preload all images for smooth carousel navigation
    const preloadImages = () => {
      this.photos.forEach((photo) => {
        const img = new Image();
        img.src = photo.image;
      });
    };

    // Preload images after initial render
    preloadImages();

    // Initialize
    updateCarousel();

    // Recalculate on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Reset to first item if we're beyond bounds after resize
        const mobile = isMobile();
        const maxIndex = mobile ? totalItems - 1 : totalItems - 2;
        if (currentIndex > maxIndex) {
          currentIndex = 0;
        }
        updateCarousel();
      }, 100);
    });
  }
}

export default ArchiveSection;

