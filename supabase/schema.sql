-- ============================================================
--  Arjean Amiscosa Financial - Financial Roadmap funnel schema
--  Run this once in Supabase: Dashboard > SQL Editor > New query.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- leads: one row per completed Financial Roadmap Test
-- ------------------------------------------------------------
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  surname           text not null,
  first_name        text not null,
  middle_name       text,
  email             text not null,
  date_of_birth     date,
  preferred_contact text,
  mobile            text,
  consent           boolean not null default false,
  score             integer,
  risk_band         text,
  answers           jsonb not null default '{}'::jsonb,
  results           jsonb not null default '{}'::jsonb,
  source            text,
  landing_path      text,
  utm               jsonb not null default '{}'::jsonb
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_idx      on public.leads (email);

alter table public.leads enable row level security;

-- The public website may ONLY insert, and only with consent ticked.
drop policy if exists "public can submit a lead" on public.leads;
create policy "public can submit a lead"
  on public.leads
  for insert
  to anon
  with check (consent = true);

-- There is deliberately NO select / update / delete policy for anon.
-- Visitors can post their own answers but can never read anyone back.
-- Read your leads from the Supabase Table Editor, which bypasses RLS
-- because it authenticates as the service role.

-- ------------------------------------------------------------
-- call_requests: one row each time someone clicks Book my free call
-- ------------------------------------------------------------
create table if not exists public.call_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  lead_id           uuid references public.leads (id) on delete set null,
  email             text,
  mobile            text,
  preferred_contact text,
  score             integer,
  notes             text
);

create index if not exists call_requests_created_at_idx on public.call_requests (created_at desc);

alter table public.call_requests enable row level security;

drop policy if exists "public can request a call" on public.call_requests;
create policy "public can request a call"
  on public.call_requests
  for insert
  to anon
  with check (true);

-- ------------------------------------------------------------
-- Safety notes
-- ------------------------------------------------------------
-- 1. Do NOT create views over public.leads in the public schema unless you
--    add  with (security_invoker = true)  - a plain view runs as its owner
--    and would let anonymous visitors read every lead.
-- 2. Never put the service_role key or the database password in the front end.
--    assets/config.js should only ever hold the anon (publishable) key.
-- 3. If you later add email notifications, do it in a Supabase Edge Function
--    or a database webhook so no secret has to reach the browser.
