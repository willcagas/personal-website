/**
 * Writings: blog posts (/content/blog/*.md) and research papers
 * (/content/research/*.md). A file's frontmatter (title, date, summary, venue,
 * authors) overrides the entry here once the body loads.
 *
 * Post fields:
 *   date        "YYYY-MM-DD", or "YYYY-MM" to show only the month
 *   draft       shown only on localhost; elsewhere its URL is "Not found".
 *               Draft markdown is gitignored, so unfinished prose never ships.
 *   hidden      hidden everywhere, localhost included
 *   comingSoon  the page (title, date, hero, overview) is public with "Coming
 *               soon" in place of the article; localhost shows the full text
 *   hero        { kind: "title-card", title, subtitle?, background?: "life" | "frontier" }
 *               an animated title card above the article (src/js/title-card.js)
 *   overview    { details: [{ label, value, note? }], text }
 *               a Details / Overview block under the hero; `text` may contain HTML
 *
 * Research posts are papers' project pages; they're listed under Builds and
 * live at /projects/<slug>.
 */

const BLOG_POSTS = [
  {
    section: "blog",
    slug: "thesis-labs-internship",
    title: "A Summer of Hillclimbing at Darwin (YC F25)",
    date: "2026-10",
    summary:
      "My work, thoughts, and learnings during my internship at Darwin (YC F25).",
    file: "/content/blog/thesis-labs-internship.md",
    comingSoon: true,
    hero: { kind: "title-card", title: "Darwin", background: "frontier" },
    overview: {
      details: [
        { label: "Role", value: "Member of Technical Staff (Intern)" },
        { label: "Location", value: "San Francisco" },
        { label: "Dates", value: "March – August 2026" }
      ],
      text:
        "I spent six months at <a href=\"https://darwinrobotics.ai/\" target=\"_blank\" rel=\"noopener noreferrer\">Darwin</a>, formerly Thesis (YC F25), working on autonomous AI R&D systems. I started in March and then moved to SF in June to go full-time and on-site through August. Darwin has since moved into robotics and is backed by the cofounders of OpenAI, xAI, and YC. Here, I talk about some of the projects I worked on, thoughts and experiences during the internship, and learnings throughout."
    }
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

// Local development (wcagas.com and Vercel previews are not)
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

/** Whether a post's article text is shown here (coming-soon posts show it only on localhost). */
export function showsFullText(post) {
  return IS_DEV || !post.comingSoon;
}

export function getWriting(slug) {
  return visible(ALL_POSTS).find((p) => p.slug === slug) || null;
}

/** A post's address: papers under Builds, everything else under Writings. */
export function postPath(post) {
  return `${post.section === "research" ? "/projects" : "/writings"}/${post.slug}`;
}

/** Fetch markdown body for a writing (cached). */
export async function loadWritingBody(slug) {
  if (bodyCache.has(slug)) return bodyCache.get(slug);

  const post = getWriting(slug);
  if (!post?.file) return "";

  const res = await fetch(post.file, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${post.file} (${res.status})`);

  const { meta, body } = parseFrontmatter(await res.text());
  for (const key of ["title", "date", "summary", "venue", "authors"]) {
    if (meta[key]) post[key] = meta[key];
  }

  bodyCache.set(slug, body);
  return body;
}
