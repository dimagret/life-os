create table if not exists public.user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_states enable row level security;

create policy "Users can read their own Life OS state"
on public.user_states for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own Life OS state"
on public.user_states for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own Life OS state"
on public.user_states for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_states to authenticated;
