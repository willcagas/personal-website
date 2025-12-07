/**
 * Main Application Entry Point
 * 
 * Initializes all components and sets up the application.
 * Uses ES6 modules for component imports.
 */

import NavBar from '../components/NavBar.js';
import Hero from '../components/Hero.js';
import AboutSection from '../components/AboutSection.js';
import ProjectsSection from '../components/ProjectsSection.js';
import ArchiveSection from '../components/ArchiveSection.js';
// import PersonalSection from '../components/PersonalSection.js';
import Footer from '../components/Footer.js';
import ThemeManager from './theme.js';

/**
 * Smooth Scrolling Handler
 * Handles smooth scrolling for anchor links
 */
class SmoothScroller {
  constructor() {
    this.init();
  }

  init() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetSection = document.getElementById(targetId);
          if (targetSection) {
            // Dynamically get navbar height (works on all devices/screen sizes)
            const navbar = document.querySelector('.navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            
            // Get the section header - this is what we want to see below the navbar
            const sectionHeader = targetSection.querySelector('.section-header');
            const targetElement = sectionHeader || targetSection;
            
            // Wait for next frame to ensure layout is calculated
            requestAnimationFrame(() => {
              // Get current scroll position (works across browsers)
              const currentScroll = window.pageYOffset || window.scrollY || document.documentElement.scrollTop;
              
              // Get the target element's position relative to viewport
              const rect = targetElement.getBoundingClientRect();
              const elementTop = rect.top;
              
              // Calculate target position: current scroll + element position - navbar height
              // Add offset to account for section spacing/padding to fully hide previous section
              const offset = 15; // Accounts for section padding and spacing
              const targetPosition = currentScroll + elementTop - navbarHeight - offset;
              
              window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
              });
            });
          }
        }
      });
    });
  }
}

/**
 * Application Initialization
 */
class App {
  constructor() {
    // Initialize theme manager first (before rendering)
    this.themeManager = new ThemeManager();
    
      this.components = {
        navbar: new NavBar(),
        hero: new Hero(),
        about: new AboutSection(),
        projects: new ProjectsSection(),
        archive: new ArchiveSection(),
        // personal: new PersonalSection(),
        footer: new Footer()
      };
  }

  init() {
    // Render all components
    this.renderComponents();
    
    // Initialize component-specific functionality
    this.components.navbar.init();
    this.initThemeToggle();
    
    // Initialize smooth scrolling after components are rendered
    setTimeout(() => {
      new SmoothScroller();
    }, 100);
  }

  initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.themeManager.toggleTheme();
      });
    }
  }

  renderComponents() {
    // Render NavBar
    const navbarRoot = document.getElementById('navbar-root');
    if (navbarRoot) {
      navbarRoot.innerHTML = this.components.navbar.render();
      // Re-initialize after render to attach event listeners
      setTimeout(() => this.components.navbar.init(), 0);
    }

    // Render Hero
    const heroRoot = document.getElementById('hero-root');
    if (heroRoot) {
      heroRoot.innerHTML = this.components.hero.render();
    }

    // Render About
    const aboutRoot = document.getElementById('about-root');
    if (aboutRoot) {
      aboutRoot.innerHTML = this.components.about.render();
    }

    // Render Projects
    const projectsRoot = document.getElementById('projects-root');
    if (projectsRoot) {
      projectsRoot.innerHTML = this.components.projects.render();
    }

    // Render Archive
    const archiveRoot = document.getElementById('archive-root');
    if (archiveRoot) {
      archiveRoot.innerHTML = this.components.archive.render();
      // Initialize archive carousel functionality
      setTimeout(() => this.components.archive.init(), 0);
    }

    // Render Personal
    // const personalRoot = document.getElementById('personal-root');
    // if (personalRoot) {
    //   personalRoot.innerHTML = this.components.personal.render();
    // }

    // Render Footer
    const footerRoot = document.getElementById('footer-root');
    if (footerRoot) {
      footerRoot.innerHTML = this.components.footer.render();
    }
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

