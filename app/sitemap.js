import { createClient } from '@/lib/supabase/server'
import { SITE_URL, FOCUS, focusSlug } from '@/lib/site'

export default async function sitemap() {
  const staticPaths = [
    '', '/for-freelancers', '/pricing', '/hire', '/open-projects',
    ...Object.keys(FOCUS).map((key) => `/hire/${focusSlug(key)}`),
    '/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/refund', '/legal/ip', '/legal/disputes',
  ]

  const supabase = await createClient()
  const { data: teams } = await supabase.from('collectives').select('id, updated_at').eq('is_public', true).limit(5000)

  return [
    ...staticPaths.map((path) => ({ url: `${SITE_URL}${path}`, lastModified: new Date() })),
    ...(teams || []).map((t) => ({ url: `${SITE_URL}/teams/${t.id}`, lastModified: t.updated_at || new Date() })),
  ]
}
