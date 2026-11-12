import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/search'
import ProjectCard from '@/components/ProjectCard/ProjectCard'
import '../projects/projects.css'

export const metadata = {
  title: 'Open Freelance Projects for Teams — CollabLance',
  description: 'Projects from clients looking for a freelancer team. Send a proposal with your team\'s price and timeline.',
  alternates: { canonical: '/open-projects' },
}

// Public board of projects still looking for a team. Opening one needs an account.
export default async function OpenProjectsPage({ searchParams }) {
  const { q } = await searchParams
  const search = typeof q === 'string' ? q.trim() : ''
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, title, description, budget_min, budget_max, currency, status, skills_needed, deadline')
    .eq('status', 'open')
    .is('collective_id', null)
    .order('created_at', { ascending: false })
    .limit(60)
  if (search) query = query.ilike('title', `%${escapeLike(search)}%`)
  const { data: projects, error } = await query

  return (
    <div className="projects-page">
      <div className="container">
        <div className="projects-page__header">
          <div>
            <h1 className="projects-page__title">Open projects</h1>
            <p className="projects-page__subtitle">Clients looking for a team. Log in to send a proposal with your price and timeline.</p>
          </div>
          <Link href="/for-freelancers" className="btn btn--primary" id="open-projects-start-team">Start a Team</Link>
        </div>

        <form action="/open-projects" className="projects-page__filters" role="search">
          <input type="search" name="q" className="input" placeholder="Search projects..." defaultValue={search} aria-label="Search projects" id="open-project-search" />
        </form>

        {error && <div className="alert alert--error">Couldn&apos;t load projects. Please try again.</div>}

        {!projects?.length ? (
          <div className="projects-empty">
            <h2 className="projects-empty__title">{search ? 'No projects match your search' : 'No open projects right now'}</h2>
            <p className="projects-empty__desc">New projects appear here as clients post them.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
