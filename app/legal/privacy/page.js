export const metadata = {
  title: 'Privacy Policy — CollabLance',
  description: 'How CollabLance collects, uses, and protects your data. DPDPA 2023 compliant.',
}

export default function PrivacyPage() {
  return (
    <>
      <div className="legal-header">
        <p className="legal-updated">Last updated: October 2024</p>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-subtitle">
          We take your privacy seriously. This policy explains what data we collect, 
          how we use it, and your rights under Indian law.
        </p>
      </div>

      <div className="legal-content">
        <div className="legal-section">
          <h2>1. Data We Collect</h2>
          <ul>
            <li><strong>Account data:</strong> Name, email address, password (hashed, never stored in plaintext)</li>
            <li><strong>Profile data:</strong> Skills, bio, location, hourly rate, portfolio URL, experience</li>
            <li><strong>Payment data:</strong> Processed via Razorpay — we do not store card numbers, UPI IDs, or payment credentials</li>
            <li><strong>Project data:</strong> Project descriptions, milestones, deliverables, files</li>
            <li><strong>Communication data:</strong> Messages sent within project chats</li>
            <li><strong>Rating data:</strong> Ratings and reviews given and received</li>
            <li><strong>Usage data:</strong> Page views, feature usage (via privacy-friendly analytics only)</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>2. How We Use Your Data</h2>
          <ul>
            <li><strong>Platform operation:</strong> Account management, authentication, authorization</li>
            <li><strong>Matching:</strong> Helping collectives find relevant projects and vice versa</li>
            <li><strong>Payments:</strong> Processing milestone payments and split distributions via Razorpay</li>
            <li><strong>Reputation:</strong> Calculating and displaying ratings and reputation scores</li>
            <li><strong>Communication:</strong> Facilitating team chat within projects</li>
            <li><strong>Improvement:</strong> Analysing usage patterns to improve the platform</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Data Sharing</h2>
          <p>We share your data only with the following third parties, and only as necessary:</p>
          <ul>
            <li><strong>Razorpay:</strong> For payment processing (governed by Razorpay's privacy policy)</li>
            <li><strong>Supabase:</strong> For data storage and authentication (data stored securely)</li>
            <li><strong>Claude API (Anthropic):</strong> For AI-powered features (when launched in Phase 2)</li>
          </ul>
          <div className="legal-highlight">
            We never sell your data to third parties. Ever. No exceptions.
          </div>
        </div>

        <div className="legal-section">
          <h2>4. Data Retention</h2>
          <ul>
            <li>Active account data is retained for the lifetime of your account</li>
            <li>Project data is retained for <strong>3 years</strong> after project completion for dispute resolution purposes</li>
            <li>Deleted account data is removed within 30 days of deletion request</li>
            <li>Unverified accounts are automatically deleted after 30 days</li>
            <li>A confirmation email is sent when your data deletion request is processed</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>5. Your Rights</h2>
          <p>Under the Digital Personal Data Protection Act 2023 (DPDPA) and applicable Indian law, you have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
            <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
            <li><strong>Deletion:</strong> Request deletion of your personal data and account</li>
            <li><strong>Grievance redressal:</strong> File a complaint with our Data Protection Officer</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@collablance.in">privacy@collablance.in</a>.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Cookies</h2>
          <p>
            We use essential and optional cookies. For full details, see our{' '}
            <a href="/legal/cookies">Cookie Policy</a>.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. DPDPA Compliance</h2>
          <div className="legal-highlight">
            CollabLance is committed to full compliance with India's Digital Personal 
            Data Protection Act 2023 (DPDPA). We process personal data only with valid 
            consent, for legitimate purposes, and with appropriate security measures.
          </div>
        </div>

        <div className="legal-section">
          <h2>8. Security</h2>
          <p>
            We implement industry-standard security measures including encrypted 
            connections (HTTPS), hashed passwords, row-level security on all database 
            tables, and regular security audits. Despite our best efforts, no method 
            of transmission over the internet is 100% secure.
          </p>
        </div>

        <div className="legal-contact">
          <h3>Privacy Requests</h3>
          <p>
            For any privacy-related requests or questions, contact our Data Protection Officer at{' '}
            <a href="mailto:privacy@collablance.in">privacy@collablance.in</a>
          </p>
          <p>CollabLance, Pune, Maharashtra, India</p>
        </div>
      </div>
    </>
  )
}
