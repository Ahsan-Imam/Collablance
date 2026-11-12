'use client'

import { useState } from 'react'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

// Razorpay's script is loaded only when the client chooses to pay, so no
// third-party script runs on ordinary page views.
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.onload = resolve
    script.onerror = () => reject(new Error('Couldn’t load Razorpay. Check your connection.'))
    document.body.appendChild(script)
  })
}

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function FundMilestoneButton({ milestoneId, onFunded, onError }) {
  const [busy, setBusy] = useState(false)

  const fund = async () => {
    setBusy(true)
    onError('')
    try {
      const res = await fetch(`/api/milestones/${milestoneId}/fund`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const order = json.data

      const ok = confirm(
        `Fund this milestone?\n\n${rupees(order.milestone_amount)} milestone\n+ ${rupees(order.client_fee)} service fee (5%)\n= ${rupees(order.amount)}\n\n` +
        'The money is held and only paid to the team when you approve the work.'
      )
      if (!ok) return

      await loadCheckout()
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: 'CollabLance',
          description: order.description,
          handler: async (response) => {
            try {
              const verify = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              })
              const vJson = await verify.json()
              if (!verify.ok) throw new Error(vJson.error)
              resolve()
            } catch (err) {
              reject(err)
            }
          },
          modal: { ondismiss: () => resolve('dismissed') },
        })
        checkout.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')))
        checkout.open()
      }).then((result) => { if (result !== 'dismissed') onFunded() })
    } catch (err) {
      onError(err.message || 'Payment failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="btn btn--primary btn--sm" disabled={busy} onClick={fund}>
      {busy ? 'Opening…' : 'Fund milestone'}
    </button>
  )
}
