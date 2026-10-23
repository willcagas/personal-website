/**
 * History-API router. Routes are { path, render } or { match(path), render };
 * unknown paths fall back to the first route. Links opt in with data-route.
 */
export class Router {
  constructor(routes, onNavigate) {
    this.routes = routes;
    this.onNavigate = onNavigate;

    window.addEventListener('popstate', () => this.resolve());
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      const path = link?.getAttribute('href');
      if (!path || path.startsWith('#')) return;
      e.preventDefault();
      if (path !== window.location.pathname) {
        window.history.pushState(null, '', path);
        this.resolve();
      }
    });
  }

  match(path) {
    return this.routes.find((r) => r.path === path)
      || this.routes.find((r) => r.match?.(path))
      || this.routes[0];
  }

  resolve() {
    const path = window.location.pathname;
    this.onNavigate(this.match(path), path);
  }
}
