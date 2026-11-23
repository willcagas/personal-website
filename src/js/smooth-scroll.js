/**
 * Eased wheel and trackpad scrolling (Lenis): each scroll glides to a stop
 * instead of landing at once. Touch keeps the phone's own scrolling, reduced
 * motion keeps everything native, and scrollable boxes inside the page (the
 * contents sidebar, wide code and math) still scroll on their own.
 */

const LENIS = 'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.mjs';

let lenis = null;

export async function initSmoothScroll() {
  try {
    const { default: Lenis } = await import(LENIS);
    // lerp: how much of the remaining distance each frame covers; lower glides longer
    lenis = new Lenis({ lerp: 0.16, allowNestedScroll: true, autoRaf: true });
  } catch (err) {
    console.warn('Smooth scrolling unavailable, using native scrolling:', err);
  }
}

/** Drop any glide still in progress, so a jump the page makes itself isn't pulled back. */
export function stopGlide() {
  lenis?.reset();
}
