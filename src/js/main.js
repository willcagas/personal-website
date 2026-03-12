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
