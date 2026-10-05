export const metadata = {
  title: 'Refund Policy — CollabLance',
  description: 'CollabLance refund policy for platform fees, escrow, and cancelled projects.',
}

export default function RefundPage() {
  return (
    <>
      <div className="legal-header">
        <p className="legal-updated">Last updated: October 2024</p>
        <h1 className="legal-title">Refund Policy</h1>
        <p className="legal-subtitle">
          Transparent refund rules for platform fees, escrow funds, 
          and cancelled projects.
        </p>
      </div>

      <div className="legal-content">
        <div className="legal-section">
          <h2>1. Platform Fee</h2>
          <div className="legal-highlight">
            The CollabLance platform fee (3-5%) is non-refundable once a milestone 
            has been approved by the client. This fee covers payment processing, 
            escrow management, and platform maintenance.
          </div>
        </div>

        <div className="legal-section">
          <h2>2. Project Cancelled Before Work Starts</h2>
          <p>
            If a project is cancelled before any work has begun on the first milestone:
          </p>
          <ul>
            <li>The client receives a <strong>full refund</strong> of escrowed funds</li>
            <li>No platform fee is charged</li>
            <li>Refund is processed within 5-7 business days</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>3. Project Cancelled Mid-Milestone</h2>
          <p>
            If a project is cancelled while a milestone is in progress:
          </p>
          <ul>
            <li>Completed and approved milestones are <strong>not refundable</strong></li>
            <li>The current in-progress milestone is refunded based on the <strong>completion percentage</strong> as agreed by both parties</li>
            <li>Future milestones that haven't started are <strong>fully refundable</strong></li>
            <li>If parties cannot agree on completion percentage, the <a href="/legal/disputes">dispute resolution process</a> applies</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>4. Dispute-Based Refunds</h2>
          <p>
            Refunds arising from disputes follow the dispute resolution process 
            outlined in our <a href="/legal/disputes">Dispute Resolution Policy</a>. 
            Escrow funds are held until the dispute is fully resolved.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. Refund Processing</h2>
          <ul>
            <li><strong>Processing time:</strong> 5-7 business days from approval</li>
            <li><strong>Method:</strong> Refunds are issued to the original payment method used</li>
            <li><strong>Processor:</strong> Razorpay handles refund execution — CollabLance initiates the refund, Razorpay processes it</li>
            <li><strong>Confirmation:</strong> You will receive an email confirmation when your refund is processed</li>
          </ul>
        </div>

        <div className="legal-section">
          <h2>6. Non-Refundable Situations</h2>
          <ul>
            <li>Platform fees on approved milestones</li>
            <li>Payments for milestones already approved and distributed</li>
            <li>Account deletion does not trigger automatic refunds for completed work</li>
          </ul>
        </div>

        <div className="legal-contact">
          <h3>Refund Questions?</h3>
          <p>
            Contact our support team at{' '}
            <a href="mailto:support@collablance.in">support@collablance.in</a>
          </p>
        </div>
      </div>
    </>
  )
}
