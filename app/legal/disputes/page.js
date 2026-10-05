export const metadata = {
  title: 'Dispute Resolution Policy — CollabLance',
  description: 'How CollabLance handles disputes between freelancers and clients. Four-step resolution process.',
}

export default function DisputesPage() {
  return (
    <>
      <div className="legal-header">
        <p className="legal-updated">Last updated: October 2024</p>
        <h1 className="legal-title">Dispute Resolution Policy</h1>
        <p className="legal-subtitle">
          A fair, structured process for resolving disagreements 
          between collectives and clients.
        </p>
      </div>

      <div className="legal-content">
        <div className="legal-section">
          <h2>Overview</h2>
          <p>
            Disputes are an unfortunate reality of freelancing. CollabLance provides 
            a structured four-step process to resolve them fairly. Escrow funds are 
            held until the dispute is fully resolved.
          </p>
          <div className="legal-highlight">
            Escrow funds are never released during an active dispute. They remain 
            held until the resolution process reaches a conclusion.
          </div>
        </div>

        <div className="legal-section">
          <h2>Step 1: Direct Negotiation (72 Hours)</h2>
          <ul>
            <li>When a dispute is filed, both parties have a <strong>72-hour window</strong> to negotiate directly</li>
            <li>Communication happens through the project chat</li>
            <li>Both parties can share evidence, screenshots, and documentation</li>
            <li>If an agreement is reached, the dispute is closed and funds are distributed accordingly</li>
            <li>If no agreement after 72 hours, the dispute escalates to Step 2</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Step 2: CollabLance Review</h2>
          <ul>
            <li>The CollabLance team reviews all available evidence including:
              <ul>
                <li>Project agreement and milestone definitions</li>
                <li>Chat history and communication records</li>
                <li>Submitted deliverables and feedback</li>
                <li>Payment history and split agreements</li>
              </ul>
            </li>
            <li>CollabLance issues a ruling within <strong>5 business days</strong> of escalation</li>
            <li>The ruling determines how escrowed funds are distributed</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Step 3: Appeal to Human Reviewer</h2>
          <ul>
            <li>Either party may appeal the Step 2 ruling within <strong>7 days</strong></li>
            <li>The appeal is reviewed by an independent human reviewer</li>
            <li>The reviewer may request additional evidence from either party</li>
            <li>A final ruling is issued within <strong>10 business days</strong></li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Step 4: Binding Arbitration</h2>
          <ul>
            <li>If the dispute remains unresolved after Step 3, either party may request binding arbitration</li>
            <li>Arbitration is conducted under Indian arbitration law</li>
            <li>The arbitrator's decision is final and binding on both parties</li>
            <li>Arbitration costs are shared equally unless the arbitrator decides otherwise</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>Platform Ruling Finality</h2>
          <div className="legal-highlight">
            CollabLance's ruling (Step 2 or Step 3) is final for platform purposes. 
            This means it determines how escrowed funds are distributed on the platform. 
            Either party retains the right to pursue external legal action, but the 
            platform ruling stands regardless of external proceedings.
          </div>
        </div>

        <div className="legal-section">
          <h2>Evidence & Documentation</h2>
          <p>
            To support a fair resolution, we recommend keeping thorough records of:
          </p>
          <ul>
            <li>All communications with the other party</li>
            <li>Milestone deliverables and version history</li>
            <li>Screenshots of approvals or rejections</li>
            <li>Any agreements made outside the platform (if applicable)</li>
          </ul>
        </div>

        <div className="legal-contact">
          <h3>Need to file a dispute?</h3>
          <p>
            Use the dispute button on your project page, or contact us at{' '}
            <a href="mailto:disputes@collablance.in">disputes@collablance.in</a>
          </p>
        </div>
      </div>
    </>
  )
}
