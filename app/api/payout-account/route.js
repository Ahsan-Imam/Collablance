import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentsEnabled, createLinkedAccount } from '@/lib/payments/razorpay'
import { NextResponse } from 'next/server'

// GET /api/payout-account — has the signed-in freelancer set up payouts?
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('payout_accounts').select('created_at').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ data: { hasPayoutAccount: !!data, paymentsEnabled: paymentsEnabled() } })
}

// POST /api/payout-account — create the freelancer's Razorpay Route linked
// account. Bank details are passed straight to Razorpay and never stored or
// logged here; we keep only Razorpay's account id.
export async function POST(request) {
  if (!paymentsEnabled()) return NextResponse.json({ error: 'Payments aren’t live yet' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const legalName = String(body.legal_name || '').trim()
  const phone = String(body.phone || '').replace(/[\s-]/g, '')
  const accountNumber = String(body.account_number || '').replace(/\s/g, '')
  const ifsc = String(body.ifsc || '').trim().toUpperCase()

  if (body.tnc_accepted !== true) return NextResponse.json({ error: 'Please accept the payout terms' }, { status: 400 })
  if (legalName.length < 4 || legalName.length > 200) return NextResponse.json({ error: 'Enter your full name as on your bank account' }, { status: 400 })
  if (!/^\+?\d{10,14}$/.test(phone)) return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  if (!/^\d{5,20}$/.test(accountNumber)) return NextResponse.json({ error: 'Enter a valid bank account number' }, { status: 400 })
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return NextResponse.json({ error: 'Enter a valid IFSC code (e.g. HDFC0001234)' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('payout_accounts').select('user_id').eq('user_id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Payout details are already set up' }, { status: 409 })

  try {
    const account = await createLinkedAccount({
      type: 'route',
      tnc_accepted: true,
      reference_id: user.id,
      legal_business_name: legalName,
      business_type: 'individual',
      email: user.email,
      phone,
      settlement_accounts: [{
        method: 'bank_account',
        bank_account: {
          account_number: accountNumber,
          beneficiary_name: legalName,
          code_type: 'ifsc',
          code: ifsc,
          currency: 'INR',
          is_default: true,
        },
      }],
    }, `payout-${user.id}`)

    const { error } = await admin.from('payout_accounts').insert({ user_id: user.id, razorpay_account_id: account.id })
    if (error) throw new Error(error.message)
    return NextResponse.json({ data: { hasPayoutAccount: true } }, { status: 201 })
  } catch (err) {
    console.error('[payments] payout account setup failed for user', user.id, err.message)
    if (/route feature not enabled/i.test(err.message)) {
      return NextResponse.json({ error: 'Payouts aren’t switched on for CollabLance yet — your details are fine, please try again later.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Razorpay couldn’t verify those details. Check them and try again.' }, { status: 502 })
  }
}
