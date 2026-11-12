export const metadata = {
  title: 'Terms of Service — CollabLance',
  description: 'CollabLance Terms of Service. Read about platform usage, payments, disputes, and your rights.',
}

export default function TermsPage() {
  return (
    <>
      <div className="legal-header">
        <p className="legal-updated">Last updated: November 2026</p>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-subtitle">
          These terms govern your use of the CollabLance platform. 
          By using CollabLance, you agree to these terms.
        </p>
      </div>

      <div className="legal-content">
        <div className="legal-section">
          <h2>1. Platform Description & Permitted Use</h2>
          <p>
            CollabLance is a platform where freelancers form named teams, 
            pitch clients together, and agree payment splits before work starts. The platform
            facilitates project management, milestone tracking and team collaboration.
            Escrow payments are not live yet; see Section 5.
          </p>
          <p>
            You may use CollabLance only for lawful freelancing activities. Any use 
            of the platform for illegal, fraudulent, or harmful purposes is strictly prohibited.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. User Eligibility</h2>
          <p>To use CollabLance, you must be:</p>
          <ul>
            <li>At least 18 years of age, OR</li>
            <li>At least 16 years of age with verifiable guardian consent</li>
            <li>Legally capable of entering into a binding agreement under Indian law</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Team Formation Rules</h2>
          <ul>
            <li>Any freelancer can create a team and invite other freelancers to join</li>
            <li>Team names must be unique on the platform and must not infringe on existing trademarks</li>
            <li>A freelancer may belong to multiple teams simultaneously</li>
            <li>Team creators are responsible for managing membership and resolving internal disputes</li>
            <li>CollabLance reserves the right to disband teams that violate platform rules</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Project Posting Rules</h2>
          <ul>
            <li>Projects must have clear descriptions, budgets, and deliverable timelines</li>
            <li>Project budgets must be stated in Indian Rupees (₹)</li>
            <li>Projects must not involve illegal content, activities, or services</li>
            <li>Project posters are responsible for accurately representing scope and requirements</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>5. Payment Terms</h2>
          <p>
            <strong>Online payments are not live yet.</strong> Until they launch, CollabLance
            does not collect, hold or transfer any money, and charges no platform fee.
            The terms below apply from the date payments launch, with notice as set out in Section 12.
          </p>
          <div className="legal-highlight">
            Clients pay a 5% service fee on top of each milestone. Teams pay an 8% commission,
            deducted from each milestone before it is split among members. Both are
            non-refundable once a milestone is approved by the client.
          </div>
          <ul>
            <li><strong>Funding:</strong> The client funds each milestone before the team starts it. Funds are held via Razorpay until the client approves that milestone</li>
            <li><strong>Release:</strong> On approval, the milestone amount minus the 8% commission is paid to the team members per their signed split</li>
            <li><strong>Splits:</strong> Payment splits are defined at project setup and locked once agreed by all team members</li>
            <li><strong>Example:</strong> For a ₹10,000 milestone, the client pays ₹10,500 and the team receives ₹9,200 in total</li>
            <li><strong>Payouts:</strong> Each team member must set up a payout account with Razorpay. Payouts are settled by Razorpay to their bank account on Razorpay&apos;s settlement schedule after approval</li>
          </ul>
          <p>
            For disputes regarding payments, see our <a href="/legal/disputes">Dispute Resolution Policy</a>.
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Prohibited Content & Conduct</h2>
          <ul>
            <li>Posting or sharing illegal, obscene, defamatory, or harmful content</li>
            <li>Impersonating another person or entity</li>
            <li>Attempting to circumvent the escrow or payment system</li>
            <li>Spamming, phishing, or distributing malware</li>
            <li>Manipulating ratings or reviews</li>
            <li>Sharing another member&apos;s private information without consent</li>
            <li>Using the platform for money laundering or illegal financial activities</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>7. Intellectual Property</h2>
          <p>
            Work produced on CollabLance belongs to the client upon full payment release 
            from escrow. Before full payment, work remains the property of the team 
            that created it. See our full <a href="/legal/ip">Intellectual Property Policy</a> for details.
          </p>
        </div>

        <div className="legal-section">
          <h2>8. Termination & Blacklisting</h2>
          <ul>
            <li>CollabLance reserves the right to suspend or terminate accounts that violate these terms</li>
            <li>Repeated violations may result in permanent blacklisting from the platform</li>
            <li>Users may delete their accounts at any time via account settings</li>
            <li>Upon termination, ongoing escrow funds will be handled per the dispute resolution process</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>9. Non-Disclosure Agreements</h2>
          <p>
            A client can ask the team on a project to sign a standard non-disclosure
            agreement on CollabLance. The agreement is between the client and each
            team member who signs it. CollabLance records who signed and when, but
            is not a party to it and does not provide legal advice.
          </p>
          <p>
            If we find that a user has broken an NDA signed on the platform, we may
            suspend or permanently ban their account. Any claim for damages is
            between the client and the team member concerned.
          </p>
        </div>

        <div className="legal-section">
          <h2>10. Governing Law & Jurisdiction</h2>
          <div className="legal-highlight">
            These Terms are governed by the laws of India. Any disputes arising 
            from these Terms shall be subject to the exclusive jurisdiction of 
            the courts in Pune, Maharashtra, India.
          </div>
        </div>

        <div className="legal-section">
          <h2>11. Limitation of Liability</h2>
          <p>
            CollabLance is not liable for disputes between members beyond the 
            platform&apos;s dispute resolution process. The platform acts as a facilitator 
            and marketplace — not a party to agreements between freelancers and clients.
          </p>
        </div>

        <div className="legal-section">
          <h2>12. Modifications to Terms</h2>
          <p>
            CollabLance reserves the right to modify these Terms at any time. 
            Users will be notified of material changes at least 30 days before 
            they take effect. Continued use of the platform after changes constitutes 
            acceptance of the modified terms.
          </p>
        </div>

        <div className="legal-contact">
          <h3>Questions?</h3>
          <p>
            If you have questions about these Terms, contact us at{' '}
            <a href="mailto:legal@collablance.in">legal@collablance.in</a>
          </p>
        </div>
      </div>
    </>
  )
}
