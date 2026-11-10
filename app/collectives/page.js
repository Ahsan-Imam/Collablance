import { redirect } from 'next/navigation'

// Collectives are now called Teams — see app/teams.
export default function CollectivesRedirect() {
  redirect('/teams')
}
