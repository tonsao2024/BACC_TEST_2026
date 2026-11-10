create table public.exam_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.exam_user_state enable row level security;
create policy exam_user_select on public.exam_user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy exam_user_insert on public.exam_user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy exam_user_update on public.exam_user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.exam_user_state to authenticated;
