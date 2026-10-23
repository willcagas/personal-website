/**
 * Main Application Entry Point
 * Multi-page SPA with client-side routing
 * 
 * Routes: / (Home), /work, /projects, /archive
 * All content is managed in the Content class data structure.
 */

import ARCHIVE_DATA from './archive-data.js?v=17';
import { initGameOfLife } from './game-of-life.js?v=7';
import { initTitleCard } from './title-card.js?v=4';
import { initRangeFooter } from './range-footer.js';
import { mountArticleFigures } from './article-figures.js?v=3';
import {
  getBlogPosts,
  getResearchPosts,
  getWriting,
  canReadWriting,
  loadWritingBody
} from './writings.js?v=17';

let markedParse = null;
let katexReady = null;

/** Pull $...$ / $$...$$ out so markdown can't mangle LaTeX subscripts (_..._). */
function protectMath(md) {
  const slots = [];
  const stash = (match) => {
    const key = `@@MATH${slots.length}@@`;
    slots.push(match);
    return key;
  };
  // Display math first, then inline (non-greedy, same-line)
  let text = md.replace(/\$\$[\s\S]+?\$\$/g, stash);
  text = text.replace(/\$[^$\n]+?\$/g, stash);
  return { text, slots };
}

function restoreMath(html, slots) {
  // Use a function replacer — string replace treats "$$" as a single "$".
  return slots.reduce(
    (acc, math, i) => acc.replaceAll(`@@MATH${i}@@`, () => math),
    html
  );
}

/** Marked does not parse markdown inside raw HTML — convert caption links to <a>. */
function hydrateFigcaptionLinks(md) {
  return String(md || '').replace(/<figcaption>([\s\S]*?)<\/figcaption>/g, (_, inner) => {
    const fixed = inner.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return `<figcaption>${fixed}</figcaption>`;
  });
}

async function ensureMarked() {
  if (markedParse) return markedParse;
  const { marked } = await import('https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js');
  const renderer = new marked.Renderer();
  const defaultLink = renderer.link.bind(renderer);
  renderer.link = (token) => {
    const html = defaultLink(token);
    const href = typeof token === 'string' ? token : token?.href;
    if (!href || href.startsWith('#') || href.startsWith('/') || href.startsWith('mailto:')) {
      return html;
    }
    return html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
  };
  marked.setOptions({ gfm: true, breaks: false, renderer });
  markedParse = (md) => {
    const { text, slots } = protectMath(md);
    return restoreMath(marked.parse(hydrateFigcaptionLinks(text)), slots);
  };
  return markedParse;
}

function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else existing.addEventListener('load', () => resolve(), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureKatex() {
  if (katexReady) return katexReady;
  katexReady = (async () => {
    loadStylesheet('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/contrib/auto-render.min.js');
  })();
  return katexReady;
}

function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function addHeadingIds(root) {
  root.querySelectorAll('h2, h3, h4').forEach((heading) => {
    if (heading.id) return;
    heading.id = slugifyHeading(heading.textContent);
  });
}

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
      const path = link.getAttribute('href');
      if (!path || path.startsWith('#')) return;
      e.preventDefault();
      if (path !== window.location.pathname) {
        window.history.pushState(null, '', path);
        this.resolve();
      }
    });
  }

  matchRoute(path) {
    return (
      this.routes.find((r) => r.path === path) ||
      this.routes.find((r) => typeof r.match === 'function' && r.match(path)) ||
      this.routes[0]
    );
  }

  resolve() {
    const path = window.location.pathname;
    const route = this.matchRoute(path);
    this.onNavigate(route, path);
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
      mainRoles: [
        {
          company: "Darwin (YC F25)",
          url: "https://darwinrobotics.ai/",
          logo: "/assets/logos/darwin.png",
          role: "Member of Technical Staff (Intern)",
          current: false,
          stats: [
            "δ Helped develop an autonomous AI R&D system that hillclimbs to the frontier (formerly Thesis)."
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
            "Lead a cross-functional team building AI systems for pesticide regulatory approval."
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
      location: `San Francisco | Waterloo | <a href="https://en.wikipedia.org/wiki/Hamilton,_Ontario" target="_blank" rel="noopener noreferrer" class="location-link" title="Hamilton, Ontario, Canada">Hamilton<sup class="location-icon"><svg viewBox="0 0 24 24" width="0.8em" height="0.8em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></sup></a>`,
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
          title: "Hamilton high schooler uses tech to solve problems, from gaps in medical data to teen acne",
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
          name: "Twitter",
          url: "https://x.com/williamcagas"
        }
      ]
    };
  }

  /* ── Helpers ── */

  logoHtml(src, alt) {
    // Logos intentionally omitted — clean underlined text links only.
    return "";
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
      { label: "Builds", path: "/projects" },
      { label: "Archive", path: "/archive" },
      { label: "Writings", path: "/writings" }
    ];
    const navItems = links.map((l) => {
      const onWritings =
        l.path === '/writings' &&
        (currentPath === '/blog' || currentPath.startsWith('/blog/'));
      const active =
        l.path === currentPath ||
        (l.path !== '/' && currentPath.startsWith(l.path + '/')) ||
        onWritings
          ? ' nav-link active'
          : ' nav-link';
      return `<a href="${l.path}" data-route class="${active}" data-text="${l.label}">${l.label}</a>`;
    }).join("");

    return `
      <header class="site-header">
        <div class="header-inner">
          <div class="header-left">
            <img src="/assets/pictures/profile-beach.jpg" alt="William Cagas" class="site-avatar" width="104" height="104" loading="eager" decoding="async">
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
    const socialOrder = ["Email", "GitHub", "LinkedIn", "Twitter"];
    const iconMap = {
      Email: "gmail",
      GitHub: "github",
      LinkedIn: "linkedin",
      Twitter: "x"
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
          <p class="about-bio">I'm a Software Engineering student at the <a href="${this.data.roleLine.link.url}" target="_blank" rel="noopener noreferrer">University of Waterloo</a> interested in applied AI, health/bio tech, and full-stack web/app/game development.</p>
          <p class="about-bio">Previously, I was a Member of Technical Staff (Intern) at <a href="https://darwinrobotics.ai/" target="_blank" rel="noopener noreferrer">Darwin</a>, formerly Thesis (YC F25), working on autonomous AI R&D systems for scientific discovery.</p>
        </div>
      </section>

      <section class="panel panel-location page-content">
        <p class="section-kicker">LOCATION</p>
        <p class="location-text">${this.data.location}</p>
      </section>

      <section class="panel panel-socials page-content">
        <p class="section-kicker">LINKS</p>
        <div class="social-list">
          ${socialItems}
        </div>
      </section>
      ${this.renderFooter()}
    `;
  }

  formatBlogDate(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /** Press-style short date: "Jan. 2026" */
  formatWritingListDate(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    const months = [
      'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.',
      'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /** Word-count reading time from current markdown — updates whenever the body changes. */
  estimateReadingTime(markdown, wpm = 220) {
    const text = String(markdown || '')
      .replace(/\$\$[\s\S]+?\$\$/g, ' ')
      .replace(/\$[^$\n]+?\$/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]+`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/[#>*_~|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = text ? text.split(' ').length : 0;
    return Math.max(1, Math.round(words / wpm));
  }

  renderWritingListItem(post) {
    return `
      <article class="project-item writing-list-item">
        <div class="writing-list-header">
          ${post.comingSoon
            ? `<p class="project-title">${this.escapeHtml(post.title)}</p>
          <span class="writing-list-date">Coming soon</span>`
            : `<p class="project-title"><a href="/writings/${post.slug}" data-route>${this.escapeHtml(post.title)}</a></p>
          <time class="writing-list-date" datetime="${post.date}">${this.formatWritingListDate(post.date)}</time>`}
        </div>
        ${post.summary ? `<p class="project-detail">${this.escapeHtml(post.summary)}</p>` : ''}
      </article>
    `;
  }

  renderWritings() {
    const blogItems = getBlogPosts().map((p) => this.renderWritingListItem(p)).join('');

    return `
      <section class="panel page-content">
        <p class="section-kicker">BLOG</p>
        <div class="projects-list">
          ${blogItems || '<p class="blog-soon">No posts yet.</p>'}
        </div>
      </section>
      ${this.renderFooter()}
    `;
  }

  /** @deprecated */
  renderBlog() {
    return this.renderWritings();
  }

  /** Stop "(YC F25)"-style asides from breaking across lines. */
  keepParensTogether(html) {
    return html.replace(/\(([^)]*)\)/g, '<span class="nowrap">($1)</span>');
  }

  renderPostOverview(overview) {
    if (!overview) return '';
    return `
      <section class="post-overview" aria-label="Overview">
        <div class="post-overview-details">
          <h2 class="post-overview-label">Details</h2>
          <dl>${overview.details.map((d) => `
            <div>
              <dt>${this.escapeHtml(d.label)}</dt>
              <dd>${this.keepParensTogether(this.escapeHtml(d.value))}${d.note ? `<span class="post-overview-note">${this.escapeHtml(d.note)}</span>` : ''}</dd>
            </div>`).join('')}
          </dl>
        </div>
        <div class="post-overview-text">
          <h2 class="post-overview-label" id="overview">Overview</h2>
          <p>${this.escapeHtml(overview.text)}</p>
        </div>
      </section>
    `;
  }

  renderPostHero(hero) {
    if (hero?.kind !== 'title-card') return '';
    return `
      <figure class="blog-hero">
        <div class="title-card" data-title-card data-background="${hero.background || 'life'}">
          <canvas aria-hidden="true"></canvas>
          <div class="title-card-text">
            <p class="title-card-word">${this.escapeHtml(hero.title)}</p>
            ${hero.subtitle ? `<p class="title-card-sub">${this.escapeHtml(hero.subtitle)}</p>` : ''}
          </div>
          <button type="button" class="title-card-toggle" data-hero-toggle data-paused="false" aria-label="Pause animation">
            <svg class="icon-pause" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
            <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </div>
      </figure>
    `;
  }

  renderWritingPost(slug) {
    const post = getWriting(slug);
    if (!post || !canReadWriting(post)) {
      const message = post ? `${this.escapeHtml(post.title)} is coming soon.` : 'Not found.';
      return `
        <section class="panel page-content">
          <p class="section-kicker">WRITINGS</p>
          <p class="blog-soon">${message}</p>
          <p><a href="/writings" data-route class="blog-back">← Writings</a></p>
        </section>
        ${this.renderFooter()}
      `;
    }

    const authorLine = post.authors || this.data.name;

    return `
      <article class="panel page-content blog-post blog-post-layout" data-blog-slug="${this.escapeHtml(post.slug)}">
        <div class="blog-post-main">
          ${post.section === 'research'
            ? '<a href="/projects" data-route class="blog-back">← Builds</a>'
            : '<a href="/writings" data-route class="blog-back">← Writings</a>'}
          <header class="blog-post-header">
            <h1 class="blog-post-title">${this.escapeHtml(post.title)}</h1>
            <p class="blog-post-meta">
              <span class="blog-post-author">${this.escapeHtml(authorLine)}</span>
              <span class="blog-post-meta-sep" aria-hidden="true">·</span>
              <time class="blog-post-date" datetime="${post.date}">${this.formatBlogDate(post.date)}</time>
              <span class="blog-post-meta-sep" aria-hidden="true">·</span>
              <span class="blog-post-readtime" data-blog-readtime>…</span>
            </p>
          </header>
          ${this.renderPostHero(post.hero)}
          ${this.renderPostOverview(post.overview)}
          <div class="blog-post-body" data-blog-body></div>
        </div>
        <aside class="blog-toc" data-blog-toc hidden aria-label="Contents"></aside>
      </article>
      ${this.renderFooter()}
    `;
  }

  /** @deprecated */
  renderBlogPost(slug) {
    return this.renderWritingPost(slug);
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

    const researchItems = getResearchPosts().map((p) => this.renderWritingListItem(p)).join('');

    return `
      <section class="panel panel-projects page-content">
        <p class="section-kicker">BUILDS</p>
        <div class="projects-layout">
          <div class="projects-list">
            ${projectItems}
          </div>
        </div>
      </section>

      <section class="panel page-content">
        <p class="section-kicker">PAPERS</p>
        <div class="projects-list">
          ${researchItems || '<p class="blog-soon">No papers yet.</p>'}
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

    // Favourites: a Letterboxd-style poster row per group (Shows, Movies, ...)
    const favouriteGroups = (this.data.archiveData?.favourites ?? [])
      .filter((group) => group.items.length > 0)
      .map((group) => `
        <div class="favourites-group">
          <p class="subsection-title">${this.escapeHtml(group.title)}</p>
          <div class="poster-grid${group.shape === "square" ? " poster-grid--square" : ""}">
            ${group.items.map((item) => `
              <a class="poster-item" href="${item.url}" target="_blank" rel="noopener noreferrer">
                <div class="poster-frame">
                  <img src="${item.poster}" alt="${this.escapeHtml(item.title)} poster" loading="lazy" decoding="async">
                </div>
                <p class="poster-title">${this.escapeHtml(item.title)}</p>
                ${item.subtitle ? `<p class="poster-subtitle">${this.escapeHtml(item.subtitle)}</p>` : ""}
              </a>
            `).join("")}
          </div>
        </div>
      `)
      .join("");

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

      ${favouriteGroups ? `
      <section class="panel panel-favourites page-content">
        <p class="section-kicker">FAVOURITES</p>
        ${favouriteGroups}
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

    // Site-wide background and footer; they live outside the routed content
    initGameOfLife();
    initRangeFooter();

    // Insert header once (will be updated for active nav state)
    this.headerEl = document.createElement('div');
    this.headerEl.id = 'site-header-wrapper';
    main.insertBefore(this.headerEl, main.firstChild);

    const routes = [
      { path: "/", render: () => this.content.renderHome() },
      { path: "/work", render: () => this.content.renderWork() },
      { path: "/projects", render: () => this.content.renderProjects() },
      { path: "/archive", render: () => this.content.renderArchive() },
      { path: "/writings", render: () => this.content.renderWritings() },
      {
        path: "/writings/:slug",
        match: (path) => /^\/writings\/[^/]+\/?$/.test(path),
        render: (path) => {
          const slug = path.replace(/^\/writings\//, '').replace(/\/$/, '');
          return this.content.renderWritingPost(slug);
        }
      },
      // Legacy /blog aliases
      { path: "/blog", render: () => this.content.renderWritings() },
      {
        path: "/blog/:slug",
        match: (path) => /^\/blog\/[^/]+\/?$/.test(path),
        render: (path) => {
          const slug = path.replace(/^\/blog\//, '').replace(/\/$/, '');
          return this.content.renderWritingPost(slug);
        }
      }
    ];

    this.router = new Router(routes, (route, path) => this.onNavigate(route, path));
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

  onNavigate(route, path = window.location.pathname) {
    // Update header with active nav state
    this.headerEl.innerHTML = this.content.renderNav(path);

    this._blogTocObserver?.disconnect();
    this._blogTocObserver = null;
    document.querySelector('main')?.classList.remove('main-wide');

    // Render page content with fade-in
    if (this.contentRoot) {
      this.contentRoot.classList.remove('page-fade-in');
      this.contentRoot.innerHTML = route.render(path);
      // Trigger reflow then add animation class
      void this.contentRoot.offsetHeight;
      this.contentRoot.classList.add('page-fade-in');
    }

    // Scroll to top on navigation (hash links handled after blog hydrate)
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }

    // Re-init interactive features
    this.initMilestoneStats();
    this.initPhotoGalleryNav();
    initTitleCard();
    mountArticleFigures(null);
    this.initWritingPost();
  }

  async initWritingPost() {
    const body = this.contentRoot?.querySelector('[data-blog-body]');
    const article = this.contentRoot?.querySelector('[data-blog-slug]');
    if (!body || !article) return;

    const slug = article.getAttribute('data-blog-slug');
    const post = getWriting(slug);
    if (!post) return;

    const mainEl = document.querySelector('main');
    mainEl?.classList.add('main-wide');

    try {
      const markdown = await loadWritingBody(slug);
      const readEl = article.querySelector('[data-blog-readtime]');
      if (readEl) readEl.textContent = `${this.content.estimateReadingTime(markdown)} min read`;

      const parse = await ensureMarked();
      body.innerHTML = parse(markdown);
      addHeadingIds(body);
      mountArticleFigures(body);
      this.initBlogToc(article, body);

      const bindInPageNav = (root) => {
        root.querySelectorAll('a[href^="#"]').forEach((anchor) => {
          anchor.addEventListener('click', (e) => {
            const id = decodeURIComponent(anchor.getAttribute('href').slice(1));
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            history.replaceState(null, '', `#${id}`);
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      };
      bindInPageNav(body);
      bindInPageNav(article.querySelector('[data-blog-toc]') || article);

      await ensureKatex();
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      }

      if (window.location.hash) {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('Failed to render blog post:', err);
      body.innerHTML = `<p class="blog-soon">Failed to load post content.</p>`;
    }
  }

  initBlogToc(article, body) {
    const tocEl = article.querySelector('[data-blog-toc]');
    if (!tocEl) return;

    // The post's Overview block sits above the body; list it first, as a section
    const overview = article.querySelector('#overview');
    const headings = [...(overview ? [overview] : []), ...body.querySelectorAll('h2, h3, h4')].filter((h) => {
      const text = h.textContent.trim();
      return text && !/^contents$/i.test(text);
    });

    if (headings.length < 2) {
      tocEl.hidden = true;
      return;
    }

    const items = [];
    let currentGroup = null;
    for (const heading of headings) {
      const level = heading === overview ? 3 : Number(heading.tagName.slice(1));
      const entry = {
        id: heading.id,
        text: heading.textContent.trim(),
        level,
        children: []
      };
      if (level <= 3) {
        currentGroup = entry;
        items.push(entry);
      } else if (currentGroup) {
        currentGroup.children.push(entry);
      } else {
        items.push(entry);
      }
    }

    const renderItem = (item) => {
      const kids = item.children.length
        ? `<ul class="blog-toc-sublist">${item.children.map(renderItem).join('')}</ul>`
        : '';
      return `
        <li class="blog-toc-item" data-toc-level="${item.level}">
          <a href="#${item.id}" class="blog-toc-link" data-toc-link="${item.id}">${this.content.escapeHtml(item.text)}</a>
          ${kids}
        </li>
      `;
    };

    tocEl.hidden = false;
    tocEl.innerHTML = `
      <p class="blog-toc-kicker">Contents</p>
      <nav class="blog-toc-nav">
        <ul class="blog-toc-list">
          ${items.map(renderItem).join('')}
        </ul>
      </nav>
    `;

    const links = [...tocEl.querySelectorAll('[data-toc-link]')];
    const setActive = (id) => {
      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('data-toc-link') === id);
      });
    };

    if (links.length) setActive(links[0].getAttribute('data-toc-link'));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      {
        rootMargin: '-15% 0px -70% 0px',
        threshold: [0, 1]
      }
    );

    headings.forEach((h) => observer.observe(h));
    this._blogTocObserver?.disconnect();
    this._blogTocObserver = observer;
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
