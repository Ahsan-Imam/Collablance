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

  const { data: signatures } = await supabase.from('contract_signatures').select('user_id').eq('contract_id', id)

  let updatedContract = contract
  // Check against the split's own member list, not a fresh team-roster query —
  // membership can change after the split is proposed, and a locked split is
  // never edited, so completion must be judged by who's actually in it.
  const allSigned = contract.splits.every((s) => signatures.some((sig) => sig.user_id === s.user_id))
  if (allSigned) {
    const { data } = await supabase
      .from('project_contracts')
      .update({ status: 'signed', locked_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, collective_id, status, project_id, created_by, splits, created_at, locked_at')
      .single()
    if (data) updatedContract = data
  }

  return NextResponse.json({ data: { ...updatedContract, signatures } })
}
