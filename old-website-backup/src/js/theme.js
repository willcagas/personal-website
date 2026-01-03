/**
 * Theme Manager
 * Handles dark/light mode switching with localStorage persistence
 */

class ThemeManager {
  constructor() {
    this.theme = this.getStoredTheme() || this.getSystemTheme();
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

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  updateToggleButton() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      // The icon visibility is handled by CSS based on data-theme attribute
      toggleBtn.setAttribute('aria-label', `Switch to ${this.theme === 'light' ? 'dark' : 'light'} mode`);
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

