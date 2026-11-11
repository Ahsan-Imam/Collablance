# CollabLance

A platform where freelancers form named teams, pitch clients together, and track projects, milestones, and payments in one place. India-first.

## Stack

- **Next.js 16** (App Router) + React 19
- **Supabase** (Postgres, Auth, Realtime, pgvector)
- **Vercel AI Gateway** + AI SDK — the in-app AI Assistant (`/chat`)
- **Razorpay** — payments (integration pending, see `guardrail.md`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase/Razorpay/Gemini keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Run the SQL files in `lib/db/` against your Supabase project, in this order, via the Supabase SQL editor:

1. `setup.sql`, `app_schema.sql` — core tables (profiles, collectives, projects)
2. `team_context_migration.sql`, `vector_migration.sql`, `context_scoped_search_migration.sql` — Team Context board + semantic search
3. `dual_role_migration.sql`, `client_role_migration.sql`, `google_client_signup_migration.sql` — client/freelancer dual-role accounts
4. `project_acceptance_migration.sql` — team accepts a project to open its workspace
5. `milestones_migration.sql`, `reviews_migration.sql`, `project_messages_migration.sql` — milestones, ratings, team chat
6. `team_invites_migration.sql`, `project_applications_migration.sql`, `team_leader_migration.sql`, `contracts_migration.sql` — invites, team applications, team leader role, payment split contracts
7. `security_hardening_migration.sql` — **always last**: makes the database enforce who can change what (the browser can call Supabase directly, so API checks alone aren't enough)

### AI Assistant (`/chat`)

Routed through [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). For local dev, either:
- `vercel link` + `vercel env pull` (OIDC — matches production), or
- set `AI_GATEWAY_API_KEY` in `.env.local`.

### MCP server

`mcp-server/` exposes the Team Context board to external AI tools (Claude Desktop, Cursor, etc.) over MCP. See `mcp-server/README.md`.

## Project structure

- `app/` — routes (App Router), one folder per page/segment; `app/api/` for API routes
- `components/` — shared UI components
- `lib/` — Supabase clients, shared server-side helpers, SQL migrations (`lib/db/`)
- `proxy.js` — auth middleware (protects logged-in-only routes)
- `guardrail.md` — the project's own scope/phase plan and build rules

## Scope

See `guardrail.md` for the authoritative phase plan (what's in scope now vs. later) and the hard rules around payments, data handling, and legal compliance.
