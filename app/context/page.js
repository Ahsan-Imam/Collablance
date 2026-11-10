import { redirect } from 'next/navigation'

// The Team Context board now lives inside each project's workspace
// (app/projects/[id]/workspace) — context is scoped to a team's accepted
// project rather than a single global feed. Send old links there.
export default function ContextPage() {
  redirect('/projects')
}
