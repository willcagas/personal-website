import { SITE } from '../site-data.js';
import { getResearchPosts } from '../writings.js';
import { renderPostListItem } from './shared.js';

/** Builds: projects, then papers. */
export function renderProjects() {
  const projects = SITE.projects.map(({ title, url, detail }) => `
    <article class="project-item">
      <p class="project-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></p>
      <p class="project-detail">${detail}</p>
    </article>
  `).join('');
  const papers = getResearchPosts().map(renderPostListItem).join('');

  return `
    <section class="panel panel-projects page-content">
      <p class="section-kicker">BUILDS</p>
      <div class="projects-layout">
        <div class="projects-list">
          ${projects}
        </div>
      </div>
    </section>

    <section class="panel page-content">
      <p class="section-kicker">PAPERS</p>
      <div class="projects-list">
        ${papers || '<p class="blog-soon">No papers yet.</p>'}
      </div>
    </section>
  `;
}
