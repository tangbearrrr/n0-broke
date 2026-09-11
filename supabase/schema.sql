-- N0broke — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Auth stays on Firebase (see src/hooks/useAuth.ts) — the app talks to
-- Supabase with the public anon key, so RLS is enabled with permissive
-- "allow all" policies rather than per-user policies. The Firebase login
-- gate is what actually keeps this app single-user.

create extension if not exists pgcrypto;

-- ─── Transactions ────────────────────────────────────────────────────────────

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  date date,
  name text not null,
  amount numeric not null,
  type text not null check (type in ('KTC', 'Shopee', 'Other')),
  created_at timestamptz not null default now()
);

alter table transactions enable row level security;
create policy "allow all - transactions" on transactions for all using (true) with check (true);

-- ─── Debts ───────────────────────────────────────────────────────────────────

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  debt_name text not null,
  monthly_payment numeric not null,
  remaining text not null default '-',
  type text not null default '',
  created_at timestamptz not null default now()
);

alter table debts enable row level security;
create policy "allow all - debts" on debts for all using (true) with check (true);

-- ─── Income ──────────────────────────────────────────────────────────────────
-- Read-only from the app UI; edit values directly in the Supabase Table Editor.

create table if not exists income (
  label text primary key,
  value numeric not null
);

alter table income enable row level security;
create policy "allow all - income" on income for all using (true) with check (true);

insert into income (label, value)
values ('Net Income', 52178.10)
on conflict (label) do nothing;

-- ─── Notes ───────────────────────────────────────────────────────────────────

create table if not exists notes (
  month text primary key,
  note text not null default ''
);

alter table notes enable row level security;
create policy "allow all - notes" on notes for all using (true) with check (true);
