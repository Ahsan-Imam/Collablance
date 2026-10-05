import Link from 'next/link'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer" id="site-footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <Link href="/" className="footer__logo">
              <span className="footer__logo-icon">⬡</span>
              <span className="footer__logo-text">
                Collab<span className="footer__logo-accent">Lance</span>
              </span>
            </Link>
            <p className="footer__tagline">
              Form collectives. Pitch together. Get paid fairly.
            </p>
            <p className="footer__tagline footer__tagline--small">
              India's platform for freelancer teams.
            </p>
          </div>

          {/* Platform */}
          <div className="footer__section">
            <h4 className="footer__heading">Platform</h4>
            <ul className="footer__links">
              <li><Link href="/auth/signup" id="footer-signup">Get Started</Link></li>
              <li><Link href="/collectives" id="footer-collectives">Collectives</Link></li>
              <li><Link href="/projects" id="footer-projects">Browse Projects</Link></li>
              <li><Link href="/#features" id="footer-features">Features</Link></li>
            </ul>
          </div>

          {/* Legal — must be accessible without login per guardrails */}
          <div className="footer__section">
            <h4 className="footer__heading">Legal</h4>
            <ul className="footer__links">
              <li><Link href="/legal/terms" id="footer-terms">Terms of Service</Link></li>
              <li><Link href="/legal/privacy" id="footer-privacy">Privacy Policy</Link></li>
              <li><Link href="/legal/cookies" id="footer-cookies">Cookie Policy</Link></li>
              <li><Link href="/legal/refund" id="footer-refund">Refund Policy</Link></li>
              <li><Link href="/legal/ip" id="footer-ip">IP Policy</Link></li>
              <li><Link href="/legal/disputes" id="footer-disputes">Dispute Resolution</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__section">
            <h4 className="footer__heading">Contact</h4>
            <ul className="footer__links">
              <li><a href="mailto:support@collablance.in" id="footer-email">support@collablance.in</a></li>
              <li><span className="footer__text">Pune, Maharashtra, India</span></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} CollabLance™. All rights reserved.
          </p>
          <p className="footer__legal-note">
            Governed by Indian law. Jurisdiction: Pune, India.
          </p>
        </div>
      </div>
    </footer>
  )
}
