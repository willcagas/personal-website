/**
 * Navigation Bar Component
 * 
 * Creates a clean, minimal navigation bar with smooth scrolling.
 * Replace navigation links with your actual sections.
 */

class NavBar {
  constructor() {
      this.navItems = [
        { label: 'Home', href: '#home' },
        { label: 'About', href: '#about' },
        { label: 'Highlights', href: '#projects' },
        { label: 'Archive', href: '#archive' }
        // { label: 'Personal', href: '#personal' }
      ];
  }

  render() {
    return `
      <nav class="navbar" role="navigation" aria-label="Main navigation">
        <div class="navbar-container">
          <a href="/" class="navbar-logo" id="navbar-logo">William Cagas</a>
          <div class="navbar-right">
            <ul class="navbar-menu" id="navbar-menu">
              ${this.navItems.map(item => `
                <li class="navbar-item">
                  <a href="${item.href}" class="navbar-link nav-link">${item.label}</a>
                </li>
              `).join('')}
            </ul>
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
            <button class="navbar-toggle" id="navbar-toggle" aria-label="Toggle navigation" aria-expanded="false">
              <span class="navbar-toggle-icon"></span>
              <span class="navbar-toggle-icon"></span>
              <span class="navbar-toggle-icon"></span>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  init() {
    // Logo click handler - scroll to top without changing URL
    const logo = document.getElementById('navbar-logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Mobile menu toggle
    const toggle = document.getElementById('navbar-toggle');
    const menu = document.getElementById('navbar-menu');
    
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        menu.classList.toggle('navbar-menu-active');
        toggle.classList.toggle('navbar-toggle-active');
      });
    }

    // Close mobile menu when clicking a link
    const navLinks = document.querySelectorAll('.navbar-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 640) {
          menu.classList.remove('navbar-menu-active');
          toggle.classList.remove('navbar-toggle-active');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }
}

export default NavBar;

