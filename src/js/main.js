/**
 * Main Application Entry Point
 * Multi-page SPA with client-side routing
 * 
 * Routes: / (Home), /work, /projects, /archive
 * All content is managed in the Content class data structure.
 */

import ARCHIVE_DATA from './archive-data.js';

/**
 * Simple client-side router using History API
 */
class Router {
  constructor(routes, onNavigate) {
    this.routes = routes;
    this.onNavigate = onNavigate;

    window.addEventListener('popstate', () => this.resolve());

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (!link) return;
      e.preventDefault();
      const path = link.getAttribute('href');
      if (path !== window.location.pathname) {
        window.history.pushState(null, '', path);
        this.resolve();
      }
    });
  }

  resolve() {
    const path = window.location.pathname;
    const route = this.routes.find((r) => r.path === path) || this.routes[0];
    this.onNavigate(route);
  }
}

/**
 * Content Component
 * Manages all website content and rendering logic
 */
class Content {
  constructor() {
    this.data = {
      name: "William Cagas",
      nameSubtitle: "",
      roleLine: {
        prefix: "Software Engineering @ ",
        link: { text: "University of Waterloo", url: "https://uwaterloo.ca/", logo: "/assets/logos/waterloo-logo.png" }
      },
      // Keep this list in desired visual order.
      // Requested order: WAT.ai, CMU, Algoverse, HammerHacks.
      mainRoles: [
        {
          company: "Thesis (YC F25)",
          url: "https://thesislabs.ai/",
          logo: "/assets/logos/thesislabs.png",
          role: "Member of Technical Staff Intern",
          current: true,
          stats: [
            "δ Building an agentic environment that autonomously runs ML research."
          ]
        },
        {
          companies: [
            { name: "WAT.ai", url: "https://watai.ca", logo: "/assets/logos/watai.png" },
            { name: "Bindwell (YC W25)", url: "https://bindwell.ai/", logo: "/assets/logos/bindwell.png" }
          ],
          role: "Technical PM",
          current: true,
          stats: [
            "Leading a cross-functional team building AI systems for pesticide regulatory approval."
          ]
        },
        {
          company: "CMU Xu Lab",
          url: "https://xulabs.github.io/",
          logo: "/assets/logos/cmu.png",
          role: "ML Researcher",
          current: false,
          stats: [
            "Researched DDPMs for medical image synthesis to accelerate rare disease clinical trials."
          ]
        },
        {
          company: "Algoverse AI Research",
          url: "https://algoverseairesearch.org/",
          logo: "/assets/logos/algoverse.png",
          role: "ML Researcher",
          current: false,
          stats: [
            "Lead author on GAN-based medical imaging research published at ACCV 2024 workshop."
          ]
        }
      ],
      projectHighlights: [
        {
          title: "Zentro",
          url: "https://joinzentro.com",
          logo: "/assets/logos/zentro-logo.png",
          detail: "300K+ views on X/Twitter in 24h with inbound VC interest."
        },
        {
          title: "Goose Trials",
          url: "https://goosetrials.com",
          logo: "/assets/logos/goosetrials.png",
          detail: "~1K unique players and 8K games played in 24h; featured on UW Imprint."
        },
        {
          title: "AcneCura",
          url: "https://acnecura.io",
          logo: "/assets/logos/acnecura.png",
          detail: "300K+ views; endorsed by Apple Canada and featured on Global News."
        },
        {
          title: "WasteBuster",
          url: "https://apps.apple.com/ca/app/wastebuster/id6450317120",
          logo: "/assets/logos/wastebuster.jpg",
          detail: "500+ circular solutions tackling overconsumption."
        },
        {
          title: "Sword Power Tycoon",
          url: "https://www.roblox.com/games/6937615628/Sword-Power-Tycoon",
          logo: "/assets/logos/roblox-logo.png",
          detail: "19M+ plays and 36K+ favourites."
        }
      ],
      researchHighlights: [
        {
          title: "Medical Imaging Complexity and its Effects on GAN Performance",
          venue: "GAISynMeD @ ACCV 2024",
          note: "(oral presentation); cited 10x including ICCV, ACM.",
          url: "https://medgans.wcagas.com",
          logo: "/assets/logos/medgans.png"
        }
      ],
      communityHighlights: [
        {
          company: "HammerHacks",
          url: "https://hammerhacks2024.wcagas.com",
          logo: "/assets/logos/hammerhacks.png",
          role: "Co-Founder & Lead Organizer",
          stats: ["140+ participants and $12K in sponsorships from McMaster Engineering, Hack Club, and more."]
        },
        {
          company: "Stanford Code in Place",
          url: "https://codeinplace.stanford.edu/",
          logo: "/assets/logos/stanford-logo.jpg",
          role: "Coding Instructor",
          stats: ["Taught CS106A Python fundamentals 2x to classes of international students."]
        }
      ],
      aboutMeta: "Building cool things to solve real-world problems",
      location: "Hamilton | Waterloo | San Francisco",
      // Preserved for future archive section reintroduction.
      archiveData: ARCHIVE_DATA,
      press: [
        {
          outlet: "UW Imprint",
          url: "https://uwimprint.ca/first-year-engineering-students-launch-goose-trials-a-competitive-game-platform/",
          title: "First-year engineering students launch Goose Trials, a competitive game platform",
          date: "Jan. 2026",
          logo: "/assets/logos/uw-imprint.png"
        },
        {
          outlet: "Global News",
          url: "https://globalnews.ca/video/11330376/hamilton-teen-develops-app-to-detect-diagnose-acne/",
          title: "Hamilton teen develops app to detect, diagnose acne",
          date: "Aug. 2025",
          logo: "/assets/logos/global-news.jpeg"
        },
        {
          outlet: "HWCDSB",
          url: "https://www.hwcdsb.ca/news/2024-2025/hammer_hacks_empowers_hamilton_youth_in_s_t_e_m",
          title: "HammerHacks Empowers Hamilton Youth in STEM",
          date: "Jan. 2025",
          logo: "/assets/logos/hwcdsb.png"
        },
        {
          outlet: "The Hamilton Spectator",
          url: "https://www.thespec.com/news/hamilton-region/hamilton-high-schooler-uses-tech-to-solve-problems-from-gaps-in-medical-data-to-teen/article_35dcda17-4b96-5079-90d5-84625c65f254.html",
          title: "Hamilton high schooler uses tech to solve problems — from gaps in medical data to teen acne",
          date: "Jan. 2025",
          logo: "/assets/logos/hamilton-spec.png"
        }
      ],
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
          url: "https://www.instagram.com/williamcagas"
        }
      ]
    };
  }

  /* ── Helpers ── */

  logoHtml(src, alt) {
    return src ? `<img src="${src}" alt="${alt}" class="inline-logo">` : "";
  }

  escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Shared chrome ── */

  renderNav(currentPath) {
    const links = [
      { label: "Home", path: "/" },
      { label: "Work", path: "/work" },
      { label: "Projects", path: "/projects" },
      { label: "Archive", path: "/archive" }
    ];
    const navItems = links.map((l) => {
      const active = l.path === currentPath ? ' class="nav-link active"' : ' class="nav-link"';
      return `<a href="${l.path}" data-route${active}>${l.label}</a>`;
    }).join("");

    return `
      <header class="site-header">
        <div class="header-inner">
          <div class="header-left">
            <h1 class="site-name"><a href="/" data-route class="name-link">${this.data.name}</a></h1>
            ${this.data.nameSubtitle ? `<p class="site-subtitle">${this.data.nameSubtitle}</p>` : ""}
          </div>
        </div>
        <nav class="site-nav" aria-label="Main navigation">
          ${navItems}
        </nav>
      </header>
    `;
  }

  renderFooter() {
    return '';
  }

  /* ── Pages ── */

  renderHome() {
    const socialOrder = ["Email", "GitHub", "Google Scholar", "LinkedIn", "Twitter", "Instagram"];
    const iconMap = {
      Email: "gmail",
      GitHub: "github",
      "Google Scholar": "googlescholar",
      LinkedIn: "linkedin",
      Twitter: "x",
      Instagram: "instagram"
    };

    const socialItems = socialOrder
      .map((name) => {
        if (name === "Email") {
          return { name: "Email", url: `mailto:${this.data.email}`, icon: iconMap.Email };
        }
        const link = this.data.socialLinks.find((s) => s.name === name);
        if (!link) return null;
        return { name: link.name, url: link.url, icon: iconMap[link.name] || link.name.toLowerCase().replace(/\s+/g, "") };
      })
      .filter(Boolean)
      .map((social) => `
        <a href="${social.url}" target="_blank" rel="noopener noreferrer" class="social-list-link" aria-label="${social.name}">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${social.icon}.svg" alt="${social.name}" class="social-logo">
          <span>${social.name}</span>
        </a>
      `)
      .join("");

    return `
      <section class="panel panel-meta page-content">
        <p class="section-kicker">ABOUT</p>
        <div class="meta-section">
          <p class="about-bio">I'm a Software Engineering student @ <a href="${this.data.roleLine.link.url}" target="_blank" rel="noopener noreferrer">University of Waterloo</a>${this.data.roleLine.link.logo ? `<img src="${this.data.roleLine.link.logo}" alt="University of Waterloo" class="school-logo">` : ""} interested in applied AI/ML, bio/health tech, and full-stack/app/game development. I believe in learning by doing, evolving by shipping and iterating software to solve real-world problems.</p>
          <p class="about-bio">Currently, I'm at <span class="demo-toggle-group" id="demo-toggle"><span class="demo-play-btn" aria-label="Play demo"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="demo-toggle-name">Thesis</span><img src="/assets/logos/thesislabs.png" alt="Thesis" class="school-logo"></span> as a Member of Technical Staff Intern to help accelerate AI R&D for the good of all.</p>
          <p class="about-bio">Feel free to reach out to chat about anything :)</p>
        </div>
      </section>

      <section class="panel panel-location page-content">
        <p class="section-kicker">LOCATION</p>
        <p class="location-text">${this.data.location}</p>
      </section>

      <section class="panel panel-socials page-content">
        <p class="section-kicker">SOCIALS</p>
        <div class="social-list">
          ${socialItems}
        </div>
        <div class="webring-widget" aria-label="SE '30 Webring">
          <a href="https://se30webring.com?from=https://wcagas.com&dir=prev" aria-label="Previous site" style="text-decoration: none; color: #FFCE1A; font-size: 1.15rem; line-height: 1; display: flex; align-items: center;">←</a>
          <a href="https://se30webring.com" target="_blank" rel="noopener noreferrer" aria-label="SE '30 Webring" style="text-decoration: none; display: flex; align-items: center;">
            <img src="https://se30webring.com/assets/icon-yellow.svg" alt="SE '30 Webring" style="width: 22px; height: 22px;" />
          </a>
          <a href="https://se30webring.com?from=https://wcagas.com&dir=next" aria-label="Next site" style="text-decoration: none; color: #FFCE1A; font-size: 1.15rem; line-height: 1; display: flex; align-items: center;">→</a>
        </div>
      </section>
      ${this.renderFooter()}
    `;
  }

  renderWork() {
    const roleItems = this.data.mainRoles.map((item) => {
      const companyHtml = item.companies
        ? item.companies.map((company) => `<a href="${company.url}" target="_blank" rel="noopener noreferrer">${company.name}</a>${this.logoHtml(company.logo, company.name)}`).join('<span class="meta-separator" style="margin: 0 4px;">x</span>')
        : (item.url
          ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.company}</a>${this.logoHtml(item.logo, item.company)}`
          : `${item.company}`);
      const statsHtml = (item.stats && item.stats.length)
        ? item.stats.map((stat) => `<p class="work-detail">${stat}</p>`).join("")
        : "";
      return `
        <article class="work-item">
          <div class="work-header">
            <p class="work-title">${companyHtml}</p>
            <p class="work-role">${item.role}</p>
          </div>
          ${statsHtml}
        </article>
      `;
    }).join("");

    const communityItems = this.data.communityHighlights.map((item) => {
      const companyHtml = item.url
        ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.company}</a>${this.logoHtml(item.logo, item.company)}`
        : `${item.company}`;
      const statsHtml = (item.stats && item.stats.length)
        ? `<p class="work-detail">${item.stats[0]}</p>`
        : "";
      const roleHtml = item.role ? `<p class="work-role">${item.role}</p>` : "";
      return `
        <article class="work-item">
          <div class="work-header">
            <p class="work-title">${companyHtml}</p>
            ${roleHtml}
          </div>
          ${statsHtml}
        </article>
      `;
    }).join("");

    return `
      <section class="panel panel-main-roles page-content">
        <p class="section-kicker">WORK</p>
        <div class="work-list">
          ${roleItems}
        </div>
      </section>

      <section class="panel panel-community page-content">
        <p class="section-kicker">COMMUNITY</p>
        <div class="work-list">
          ${communityItems}
        </div>
      </section>
      ${this.renderFooter()}
    `;
  }

  renderProjects() {
    const projectItems = this.data.projectHighlights
      .map((project) => `
        <article class="project-item">
          <p class="project-title"><a href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title}</a>${this.logoHtml(project.logo, project.title)}</p>
          <p class="project-detail">${project.detail}</p>
        </article>
      `)
      .join("");

    const researchItems = this.data.researchHighlights
      .map((paper) => `
        <article class="project-item">
          <p class="project-title"><a href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.title}</a>${this.logoHtml(paper.logo, paper.title)}</p>
          <p class="project-detail">${paper.venue} ${paper.note}</p>
        </article>
      `)
      .join("");



    return `
      <section class="panel panel-projects page-content">
        <p class="section-kicker">BUILDS</p>
        <div class="projects-layout">
          <div class="projects-list">
            ${projectItems}
          </div>
        </div>
      </section>

      <section class="panel panel-research page-content">
        <p class="section-kicker">RESEARCH</p>
        <div class="projects-list">
          ${researchItems}
        </div>
      </section>
      ${this.renderFooter()}
    `;
  }

  renderArchive() {
    const pressItems = (this.data.press || [])
      .map((item) => `
        <div class="press-item">
          <p class="press-outlet">
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="${item.title.replace(/"/g, "&quot;")}">${item.outlet}</a>${this.logoHtml(item.logo, item.outlet)}
          </p>
          ${item.date ? `<span class="press-date">${item.date}</span>` : ""}
        </div>
      `)
      .join("");

    // Photos carousel
    const photos = this.data.archiveData?.photos ?? [];
    const renderPhotoSlide = (photo) => {
      const objectStyle = photo.objectPosition ? `object-position: ${photo.objectPosition};` : "";
      return `
        <figure class="photo-carousel-item">
          <div class="photo-carousel-frame">
            <img src="${photo.image}" alt="${this.escapeHtml(photo.caption)}" class="photo-carousel-img"${objectStyle ? ` style="${objectStyle}"` : ""} loading="eager" decoding="async">
          </div>
          <figcaption class="photo-carousel-caption">${this.escapeHtml(photo.caption)}</figcaption>
        </figure>
      `;
    };
    const slidesHtml = photos.map(renderPhotoSlide).join("");
    const photoGalleryHtml = photos.length > 0
      ? `
        <div class="photo-carousel-nav" role="group" aria-label="Photo gallery">
          <button type="button" class="photo-nav photo-nav-prev" aria-label="Previous photo"><span class="photo-nav-icon" aria-hidden="true">‹</span></button>
          <div class="photo-strip" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Photos">
            <div class="photo-strip-inner">
              ${slidesHtml}
            </div>
          </div>
          <button type="button" class="photo-nav photo-nav-next" aria-label="Next photo"><span class="photo-nav-icon" aria-hidden="true">›</span></button>
        </div>
      `
      : "";

    // Videos
    const videos = this.data.archiveData?.videos ?? [];
    const videoItems = videos.map((v) => {
      let embedHtml = "";
      if (v.type === "youtube") {
        embedHtml = `<iframe src="https://www.youtube.com/embed/${v.videoId}" title="${this.escapeHtml(v.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="video-iframe"></iframe>`;
      } else if (v.type === "iframe") {
        embedHtml = `<iframe src="${v.embedSrc}" title="${this.escapeHtml(v.title)}" frameborder="0" allowfullscreen class="video-iframe"></iframe>`;
      }
      return `
        <div class="video-item">
          <div class="video-frame">
            ${embedHtml}
          </div>
          <p class="video-caption">${this.escapeHtml(v.caption)}</p>
        </div>
      `;
    }).join("");

    // Playlists
    const playlists = this.data.archiveData?.playlists ?? [];
    const playlistItems = playlists.map((p) => `
      <div class="playlist-item">
        <iframe style="border-radius:12px" src="${p.embedSrc}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
      </div>
    `).join("");

    return `
      <section class="panel panel-press page-content">
        <p class="section-kicker">PRESS</p>
        <div class="press-list">
          ${pressItems}
        </div>
      </section>

      ${photoGalleryHtml ? `
      <section class="panel panel-photos page-content">
        <p class="section-kicker">PHOTOS</p>
        <div class="photo-carousel">
          ${photoGalleryHtml}
        </div>
      </section>
      ` : ""}

      ${videoItems ? `
      <section class="panel panel-videos page-content">
        <p class="section-kicker">VIDEOS</p>
        <div class="videos-list">
          ${videoItems}
        </div>
      </section>
      ` : ""}

      ${playlistItems ? `
      <section class="panel panel-playlists page-content">
        <p class="section-kicker">PLAYLISTS</p>
        <div class="playlists-list">
          ${playlistItems}
        </div>
      </section>
      ` : ""}
      ${this.renderFooter()}
    `;
  }
}

/**
 * Application Initialization
 */
class App {
  constructor() {
    this.content = new Content();
    this.headerEl = null;
    this.contentRoot = null;
  }

  init() {
    const main = document.querySelector('main');
    if (!main) return;

    this.contentRoot = main.querySelector('#content-root');

    // Insert header once (will be updated for active nav state)
    this.headerEl = document.createElement('div');
    this.headerEl.id = 'site-header-wrapper';
    main.insertBefore(this.headerEl, main.firstChild);

    const routes = [
      { path: "/", render: () => this.content.renderHome() },
      { path: "/work", render: () => this.content.renderWork() },
      { path: "/projects", render: () => this.content.renderProjects() },
      { path: "/archive", render: () => this.content.renderArchive() }
    ];

    this.router = new Router(routes, (route) => this.onNavigate(route));
    this.router.resolve();

    this.initGlobalCounter();
  }

  initGlobalCounter() {
    // --- Goose clicker UI hidden for now ---
    // The button, counter badge, label, and click-to-pet logic are
    // commented out. The flying goose auto-spawn remains active.

    let geese = [];
    let gooseIdCounter = 0;
    let isAnimating = false;

    let lastTime = 0;

    const animateGeese = (timestamp) => {
      if (geese.length === 0) {
        isAnimating = false;
        lastTime = 0;
        return;
      }

      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;

      // Base math was designed for 60fps (16.66ms per frame). Multiply by ratio so 144hz/120hz monitors scale down per-frame movement
      const timeScale = deltaTime / 16.666;

      geese = geese.filter(goose => {
        goose.x += goose.velocityX * timeScale;
        goose.y += goose.velocityY * timeScale;

        goose.element.style.left = `${goose.x}px`;
        goose.element.style.top = `${goose.y}px`;

        // Deletion bounds are safely wider than spawn offset so it doesn't instantly delete
        const isOutOfBounds = goose.x > window.innerWidth + 300 || goose.x < -300 || goose.y > window.innerHeight + 300 || goose.y < -300;

        if (isOutOfBounds) {
          goose.element.remove();
          return false;
        }
        return true;
      });
      requestAnimationFrame(animateGeese);
    };

    const launchFlyingGoose = () => {
      const side = Math.floor(Math.random() * 4);
      let startX, startY, angle;
      const speed = 5 + Math.random() * 5;

      // Spawn slightly off-screen (150px)
      if (side === 0) { // Top
        startX = Math.random() * window.innerWidth;
        startY = -150;
        angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
      } else if (side === 1) { // Right
        startX = window.innerWidth + 150;
        startY = Math.random() * window.innerHeight;
        angle = Math.PI + (Math.random() - 0.5) * Math.PI / 2;
      } else if (side === 2) { // Bottom
        startX = Math.random() * window.innerWidth;
        startY = window.innerHeight + 150;
        angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 2;
      } else { // Left
        startX = -150;
        startY = Math.random() * window.innerHeight;
        angle = (Math.random() - 0.5) * Math.PI / 2;
      }

      const scaleY = Math.cos(angle) < 0 ? -1 : 1;

      const gooseEl = document.createElement('div');
      gooseEl.className = 'flying-goose';
      gooseEl.setAttribute('aria-hidden', 'true');
      gooseEl.style.left = `${startX}px`;
      gooseEl.style.top = `${startY}px`;
      gooseEl.style.transform = `rotate(${angle}rad) scaleY(${scaleY})`;

      const imgEl = document.createElement('img');
      imgEl.className = 'goose-spritesheet';
      imgEl.src = '/assets/goose-sprite.png';
      imgEl.alt = 'Flying Goose';

      gooseEl.appendChild(imgEl);
      document.body.appendChild(gooseEl);

      geese.push({
        id: gooseIdCounter++,
        x: startX,
        y: startY,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        element: gooseEl
      });

      if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(animateGeese);
      }
    };

    // Auto-spawn geese every 30 seconds (provided tab is active)
    setInterval(() => {
      if (!document.hidden) launchFlyingGoose();
    }, 30000);
  }

  onNavigate(route) {
    const path = window.location.pathname;

    // Update header with active nav state
    this.headerEl.innerHTML = this.content.renderNav(path);

    // Render page content with fade-in
    if (this.contentRoot) {
      this.contentRoot.classList.remove('page-fade-in');
      this.contentRoot.innerHTML = route.render();
      // Trigger reflow then add animation class
      void this.contentRoot.offsetHeight;
      this.contentRoot.classList.add('page-fade-in');
    }

    // Scroll to top on navigation
    window.scrollTo(0, 0);

    // Re-init interactive features
    this.initMilestoneStats();
    this.initPhotoGalleryNav();
    this.initDemoToggle();
  }

  initDemoToggle() {
    const toggle = document.getElementById('demo-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      // Create modal if it doesn't exist yet
      let modal = document.getElementById('demo-lightbox');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'demo-lightbox';
        modal.className = 'demo-lightbox';
        modal.innerHTML = `
          <div class="demo-lightbox-backdrop"></div>
          <div class="demo-lightbox-content">
            <button class="demo-lightbox-close" aria-label="Close">✕</button>
            <video
              class="demo-video"
              muted
              loop
              playsinline
              preload="metadata"
            >
              <source src="/assets/thesis.mov" type="video/mp4" />
            </video>
            <a href="https://thesislabs.ai/" target="_blank" rel="noopener noreferrer" class="demo-lightbox-link">thesislabs.ai<span style="display:inline-block; vertical-align:-0.15em; margin-left: 4px;"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M7 7h8.586L5.293 17.293l1.414 1.414L17 8.414V17h2V5H7v2z"/></svg></span></a>
          </div>
        `;
        document.body.appendChild(modal);

        // Close handlers
        const close = () => {
          modal.classList.remove('is-open');
          const video = modal.querySelector('video');
          if (video) video.pause();
          setTimeout(() => { modal.style.display = 'none'; }, 300);
        };
        modal.querySelector('.demo-lightbox-backdrop').addEventListener('click', close);
        modal.querySelector('.demo-lightbox-close').addEventListener('click', close);
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
        });
      }

      // Open
      modal.style.display = 'flex';
      void modal.offsetHeight;
      modal.classList.add('is-open');
      const video = modal.querySelector('video');
      if (video) video.play().catch(() => { });
    });
  }

  /**
   * Arrow buttons; translate by one slide width. Logical pages use maxIndex = n - visibleCount
   * so the viewport stays full. For smooth infinite wrap, clones bookend the strip: [clone][orig][clone];
   * offset n..n+maxIndex addresses originals; wrapping animates into the adjacent clone run then resets.
   */
  initPhotoGalleryNav() {
    const root = document.querySelector(".photo-carousel-nav");
    if (!root) return;

    const inner = root.querySelector(".photo-strip-inner");
    const initialItems = inner ? inner.querySelectorAll(".photo-carousel-item") : [];
    const prevBtn = root.querySelector(".photo-nav-prev");
    const nextBtn = root.querySelector(".photo-nav-next");
    const strip = root.querySelector(".photo-strip");

    const n = initialItems.length;
    if (!inner || !prevBtn || !nextBtn || n === 0) return;

    if (n === 1) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      prevBtn.setAttribute("aria-hidden", "true");
      nextBtn.setAttribute("aria-hidden", "true");
      return;
    }

    const originals = Array.from(initialItems);
    const lead = document.createDocumentFragment();
    const trail = document.createDocumentFragment();
    for (const el of originals) {
      lead.appendChild(el.cloneNode(true));
      trail.appendChild(el.cloneNode(true));
    }
    inner.insertBefore(lead, inner.firstChild);
    inner.appendChild(trail);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let offset = n;
    let pendingWrap = null;
    let busy = false;

    const getVisibleCount = () => {
      if (!strip) return 1;
      const raw = getComputedStyle(strip).getPropertyValue("--photo-slides-visible").trim();
      const k = parseInt(raw, 10);
      if (!Number.isFinite(k) || k < 1) return 1;
      return Math.min(k, n);
    };

    const getMaxIndex = () => Math.max(0, n - getVisibleCount());

    const updateNavState = () => {
      const maxIdx = getMaxIndex();
      const hideNav = maxIdx === 0;
      prevBtn.disabled = hideNav;
      nextBtn.disabled = hideNav;
      if (hideNav) {
        prevBtn.setAttribute("aria-hidden", "true");
        nextBtn.setAttribute("aria-hidden", "true");
      } else {
        prevBtn.removeAttribute("aria-hidden");
        nextBtn.removeAttribute("aria-hidden");
      }
    };

    const clampOffset = () => {
      const maxIdx = getMaxIndex();
      let logical = offset - n;
      logical = Math.max(0, Math.min(maxIdx, logical));
      offset = n + logical;
    };

    const getStep = () => {
      if (inner.children.length < 2) {
        return strip ? Math.max(1, strip.clientWidth) : 1;
      }
      const a = inner.children[0].getBoundingClientRect();
      const b = inner.children[1].getBoundingClientRect();
      return Math.max(1, Math.round(b.left - a.left));
    };

    const syncNavCenter = () => {
      const leftEl = inner.children[offset];
      const frame = leftEl?.querySelector?.(".photo-carousel-frame");
      if (!frame) return;
      const navRect = root.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      if (frameRect.height < 2) return;
      const y = frameRect.top - navRect.top + frameRect.height / 2;
      root.style.setProperty("--photo-nav-center", `${Math.round(y * 10) / 10}px`);
    };

    const apply = (instant) => {
      const step = getStep();
      const useInstant = instant || reduceMotion;
      if (useInstant) {
        inner.style.transition = "none";
      } else {
        inner.style.transition = "transform 0.35s ease";
      }
      inner.style.transform = `translate3d(${-offset * step}px, 0, 0)`;
      if (useInstant) {
        void inner.offsetHeight;
        inner.style.transition = reduceMotion ? "none" : "transform 0.35s ease";
      }
    };

    const finishWrap = () => {
      const kind = pendingWrap;
      pendingWrap = null;
      if (!kind) return;
      const maxIdx = getMaxIndex();
      if (kind === "forward") {
        offset = n;
      } else if (kind === "backward") {
        offset = n + maxIdx;
      }
      apply(true);
    };

    let wrapFallbackTimer = null;
    inner.addEventListener(
      "transitionend",
      (e) => {
        if (e.target !== inner || e.propertyName !== "transform") return;
        if (wrapFallbackTimer) {
          clearTimeout(wrapFallbackTimer);
          wrapFallbackTimer = null;
        }
        if (pendingWrap) {
          finishWrap();
        }
        busy = false;
      },
      false
    );

    const go = (delta) => {
      const maxIdx = getMaxIndex();
      if (maxIdx === 0 || busy) return;
      const v = getVisibleCount();

      if (reduceMotion) {
        let logical = offset - n;
        if (delta === 1) {
          logical = logical >= maxIdx ? 0 : logical + 1;
        } else {
          logical = logical <= 0 ? maxIdx : logical - 1;
        }
        offset = n + logical;
        apply(true);
        return;
      }

      busy = true;
      if (delta === 1) {
        if (offset < n + maxIdx) {
          offset += 1;
          apply(false);
        } else {
          pendingWrap = "forward";
          offset += v;
          apply(false);
          wrapFallbackTimer = window.setTimeout(() => {
            wrapFallbackTimer = null;
            if (pendingWrap) finishWrap();
            busy = false;
          }, 450);
        }
      } else if (offset > n) {
        offset -= 1;
        apply(false);
      } else {
        pendingWrap = "backward";
        offset -= v;
        apply(false);
        wrapFallbackTimer = window.setTimeout(() => {
          wrapFallbackTimer = null;
          if (pendingWrap) finishWrap();
          busy = false;
        }, 450);
      }
    };

    prevBtn.addEventListener("click", () => go(-1));
    nextBtn.addEventListener("click", () => go(1));

    const onKey = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      }
    };
    strip.addEventListener("keydown", onKey);

    const remeasure = () => {
      pendingWrap = null;
      if (wrapFallbackTimer) {
        clearTimeout(wrapFallbackTimer);
        wrapFallbackTimer = null;
      }
      busy = false;
      clampOffset();
      updateNavState();
      syncNavCenter();
      apply(true);
    };
    window.addEventListener("resize", remeasure, { passive: true });
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(remeasure).observe(strip);
    }

    inner.querySelectorAll(".photo-carousel-img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", remeasure, { passive: true });
    });

    requestAnimationFrame(() => {
      remeasure();
      requestAnimationFrame(remeasure);
    });
  }

  initMilestoneStats() {
    const items = Array.from(document.querySelectorAll('.timeline-item[data-has-stats="true"]'));
    const collapseAll = () => {
      items.forEach((item) => {
        item.classList.remove('expanded');
        const trigger = item.querySelector('.timeline-main');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    };

    items.forEach((item) => {
      const trigger = item.querySelector('.timeline-main');
      if (!trigger) return;

      const toggle = () => {
        const willExpand = !item.classList.contains('expanded');
        collapseAll();
        if (willExpand) {
          item.classList.add('expanded');
          trigger.setAttribute('aria-expanded', 'true');
        }
      };

      trigger.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        toggle();
      });
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
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
