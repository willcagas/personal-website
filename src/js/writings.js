/**
 * Writings index (Blog + Research).
 *
 * Blog:     /content/blog/*.md
 * Research: /content/research/*.md
 *
 * Frontmatter: title, date, slug, summary
 * Research may also set: venue, authors
 */

const BLOG_POSTS = [
  {
    section: "blog",
    slug: "thesis-labs-internship",
    title: "Six Months at Darwin (YC F25)",
    date: "2026-09-19",
    summary:
      "My work, experiences, thoughts, and learnings during my internship for Darwin, previously Thesis Labs.",
    file: "/content/blog/thesis-labs-internship.md",
    comingSoon: true
  },
  {
    section: "blog",
    slug: "llm-driven-evolutionary-ai",
    title: "LLM-driven Evolutionary AI",
    date: "2026-08-03",
    summary:
      "An overview of modern evolutionary AI: the LLM as mutation operator, selection, context, evaluation, and the meta-level turn.",
    file: "/content/blog/llm-driven-evolutionary-ai.md",
    draft: true,
    hidden: true
  }
];

const RESEARCH_POSTS = [
  {
    section: "research",
    slug: "medical-imaging-complexity",
    title: "Medical Imaging Complexity and its Effects on GAN Performance",
    date: "2024-12-12",
    summary:
      "GAISynMeD @ ACCV 2024 (oral presentation); cited 14x including ICCV, ACM.",
    venue: "GAISynMeD @ ACCV 2024",
    authors:
      "William Cagas, Chan Ko, Blake Hsiao, Shryuk Grandhi, Rishi Bhattacharya, Michael Lam, Kevin Zhu",
    file: "/content/research/medical-imaging-complexity.md"
  }
];

const ALL_POSTS = [...BLOG_POSTS, ...RESEARCH_POSTS];
const bodyCache = new Map();

/**
 * Drafts are visible only when developing locally. On the deployed site
 * (wcagas.com, Vercel previews, anything not localhost) they are hidden and
 * their direct URLs resolve to "Not found". Their markdown lives in files that
 * are gitignored, so unfinished prose never ships. `hidden: true` hides a post
 * everywhere, including localhost. `comingSoon: true` lists a post as "Coming
 * soon" without a link; its page stays readable only on localhost.
 */
const IS_DEV =
  typeof location !== "undefined" &&
  (location.hostname === "" ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));

function visible(posts) {
  return posts.filter((p) => !p.hidden && (IS_DEV || !p.draft));
}

function parseFrontmatter(raw) {
  const match = String(raw || "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: String(raw || "").trim() };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body: match[2].trim() };
}

function sortByDate(posts) {
  return [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getBlogPosts() {
  return sortByDate(visible(BLOG_POSTS));
}

export function getResearchPosts() {
  return sortByDate(visible(RESEARCH_POSTS));
}

export function canReadWriting(post) {
  return IS_DEV || !post.comingSoon;
}

export function getWriting(slug) {
  return visible(ALL_POSTS).find((p) => p.slug === slug) || null;
}

/** @deprecated use getWriting */
export function getBlogPost(slug) {
  return getWriting(slug);
}

/** Fetch markdown body for a writing (cached). */
export async function loadWritingBody(slug) {
  if (bodyCache.has(slug)) return bodyCache.get(slug);

  const post = getWriting(slug);
  if (!post?.file) return "";

  const res = await fetch(post.file, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${post.file} (${res.status})`);

  const { meta, body } = parseFrontmatter(await res.text());
  if (meta.title) post.title = meta.title;
  if (meta.date) post.date = meta.date;
  if (meta.summary) post.summary = meta.summary;
  if (meta.venue) post.venue = meta.venue;
  if (meta.authors) post.authors = meta.authors;

  bodyCache.set(slug, body);
  return body;
}

/** @deprecated use loadWritingBody */
export async function loadBlogPostBody(slug) {
  return loadWritingBody(slug);
}

export default { blog: BLOG_POSTS, research: RESEARCH_POSTS };
