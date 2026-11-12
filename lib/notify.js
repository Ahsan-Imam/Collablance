import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/site'

/**
 * Email the given users (looked up by id — emails live in auth.users, which
 * only the service role can read). Does nothing until RESEND_API_KEY and
 * EMAIL_FROM are set. Never throws: a failed email must not fail the request.
 * Call inside after() so it runs once the response is sent.
 */
export async function notify(userIds, subject, text, path = '/inbox') {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from || !process.env.SUPABASE_SERVICE_ROLE_KEY) return
  try {
    const admin = createAdminClient()
    const ids = [...new Set(userIds)].filter(Boolean)
    const users = await Promise.all(ids.map((id) => admin.auth.admin.getUserById(id)))
    const emails = users.map((u) => u.data?.user?.email).filter(Boolean)
    // One email per person, so recipients never see each other's addresses
    await Promise.all(emails.map(async (to) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text: `${text}\n\n${SITE_URL}${path}\n\n— CollabLance` }),
      })
      if (!res.ok) console.error('[notify] send failed', res.status, await res.text())
    }))
  } catch (err) {
    console.error('[notify]', err.message)
  }
}

export async function teamMemberIds(supabase, collectiveId) {
  const { data } = await supabase.from('collective_members').select('user_id').eq('collective_id', collectiveId)
  return (data || []).map((m) => m.user_id)
}
