/**
 * About Section Component
 * 
 * Brief introduction and background information.
 * Replace content with your actual about information.
 */

class AboutSection {
  constructor() {
    this.data = {
      title: "About",
      content: `
        <p>I like to research and build AI that solves real-world problems.</p>
        <p>My work spans across health tech, applied AI research, web/mobile app development, hackathon organizing, education, game development, and more.</p>
        <p>If you're interested in tech or building something cool, feel free to reach out!</p>
        <p>I'm currently...</p>
        <ul>
          <li>(Soon!) Leading high-impact AI projects at UWaterloo's AI Team, <a href="https://watai.ca/" target="_blank" rel="noopener noreferrer" class="link">WAT.ai <img src="/assets/logos/watai.png" alt="WAT.ai" class="project-logo"></a></li>
          <li>Building B2C mobile apps including AI for acne at <a href="https://acnecura.io/" target="_blank" rel="noopener noreferrer" class="link">AcneCura <img src="/assets/logos/acnecura.png" alt="AcneCura" class="project-logo"></a></li>
          <li>Exploring AI x biomedical applications inlcuding medical imaging and CT-based oncology analysis</li>
          <li>Creating a shared online space for the SE '30 cohort through the <a href="https://se30webring.com/" target="_blank" rel="noopener noreferrer" class="link">SE '30 Webring <img src="/assets/logos/se30webring.png" alt="SE '30 Webring" class="project-logo"></a></li>
          <li>Documenting tech and uni life on <a href="https://www.instagram.com/willcagas.mov" target="_blank" rel="noopener noreferrer" class="link">@willcagas.mov <img src="/assets/logos/instagram.jpg" alt="Instagram" class="project-logo"></a></li>
        </ul>
      `
    };
  }

  render() {
    return `
      <section id="about" class="about-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">${this.data.title}</h2>
          </div>
          <div class="about-content">
            ${this.data.content}
          </div>
        </div>
      </section>
    `;
  }
}

export default AboutSection;

