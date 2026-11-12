import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RuleForm from './RuleForm'
import ActionButton from './ActionButton'

export const metadata = { title: 'Admin — CollabLance', robots: { index: false } }

// Platform admins only (rows in platform_admins, added by hand in SQL).
// Everyone else gets a 404, so the page's existence isn't advertised.
export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = user
    ? await supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    : { data: null }
  if (!me) notFound()

  const admin = createAdminClient()
  const [{ data: disputed, error }, { data: rulings }, { data: stuck }, { data: payments, error: payErr }] = await Promise.all([
    admin.from('milestones')
      .select('id, title, description, amount, funded_at, submitted_at, updated_at, project_id, projects(title, owner_id, collectives(name))')
      .eq('status', 'disputed')
      .order('updated_at', { ascending: true }),
    admin.from('dispute_rulings')
      .select('id, outcome, note, created_at, milestones(title)')
      .order('created_at', { ascending: false })
      .limit(20),
    // Approved and funded but not 'paid': the automatic release to the team failed
    admin.from('milestones')
      .select('id, title, amount, approved_at, project_id, projects(title)')
      .eq('status', 'approved')
      .not('funded_at', 'is', null)
      .order('approved_at', { ascending: true }),
    // shortcut: reads the latest 500 payments and filters here, switch to a database view when there are more
    admin.from('milestone_payments')
      .select('id, status, total_amount, razorpay_order_id, razorpay_payment_id, project_id, milestones(title, status), payment_events(event, data)')
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  // Money the client is owed back: a dispute ruled for them, or a second payment
  // for a milestone that was already funded. Cleared once marked refunded.
  const refunds = (payments || []).flatMap(p => {
    const events = p.payment_events || []
    if (events.some(e => e.event === 'refunded_manually')) return []
    const duplicate = events.find(e => e.event === 'duplicate_payment_needs_refund')
    if (duplicate) return [{ ...p, reason: 'Paid twice for the same milestone', razorpayPaymentId: duplicate.data?.razorpay_payment_id }]
    if (p.status !== 'created' && p.milestones?.status === 'refunded') return [{ ...p, reason: 'Dispute ruled for the client', razorpayPaymentId: p.razorpay_payment_id }]
    return []
  })

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) var(--space-lg)' }}>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>Open disputes</h1>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-xl)' }}>
        Oldest first. A disputed milestone&apos;s payment stays on hold until you rule. Read the project chat and deliverables before deciding.
      </p>

      {error && <div className="alert alert--error">{error.message}</div>}
      {!disputed?.length && <p>No open disputes.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {(disputed || []).map(m => (
          <div key={m.id} className="card" style={{ padding: 'var(--space-lg)' }}>
            <h2 style={{ fontSize: '1.125rem' }}>{m.title} — ₹{Number(m.amount).toLocaleString('en-IN')}</h2>
            <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', margin: '4px 0 var(--space-md)' }}>
              Project: <Link href={`/projects/${m.project_id}`}>{m.projects?.title}</Link>
              {' · '}Team: {m.projects?.collectives?.name || 'none'}
              {' · '}{m.funded_at ? 'Funded, money on hold' : 'Not funded, no money involved'}
              {' · '}Disputed since {new Date(m.updated_at).toLocaleDateString('en-IN')}
            </p>
            {m.description && <p style={{ marginBottom: 'var(--space-md)' }}>{m.description}</p>}
            <RuleForm milestoneId={m.id} funded={!!m.funded_at} />
          </div>
        ))}
      </div>

      <h2 style={{ margin: 'var(--space-2xl) 0 var(--space-sm)' }}>Refunds to send</h2>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-md)' }}>
        Refund each payment in the Razorpay dashboard (reverse its transfers first), then mark it here. Marking it moves no money.
      </p>
      {payErr && <div className="alert alert--error">{payErr.message}</div>}
      {!refunds.length ? <p>Nothing to refund.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {refunds.map(p => (
            <div key={p.id} className="card" style={{ padding: 'var(--space-lg)' }}>
              <strong>₹{(p.total_amount / 100).toLocaleString('en-IN')}</strong> — {p.reason}
              <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', margin: '4px 0 var(--space-md)' }}>
                Milestone: <Link href={`/projects/${p.project_id}`}>{p.milestones?.title}</Link>
                {' · '}Razorpay payment: {p.razorpayPaymentId || 'unknown'}
                {' · '}Order: {p.razorpay_order_id}
              </p>
              <ActionButton url={`/api/admin/payments/${p.id}/refunded`} label="Mark refunded"
                confirmText="Have you already refunded this payment in the Razorpay dashboard? This only records it." />
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: 'var(--space-2xl) 0 var(--space-sm)' }}>Payouts that failed</h2>
      <p style={{ color: 'var(--cl-text-secondary)', marginBottom: 'var(--space-md)' }}>
        The client approved these funded milestones but the team hasn&apos;t been paid.
      </p>
      {!stuck?.length ? <p>None.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {stuck.map(m => (
            <div key={m.id} className="card" style={{ padding: 'var(--space-lg)' }}>
              <strong>{m.title} — ₹{Number(m.amount).toLocaleString('en-IN')}</strong>
              <p style={{ color: 'var(--cl-text-secondary)', fontSize: '0.875rem', margin: '4px 0 var(--space-md)' }}>
                Project: <Link href={`/projects/${m.project_id}`}>{m.projects?.title}</Link>
                {m.approved_at && <>{' · '}Approved {new Date(m.approved_at).toLocaleDateString('en-IN')}</>}
              </p>
              <ActionButton url={`/api/admin/milestones/${m.id}/release`} label="Retry payout"
                confirmText="Release the held money to the team now?" />
            </div>
          ))}
        </div>
      )}

      <h2 style={{ margin: 'var(--space-2xl) 0 var(--space-md)' }}>Recent rulings</h2>
      {!rulings?.length ? <p>None yet.</p> : (
        <ul>
          {rulings.map(r => (
            <li key={r.id}>
              {new Date(r.created_at).toLocaleDateString('en-IN')} — {r.milestones?.title}: <strong>{r.outcome.replaceAll('_', ' ')}</strong>. {r.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
