import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import RuleForm from './RuleForm'

export const metadata = { title: 'Disputes — CollabLance Admin', robots: { index: false } }

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
  const [{ data: disputed, error }, { data: rulings }] = await Promise.all([
    admin.from('milestones')
      .select('id, title, description, amount, funded_at, submitted_at, updated_at, project_id, projects(title, owner_id, collectives(name))')
      .eq('status', 'disputed')
      .order('updated_at', { ascending: true }),
    admin.from('dispute_rulings')
      .select('id, outcome, note, created_at, milestones(title)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

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
