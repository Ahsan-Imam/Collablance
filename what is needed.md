# What Is Needed: CollabLance Professional Review

*Review date: 12 Nov 2026 · Scope: market research and a full codebase review (about 8,000 lines, 17 SQL migrations, 27 API routes, every page)*

## Bottom line

The idea is better than most. "Hire a ready-made team, and the payout split is signed before work starts" is a real gap that Upwork and Fiverr don't fill well. But the app isn't at a professional level yet, for three reasons:

1. The website promises things the code doesn't do.
2. The database lets users skip your rules.
3. The core money flow, the thing that makes a marketplace a business, doesn't exist yet.

Fix these in the order below.

---

## 1. How the professional platforms make money

| Platform | Model | What they actually take |
|---|---|---|
| **Upwork** | Freelancer pays 0–15% per contract (variable since May 2025). Client pays about 5%. Freelancers buy "Connects" (~$0.15 each) to send proposals | **18.5%** total take rate (Q2 2025) |
| **Fiverr** | Seller pays 20%, buyer pays about 5.5% on top | **~27.7%** blended |
| **Toptal / A.Team** | Curated, vetted talent and teams. Price is built into the hourly rate | High margin, few deals |
| **Contra** | No commission. Earns from Pro subscriptions | Subscription revenue |
| **Truelancer (India)** | No client fee. Sells proposal credit packs | Credits plus commission |

What they all have in common:

- They **hold the money**. Escrow is the product; everything else is software around it.
- They **charge both sides** and run several revenue streams at once (fees, subscriptions, paid proposals, ads).
- Their **public pages bring in visitors**. Every freelancer profile, category page and job listing is indexed by Google and shareable. That's free traffic.
- They **sell trust**: verification badges, success scores, portfolios, a working dispute process with admins behind it.

### The planned 3–5% fee won't cover costs

On a ₹50,000 project, 4% is ₹2,000. Razorpay takes roughly 2% plus 18% GST on its fee (verify current pricing), and you owe GST on your own fee. That leaves almost nothing for support and disputes.

### Recommended pricing (aiming for about 10–12% in total)

- **Client fee: 3–5%.** Posting stays free. Clients are your scarce side, so keep their cost low.
- **Team commission: about 8%**, dropping to 5% with a repeat client. This rewards loyalty and discourages taking repeat work off the platform.
- **Team Pro, ₹499–999 a month (later):** lower commission, featured placement, a branded team page. `guardrail.md` already lists "Collective brand pages".
- **Managed teams (later):** for big clients, you assemble the team yourself, A.Team style. This has the highest margin and needs no new code.
- **Don't charge for proposals yet.** There aren't enough freelancers for that.

### Pick one niche

Start with one, for example: *"Shopify + design + content teams for Indian D2C brands."* "Designers, developers and writers" is too broad to win at first.

---

## 2. Stop: things that are actively hurting you

### 🔴 A. Promises the code doesn't keep (legal risk)

There is **no Razorpay code anywhere** in `app/` or `lib/`, yet the site says:

- [app/page.js:51](app/page.js#L51): "**100%** Escrow protected"
- [app/for-freelancers/page.js](app/for-freelancers/page.js): "Split payments automatically with transparent escrow"
- [app/legal/terms/page.js:67-74](app/legal/terms/page.js#L67-L74): "Client funds are held in escrow via Razorpay" and a "3-5%" fee, which isn't a fee schedule.

`guardrail.md` says: *"Never make legal claims the platform cannot back up."*

**Action:** until payments work, change the copy to "Escrow payments coming soon," and choose one fee number.

### 🔴 B. Users can bypass the API and edit the database directly

The API routes check permissions correctly. But they run with the user's own Supabase login, and the browser holds that same key. So a user can open the browser console, call Supabase directly, skip the API, and do whatever the database rules (RLS) allow. Right now those rules are far looser than the API:

| Table | Current rule | What a user can do directly |
|---|---|---|
| `collective_members` ([app_schema.sql](lib/db/app_schema.sql)) | insert if `user_id = me` | **Join any team with role `owner`**, then read its chats and milestones and act as leader |
| `projects`, "collective lead can accept" ([project_acceptance_migration.sql](lib/db/project_acceptance_migration.sql)) | team lead can update **any column** | Change `owner_id` to themselves, edit the budget, set `status='completed'` |
| `milestones` ([milestones_migration.sql](lib/db/milestones_migration.sql)) | any participant can update any column | A team member sets their own milestone to `approved` or `paid`, or changes `amount` |
| `project_contracts` ([contracts_migration.sql](lib/db/contracts_migration.sql)) | any team member can update | **Rewrite `splits` after everyone signed**, or mark it `signed` with no signatures |
| `reviews` ([reviews_migration.sql](lib/db/reviews_migration.sql)) | insert if `reviewer_id = me` | Post unlimited 5★ reviews for any team on any project. That is fake reputation |
| `project_applications` ([project_applications_migration.sql](lib/db/project_applications_migration.sql)) | team lead can update | Mark their own application `accepted` |

**Fix:** remove the direct UPDATE and INSERT rules on these six tables. Have the API routes, which already do the right checks, write through a server-only service-role Supabase client, or through Postgres functions. That's one small change applied to each route.

**Do this before any real money flows.** Once payments exist, the `milestones` and `contracts` holes mean stolen money.

### 🟠 C. Project-owner actions with no safeguards

In [app/api/projects/[id]/route.js](app/api/projects/[id]/route.js), the owner can:

- set `collective_id` to **any team without that team agreeing**;
- mark a project `completed` while milestones are still unpaid;
- **hard-delete** the project.

That delete cascades and wipes the milestones, contracts, chat and reviews, which is the dispute evidence. `guardrail.md` requires soft deletes (`deleted_at`).

### 🟠 D. The marketplace is hidden from Google and from visitors

- [proxy.js](proxy.js) puts `/teams` and `/projects` behind login, and [app/robots.js](app/robots.js) blocks search engines from them.
- Pages like [app/teams/[id]/page.js](app/teams/[id]/page.js) are client-rendered (`'use client'`), so search engines see an empty page.

The result: a client can't look at a team before signing up, and a team can't share its profile link. On Upwork and Fiverr, public profiles and job pages are a major source of traffic.

### 🟡 E. Phase 2 is being built before Phase 1 is finished

The guardrail's build order puts payments at step 7, before ratings. Already built: the AI chatbot (`/chat`, on the `feat/ai-chatbot` branch), the vector-search Context Board, an MCP server and team recommendations. Meanwhile payments, the thing that earns money, haven't started.

**Action:** don't delete these. **Hide them from the navbar** and freeze them until payments work end to end.

### 🟡 F. Habits that will keep breaking things

- **Database changes are pasted by hand into the SQL editor**, in an order listed in the README. [lib/db/schema.sql](lib/db/schema.sql) is an old schema that defines different `milestones`, `ratings`, `messages` and `payment_splits` tables, which conflicts with the newer files. Delete it, and move to `supabase/migrations/` with the Supabase CLI.
- **There are no tests at all.** The minimum is a test for each money path: split validation, milestone status changes, and the payment webhook.
- **Several files are far too big.** For example, [app/projects/[id]/page.js](app/projects/[id]/page.js) is 773 lines, and the project's own rule is 150.
- **Each new feature has come with loose database rules.** Add a checklist step: *"Can a user do this from the browser console?"*

---

## 3. Add: what's missing compared with professional platforms

In priority order:

1. **Payments.** Use Razorpay Route. Each team member becomes a linked account (this includes their KYC). When the client pays for a milestone, create transfers that follow the signed split, with `on_hold: true`. When the client approves, release the hold. Also needed:
   - a webhook handler;
   - a `transactions` ledger table that is only ever added to, never edited;
   - a `/lib/payments` folder.

   Route only supports INR, which is fine for India-first. Before calling it "escrow," get a CA (chartered accountant) to check GST on the platform fee and e-commerce operator TDS duties (Section 194-O).
2. **Proposals with a price and timeline.** Right now `project_applications` only has a `message`. Professional proposals include a quote, a timeline and suggested milestones, so clients can compare teams side by side.
3. **Public, search-indexable pages:** `/teams/[slug]`, `/u/[username]`, the open-projects board, and category pages such as `/hire/shopify-teams`. Render them on the server and add them to the sitemap.
4. **Email notifications** for new applications, invites, milestone submitted or approved, and new messages. Marketplaces depend on these emails to bring people back. Right now there are none, so nobody returns.
5. **Deliverable uploads when a milestone is submitted** (Supabase Storage). Without files, a dispute has no evidence.
6. **An admin and dispute panel.** The dispute policy promises a 72-hour window and a CollabLance review, but no admin role or screen exists. A simple admin page that can view, freeze and rule on a project is enough.
7. **Trust signals:**
   - verified email and phone badges, and KYC-verified once payments exist;
   - a portfolio or case studies on team pages;
   - completed projects and total earned shown on team profiles;
   - a profile completeness meter.
8. **Search and filters** for projects and teams: skill, budget, focus area.
9. **Analytics and error monitoring:** Plausible (as `guardrail.md` says), plus Sentry or Vercel monitoring.

---

## 4. Design and website changes

- **Replace filler stats** ("₹0 / 1 / 100%") with real numbers once you have them, or with one concrete story: "a team of 3 shipped X for Y in 4 weeks."
- **Replace emoji icons and gradient orbs with real product screenshots**: the split contract, milestones, team chat. The split-signing screen is the most distinctive feature; show it on the homepage.
- **Add a pricing page.** Every serious platform shows its fees openly; there is none here. Add an FAQ too ("What if a team member leaves mid-project?").
- **Show teams before signup.** "Browse teams" should be the second call-to-action on the homepage, not something you see after logging in.

---

## 5. Suggested 6-week order

1. **Week 1:** fix the database rules and the false claims.
2. **Weeks 2–4:** Razorpay payments, the transactions ledger and the webhook.
3. **Week 5:** email notifications and deliverable uploads.
4. **Week 6:** public team pages, a pricing page and the homepage rewrite.
5. **Only then** switch the AI features back on.

---

## Caveats

- The app was not run, and the database bypasses were not tested against the live Supabase project. They're based on the SQL files, so check with `lib/db/check_tables.sql` that the live rules match.
- Competitor fee figures mostly come from third-party comparison sites, so confirm them on each platform's own pricing page.

## Sources

- [Upwork Q2 2025 take rate (Motley Fool)](https://www.fool.com/data-news/2025/08/06/upwork-upwk-q2-revenue-beats-by-4/)
- [Freelance platform statistics 2026 (jobbers.io)](https://www.jobbers.io/freelance-platform-statistics-2026-users-fees-market-share-analysis/)
- [Fiverr vs Upwork 2026 (ComeUp)](https://comeup.com/en/experts/fiverr-vs-upwork)
- [A.Team vs Contra](https://www.a.team/talent/comparisons/contra)
- [Toptal pricing (G2)](https://www.g2.com/products/toptal/pricing)
- [Contra alternatives (Arc)](https://arc.dev/employer-blog/contra-alternatives/)
- [Truelancer review (Flexiple)](https://flexiple.com/reviews/truelancer)
- [Truelancer (Fitgap)](https://us.fitgap.com/products/014426/truelancer)
- [Razorpay Route: transfers on orders](https://razorpay.com/docs/api/payments/route/create-transfers-orders.md)
- [Razorpay Route: modify settlement hold](https://razorpay.com/docs/api/payments/route/modify-settlement-hold.md)
- [Razorpay: freelancer registration and TDS](https://razorpay.com/rize/blogs/registering-a-freelance-business-in-india)
- [Razorpay: GST for freelancers](https://razorpay.com/learn/gst-registration-guide-freelancers/)
- [Marketplace category landing pages](https://fionaburns.beehiiv.com/p/why-your-marketplace-needs-category-landing-pages)
- [Sharetribe marketplace SEO](https://www.sharetribe.com/academy/marketplace-seo/keyword-targeted-content-marketing/)
- [Why staffing marketplaces fail to convert (Flow Ninja)](https://www.flow.ninja/blog/staffing-website-issues)
