/**
 * Markdown → HTML for posts (marked, loaded on first use), plus KaTeX for the
 * math inside them, highlight.js for the code and heading ids for the contents sidebar.
 */

const MARKED = 'https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js';
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.21/dist';
const HLJS = 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.12.0/es';

// The languages a ``` fence can name, and the highlight.js grammar each one loads.
// A fence with any other name, or none, stays in plain ink.
const CODE_LANGUAGES = { python: 'python', py: 'python', yaml: 'yaml', yml: 'yaml', bash: 'bash', sh: 'bash', shell: 'bash' };

let parse = null;
let katexReady = null;
let hljsReady = null;

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

// highlight.js's Python grammar leaves calls and named arguments as plain text, and so most of a
// line of PyTorch in one colour. These are the three kinds of name the pass below picks out:
// a named argument (`dim=`, after a bracket or comma), `self`, and a call (`topk(`).
const PYTHON_NAMES = /(^|[(,]\s*)([A-Za-z_]\w*)(?==(?!=))|\b(self|cls)\b|\b([A-Za-z_]\w*)(?=\()/g;

/** Mark the calls, named arguments and `self` that highlight.js left as plain text in a Python block. */
function markPythonNames(code) {
  const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
  const plain = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // Code proper only: not the insides of strings, comments, decorators or tokens already marked
    if (node.parentElement === code || node.parentElement.matches('.hljs-params, .hljs-subst')) plain.push(node);
  }
  plain.forEach((node) => {
    const text = node.data;
    // A name at the very start of a node is an argument only as a signature's first parameter
    const opensParams = node.parentElement.matches('.hljs-params') && !node.previousSibling;
    const parts = document.createDocumentFragment();
    let at = 0;
    for (const m of text.matchAll(PYTHON_NAMES)) {
      const [, before, argument, self, call] = m;
      if (argument && before === '' && !opensParams) continue;
      const name = argument ?? self ?? call;
      const start = m.index + (before?.length ?? 0);
      const span = document.createElement('span');
      span.className = argument ? 'code-argument' : self ? 'hljs-variable language_' : 'code-call';
      span.textContent = name;
      parts.append(text.slice(at, start), span);
      at = start + name.length;
    }
    if (!at) return;
    parts.append(text.slice(at));
    node.replaceWith(parts);
  });
}

/** Colour the ```python (or yaml, bash) blocks inside an element with highlight.js (loaded on first use). */
export async function highlightCode(el) {
  const blocks = [...el.querySelectorAll('pre > code[class*="language-"]')]
    .map((code) => ({ code, language: CODE_LANGUAGES[code.className.match(/language-([\w-]+)/)?.[1]] }))
    .filter((block) => block.language);
  if (!blocks.length) return;
  try {
    hljsReady ??= import(`${HLJS}/core.min.js`).then((module) => module.default);
    const hljs = await hljsReady;
    for (const language of new Set(blocks.map((block) => block.language))) {
      if (hljs.getLanguage(language)) continue;
      hljs.registerLanguage(language, (await import(`${HLJS}/languages/${language}.min.js`)).default);
    }
    blocks.forEach(({ code, language }) => {
      code.innerHTML = hljs.highlight(code.textContent, { language }).value;
      if (language === 'python') markPythonNames(code);
    });
  } catch {
    // Without the library the code is still readable, just in one colour
    hljsReady = null;
  }
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
