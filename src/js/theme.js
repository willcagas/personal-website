/**
 * Theme Manager
 * Handles dark/light mode switching with localStorage persistence
 */

class ThemeManager {
  constructor() {
    this.theme = this.getStoredTheme() || 'dark';
    this.isTransitioning = false;
    this.init();
  }

  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  }

  setStoredTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.warn('Could not save theme preference');
    }
  }

  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this.setStoredTheme(theme);
    this.updateToggleButton();
  }

  async toggleTheme(triggerEl = null) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasViewTransition = typeof document.startViewTransition === 'function';

    // Fallback if reduced motion or API unsupported
    if (reduceMotion || !hasViewTransition) {
      this.setTheme(newTheme);
      this.isTransitioning = false;
      return;
    }

    const rect = triggerEl ? triggerEl.getBoundingClientRect() : null;
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth - 32;
    const originY = rect ? rect.top + rect.height / 2 : 32;

    // Radius needed to cover viewport from toggle origin
    const dx = Math.max(originX, window.innerWidth - originX);
    const dy = Math.max(originY, window.innerHeight - originY);
    const endRadius = Math.ceil(Math.hypot(dx, dy));
    const origin = `${originX}px ${originY}px`;

    try {
      const transition = document.startViewTransition(() => {
        this.setTheme(newTheme);
      });

      await transition.ready;

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${origin})`,
            `circle(${endRadius}px at ${origin})`
          ]
        },
        {
          duration: 560,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );

      await transition.finished;
    } catch (error) {
      // Graceful fallback in case the transition fails at runtime
      this.setTheme(newTheme);
    } finally {
      this.isTransitioning = false;
    }
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      const switchTo = this.theme === 'light' ? 'dark' : 'light';
      toggleBtn.setAttribute('aria-label', `Switch to ${switchTo} mode`);
      toggleBtn.innerHTML = switchTo === 'dark'
        ? `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
        : `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
  }

  init() {
    // Set initial theme
    this.setTheme(this.theme);

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Only update if user hasn't set a preference
        if (!this.getStoredTheme()) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }
}

export default ThemeManager;

