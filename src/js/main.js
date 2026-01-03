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
      name: "William Cagas",
      currentRoles: [
        {
          role: "software engineering at",
          company: "University of Waterloo",
          link: "https://uwaterloo.ca/",
          logo: "/assets/logos/waterloo-logo.png"
        },
        {
          inlineLinks: [
            "leading a team at ",
            {
              text: "WAT.ai",
              url: "https://wat.ai",
              logo: "/assets/logos/watai.png"
            },
            " using AI to speed up regulatory approval of new and safer AI-discovered pesticides for farmers, at ",
            {
              text: "Bindwell",
              url: "https://bindwell.ai/",
              logo: "/assets/logos/bindwell.png"
            },
            " (YC W25)"
          ]
        }
      ],
      building: [
        {
          text: "building a competitive platform for all university students - launching in 3 days!"
        },
        {
          text: "exploring AI x biomedical applications including medical imaging and CT-based oncology analysis"
        },
        {
          text: "creating a shared online space for SE '30 through the ",
          link: {
            text: "SE '30 Webring",
            url: "https://se30webring.com",
            logo: "/assets/logos/se30webring.png"
          },
          after: " with a goal of having all ~120 of us in the webring!",
        },
        {
          text: "building AI for acne at ",
          link: {
            text: "AcneCura",
            url: "https://acnecura.io",
            logo: "/assets/logos/acnecura.png"
          },
          after: " with 300K organic views and featured in Global News"
        },
        {
          text: "documenting tech and uni life on ",
          link: {
            text: "@willcagas.mov",
            url: "https://www.instagram.com/willcagas.mov",
            logo: "/assets/logos/instagram.jpg"
          }
        },
      ],
      completed: [
        {
          text: "received a ",
          link: {
            text: "$20,000 scholarship",
            url: "https://uwaterloo.ca/undergraduate-entrance-awards/awards/gloria-baylis-entrance-award",
            logo: "/assets/logos/waterloo-logo.png"
          },
          after: " from UWaterloo for demonstrated interest in entrepreneurship"
        },
        {
          text: "led and organized ",
          link: {
            text: "HammerHacks",
            url: "https://hammerhacks2024.wcagas.com",
            logo: "/assets/logos/hammerhacks.png"
          },
          after: " with 140+ participants, ~50 projects, and $12,000 in funding from McMaster Engineering, Hack Club, Inference Labs, and more"
        },
        {
          text: "published ML research on ",
          link: {
            text: "medical imaging complexity and GAN performance",
            url: "https://medgans.wcagas.com",
            logo: "/assets/logos/medgans.png"
          },
          after: " with an oral presentation at ACCV 2024 and cited by 8 papers including ICCV and ACM"
        },
        {
          inlineLinks: [
            "software developer at ",
            {
              text: "Green Venture",
              url: "https://greenventure.ca/",
              logo: "/assets/logos/greenventure.png"
            },
            " and at ",
            {
              text: "Career Education Council",
              url: "https://cec-council.org/",
              logo: "/assets/logos/cec.png"
            },
            " x ",
            {
              text: "Apple",
              url: "https://apple.com/",
              logo: "/assets/logos/apple.png"
            },
            " building mobile apps"
          ]
        },  
        {
          text: "built sword and game mechanics for ",
          link: {
            text: "Sword Power Tycoon",
            url: "https://www.roblox.com/games/6937615628/Sword-Power-Tycoon",
            logo: "/assets/logos/roblox-logo.png"
          },
          after: " leading to 19M+ plays and 36K+ favourites on Roblox"
        }
      ],
      previously: [
        {
          role: "conducted collaborative ML research on DDPMs for clinical applications at",
          company: "CMU Xu Lab",
          link: "https://xulabs.github.io/",
          logo: "/assets/logos/cmu.png"
        },
        {
          role: "taught CS106A and Python basics at",
          company: "Stanford Code in Place",
          link: "https://codeinplace.stanford.edu",
          logo: "/assets/logos/stanford-logo.jpg"
        }
      ],
      about: [
        "passionate about researching and building AI that solves real-world problems",
        "work spans biomedical and health tech, applied AI research, web/mobile app dev, hackathon organizing, education, game dev, and more",
        "feel free to reach out if you're interested in tech or building something cool!"
      ],
      archive: {
        photos: [
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
          <a href="/" class="nav-logo">${this.data.name}</a>
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
    const renderBuildingItem = (item) => {
      // If item has inlineLinks array, render it as parts
      if (item.inlineLinks && Array.isArray(item.inlineLinks)) {
        return item.inlineLinks.map(part => {
          if (typeof part === 'string') {
            return part;
          } else if (part.url) {
            // It's a link object with text, url, and optional logo
            const logoHtml = part.logo ? `<img src="${part.logo}" alt="${part.text}" class="project-logo">` : '';
            return `<a href="${part.url}" target="_blank" rel="noopener noreferrer">${part.text}</a>${logoHtml}`;
          }
          return '';
        }).join('');
      }
      if (item.link) {
        const logoHtml = item.link.logo ? `<img src="${item.link.logo}" alt="${item.link.text}" class="project-logo">` : '';
        return `${item.text}<a href="${item.link.url}" target="_blank" rel="noopener noreferrer">${item.link.text}</a>${logoHtml}${item.after || ''}`;
      }
      return item.text;
    };

    /**
     * Renders role text with inline links and logos
     * Supports both legacy format (role, company, link, logo) and inlineLinks format
     * @param {Object} role - Role object with either inlineLinks array or legacy properties
     * @returns {string} HTML string for the role text
     */
    const renderRoleText = (role) => {
      // If role has inlineLinks array, render it as parts
      if (role.inlineLinks && Array.isArray(role.inlineLinks)) {
        return role.inlineLinks.map(part => {
          if (typeof part === 'string') {
            return part;
          } else if (part.url) {
            // It's a link object with text, url, and optional logo
            const logoHtml = part.logo ? `<img src="${part.logo}" alt="${part.text}" class="project-logo">` : '';
            return `<a href="${part.url}" target="_blank" rel="noopener noreferrer">${part.text}</a>${logoHtml}`;
          }
          return '';
        }).join('');
      }
      
      // Legacy support: if role.logo2 exists, use special case
      if (role.logo2) {
        // Special case for WAT.ai × Bindwell with two logos
        return `<a href="${role.link}" target="_blank" rel="noopener noreferrer">WAT.ai</a><img src="${role.logo}" alt="WAT.ai" class="project-logo"> × <a href="https://bindwell.ai/" target="_blank" rel="noopener noreferrer">Bindwell</a><img src="${role.logo2}" alt="Bindwell" class="project-logo"> (YC W25)`;
      }
      
      // Legacy support: render role text + company link with logo
      const roleText = role.role ? role.role + ' ' : '';
      const logoHtml = role.logo ? `<img src="${role.logo}" alt="${role.company}" class="project-logo">` : '';
      return `${roleText}<a href="${role.link}" target="_blank" rel="noopener noreferrer">${role.company}</a>${logoHtml}`;
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
        <h2>about:</h2>
        <ul class="about-list">
          ${Array.isArray(this.data.about) 
            ? this.data.about.map(item => `<li>${item}</li>`).join('')
            : `<li>${this.data.about}</li>`
          }
        </ul>
      </section>

      <section class="content-section">
        <h2>currently:</h2>
        ${this.data.currentRoles.map(role => `
          <div class="role-item">
            <span class="role-text">${renderRoleText(role)}</span>
          </div>
        `).join('')}
        ${this.data.building.map(item => `
          <div class="project-item">
            ${renderBuildingItem(item)}
          </div>
        `).join('')}
      </section>

      <section class="content-section">
        <h2>previously:</h2>
        ${this.data.previously.map(role => `
          <div class="role-item">
            <span class="role-text">${renderRoleText(role)}</span>
          </div>
        `).join('')}
        ${this.data.completed.map(item => `
          <div class="project-item">
            ${renderBuildingItem(item)}
          </div>
        `).join('')}
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
                    <img src="${photo.image}" alt="${photo.caption}" class="archive-photo" style="${photo.objectPosition ? `object-position: ${photo.objectPosition};` : ''}" loading="${index < 3 ? 'eager' : 'lazy'}">
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
        <p class="footer-copyright">© ${new Date().getFullYear()} ${this.data.name}</p>
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
