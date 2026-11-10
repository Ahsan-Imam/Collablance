import { redirect } from 'next/navigation'

export default async function CollectiveDetailRedirect({ params }) {
  const { id } = await params
  redirect(`/teams/${id}`)
}
