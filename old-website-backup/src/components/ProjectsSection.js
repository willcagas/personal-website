/**
 * Projects Section Component
 * 
 * Displays a grid of project cards.
 * Import projects data and render cards.
 */

import ProjectCard from './ProjectCard.js';
import projects from '../data/projects.js';

class ProjectsSection {
  constructor() {
    this.projects = projects;
  }

  render() {
    return `
      <section id="projects" class="projects-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Highlights</h2>
          </div>
          
          <div class="projects-grid" id="projects-grid">
            ${this.projects.map(project => {
              const card = new ProjectCard(project);
              return card.render();
            }).join('')}
          </div>
        </div>
      </section>
    `;
  }
}

export default ProjectsSection;

