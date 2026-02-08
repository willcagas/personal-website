/**
 * Main Application Entry Point
 * Simplified single-page design
 * 
 * This is a minimal, content-focused personal website.
 * All content is managed in the Content class data structure.
 */

import ThemeManager from './theme.js';

/**
 * Content Component
 * Manages all website content and rendering logic
 */
class Content {
  constructor() {
    this.data = {
      name: "William Cagas 🪿",
      nameSimple: "William Cagas",
      aboutList: [
        { text: "passionate about researching and building AI that solves real-world problems" },
        { text: "feel free to reach out if you're interested in tech or building something cool!" }
      ],
      currentList: [
        {
          text: "leading a team at ",
          link: {
            text: "WAT.ai",
            url: "https://watai.ca",
            logo: "/assets/logos/watai.png"
          },
          after: " building AI for pesticide regulatory approval for ",
          secondLink: {
            text: "Bindwell",
            url: "https://bindwell.ai/",
            logo: "/assets/logos/bindwell.png"
          },
          after2: " (YC W25)"
        },
        {
          text: "exploring multimodal AI systems for oncology workflows"
        },
        {
          text: "building AI for acne at ",
          link: {
            text: "AcneCura",
            url: "https://acnecura.io",
            logo: "/assets/logos/acnecura.png"
          },
          after: " <span class=\"sub-info\">(300K organic views, interviewed on Global News)</span>"
        }
      ],
      previousList: [
        {
          text: "shipped ",
          link: {
            text: "Goose Trials",
            url: "https://goosetrials.com",
            logo: "/assets/logos/goosetrials.png"
          },
          after: ", the ranked Human Benchmark <span class=\"sub-info\">(~1000 unique players + 8000 games played in 24 hrs, featured in UWaterloo's newspaper)</span>"
        },
        {
          text: "conducted collaborative ML research at ",
          link: {
            text: "CMU Xu Lab",
            url: "https://xulabs.github.io/",
            logo: "/assets/logos/cmu.png"
          },
          after: " <span class=\"sub-info\">(accelerating clinical trials for rare diseases using DDPMs)</span>"
        },
        {
          text: "taught CS106A and Python basics 2x at ",
          link: {
            text: "Stanford Code in Place",
            url: "https://codeinplace.stanford.edu/",
            logo: "/assets/logos/stanford-logo.jpg"
          }
        },
        {
          text: "led and organized ",
          link: {
            text: "HammerHacks",
            url: "https://hammerhacks2024.wcagas.com",
            logo: "/assets/logos/hammerhacks.png"
          },
          after: " <span class=\"sub-info\">(140+ participants, ~50 projects, and $12,000 in funding from McMaster Engineering, Hack Club, and more)</span>"
        },
        {
          text: "published an ML research paper on ",
          link: {
            text: "GANs for medical imaging",
            url: "https://medgans.wcagas.com",
            logo: "/assets/logos/medgans.png"
          },
          after: " <span class=\"sub-info\">(oral presentation at ACCV 2024, cited 8× incl. ICCV, ACM)</span>"
        },
        // Green Venture item removed as requested
        {
          text: "built sword and game mechanics for ",
          link: {
            text: "Sword Power Tycoon",
            url: "https://www.roblox.com/games/6937615628/Sword-Power-Tycoon",
            logo: "/assets/logos/roblox-logo.png"
          },
          after: " <span class=\"sub-info\">(19M+ plays, 36K+ favourites)</span>"
        }
      ],
      // Keep archive/press/socialLinks as is for now/footer
      archive: {
        photos: [
          {
            image: "/assets/pictures/uw-zfellows-meetup.jpeg",
            caption: "UW x Z Fellows builder meetup"
          },
          {
            image: "/assets/pictures/goosetrials-launch.jpg",
            caption: "Goose Trials launch at SE lounge",
            objectPosition: "60% 40%"
          },
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
          }
        ],
        videos: [
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
        ]
      },
      press: [
        {
          outlet: "UW Imprint",
          url: "https://uwimprint.ca/first-year-engineering-students-launch-goose-trials-a-competitive-game-platform/",
          title: "First-year engineering students launch Goose Trials, a competitive game platform"
        },
        {
          outlet: "Global News",
          url: "https://globalnews.ca/video/11330376/hamilton-teen-develops-app-to-detect-diagnose-acne/",
          title: "Hamilton teen develops app to detect, diagnose acne"
        },
        {
          outlet: "HWCDSB",
          url: "https://www.hwcdsb.ca/news/2024-2025/hammer_hacks_empowers_hamilton_youth_in_s_t_e_m",
          title: "HammerHacks Empowers Hamilton Youth in STEM"
        },
        {
          outlet: "The Hamilton Spectator",
          url: "https://www.thespec.com/news/hamilton-region/hamilton-high-schooler-uses-tech-to-solve-problems-from-gaps-in-medical-data-to-teen/article_35dcda17-4b96-5079-90d5-84625c65f254.html",
          title: "Hamilton high schooler uses tech to solve problems — from gaps in medical data to teen acne"
        }
      ],
      location: "Hamilton, ON, Canada",
      email: "wcagas@uwaterloo.ca",
      socialLinks: [
        {
          name: "LinkedIn",
          url: "https://www.linkedin.com/in/william-cagas/"
        },
        {
          name: "GitHub",
          url: "https://github.com/willcagas"
        },
        {
          name: "Google Scholar",
          url: "https://scholar.google.com/citations?user=IMaV4_kAAAAJ&hl"
        },
        {
          name: "Twitter",
          url: "https://x.com/williamcagas"
        },
        {
          name: "Instagram",
          url: "https://instagram.com/williamcagas"
        }
      ]
    };
  }

  renderNav() {
    return `
      <nav>
        <div class="nav-container">
          <a href="/" class="nav-logo">${this.data.nameSimple}</a>
          <div class="nav-links">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme" type="button">
              <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  renderContent() {
    const renderItem = (item) => {
      let content = item.text || '';
      if (item.link) {
        const logoHtml = item.link.logo ? `<img src="${item.link.logo}" alt="${item.link.text}" class="project-logo">` : '';
        content += `<a href="${item.link.url}" target="_blank" rel="noopener noreferrer">${item.link.text}</a>${logoHtml}`;
      }
      if (item.after) {
        content += item.after;
      }
      if (item.secondLink) {
        const logo2Html = item.secondLink.logo ? `<img src="${item.secondLink.logo}" alt="${item.secondLink.text}" class="project-logo">` : '';
        content += `<a href="${item.secondLink.url}" target="_blank" rel="noopener noreferrer">${item.secondLink.text}</a>${logo2Html}`;
      }
      if (item.after2) {
        content += item.after2;
      }
      return content;
    };

    return `
      <section id="about" class="content-section">
        <div class="profile-header">
          <div class="profile-image-container">
            <img src="/assets/pictures/profile.JPG" alt="" class="profile-image" onload="this.classList.add('loaded');" onerror="this.classList.add('loaded');">
          </div>
          <div class="profile-info">
            <h1 class="profile-name">${this.data.name}</h1>
            <p class="profile-university">Software Engineering @ <a href="https://uwaterloo.ca/" target="_blank" rel="noopener noreferrer">University of Waterloo</a><img src="/assets/logos/waterloo-logo.png" alt="University of Waterloo" class="project-logo"></p>
            <p class="profile-location">Waterloo, Ontario</p>
            <div class="profile-social">
              <a href="mailto:${this.data.email}" 
                 target="_blank" 
                 class="profile-social-link" 
                 aria-label="Email"
                 rel="noopener noreferrer">
                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/gmail.svg" alt="Email" class="social-logo">
              </a>
              ${this.data.socialLinks.map(link => {
      const iconMap = {
        'LinkedIn': 'linkedin',
        'GitHub': 'github',
        'Google Scholar': 'googlescholar',
        'Twitter': 'x',
        'Instagram': 'instagram'
      };
      const iconName = iconMap[link.name] || link.name.toLowerCase().replace(' ', '');
      return `
                <a href="${link.url}" 
                   target="_blank" 
                   class="profile-social-link" 
                   aria-label="${link.name}"
                   rel="noopener noreferrer">
                  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${iconName}.svg" alt="${link.name}" class="social-logo">
                </a>
              `;
    }).join('')}
            </div>
          </div>
        </div>
      <section class="content-section">
        <h2>about:</h2>
        ${this.data.aboutList.map(item => `
          <div class="role-item">
            <span class="role-text">${renderItem(item)}</span>
          </div>
        `).join('')}
      </section>

      <section class="content-section">
        <h2>currently:</h2>
        ${this.data.currentList.map(item => {
      const subItems = item.subItems ? item.subItems.map(sub => `<span class="sub-item">${sub}</span>`).join('') : '';
      return `
          <div class="role-item">
            <span class="role-text">${renderItem(item)}</span>${subItems}
          </div>
        `;
    }).join('')}
      </section>

      <section class="content-section">
        <h2>previously:</h2>
        ${this.data.previousList.map(item => {
      const subItems = item.subItems ? item.subItems.map(sub => `<span class="sub-item">${sub}</span>`).join('') : '';
      return `
          <div class="role-item">
            <span class="role-text">${renderItem(item)}</span>${subItems}
          </div>
        `;
    }).join('')}
      </section>

      <section class="content-section">
        <h2>press:</h2>
        <ul class="press-list">
          ${this.data.press.map(item => `
            <li class="press-item">
              <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="press-link">
                <span class="press-outlet">${item.outlet}</span>
                <span class="press-article">${item.title}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </section>

      <section class="content-section">
        <h2>archive:</h2>
        <div class="archive-content">
          
          <!-- Photos Carousel -->
          <div class="archive-photos-carousel">
            <button class="carousel-btn carousel-btn-prev" id="archive-carousel-prev" aria-label="Previous photos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div class="archive-photos-wrapper">
              <div class="archive-photos-track" id="archive-photos-track">
                ${this.data.archive.photos.map((photo, index) => `
                  <figure class="archive-photo-item">
                    <div class="archive-photo-frame">
                      <img src="${photo.image}" alt="${photo.caption}" class="archive-photo" style="${photo.objectPosition ? `object-position: ${photo.objectPosition};` : ''}" loading="${index < 3 ? 'eager' : 'lazy'}">
                    </div>
                    <figcaption class="archive-photo-caption">${photo.caption}</figcaption>
                  </figure>
                `).join('')}
              </div>
            </div>
            <button class="carousel-btn carousel-btn-next" id="archive-carousel-next" aria-label="Next photos">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <!-- Videos -->
          <div class="archive-videos">
            ${this.data.archive.videos.map(video => `
              <figure class="archive-video-item">
                <div class="archive-video-wrapper">
                  ${video.type === "youtube" ? `
                    <iframe 
                      src="https://www.youtube.com/embed/${video.videoId}" 
                      title="${video.title}"
                      frameborder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowfullscreen
                      loading="lazy"
                      class="archive-video-iframe">
                    </iframe>
                  ` : `
                    <iframe 
                      src="${video.embedSrc}" 
                      title="${video.title}"
                      frameborder="0" 
                      allowfullscreen
                      scrolling="no"
                      loading="lazy"
                      class="archive-video-iframe">
                    </iframe>
                  `}
                </div>
                <figcaption class="archive-video-caption">${video.caption}</figcaption>
              </figure>
            `).join('')}
          </div>
        </div>
      </section>

      <footer>
        <div class="footer-content-wrapper">
          <div class="footer-social">
            <a href="mailto:${this.data.email}" 
               target="_blank" 
               class="footer-social-link" 
               aria-label="Email"
               rel="noopener noreferrer">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/gmail.svg" alt="Email" class="social-logo">
            </a>
            ${this.data.socialLinks.map(link => {
      const iconMap = {
        'LinkedIn': 'linkedin',
        'GitHub': 'github',
        'Google Scholar': 'googlescholar',
        'Twitter': 'x',
        'Instagram': 'instagram'
      };
      const iconName = iconMap[link.name] || link.name.toLowerCase().replace(' ', '');
      return `
              <a href="${link.url}" 
                 target="_blank" 
                 class="footer-social-link" 
                 aria-label="${link.name}"
                 rel="noopener noreferrer">
                <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${iconName}.svg" alt="${link.name}" class="social-logo">
              </a>
            `;
    }).join('')}
          </div>
          <div class="webring-widget">
            <a href="https://se30webring.com?from=https://wcagas.com&dir=prev" style="text-decoration: none; color: #FFCE1A; font-size: 1.5rem; line-height: 1; display: flex; align-items: center;">←</a>
            <a href="https://se30webring.com" target="_blank" style="text-decoration: none; display: flex; align-items: center;">
              <img src="https://se30webring.com/assets/icon-yellow.svg" alt="SE '30 Webring" style="width: 32px; height: 32px;" />
            </a>
            <a href="https://se30webring.com?from=https://wcagas.com&dir=next" style="text-decoration: none; color: #FFCE1A; font-size: 1.5rem; line-height: 1; display: flex; align-items: center;">→</a>
          </div>
        </div>
        <p class="footer-copyright">© ${new Date().getFullYear()} ${this.data.nameSimple}</p>
      </footer>
    `;
  }
}

/**
 * Application Initialization
 */
class App {
  constructor() {
    this.themeManager = new ThemeManager();
    this.content = new Content();
  }

  init() {
    // Render nav and content inside main
    const main = document.querySelector('main');

    if (main) {
      // Insert nav at the beginning of main
      main.insertAdjacentHTML('afterbegin', this.content.renderNav());

      // Render content after nav
      main.insertAdjacentHTML('beforeend', this.content.renderContent());
    }

    // Initialize theme toggle
    this.initThemeToggle();

    // Initialize archive carousel
    this.initArchiveCarousel();
  }

  initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.themeManager.toggleTheme();
      });
    }
  }

  initArchiveCarousel() {
    const track = document.getElementById('archive-photos-track');
    const prevBtn = document.getElementById('archive-carousel-prev');
    const nextBtn = document.getElementById('archive-carousel-next');
    const wrapper = track?.parentElement;

    if (!track || !prevBtn || !nextBtn || !wrapper) return;

    const items = track.querySelectorAll('.archive-photo-item');
    const totalItems = items.length;
    const itemsPerView = 3;
    let currentIndex = 0;

    const updateCarousel = () => {
      if (items.length === 0) return;

      // Wait for layout to be ready
      const firstItem = items[0];
      const secondItem = items[1];
      if (!firstItem || firstItem.offsetWidth === 0) {
        requestAnimationFrame(updateCarousel);
        return;
      }

      // Calculate the distance between the left edges of consecutive items
      // This accounts for item width + gap in one measurement
      let stepSize;
      if (secondItem) {
        const firstRect = firstItem.getBoundingClientRect();
        const secondRect = secondItem.getBoundingClientRect();
        stepSize = secondRect.left - firstRect.left;
      } else {
        // Fallback if only one item
        stepSize = firstItem.offsetWidth + 16;
      }

      // Calculate the exact translate value
      const translateX = -currentIndex * stepSize;

      track.style.transform = `translateX(${translateX}px)`;
    };

    const next = () => {
      // Check if moving forward would show white space
      if (currentIndex + itemsPerView >= totalItems) {
        // Wrap back to the beginning
        currentIndex = 0;
      } else {
        // Move forward by one item
        currentIndex = currentIndex + 1;
      }
      updateCarousel();
    };

    const prev = () => {
      // Move backward by one item, wrapping to the end if needed
      if (currentIndex === 0) {
        // Find the last valid starting position that shows 3 items
        currentIndex = Math.max(0, totalItems - itemsPerView);
      } else {
        currentIndex = currentIndex - 1;
      }
      updateCarousel();
    };

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    // Initialize after layout is ready
    const initialize = () => {
      if (items.length > 0 && items[0].offsetWidth > 0) {
        updateCarousel();
      } else {
        requestAnimationFrame(initialize);
      }
    };

    // Wait a bit for initial layout
    setTimeout(initialize, 100);

    // Update on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateCarousel, 150);
    });
  }

}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App().init();
  });
} else {
  new App().init();
}
