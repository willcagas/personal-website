/**
 * Project Card Component
 * 
 * Displays a single project in a card format.
 * Usage: new ProjectCard(projectData).render()
 */

class ProjectCard {
  constructor(project) {
    this.project = project;
  }

  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  boldNumbers(text) {
    // Bold all numbers (including decimals, percentages, multipliers, etc.)
    // Split by existing strong tags and HTML tags to avoid wrapping content inside tags
    const parts = text.split(/(<strong>.*?<\/strong>|<[^>]+>)/g);
    return parts.map(part => {
      // Skip parts that are HTML tags or already in strong tags
      if (part.startsWith('<strong>') || part.startsWith('<')) {
        return part;
      }
      // Bold numbers in other parts
      return part.replace(/(\d+[.,]?\d*[×x]?[%+]?)/gi, '<strong>$1</strong>');
    }).join('');
  }

  render() {
    const { title, description, liveLink, repoLink, logo } = this.project;
    
    // Handle both string and array descriptions
    const descriptionItems = Array.isArray(description) ? description : [description];
    
    return `
      <article class="project-item">
        <h3 class="project-title">
          ${liveLink ? `
            <a href="${liveLink}" target="_blank" class="project-title-link" rel="noopener noreferrer">
              ${title}
              <svg class="project-external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              ${logo ? `<img src="${logo}" alt="${title}" class="project-logo">` : ''}
            </a>
          ` : `${title}${logo ? `<img src="${logo}" alt="${title}" class="project-logo">` : ''}`}
        </h3>
        <ul class="project-description">
          ${descriptionItems.map(item => {
            // Bold numbers in each item (but don't double-bold if already wrapped in <strong>)
            const processed = this.boldNumbers(item);
            return `<li>${processed}</li>`;
          }).join('')}
        </ul>
        ${repoLink ? `
          <a href="${repoLink}" target="_blank" class="project-link link" rel="noopener noreferrer">Repo →</a>
        ` : ''}
      </article>
    `;
  }
}

export default ProjectCard;

