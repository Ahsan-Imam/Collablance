import Link from 'next/link'
import { CLIENT_FEE_PERCENT, TEAM_COMMISSION_PERCENT } from '@/lib/payments/money'
import '../legal/legal.css'

export const metadata = {
  title: 'Pricing — CollabLance',
  description: `Posting a project is free. Clients pay a ${CLIENT_FEE_PERCENT}% service fee per milestone; teams pay ${TEAM_COMMISSION_PERCENT}% commission. No subscriptions, no paid proposals.`,
  alternates: { canonical: '/pricing' },
}

const rupees = (n) => `₹${n.toLocaleString('en-IN')}`
const EXAMPLE = 10000

export default function PricingPage() {
  const fee = (EXAMPLE * CLIENT_FEE_PERCENT) / 100
  const commission = (EXAMPLE * TEAM_COMMISSION_PERCENT) / 100

  return (
    <div className="legal-page">
      <div className="container container--narrow">
        <div className="legal-header">
          <h1 className="legal-title">Pricing</h1>
          <p className="legal-subtitle">Free to post, free to send proposals. We only earn when a milestone is paid.</p>
        </div>

        <div className="legal-content">
          <div className="legal-section">
            <h2>For clients</h2>
            <div className="legal-highlight">
              Posting a project: free. Service fee: {CLIENT_FEE_PERCENT}% on top of each milestone you fund.
            </div>
            <p>You compare proposals, each with a price and a timeline, and pay nothing until you fund a milestone.</p>
          </div>

          <div className="legal-section">
            <h2>For teams</h2>
            <div className="legal-highlight">
              Creating a team and sending proposals: free. Commission: {TEAM_COMMISSION_PERCENT}% of each milestone, taken before the payout is split.
            </div>
            <p>There are no subscriptions and no paid proposal credits.</p>
          </div>

          <div className="legal-section">
            <h2>Worked example</h2>
            <p>For a {rupees(EXAMPLE)} milestone:</p>
            <ul>
              <li>The client pays <strong>{rupees(EXAMPLE + fee)}</strong> ({rupees(EXAMPLE)} + {rupees(fee)} service fee).</li>
              <li>The team receives <strong>{rupees(EXAMPLE - commission)}</strong> in total ({rupees(EXAMPLE)} − {rupees(commission)} commission), divided by the split every member signed.</li>
              <li>CollabLance keeps {rupees(fee + commission)}, which also covers the payment gateway&apos;s charges.</li>
            </ul>
          </div>

          <div className="legal-section">
            <h2>When fees apply</h2>
            <p>
              Fees are charged only on milestones paid through CollabLance. Online payments are being
              switched on in stages; where they aren&apos;t live for your project yet, the platform moves
              no money and charges nothing. The binding terms are in
              our <Link href="/legal/terms">Terms of Service</Link> and <Link href="/legal/refund">Refund Policy</Link>.
            </p>
          </div>

          <div className="legal-section">
            <h2>Questions</h2>
            <details>
              <summary>When does the team get paid?</summary>
              <p>When you approve a funded milestone. Until then the money is held by our payment partner, Razorpay, not by the team.</p>
            </details>
            <details>
              <summary>What if I&apos;m not happy with a milestone?</summary>
              <p>Send it back for changes, or raise a dispute. A disputed milestone&apos;s payment stays on hold until it is resolved under the <Link href="/legal/disputes">Dispute Resolution Policy</Link>.</p>
            </details>
            <details>
              <summary>What if a team member leaves mid-project?</summary>
              <p>The signed split is locked and the platform cannot change it for you today. Talk it through in the project chat first; if the team and client can&apos;t agree, raise a dispute and we will review it.</p>
            </details>
            <details>
              <summary>How does the team decide who gets what?</summary>
              <p>The team leader proposes a percentage for each member, and every member has to sign it before the team can take the project. After that the split can&apos;t be edited.</p>
            </details>
            <details>
              <summary>Can we work in a currency other than rupees?</summary>
              <p>Not yet. Payments are in Indian Rupees only.</p>
            </details>
            <details>
              <summary>Are the fees refundable?</summary>
              <p>Not once a milestone is approved. See the <Link href="/legal/refund">Refund Policy</Link> for cancelled projects.</p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
