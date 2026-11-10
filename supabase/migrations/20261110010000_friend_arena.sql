-- ============================================================
-- Friend Arena: System-wide friend directory, public stats & multiplayer matches
-- ============================================================

create table if not exists public.friend_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  stats jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friend_profiles enable row level security;

drop policy if exists friend_profiles_select on public.friend_profiles;
create policy friend_profiles_select
  on public.friend_profiles for select to authenticated
  using (true);

drop policy if exists friend_profiles_insert on public.friend_profiles;
create policy friend_profiles_insert
  on public.friend_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists friend_profiles_update on public.friend_profiles;
create policy friend_profiles_update
  on public.friend_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.friend_profiles to authenticated;

-- Multiplayer matches (2..N players)
create table if not exists public.friend_matches (
  id text primary key,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  host_name text not null,
  title text not null,
  message text not null default '',
  exam_spec jsonb not null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'cancelled')),
  nudge_seq integer not null default 1,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.friend_matches enable row level security;

drop policy if exists friend_matches_select on public.friend_matches;
create policy friend_matches_select
  on public.friend_matches for select to authenticated
  using (true);

drop policy if exists friend_matches_insert on public.friend_matches;
create policy friend_matches_insert
  on public.friend_matches for insert to authenticated
  with check ((select auth.uid()) = host_user_id);


grant select, insert, update on public.friend_matches to authenticated;

create table if not exists public.friend_match_players (
  match_id text not null references public.friend_matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'guest' check (role in ('host', 'guest')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'playing', 'finished', 'declined')),
  decline_count integer not null default 0,
  answered_count integer not null default 0,
  total_questions integer not null default 0,
  score numeric(5,1),
  correct_count integer,
  time_used_sec integer not null default 0,
  responded_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index if not exists idx_friend_match_players_user on public.friend_match_players(user_id);
create index if not exists idx_friend_matches_updated on public.friend_matches(updated_at desc);

alter table public.friend_match_players enable row level security;

drop policy if exists friend_match_players_select on public.friend_match_players;
create policy friend_match_players_select
  on public.friend_match_players for select to authenticated
  using (true);

drop policy if exists friend_match_players_insert on public.friend_match_players;
create policy friend_match_players_insert
  on public.friend_match_players for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.friend_matches m
      where m.id = match_id and m.host_user_id = (select auth.uid())
    )
  );

drop policy if exists friend_match_players_update on public.friend_match_players;
create policy friend_match_players_update
  on public.friend_match_players for update to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.friend_matches m
      where m.id = match_id and m.host_user_id = (select auth.uid())
    )
  );

grant select, insert, update on public.friend_match_players to authenticated;

-- policy นี้ต้องสร้างหลังตาราง friend_match_players มีอยู่จริง ไม่อย่างนั้น migration จะล้มทั้งก้อน
drop policy if exists friend_matches_update on public.friend_matches;
create policy friend_matches_update
  on public.friend_matches for update to authenticated
  using (
    (select auth.uid()) = host_user_id
    or exists (
      select 1 from public.friend_match_players mp
      where mp.match_id = id and mp.user_id = (select auth.uid())
    )
  );

-- Extract public stats summary from exam_user_state.data so existing accounts appear immediately
create or replace function public.extract_public_exam_stats(state_data jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  first_pid text;
  res_arr jsonb := '[]'::jsonb;
  cnt integer := 0;
  avg_score integer := 0;
  best_score integer := 0;
  total_sec bigint := 0;
  passed_parts integer := 0;
  recent jsonb := '[]'::jsonb;
begin
  if state_data is null or jsonb_typeof(state_data) <> 'object' then
    return jsonb_build_object('count', 0, 'avg', 0, 'best', 0, 'totalTimeSec', 0, 'passedParts', 0, 'recentResults', '[]'::jsonb);
  end if;

  first_pid := state_data #>> '{profiles,0,id}';
  if first_pid is not null and jsonb_typeof(state_data -> 'results' -> first_pid) = 'array' then
    res_arr := state_data -> 'results' -> first_pid;
  end if;

  select
    count(*)::int,
    coalesce(round(avg(coalesce((elem->>'score')::numeric, 0)))::int, 0),
    coalesce(round(max(coalesce((elem->>'score')::numeric, 0)))::int, 0),
    coalesce(sum(coalesce((elem->>'timeUsedSec')::bigint, 0)), 0)
  into cnt, avg_score, best_score, total_sec
  from jsonb_array_elements(res_arr) as elem;

  select count(distinct elem->>'partId')::int
  into passed_parts
  from jsonb_array_elements(res_arr) as elem
  where elem->>'partId' is not null
    and elem->>'partId' <> 'mock'
    and coalesce((elem->>'score')::numeric, 0) >= 60;

  select coalesce(jsonb_agg(item), '[]'::jsonb)
  into recent
  from (
    select jsonb_build_object(
      'id', elem->>'id',
      'kind', coalesce(elem->>'kind', 'part'),
      'partId', elem->>'partId',
      'partLabel', elem->>'partLabel',
      'partTitle', elem->>'partTitle',
      'setName', elem->>'setName',
      'score', coalesce((elem->>'score')::numeric, 0),
      'correct', coalesce((elem->>'correct')::int, 0),
      'total', coalesce((elem->>'total')::int, 0),
      'timeUsedSec', coalesce((elem->>'timeUsedSec')::int, 0),
      'date', elem->>'date'
    ) as item
    from jsonb_array_elements(res_arr) with ordinality as t(elem, ord)
    order by ord asc
    limit 10
  ) sub;

  return jsonb_build_object(
    'count', cnt,
    'avg', avg_score,
    'best', best_score,
    'totalTimeSec', total_sec,
    'passedParts', passed_parts,
    'recentResults', recent
  );
exception when others then
  return jsonb_build_object('count', 0, 'avg', 0, 'best', 0, 'totalTimeSec', 0, 'passedParts', 0, 'recentResults', '[]'::jsonb);
end;
$$;

create or replace function public.handle_auth_user_friend_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  uname := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'ผู้เข้าสอบ');
  insert into public.friend_profiles (user_id, display_name, updated_at)
  values (new.id, uname, now())
  on conflict (user_id) do update
    set display_name = coalesce(nullif(trim(public.friend_profiles.display_name), ''), excluded.display_name),
        updated_at = now();
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_auth_user_friend_profile on auth.users;
create trigger trg_auth_user_friend_profile
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_friend_profile();

create or replace function public.handle_exam_state_friend_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  meta_name text;
begin
  select raw_user_meta_data->>'display_name' into meta_name from auth.users where id = new.user_id;
  uname := coalesce(
    nullif(trim(new.data #>> '{profiles,0,name}'), ''),
    nullif(trim(meta_name), ''),
    'ผู้เข้าสอบ'
  );
  insert into public.friend_profiles (user_id, display_name, stats, last_seen_at, updated_at)
  values (new.user_id, uname, public.extract_public_exam_stats(new.data), now(), now())
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        stats = case
          when (public.friend_profiles.stats ? 'partStats') then
            public.extract_public_exam_stats(new.data) || jsonb_build_object('partStats', public.friend_profiles.stats->'partStats')
          else public.extract_public_exam_stats(new.data)
        end,
        last_seen_at = now(),
        updated_at = now();
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_exam_state_friend_profile on public.exam_user_state;
create trigger trg_exam_state_friend_profile
  after insert or update of data on public.exam_user_state
  for each row execute function public.handle_exam_state_friend_profile();

-- Backfill all existing users in auth.users & exam_user_state
insert into public.friend_profiles (user_id, display_name, stats, last_seen_at, updated_at)
select
  u.id,
  coalesce(
    nullif(trim(s.data #>> '{profiles,0,name}'), ''),
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    'ผู้เข้าสอบ'
  ),
  public.extract_public_exam_stats(s.data),
  coalesce(s.updated_at, u.created_at, now()),
  now()
from auth.users u
left join public.exam_user_state s on s.user_id = u.id
on conflict (user_id) do update
  set display_name = excluded.display_name,
      stats = excluded.stats,
      updated_at = now();

do $$
begin
  alter publication supabase_realtime add table public.friend_profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friend_matches;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friend_match_players;
exception when duplicate_object then null;
end $$;
