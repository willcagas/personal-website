/**
 * Hero Section Component
 * 
 * Main landing section with headline, tagline, and CTA.
 * Replace content with your actual information.
 */

class Hero {
  constructor() {
    this.data = {
      name: "William Cagas",
      headline: "Software Engineering @ University of Waterloo",
      tagline: "✌️ I'm Will, an 18-year-old Hamiltonian passionate about building AI for good.",
      ctaText: "View Highlights",
      ctaLink: "#projects",
      socialLinks: [
        {
          name: "Email",
          url: "mailto:wcagas@uwaterloo.ca",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/gmail.svg"
        },
        {
          name: "LinkedIn",
          url: "https://www.linkedin.com/in/william-cagas/",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/linkedin.svg"
        },
        {
          name: "GitHub",
          url: "https://github.com/willcagas",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/github.svg"
        },
        {
          name: "Google Scholar",
          url: "https://scholar.google.com/citations?user=IMaV4_kAAAAJ&hl",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googlescholar.svg"
        },
        {
          name: "X (Twitter)",
          url: "https://x.com/williamcagas",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg"
        },
        {
          name: "Instagram",
          url: "https://instagram.com/williamcagas",
          logo: "https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg"
        }
      ]
    };
  }


  render() {
    return `
      <section id="home" class="hero">
        <div class="container">
          <div class="hero-wrapper">
            <div class="hero-image-container">
              <img src="/assets/pictures/profile.jpg" alt="" class="hero-profile-image" onload="this.classList.add('loaded');" onerror="this.classList.add('loaded');">
            </div>
            <div class="hero-content">
              <div class="hero-header">
                <h1 class="hero-name">${this.data.name}</h1>
                <p class="hero-headline">
                  Software Engineering @<span class="hero-headline-space"> </span>
                  <a href="https://uwaterloo.ca/" target="_blank" rel="noopener noreferrer" class="university-link">
                    University of Waterloo
                    <img src="/assets/logos/waterloo-logo.png" alt="University of Waterloo" class="university-logo">
                  </a>
                </p>
                <p class="hero-location">Hamilton, ON, Canada</p>
              </div>
              
              <p class="hero-tagline">${this.data.tagline}</p>
              
            <div class="hero-social">
              ${this.data.socialLinks.map(link => `
                <a href="${link.url}" 
                   target="_blank" 
                   class="hero-social-link" 
                   aria-label="${link.name}"
                   rel="noopener noreferrer">
                  <img src="${link.logo}" alt="${link.name}" class="social-logo">
                </a>
              `).join('')}
            </div>
            </div>
          </div>
        </div>
      </section>
    `;
  }
}

export default Hero;

