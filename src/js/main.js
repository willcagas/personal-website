/**
 * Main Application Entry Point
 * Simplified single-page design
 * 
 * This is a minimal, content-focused personal website.
 * All content is managed in the Content class data structure.
 */

import ARCHIVE_DATA from './archive-data.js';

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
          stats: ["Creating an agentic environment for AI/ML R&D."]
        },
        {
          companies: [
            { name: "WAT.ai", url: "https://watai.ca", logo: "/assets/logos/watai.png" },
            { name: "Bindwell (YC W25)", url: "https://bindwell.ai/", logo: "/assets/logos/bindwell.png" }
          ],
          role: "Technical PM",
          current: true,
          stats: ["Building AI systems for pesticide regulatory approval."]
        },  
        {
          company: "CMU Xu Lab",
          url: "https://xulabs.github.io/",
          logo: "/assets/logos/cmu.png",
          role: "ML Researcher",
          current: false,
          stats: [
            "Researched DDPMs for accelerating rare disease clinical trials through medical image synthesis.",
          ]
        },
        {
          company: "Algoverse AI Research",
          url: "https://algoverseairesearch.org/",
          logo: "/assets/logos/algoverse.png",
          role: "ML Researcher",
          current: false,
          stats: [
            "Lead author on GAN-based medical imaging research published at GAISynMeD at ACCV 2024."
          ]
        },
        {
          company: "HammerHacks",
          url: "https://hammerhacks2024.wcagas.com",
          logo: "/assets/logos/hammerhacks.png",
          role: "Co-Founder",
          current: false,
          stats: ["140+ participants and $12K in sponsorships from McMaster Engineering, Hack Club, and more."]
        }
      ],
      projectHighlights: [
        {
          title: "Zentro",
          url: "https://joinzentro.com",
          logo: "/assets/logos/zentro-logo.png",
          detail: "300K+ views on X in 24h (most viral project post-Browser Use x YC Web Agents Hackathon)."
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
          detail: "300K+ organic views; featured on Global News."
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
          note: "Oral presentation; cited 9x (incl. ICCV, ACM).",
          url: "https://medgans.wcagas.com",
          logo: "/assets/logos/medgans.png"
        }
      ],
      aboutMeta: "Passionate about AI that solves real-world problems",
      location: "Hamilton | Waterloo | San Francisco",
      // Preserved for future archive section reintroduction.
      archiveData: ARCHIVE_DATA,
      press: [
        {
          outlet: "UW Imprint",
          url: "https://uwimprint.ca/first-year-engineering-students-launch-goose-trials-a-competitive-game-platform/",
          title: "First-year engineering students launch Goose Trials, a competitive game platform",
          date: "Jan. 2026"
        },
        {
          outlet: "Global News",
          url: "https://globalnews.ca/video/11330376/hamilton-teen-develops-app-to-detect-diagnose-acne/",
          title: "Hamilton teen develops app to detect, diagnose acne",
          date: "Aug. 2025"
        },
        {
          outlet: "HWCDSB",
          url: "https://www.hwcdsb.ca/news/2024-2025/hammer_hacks_empowers_hamilton_youth_in_s_t_e_m",
          title: "HammerHacks Empowers Hamilton Youth in STEM",
          date: "Jan. 2025"
        },
        {
          outlet: "The Hamilton Spectator",
          url: "https://www.thespec.com/news/hamilton-region/hamilton-high-schooler-uses-tech-to-solve-problems-from-gaps-in-medical-data-to-teen/article_35dcda17-4b96-5079-90d5-84625c65f254.html",
          title: "Hamilton high schooler uses tech to solve problems — from gaps in medical data to teen acne",
          date: "Jan. 2025"
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
          url: "https://instagram.com/williamcagas"
        }
      ]
    };
  }

  renderNav() {
    return `
      <header class="site-header">
        <div class="header-inner">
          <div class="header-left">
            <h1 class="site-name">${this.data.name}</h1>
            ${this.data.nameSubtitle ? `<p class="site-subtitle">${this.data.nameSubtitle}</p>` : ""}
            <p class="site-role">${this.data.roleLine.prefix}<a href="${this.data.roleLine.link.url}" target="_blank" rel="noopener noreferrer">${this.data.roleLine.link.text}</a>${this.data.roleLine.link.logo ? `<img src="${this.data.roleLine.link.logo}" alt="${this.data.roleLine.link.text}" class="school-logo">` : ""}</p>
          </div>
        </div>
      </header>
    `;
  }

  renderContent() {
    const logoHtml = (src, alt) => src ? `<img src="${src}" alt="${alt}" class="inline-logo">` : "";

    const roleItems = this.data.mainRoles.map((item) => {
      const companyHtml = item.companies
        ? `${item.companies.map((company) => `<a href="${company.url}" target="_blank" rel="noopener noreferrer">${company.name}</a>${logoHtml(company.logo, company.name)}`).join(" x ")}`
        : (item.url
          ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.company}</a>${logoHtml(item.logo, item.company)}`
          : `${item.company}`);
      const statsHtml = (item.stats && item.stats.length)
        ? `<div class="timeline-stats">${item.stats.map((stat) => `<p>${stat}</p>`).join("")}</div>`
        : "";
      return `
        <div class="timeline-item" data-current="${item.current ? "true" : "false"}" data-has-stats="${item.stats ? "true" : "false"}">
          <div class="timeline-main" tabindex="${item.stats ? "0" : "-1"}" role="${item.stats ? "button" : "presentation"}" aria-expanded="false">
            <div class="timeline-dot"></div>
            <div class="timeline-left">${companyHtml}</div>
            <div class="timeline-right">${item.role}</div>
          </div>
          ${statsHtml}
        </div>`;
    }).join("");

    const projectItems = this.data.projectHighlights
      .map((project) => `
        <article class="project-item">
          <p class="project-title"><a href="${project.url}" target="_blank" rel="noopener noreferrer">${project.title}</a>${logoHtml(project.logo, project.title)}</p>
          <p class="project-detail">${project.detail}</p>
        </article>
      `)
      .join("");

    const researchItems = this.data.researchHighlights
      .map((paper) => `
        <article class="research-item">
          <div class="research-main">
            <a href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.title}</a>${logoHtml(paper.logo, paper.title)}
            <p class="research-note">${paper.note}</p>
          </div>
          <p class="research-venue">${paper.venue}</p>
        </article>
      `)
      .join("");

    const pressItems = (this.data.press || [])
      .map((item) => `
        <div class="press-item">
          <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="press-outlet" title="${item.title.replace(/"/g, "&quot;")}">${item.outlet}</a>
          ${item.date ? `<span class="press-date">${item.date}</span>` : ""}
        </div>
      `)
      .join("");

    const photos = this.data.archiveData?.photos ?? [];
    const escapeHtml = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
    const renderPhotoSlide = (photo) => {
      const objectStyle = photo.objectPosition ? `object-position: ${photo.objectPosition};` : "";
      return `
          <figure class="photo-carousel-item">
            <div class="photo-carousel-frame">
              <img src="${photo.image}" alt="${escapeHtml(photo.caption)}" class="photo-carousel-img"${objectStyle ? ` style="${objectStyle}"` : ""} loading="eager" decoding="async">
            </div>
            <figcaption class="photo-carousel-caption">${escapeHtml(photo.caption)}</figcaption>
          </figure>
        `;
    };
    const slidesHtml = photos.map(renderPhotoSlide).join("");
    const photoGalleryHtml =
      photos.length > 0
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
          return {
            name: "Email",
            url: `mailto:${this.data.email}`,
            icon: iconMap.Email
          };
        }
        const link = this.data.socialLinks.find((s) => s.name === name);
        if (!link) return null;
        return {
          name: link.name,
          url: link.url,
          icon: iconMap[link.name] || link.name.toLowerCase().replace(/\s+/g, "")
        };
      })
      .filter(Boolean)
      .map((social) => `
        <a href="${social.url}" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="${social.name}">
          <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${social.icon}.svg" alt="${social.name}" class="social-logo">
        </a>
      `)
      .join("");

    return `
      <section class="panel panel-meta">
        <p class="section-kicker">ABOUT</p>
        <div class="meta-section">
          <p class="meta-inline">
            <span class="meta-about">${this.data.aboutMeta}</span>
            <span class="meta-location">${this.data.location}</span>
          </p>
        </div>
      </section>

      <section class="panel panel-main-roles">
        <p class="section-kicker">Work</p>
        <div class="timeline-section">
          ${roleItems}
        </div>
      </section>

      <section class="panel panel-projects">
        <p class="section-kicker">NOTABLE BUILDS</p>
        <div class="projects-layout">
          <div class="projects-list">
            ${projectItems}
          </div>
        </div>
      </section>

      <section class="panel panel-research">
        <p class="section-kicker">RESEARCH</p>
        <div class="research-list">
          ${researchItems}
        </div>
      </section>

      <section class="panel panel-press">
        <p class="section-kicker">PRESS</p>
        <div class="press-list">
          ${pressItems}
        </div>
      </section>

      ${photoGalleryHtml ? `
      <section class="panel panel-photos">
        <p class="section-kicker">PHOTOS</p>
        <div class="photo-carousel">
          ${photoGalleryHtml}
        </div>
      </section>
      ` : ""}

      <footer class="site-footer">
        <p class="section-kicker">SOCIALS</p>
        <div class="footer-row">
          <div class="footer-socials">
            ${socialItems}
          </div>
          <div class="webring-widget" aria-label="SE '30 Webring">
            <a href="https://se30webring.com?from=https://wcagas.com&dir=prev" aria-label="Previous site" style="text-decoration: none; color: #FFCE1A; font-size: 1.1  5rem; line-height: 1; display: flex; align-items: center;">←</a>
            <a href="https://se30webring.com" target="_blank" rel="noopener noreferrer" aria-label="SE '30 Webring" style="text-decoration: none; display: flex; align-items: center;">
              <img src="https://se30webring.com/assets/icon-yellow.svg" alt="SE '30 Webring" style="width: 22px; height: 22px;" />
            </a>
            <a href="https://se30webring.com?from=https://wcagas.com&dir=next" aria-label="Next site" style="text-decoration: none; color: #FFCE1A; font-size: 1.15rem; line-height: 1; display: flex; align-items: center;">→</a>
          </div>
        </div>
      </footer>
    `;
  }
}

/**
 * Application Initialization
 */
class App {
  constructor() {
    this.content = new Content();
  }

  init() {
    const main = document.querySelector('main');

    if (main) {
      main.insertAdjacentHTML('afterbegin', this.content.renderNav());
      main.insertAdjacentHTML('beforeend', this.content.renderContent());
    }

    this.initMilestoneStats();
    this.initPhotoGalleryNav();
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
