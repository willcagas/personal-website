/**
 * Main Application Entry Point
 * Simplified single-page design
 */

import ThemeManager from './theme.js';

/**
 * Main Content Component
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
            " using AI to speed up regulatory approval of AI-discovered pesticides for farmers at ",
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
          text: "building a competitive platform for all university students at Goose Trials - launching in 3 days!"
        },
        {
          text: "exploring AI x biomedical applications including medical imaging and CT-based oncology analysis"
        },
        {
          text: "building AI for acne at ",
          link: {
            text: "AcneCura",
            url: "https://acnecura.io",
            logo: "/assets/logos/acnecura.png"
          },
          after: " with 300K organic views and featured on Global News"
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
          text: "organized ",
          link: {
            text: "HammerHacks",
            url: "https://hammerhacks2024.wcagas.com",
            logo: "/assets/logos/hammerhacks.png"
          },
          after: " with 140+ participants, ~50 projects, and $12,000 in funding by McMaster Engineering, Hack Club, Inference Labs, and more"
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
          text: "built swords and game mechanics for ",
          link: {
            text: "Sword Power Tycoon",
            url: "https://www.roblox.com/games/6937615628/Sword-Power-Tycoon",
            logo: "/assets/logos/roblox-logo.png"
          },
          after: " (19M+ plays, 36K+ favourites on Roblox)"
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
            <a href="#about" class="nav-link">about</a>
            <a href="#projects" class="nav-link">projects</a>
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
      if (item.link) {
        const logoHtml = item.link.logo ? `<img src="${item.link.logo}" alt="${item.link.text}" class="project-logo">` : '';
        return `${item.text}<a href="${item.link.url}" target="_blank" rel="noopener noreferrer">${item.link.text}</a>${logoHtml}${item.after || ''}`;
      }
      return item.text;
    };

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
    
    // Initialize smooth scrolling
    this.initSmoothScroll();
  }

  initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.themeManager.toggleTheme();
      });
    }
  }

  initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetSection = document.getElementById(targetId);
          if (targetSection) {
            const rect = targetSection.getBoundingClientRect();
            const targetPosition = window.pageYOffset + rect.top - 20;
            window.scrollTo({
              top: Math.max(0, targetPosition),
              behavior: 'smooth'
            });
          }
        }
      });
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
