/** The facts behind the Home, Work, Builds and Archive pages. */

export const SITE = {
  name: 'William Cagas',
  university: { name: 'University of Waterloo', url: 'https://uwaterloo.ca/' },

  // In display order; `icon` is a simple-icons slug
  links: [
    { name: 'Email', url: 'mailto:wcagas@uwaterloo.ca', icon: 'gmail' },
    { name: 'GitHub', url: 'https://github.com/willcagas', icon: 'github' },
    { name: 'LinkedIn', url: 'https://www.linkedin.com/in/william-cagas/', icon: 'linkedin' },
    { name: 'Twitter', url: 'https://x.com/williamcagas', icon: 'x' }
  ],

  // `detail` may contain HTML
  roles: [
    {
      company: 'Darwin (YC F25)',
      url: 'https://darwinrobotics.ai/',
      role: 'Member of Technical Staff (Intern)',
      detail: 'δ Helped develop an autonomous AI R&D system that hillclimbs to the frontier (formerly Thesis).'
    },
    {
      company: 'WAT.ai',
      url: 'https://watai.ca',
      role: 'Technical PM',
      detail: 'Lead a cross-functional team building AI systems for pesticide regulatory approval for <span class="nowrap">Bindwell (YC W25)</span>.'
    },
    {
      company: 'CMU Xu Lab',
      url: 'https://xulabs.github.io/',
      role: 'ML Researcher',
      detail: 'Researched DDPMs for medical image synthesis to accelerate rare disease clinical trials.'
    },
    {
      company: 'Algoverse AI Research',
      url: 'https://algoverseairesearch.org/',
      role: 'ML Researcher',
      detail: 'Lead author on GAN-based medical imaging research published at ACCV 2024 workshop.'
    }
  ],

  community: [
    {
      company: 'HammerHacks',
      url: 'https://hammerhacks2024.wcagas.com',
      role: 'Co-Founder & Lead Organizer',
      detail: '140+ participants and $12K in sponsorships from McMaster Engineering, Hack Club, and more.'
    },
    {
      company: 'Stanford Code in Place',
      url: 'https://codeinplace.stanford.edu/',
      role: 'Coding Instructor',
      detail: 'Taught CS106A Python fundamentals 2x to classes of international students.'
    }
  ],

  projects: [
    { title: 'Zentro', url: 'https://joinzentro.com', detail: '300K+ views on X/Twitter in 24h with inbound VC interest.' },
    { title: 'Goose Trials', url: 'https://goosetrials.com', detail: '~1K unique players and 8K games played in 24h; featured on UW Imprint.' },
    { title: 'AcneCura', url: 'https://acnecura.io', detail: '300K+ views; endorsed by Apple Canada and featured on Global News.' },
    { title: 'WasteBuster', url: 'https://apps.apple.com/ca/app/wastebuster/id6450317120', detail: '500+ circular solutions tackling overconsumption.' },
    { title: 'Sword Power Tycoon', url: 'https://www.roblox.com/games/6937615628/Sword-Power-Tycoon', detail: '19M+ plays and 36K+ favourites.' }
  ],

  press: [
    {
      outlet: 'UW Imprint',
      url: 'https://uwimprint.ca/first-year-engineering-students-launch-goose-trials-a-competitive-game-platform/',
      title: 'First-year engineering students launch Goose Trials, a competitive game platform',
      date: 'Jan. 2026'
    },
    {
      outlet: 'Global News',
      url: 'https://globalnews.ca/video/11330376/hamilton-teen-develops-app-to-detect-diagnose-acne/',
      title: 'Hamilton teen develops app to detect, diagnose acne',
      date: 'Aug. 2025'
    },
    {
      outlet: 'HWCDSB',
      url: 'https://www.hwcdsb.ca/news/2024-2025/hammer_hacks_empowers_hamilton_youth_in_s_t_e_m',
      title: 'HammerHacks Empowers Hamilton Youth in STEM',
      date: 'Jan. 2025'
    },
    {
      outlet: 'The Hamilton Spectator',
      url: 'https://www.thespec.com/news/hamilton-region/hamilton-high-schooler-uses-tech-to-solve-problems-from-gaps-in-medical-data-to-teen/article_35dcda17-4b96-5079-90d5-84625c65f254.html',
      title: 'Hamilton high schooler uses tech to solve problems, from gaps in medical data to teen acne',
      date: 'Jan. 2025'
    }
  ]
};
