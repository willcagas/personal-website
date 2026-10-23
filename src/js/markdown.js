/**
 * Markdown → HTML for posts (marked, loaded on first use), plus KaTeX for the
 * math inside them and heading ids for the contents sidebar.
 */

const MARKED = 'https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js';
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist';

let parse = null;
let katexReady = null;

/** Pull $...$ / $$...$$ out so markdown can't mangle LaTeX (e.g. _ subscripts). */
function protectMath(md) {
  const slots = [];
  const stash = (math) => {
    slots.push(math);
    return `@@MATH${slots.length - 1}@@`;
  };
  // Display math first, then inline (non-greedy, same line)
  const text = md.replace(/\$\$[\s\S]+?\$\$/g, stash).replace(/\$[^$\n]+?\$/g, stash);
  return { text, slots };
}

function restoreMath(html, slots) {
  // A function replacer, because a string replacement would turn "$$" into "$"
  return slots.reduce((acc, math, i) => acc.replaceAll(`@@MATH${i}@@`, () => math), html);
}

/** marked leaves raw HTML alone, so turn markdown links inside <figcaption> into <a>. */
function linkFigcaptions(md) {
  return md.replace(/<figcaption>([\s\S]*?)<\/figcaption>/g, (_, inner) => `<figcaption>${
    inner.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  }</figcaption>`);
}

/** Markdown → HTML. External links open in a new tab. */
export async function renderMarkdown(md) {
  if (!parse) {
    const { marked } = await import(MARKED);
    const renderer = new marked.Renderer();
    const defaultLink = renderer.link.bind(renderer);
    renderer.link = (token) => {
      const html = defaultLink(token);
      const href = token?.href;
      const internal = !href || href.startsWith('#') || href.startsWith('/') || href.startsWith('mailto:');
      return internal ? html : html.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
    };
    marked.setOptions({ gfm: true, breaks: false, renderer });
    parse = (src) => {
      const { text, slots } = protectMath(String(src || ''));
      return restoreMath(marked.parse(linkFigcaptions(text)), slots);
    };
  }
  return parse(md);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** Typeset $…$ / $$…$$ inside an element with KaTeX (loaded on first use). */
export async function typesetMath(el) {
  katexReady ??= (async () => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${KATEX}/katex.min.css`;
    document.head.appendChild(css);
    await loadScript(`${KATEX}/katex.min.js`);
    await loadScript(`${KATEX}/contrib/auto-render.min.js`);
  })();
  await katexReady;
  window.renderMathInElement?.(el, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true }
    ],
    throwOnError: false
  });
}

/** Give headings stable ids ("The part I am proudest of" → "the-part-i-am-proudest-of"). */
export function addHeadingIds(root) {
  root.querySelectorAll('h2, h3, h4').forEach((heading) => {
    heading.id ||= heading.textContent.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  });
}
