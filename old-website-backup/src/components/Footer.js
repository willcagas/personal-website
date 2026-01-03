/**
 * Footer Component
 * 
 * Site footer with contact information and social links.
 * Replace with your actual contact information.
 */

class Footer {
  constructor() {
    this.data = {
      copyright: `© ${new Date().getFullYear()} William Cagas`,
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
        },
      ],
      cta: {
        text: "Looking to chat?",
        link: "https://cal.com/wcagas/chat-with-william-cagas",
        linkText: "Book a 1-on-1"
      }
    };
  }


  render() {
    return `
      <footer id="contact" class="footer">
        <div class="container">
          ${this.data.cta ? `
            <div class="footer-cta">
              <p class="footer-cta-text">${this.data.cta.text}</p>
              <a href="${this.data.cta.link}" target="_blank" class="footer-cta-link link" rel="noopener noreferrer">
                ${this.data.cta.linkText}
              </a>
            </div>
          ` : ''}
          
          <div class="footer-content">
            <div class="footer-social">
              ${this.data.socialLinks.map(link => `
                <a href="${link.url}" 
                   target="_blank" 
                   class="footer-social-link" 
                   aria-label="${link.name}"
                   rel="noopener noreferrer">
                  <img src="${link.logo}" alt="${link.name}" class="social-logo">
                </a>
              `).join('')}
            </div>
            
            <p class="footer-copyright">${this.data.copyright}</p>
          </div>
        </div>
      </footer>
    `;
  }
}

export default Footer;

