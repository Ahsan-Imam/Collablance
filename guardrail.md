# CollabLance Dev Agent Guardrails

## Project Context
You are building CollabLance — a platform where freelancers 
form named collectives, pitch clients together, and split 
payments automatically. Built solo by a student founder. 
Stack: Next.js, Supabase (PostgreSQL), Razorpay, 
LangChain, Claude API, Chroma (vector DB).
India-first platform. All legal requirements must 
comply with Indian law first, international second.

## Current Phase — Phase 1 Only
Build only what Phase 1 needs. Do not build ahead.

### Phase 1 scope (build this):
- Auth (Supabase)
- Freelancer profiles with skill tagging
- Collective formation and membership
- Project posting and browsing
- Milestone creation and tracking
- Basic payment via Razorpay with platform cut
- Rating and reputation after project completion
- Basic team chat per project
- All legal pages and compliance features below

### Phase 2 scope (do not build yet):
- Shared AI workspace
- LangChain integration
- Chroma vector DB
- NDA generation and signing
- AI pitch builder
- Smart split suggestion
- AI team matchmaking
- Collective brand pages
- Enterprise features

If asked to build a Phase 2 feature, refuse and explain 
why it belongs in Phase 2. Do not build it anyway.

## Legal Pages — Build All of These
Every page must be linked in the footer and 
accessible without logging in.

### 1. Terms of Service
Must include:
- Platform description and permitted use
- User eligibility (18+ or with guardian consent)
- Collective formation rules
- Project posting rules
- Payment terms — platform cut percentage, 
  when funds are released, dispute process
- Prohibited content and conduct
- Intellectual property — work produced belongs 
  to the client upon full payment
- Termination and blacklisting conditions
- NDA violation consequences — fines and 
  permanent ban (Phase 2, placeholder for now)
- Governing law: India, jurisdiction: Pune
- CollabLance is not liable for disputes between 
  members beyond the platform's dispute process
- Right to modify terms with 30-day notice

### 2. Privacy Policy
Must include:
- What data is collected: name, email, skills, 
  payment details (via Razorpay, not stored by us),
  project content, messages, ratings
- How data is used: platform operation, 
  matching, payments, reputation scoring
- Data sharing: only with Razorpay for payments, 
  Supabase for storage, Claude API for AI features
- Data retention: project data kept for 3 years 
  after completion for dispute resolution
- User rights: access, correction, deletion request
- Cookies policy summary with link to full 
  cookie policy
- Contact for privacy requests
- Compliant with India's Digital Personal Data 
  Protection Act 2023 (DPDPA)
- No data sold to third parties ever

### 3. Cookie Policy
Must include:
- What cookies are used:
  - Essential: auth session, CSRF protection
  - Functional: user preferences, language
  - Analytics: page views, feature usage 
    (use privacy-friendly analytics only — 
    Plausible or Umami, not Google Analytics)
  - No advertising or tracking cookies
- Cookie consent banner on first visit
- Option to accept essential only or all cookies
- How to manage/delete cookies
- Cookies do not store payment information ever

### 4. Refund Policy
Must include:
- Platform fee (3-5% cut) is non-refundable 
  once a milestone is approved by the client
- Escrow refund process if project is cancelled 
  before work starts — full refund to client
- Partial refund process if project is cancelled 
  mid-milestone — based on approved milestone 
  completion percentage
- Dispute-based refunds follow the dispute 
  resolution process in Terms of Service
- Refund processing time: 5-7 business days 
  via original payment method
- Razorpay handles refund execution — 
  CollabLance initiates, Razorpay processes

### 5. Intellectual Property Policy
Must include:
- Work created on CollabLance belongs to the 
  client upon full payment release from escrow
- Before full payment, work remains property 
  of the collective that created it
- CollabLance claims no ownership over any 
  work created on the platform
- Freelancers retain right to show work in 
  their portfolio unless NDA prohibits it
- AI-generated content ownership follows 
  Indian copyright law — currently unresolved, 
  disclose this honestly
- Copyright infringement reporting process

### 6. Dispute Resolution Policy
Must include:
- Step 1: 72-hour negotiation window between 
  team and client
- Step 2: CollabLance reviews evidence log 
  and makes ruling
- Step 3: Appeal to human reviewer
- Step 4: Binding arbitration if unresolved
- Escrow held until dispute is resolved
- CollabLance ruling is final for platform 
  purposes — external legal action is 
  the user's right but platform ruling stands

## Cookie Consent Implementation
- Banner appears on first visit for new users
- Two options only: Accept All or Essential Only
- Choice stored in localStorage
- Essential cookies load regardless of choice
- Analytics cookies load only if Accept All chosen
- No dark patterns — both options equally visible
- Banner does not block page content
- User can change preference in account settings

## Copyright Implementation
- Footer copyright: 
  © 2024 CollabLance. All rights reserved.
- Update year automatically using JavaScript
- Every legal page has last updated date at top
- CollabLance logo and name are platform 
  trademarks — add TM symbol in footer

## Data Handling Rules
- Never log passwords — Supabase handles auth
- Never log full payment amounts in 
  client-side console
- Never store Razorpay payment IDs in 
  localStorage or sessionStorage
- Anonymise user data in error logs — 
  log user ID not email or name
- Delete unverified accounts after 30 days
- Send data deletion confirmation email 
  when user requests account deletion

## Database Rules
- Use PostgreSQL via Supabase exclusively
- Every financial transaction must be logged with 
  timestamp, amount, sender, receiver, project ID
- Payment splits must be stored as locked records — 
  never update a split after it is agreed and signed
- Never store split percentages as floating point — 
  use integers (50, 30, 20) to avoid rounding errors 
  that cause payment disputes
- Every schema change must be backwards compatible — 
  no breaking migrations without explicit instruction
- Row level security must be enabled on all tables — 
  members can only read their own project data
- Store consent records — when user accepted 
  cookies, what version of terms they agreed to,
  timestamp of agreement

## Code Rules
- JavaScript only
- Never hardcode API keys, secrets, or environment 
  variables — always use .env
- Never commit .env files
- Every payment-related function must have error 
  handling — failed payments must log before throwing
- Never delete data — use soft deletes with 
  deleted_at timestamps only
- Every API route must validate the requesting user 
  belongs to the project they are accessing
- Never expose other members' private data in 
  API responses — filter at the query level, 
  not the frontend level

## What to Build First — Strict Order
1. Supabase project setup + schema
2. Auth — signup as Freelancer only (no Client yet)
3. Freelancer profile creation
4. Collective formation — create and join
5. Project posting by collective
6. Milestone creation per project
7. Basic Razorpay payment integration
8. Milestone approval and payment release
9. Rating system after project completion
10. All legal pages and cookie consent
11. Client signup (only after steps 1-10 working)

Do not move to the next step until the current 
step is tested and working. Do not skip steps.

## Hard Limits — Never Do These
- Never build a feature not in Phase 1 scope 
  without explicit instruction
- Never modify payment or escrow logic without 
  flagging it first and waiting for confirmation
- Never remove a Razorpay webhook handler — 
  missing webhooks cause silent payment failures
- Never bypass Supabase row level security 
  for convenience
- Never use client-side logic for payment 
  calculations — all split math happens server side
- Never store card numbers, UPI IDs, or any 
  payment credentials in your database
- Never deploy to production without testing 
  payment flows in Razorpay test mode first
- Never load third party scripts without 
  user cookie consent where required
- Never collect data not listed in the 
  privacy policy
- Never make legal claims the platform 
  cannot back up

## When to Stop and Ask
Stop and ask before proceeding when:
- A schema change affects payments or splits tables
- A feature request belongs to Phase 2
- An API integration requires paid plan or 
  production credentials
- A decision affects how money moves through 
  the platform
- Two features conflict architecturally
- A legal page needs a claim that may not 
  be legally accurate for India

## Code Style
- Components in /components
- API routes in /app/api
- Database queries in /lib/db
- Payment logic in /lib/payments — isolated, 
  never mixed into components
- Legal pages in /app/legal
- Cookie consent component in 
  /components/CookieConsent
- Types in /types
- Keep components small — if a component 
  exceeds 150 lines, split it

## Tone
You are building for a solo student founder with 
limited time and budget. Suggest the simplest 
solution that works, not the most elegant one. 
Flag complexity before introducing it. If two 
approaches exist, recommend the faster one unless 
the slower one prevents a serious problem later.