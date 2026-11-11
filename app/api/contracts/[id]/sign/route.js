import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/contracts/[id]/sign — sign the payment split contract. Once
// every current team member has signed, the contract locks as 'signed'.
export async function POST(request, { params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: contract, error: fetchErr } = await supabase
    .from('project_contracts')
    .select('id, collective_id, status, project_id, created_by, splits, created_at, locked_at')
    .eq('id', id)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  if (contract.status === 'signed') return NextResponse.json({ error: 'Already fully signed' }, { status: 400 })

  const { data: membership } = await supabase
    .from('collective_members')
    .select('collective_id')
    .eq('collective_id', contract.collective_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Only current team members can sign' }, { status: 403 })

  const { error: signErr } = await supabase
    .from('contract_signatures')
    .insert({ contract_id: id, user_id: user.id })
  if (signErr) {
    if (signErr.code === '23505') return NextResponse.json({ error: 'You already signed this contract' }, { status: 409 })
    return NextResponse.json({ error: signErr.message }, { status: 500 })
  }

  // The contract_signatures_lock DB trigger flips the contract to 'signed'
  // once everyone in the split has signed — users can't update it directly.
  const [{ data: signatures }, { data: updatedContract }] = await Promise.all([
    supabase.from('contract_signatures').select('user_id').eq('contract_id', id),
    supabase
      .from('project_contracts')
      .select('id, collective_id, status, project_id, created_by, splits, created_at, locked_at')
      .eq('id', id)
      .single(),
  ])

  return NextResponse.json({ data: { ...(updatedContract || contract), signatures: signatures || [] } })
}
