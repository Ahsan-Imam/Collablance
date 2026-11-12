# CollabLance

A platform where freelancers form named teams, pitch clients together, and track projects, milestones, and payments in one place. India-first.

## Stack

- **Next.js 16** (App Router) + React 19
- **Supabase** (Postgres, Auth, Realtime, pgvector)
- **LangChain** + **Chroma** — AI Assistant (`/chat`), proposal drafts, split suggestions, semantic search and team matching (all in `lib/ai/`)
- **Razorpay Route** — milestone payments (off until `PAYMENTS_ENABLED=true`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase/Razorpay/Gemini keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Migrations live in `supabase/migrations/` and are applied with the [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`). Don't paste SQL into the dashboard editor — the CLI keeps a record of what's applied, so the database can't drift behind the code.

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --remote --dry-run   # see what would run
supabase db push --remote             # apply it
```

To change the schema: `supabase migration new <name>`, write the SQL in the new file, then `db push --remote`. Never edit a migration that's already been pushed — add a new one.

### Tests

```bash
npm test   # money maths, webhook signature check, milestone status rules
```

### Optional services

All off until their env vars are set (see `.env.example`): email notifications (Resend: `RESEND_API_KEY`, `EMAIL_FROM`), analytics (Plausible: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), payments (`PAYMENTS_ENABLED`).

### Admins and disputes

`/admin` lists disputed milestones and records rulings. Make someone an admin in the Supabase SQL editor: `insert into platform_admins values ('<their user id>');`

Every table needs RLS rules that hold even if someone calls Supabase directly from the browser (the anon key is public). `supabase/tests/security_hardening_test.sql` attacks the rules on a throwaway local Postgres — run it after changing access rules.

### AI features

All AI code is in `lib/ai/` and uses LangChain. See `.env.example` for the keys.

- **Model:** Gemini with `GEMINI_API_KEY` by default; Claude through Vercel AI Gateway if `AI_GATEWAY_API_KEY` is set.
- **Vector search:** Chroma. Locally: `pip install chromadb`, `chroma run`, and set `CHROMA_URL=http://localhost:8000`. In production use Chroma Cloud (`CHROMA_API_KEY`, `CHROMA_TENANT`, `CHROMA_DATABASE`). Without Chroma, search and matching fall back to keywords.
- After connecting Chroma, each user's existing Team Context cards are indexed by `POST /api/context/backfill`. New and edited cards index themselves.

### MCP server

`mcp-server/` exposes the Team Context board to external AI tools (Claude Desktop, Cursor, etc.) over MCP. See `mcp-server/README.md`.

## Project structure

- `app/` — routes (App Router), one folder per page/segment; `app/api/` for API routes
- `components/` — shared UI components
- `lib/` — Supabase clients, shared server-side helpers
- `supabase/migrations/` — database schema, applied in filename order by `supabase db push`
- `proxy.js` — auth middleware (protects logged-in-only routes)
- `guardrail.md` — the project's own scope/phase plan and build rules

## Scope

See `guardrail.md` for the authoritative phase plan (what's in scope now vs. later) and the hard rules around payments, data handling, and legal compliance.
