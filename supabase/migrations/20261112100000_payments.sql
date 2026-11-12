-- Milestone escrow via Razorpay Route. The client funds a milestone before
-- work starts; the payment is split into held transfers (one per team member,
-- per the signed split) and released when the client approves.
--
-- Users can only READ these tables. Every write happens server-side in
-- lib/payments with the service role, after the route has checked who's asking.
-- Amounts are integer paise.

-- ─────────────────────────────────────────────────────────────
-- 1. Payout accounts: a Razorpay Route linked account per freelancer.
--    Bank details go straight to Razorpay and are never stored here.
-- ─────────────────────────────────────────────────────────────
create table if not exists payout_accounts (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  razorpay_account_id text not null unique,
  created_at          timestamptz default now()
);
alter table payout_accounts enable row level security;
drop policy if exists "payout_accounts: own read" on payout_accounts;
create policy "payout_accounts: own read"
  on payout_accounts for select to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 2. Milestone payments: one row per checkout attempt
-- ─────────────────────────────────────────────────────────────
create table if not exists milestone_payments (
  id                  uuid default gen_random_uuid() primary key,
  milestone_id        uuid references milestones(id) on delete restrict not null,
  project_id          uuid references projects(id) on delete restrict not null,
  payer_id            uuid references auth.users(id) not null,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text unique,
  milestone_amount    int not null check (milestone_amount >= 100),
  client_fee          int not null check (client_fee >= 0),
  team_commission     int not null check (team_commission >= 0),
  total_amount        int not null,
  payouts             jsonb not null,  -- [{user_id, account, percent, amount}], fixed at checkout
  status              text not null default 'created' check (status in ('created', 'paid', 'released')),
  created_at          timestamptz default now(),
  paid_at             timestamptz,
  released_at         timestamptz,
  check (total_amount = milestone_amount + client_fee)
);
-- A milestone can have abandoned checkouts, but only one payment that went through
create unique index if not exists milestone_payments_one_paid
  on milestone_payments (milestone_id) where status in ('paid', 'released');

alter table milestone_payments enable row level security;
drop policy if exists "milestone_payments: participant can read" on milestone_payments;
create policy "milestone_payments: participant can read"
  on milestone_payments for select to authenticated
  using (
    exists (select 1 from projects p where p.id = milestone_payments.project_id and p.owner_id = auth.uid())
    or exists (
      select 1 from projects p join collective_members cm on cm.collective_id = p.collective_id
      where p.id = milestone_payments.project_id and cm.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 3. Payment events: append-only money log (every order, payment,
--    release and failure, with amount and timestamp)
-- ─────────────────────────────────────────────────────────────
create table if not exists payment_events (
  id         bigint generated always as identity primary key,
  payment_id uuid references milestone_payments(id) on delete restrict not null,
  event      text not null,
  amount     int,
  data       jsonb,
  created_at timestamptz default now()
);
alter table payment_events enable row level security;
drop policy if exists "payment_events: participant can read" on payment_events;
create policy "payment_events: participant can read"
  on payment_events for select to authenticated
  using (exists (
    select 1 from milestone_payments mp join projects p on p.id = mp.project_id
    where mp.id = payment_events.payment_id
      and (p.owner_id = auth.uid()
        or exists (select 1 from collective_members cm where cm.collective_id = p.collective_id and cm.user_id = auth.uid()))
  ));

-- ─────────────────────────────────────────────────────────────
-- 4. Milestones: funded_at is set only by the server once paid; a funded
--    milestone can't be edited or deleted (the money is fixed to it)
-- ─────────────────────────────────────────────────────────────
alter table milestones add column if not exists funded_at timestamptz;

create or replace function guard_milestone_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  move text;
begin
  if uid is null then return new; end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.submitted_at := null;
    new.approved_at := null;
    new.approved_by := null;
    new.funded_at := null;
    return new;
  end if;

  if new.project_id is distinct from old.project_id then
    raise exception 'A milestone cannot move between projects';
  end if;

  if new.funded_at is distinct from old.funded_at then
    raise exception 'Only a confirmed payment can mark a milestone funded';
  end if;

  select coalesce(p.owner_id = uid, false) into is_owner from projects p where p.id = old.project_id;
  is_owner := coalesce(is_owner, false);

  if new.status is distinct from old.status then
    move := old.status || '>' || new.status;
    if not (
         (is_owner and move in ('submitted>pending', 'submitted>approved', 'submitted>disputed', 'approved>disputed'))
      or (not is_owner and move in ('pending>submitted', 'submitted>disputed', 'approved>disputed'))
    ) then
      raise exception 'Cannot move milestone from "%" to "%" with your role', old.status, new.status;
    end if;
  end if;

  if (new.title, new.description, new.amount, new.currency, new.due_date, new.order_index)
     is distinct from (old.title, old.description, old.amount, old.currency, old.due_date, old.order_index)
     and not (is_owner and old.status = 'pending' and old.funded_at is null) then
    raise exception 'Only the project owner can edit a milestone, and only before it is funded or submitted';
  end if;

  if new.approved_by is distinct from old.approved_by and new.approved_by is distinct from uid then
    raise exception 'approved_by must be you';
  end if;

  return new;
end $$;

revoke execute on function guard_milestone_write() from public, anon, authenticated;

drop policy if exists "milestones: owner can delete" on milestones;
create policy "milestones: owner can delete"
  on milestones for delete to authenticated
  using (
    funded_at is null
    and exists (select 1 from projects p where p.id = milestones.project_id and p.owner_id = auth.uid())
  );
