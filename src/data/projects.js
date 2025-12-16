/**
 * Projects Data Structure
 * 
 * Replace this with your actual project data.
 * Each project should have:
 * - title: Project name
 * - date: Publication/completion date (YYYY-MM-DD format)
 * - description: Brief description (1-2 sentences)
 * - tags: Array of technology/topic tags
 * - liveLink: URL to live project (optional)
 * - repoLink: URL to repository (optional)
 * - image: Path to project image/screenshot (optional)
 * - featured: Boolean to mark featured projects
 */

const projects = [
  // {
  //   title: "(Incoming) TPM at WAT.ai",
  //   date: "2025-01-01",
  //   description: [
  //     "Leading and building high-impact projects pushing the boundaries of AI at UWaterloo"
  //   ],
  //   tags: ["TPM", "AI", "Project Management"],
  //   liveLink: "https://watai.ca/",
  //   repoLink: null,
  //   image: null,
  //   logo: "/assets/pictures/watai.png",
  //   featured: true
  // },
  {
    title: "AcneCura",
    date: "2024-01-15",
    description: [
      "AI-powered app that recommends personalized acne treatments in minutes",
      "Helping users navigate long dermatologist wait times by recommending safe, personalized acne treatments",
      "Featured on <a href=\"https://globalnews.ca/video/11330376/hamilton-teen-develops-app-to-detect-diagnose-acne/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">Global News</a> and <a href=\"https://www.thespec.com/news/hamilton-region/hamilton-high-schooler-uses-tech-to-solve-problems-from-gaps-in-medical-data-to-teen/article_35dcda17-4b96-5079-90d5-84625c65f254.html\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">The Hamilton Spectator</a>"
    ],
    tags: ["AI", "Healthcare", "Mobile App"],
    liveLink: "https://acnecura.io",
    repoLink: null,
    image: null,
    logo: "/assets/logos/acnecura.png",
    featured: true
  },
  {
    title: "DDPM Research at CMU's Xu Lab",
    date: "2024-11-01",
    description: [
      "Conducted short-term collaborative research on DDPMs in <strong>CMU's Xu Lab</strong> within the Computational Biology Department",
      "Specialized in DDPMs for clinical applications, focusing on medical image synthesis"
    ],
    tags: ["Research", "Machine Learning", "DDPMs", "Medical Imaging"],
    liveLink: "https://xulabs.github.io/",
    repoLink: null,
    image: null,
    logo: "/assets/logos/cmu.png",
    featured: true
  },
  {
    title: "HammerHacks",
    date: "2024-03-20",
    description: [
      "Hamilton's first high school hackathon",
      "Secured <strong>$12,000</strong> in funding from <a href=\"https://www.eng.mcmaster.ca/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">McMaster Engineering</a>, <a href=\"https://hackclub.com/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">Hack Club</a>, <a href=\"https://inferencelabs.com/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">Inference Labs</a>, and more",
      "Resulted in <strong>140+ participants</strong> from <strong>17 high schools</strong> and <strong>~50 projects</strong>"
    ],
    tags: ["Event", "Organizing", "Community"],
    liveLink: "https://hammerhacks2024.wcagas.com",
    repoLink: null,
    image: null,
    logo: "/assets/logos/hammerhacks.png",
    featured: true
  },
  {
    title: "Medical Imaging Complexity and its Effects on GAN Performance",
    date: "2024-10-15",
    description: [
      "Used Larkin’s delentropy to show that tighter complexity distributions yield <strong>~2× lower FID</strong> with <strong>1,000 images</strong>, linking image complexity to optimal GAN data size",
      "Published and invited to present at <a href=\"https://sites.google.com/view/gaisynmed/home\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">GAISynMeD</a> at <strong>ACCV 2024</strong> in <strong>Hanoi, Vietnam</strong>",
      "Cited by <a href=\"https://scholar.google.com/scholar?oi=bibs&hl=en&cites=14961825138095950109\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\"><strong>7 papers</strong></a>, including publications at top conferences/journals like <strong>ICCV</strong> and <strong>ACM</strong>"
    ],
    tags: ["Research", "Machine Learning", "Medical Imaging"],
    liveLink: "https://medgans.wcagas.com",
    repoLink: null,
    image: null,
    logo: "/assets/logos/medgans.png",
    featured: true
  },
  {
    title: "Stanford Code in Place",
    date: "2024-04-01",
    description: [
      "Taught <strong>Stanford University's CS106A</strong> course and Python basics to classes of online international students for <a href=\"https://digitalcredential.stanford.edu/check/9E3635B2E0D3610DF0BA33F4735293F13DC908E01DE02E25BBA1CB0BB26E56E6Zml3Tmg1eTRzSFB5U3l5MWFxRFIrZW8rbm03aXFkMFZ6VDZ6TFFJN2FSVnJLUlA5\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">CIP '24</a> and <a href=\"https://digitalcredential.stanford.edu/check/331E06BB0705E3BB501F97242E27B318FD85DFB285709547D86DBB5D57821610UlZhRHJsUTdRWnZHSjdBamZuQ3Q4RHRMeHM1UWFncU1nK29CMWdvbGVK5\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"project-featured-link\">CIP '25</a>"
    ],
    tags: ["Education", "Teaching", "Python"],
    liveLink: "https://codeinplace.stanford.edu",
    repoLink: null,
    image: null,
    logo: "/assets/logos/stanford-logo.jpg",
    featured: false
  },
  {
    title: "Sword Power Tycoon",
    date: "2023-08-10",
    description: [
      "Developed sword powers and game mechanics",
      "Reached <strong>19M+ plays</strong> on Roblox with <strong>36K+ favourites</strong>"
    ],
    tags: ["Game Development", "Roblox", "Lua"],
    liveLink: "https://www.roblox.com/games/6937615628/Sword-Power-Tycoon",
    repoLink: null,
    image: null,
    logo: "/assets/logos/roblox-logo.png",
    featured: false
  },
];

export default projects;

