export const metadata = {
  title: 'Cookie Policy — CollabLance',
  description: 'How CollabLance uses cookies. Essential, functional, and analytics cookies explained.',
}

export default function CookiesPage() {
  return (
    <>
      <div className="legal-header">
        <p className="legal-updated">Last updated: October 2024</p>
        <h1 className="legal-title">Cookie Policy</h1>
        <p className="legal-subtitle">
          We use cookies to make CollabLance work and to understand how we can improve. 
          No advertising or tracking cookies — ever.
        </p>
      </div>

      <div className="legal-content">
        <div className="legal-section">
          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website. 
            They help the website remember your preferences and how you interact with it.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. Cookies We Use</h2>

          <h3>Essential Cookies (Always Active)</h3>
          <p>These are required for CollabLance to function. They cannot be disabled.</p>
          <ul>
            <li><strong>Authentication session:</strong> Keeps you logged in as you navigate the platform</li>
            <li><strong>CSRF protection:</strong> Prevents cross-site request forgery attacks</li>
            <li><strong>Cookie consent preference:</strong> Remembers your cookie choice</li>
          </ul>

          <h3>Functional Cookies</h3>
          <p>These enhance your experience but are not strictly necessary.</p>
          <ul>
            <li><strong>User preferences:</strong> Theme (light/dark mode), language settings</li>
            <li><strong>UI state:</strong> Sidebar open/closed, last viewed page</li>
          </ul>

          <h3>Analytics Cookies (Opt-in Only)</h3>
          <p>These help us understand how CollabLance is used so we can improve it.</p>
          <ul>
            <li><strong>Page views:</strong> Which pages are visited most</li>
            <li><strong>Feature usage:</strong> Which features are used and how often</li>
          </ul>
          <div className="legal-highlight">
            We use privacy-friendly analytics only (such as Plausible or Umami). 
            We do not use Google Analytics. Analytics cookies are loaded only if 
            you choose "Accept All" on our cookie consent banner.
          </div>

          <h3>Advertising / Tracking Cookies</h3>
          <div className="legal-highlight">
            CollabLance does not use any advertising or tracking cookies. None. 
            We do not track you across websites. We do not serve ads. We do not 
            sell cookie data to third parties.
          </div>
        </div>

        <div className="legal-section">
          <h2>3. Cookie Consent</h2>
          <ul>
            <li>On your first visit, a cookie consent banner appears</li>
            <li>You can choose <strong>"Accept All"</strong> (essential + analytics) or <strong>"Essential Only"</strong></li>
            <li>Both options are equally visible — no dark patterns</li>
            <li>Your choice is stored in your browser's localStorage</li>
            <li>You can change your preference at any time in your account settings</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Payment Information</h2>
          <div className="legal-highlight">
            Cookies never store payment information. Card numbers, UPI IDs, and 
            payment credentials are never stored in cookies, localStorage, or 
            sessionStorage. All payment processing is handled by Razorpay.
          </div>
        </div>

        <div className="legal-section">
          <h2>5. Managing & Deleting Cookies</h2>
          <p>You can manage cookies through your browser settings:</p>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
            <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
          </ul>
          <p>
            Note: Clearing essential cookies will log you out and you may need to 
            set your preferences again.
          </p>
        </div>

        <div className="legal-contact">
          <h3>Questions about cookies?</h3>
          <p>
            Contact us at{' '}
            <a href="mailto:privacy@collablance.in">privacy@collablance.in</a>
          </p>
        </div>
      </div>
    </>
  )
}
