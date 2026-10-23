import { SITE } from '../site-data.js';

function renderWorkItem({ company, url, role, detail }) {
  return `
    <article class="work-item">
      <div class="work-header">
        <p class="work-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${company}</a></p>
        <p class="work-role">${role}</p>
      </div>
      <p class="work-detail">${detail}</p>
    </article>
  `;
}

export function renderWork() {
  return `
    <section class="panel panel-main-roles page-content">
      <p class="section-kicker">WORK</p>
      <div class="work-list">
        ${SITE.roles.map(renderWorkItem).join('')}
      </div>
    </section>

    <section class="panel panel-community page-content">
      <p class="section-kicker">COMMUNITY</p>
      <div class="work-list">
        ${SITE.community.map(renderWorkItem).join('')}
      </div>
    </section>
  `;
}
