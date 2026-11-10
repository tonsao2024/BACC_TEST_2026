-- ============================================================
-- Friend directory fallback
-- ─────────────────────────────────────────────
-- ปัญหา: หน้าจอ "แข่งขันกับเพื่อน" เห็นแค่บัญชีของตัวเอง
-- สาเหตุที่พบบ่อย: ตาราง public.friend_profiles มีแค่แถวของเรา
--   (ยังไม่ถูก backfill / trigger ไม่ทำงานกับบัญชีที่สมัครก่อน migration)
-- ไฟล์นี้จึง
--   1) เติมแถวที่ขาดให้ทุกบัญชีใน auth.users (ทำซ้ำได้ ปลอดภัย)
--   2) เพิ่ม RPC public.list_friend_directory() ให้ฝั่งแอปดึงรายชื่อทุกบัญชีได้
--      แม้ตาราง friend_profiles จะว่างหรือถูก RLS บล็อก
-- ============================================================

-- 1) Backfill บัญชีที่ยังไม่มีแถวใน friend_profiles
insert into public.friend_profiles (user_id, display_name, stats, last_seen_at, updated_at)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(s.data #>> '{profiles,0,name}'), ''),
    'ผู้เข้าสอบ'
  ),
  coalesce(public.extract_public_exam_stats(s.data), '{}'::jsonb),
  coalesce(s.updated_at, u.created_at, now()),
  now()
from auth.users u
left join public.exam_user_state s on s.user_id = u.id
on conflict (user_id) do nothing;

-- 2) RPC สำรอง: คืนรายชื่อบัญชีทั้งหมด + สถิติสาธารณะ
create or replace function public.list_friend_directory()
returns table (
  user_id uuid,
  display_name text,
  stats jsonb,
  last_seen_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id as user_id,
    coalesce(
      nullif(trim(f.display_name), ''),
      nullif(trim(s.data #>> '{profiles,0,name}'), ''),
      nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
      'ผู้เข้าสอบ'
    ) as display_name,
    coalesce(f.stats, public.extract_public_exam_stats(s.data), '{}'::jsonb) as stats,
    coalesce(f.last_seen_at, s.updated_at, u.created_at) as last_seen_at,
    coalesce(f.updated_at, s.updated_at, u.created_at, now()) as updated_at
  from auth.users u
  left join public.friend_profiles f on f.user_id = u.id
  left join public.exam_user_state s on s.user_id = u.id
  where (select auth.uid()) is not null
  order by coalesce(f.updated_at, s.updated_at, u.created_at, now()) desc
  limit 500
$$;

revoke all on function public.list_friend_directory() from public;
revoke all on function public.list_friend_directory() from anon;
grant execute on function public.list_friend_directory() to authenticated;
