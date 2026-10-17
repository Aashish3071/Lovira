-- Lovira initial schema
-- Every table has Row Level Security. Anything that must not be bypassed from the
-- browser (feed, swipes, daily limits, matches, verification status) goes through
-- SECURITY DEFINER functions below.


-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  dob date not null,
  gender text not null check (gender in ('woman', 'man', 'non_binary', 'trans_woman', 'trans_man', 'genderqueer', 'other')),
  gender_custom text check (char_length(gender_custom) <= 40),
  orientations text[] not null default '{}',
  show_me text[] not null default '{}',
  age_min int not null default 18 check (age_min >= 18),
  age_max int not null default 60 check (age_max <= 100),
  city text not null check (char_length(city) between 1 and 60),
  state text not null check (char_length(state) between 1 and 60),
  bio text check (char_length(bio) <= 500),
  prompts jsonb not null default '[]',
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (age_min <= age_max)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index photos_user_idx on public.photos (user_id, position);

create table public.verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  id_type text not null check (id_type in ('pan', 'driving_licence', 'passport', 'voter_id', 'masked_aadhaar')),
  selfie_path text,
  id_path text, -- set to null once the ID image is deleted after review
  reject_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id)
);

create table public.swipes (
  swiper uuid not null references public.profiles (id) on delete cascade,
  swipee uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (swiper, swipee),
  check (swiper <> swipee)
);
create index swipes_swipee_idx on public.swipes (swipee) where liked;
create index swipes_swiper_time_idx on public.swipes (swiper, created_at);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index matches_b_idx on public.matches (user_b);

create table public.messages (
  id bigint generated always as identity primary key,
  match_id uuid not null references public.matches (id) on delete cascade,
  sender uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_match_idx on public.messages (match_id, created_at);

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('fake_profile', 'scam', 'harassment', 'inappropriate_photos', 'underage', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.plans (
  id text primary key,
  name text not null,
  price_paise int not null,
  duration_hours int not null,
  daily_limit int not null,
  can_see_likes boolean not null default false,
  sort int not null default 0,
  active boolean not null default true
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  amount_paise int not null,
  razorpay_order_id text not null,
  razorpay_payment_id text not null unique,
  created_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id, ends_at);

-- Edit prices and limits here (or in the Supabase table editor). Prices are in paise.
insert into public.plans (id, name, price_paise, duration_hours, daily_limit, can_see_likes, sort) values
  ('free',  'Free',     0,     0,   150, false, 0),
  ('day',   'Day Pass', 2900,  24,  600, true,  1),
  ('week',  'Week',     9900,  168, 750, true,  2),
  ('month', 'Month',    29900, 720, 900, true,  3);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create function public.is_verified(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from verifications v join profiles p on p.id = v.user_id
    where v.user_id = uid and v.status = 'approved' and p.status = 'active'
  );
$$;

create function public.is_blocked_pair(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

create function public.age_of(d date) returns int
language sql stable as $$
  select extract(year from age((now() at time zone 'Asia/Kolkata')::date, d))::int;
$$;

-- The plan currently in force: the best active paid pass, else free.
create function public.current_plan(uid uuid) returns public.plans
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select pl from subscriptions s join plans pl on pl.id = s.plan_id
      where s.user_id = uid and s.starts_at <= now() and s.ends_at > now()
      order by pl.daily_limit desc limit 1),
    (select pl from plans pl where pl.id = 'free')
  );
$$;

-- Profiles swiped today (India time) count toward the daily limit.
create function public.swipes_today(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from swipes
  where swiper = uid
    and created_at >= ((now() at time zone 'Asia/Kolkata')::date)::timestamp at time zone 'Asia/Kolkata';
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- 18+ only, and users can never change their own moderation status.
create function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if age_of(new.dob) < 18 then
    raise exception 'You must be 18 or older to use Lovira' using errcode = 'P0001';
  end if;
  if not is_admin() then
    if tg_op = 'INSERT' then
      new.status := 'active';
    else
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard before insert or update on public.profiles
for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.verifications enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

create policy "admins read own row" on public.admins for select using (user_id = auth.uid());

-- Other people's profiles are only exposed through the functions below, so exact
-- date of birth never leaves the database.
create policy "own profile read" on public.profiles for select using (id = auth.uid() or is_admin());
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid() or is_admin());

create policy "photos read" on public.photos for select using (
  user_id = auth.uid() or is_admin()
  or (is_verified(auth.uid()) and is_verified(user_id) and not is_blocked_pair(auth.uid(), user_id))
);
create policy "own photos insert" on public.photos for insert with check (user_id = auth.uid());
create policy "own photos update" on public.photos for update using (user_id = auth.uid());
create policy "own photos delete" on public.photos for delete using (user_id = auth.uid());

-- Users submit via submit_verification(); only admins change status.
create policy "own verification read" on public.verifications for select using (user_id = auth.uid() or is_admin());

create policy "own swipes read" on public.swipes for select using (swiper = auth.uid());

create policy "match members read" on public.matches for select using (auth.uid() in (user_a, user_b));

create policy "match members read messages" on public.messages for select using (
  exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b))
);
create policy "match members send messages" on public.messages for insert with check (
  sender = auth.uid()
  and is_verified(auth.uid())
  and exists (
    select 1 from matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b)
      and not is_blocked_pair(m.user_a, m.user_b)
  )
);

create policy "own blocks read" on public.blocks for select using (blocker = auth.uid());

create policy "report insert" on public.reports for insert with check (reporter = auth.uid());
create policy "admin reports read" on public.reports for select using (is_admin());
create policy "admin reports update" on public.reports for update using (is_admin());

create policy "plans readable" on public.plans for select using (true);

create policy "own subscriptions read" on public.subscriptions for select using (user_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- App functions (called with supabase.rpc)
-- ---------------------------------------------------------------------------

create function public.photo_paths(uid uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(path order by position, created_at), '{}') from photos where user_id = uid;
$$;

-- Everything the app shell needs about the signed-in user.
create function public.my_status() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  pl plans;
  sub_end timestamptz;
begin
  if uid is null then return null; end if;
  pl := current_plan(uid);
  select max(ends_at) into sub_end from subscriptions where user_id = uid and ends_at > now();
  return json_build_object(
    'has_profile', exists (select 1 from profiles where id = uid),
    'photo_count', (select count(*) from photos where user_id = uid),
    'account_status', (select status from profiles where id = uid),
    'verification', (select json_build_object('status', status, 'reject_reason', reject_reason)
                       from verifications where user_id = uid),
    'is_admin', is_admin(),
    'plan', json_build_object('id', pl.id, 'name', pl.name, 'daily_limit', pl.daily_limit,
                              'can_see_likes', pl.can_see_likes, 'ends_at', sub_end),
    'used_today', swipes_today(uid),
    'likes_count', (
      select count(*) from swipes s
      where s.swipee = uid and s.liked
        and not exists (select 1 from swipes m where m.swiper = uid and m.swipee = s.swiper)
        and not is_blocked_pair(uid, s.swiper)
        and is_verified(s.swiper)
    )
  );
end;
$$;

create function public.submit_verification(p_id_type text, p_selfie_path text, p_id_path text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_selfie_path not like uid::text || '/%' or p_id_path not like uid::text || '/%' then
    raise exception 'Invalid file path';
  end if;
  if exists (select 1 from verifications where user_id = uid and status = 'approved') then
    raise exception 'Already verified';
  end if;
  insert into verifications (user_id, status, id_type, selfie_path, id_path, submitted_at, reject_reason, reviewed_at, reviewed_by)
  values (uid, 'pending', p_id_type, p_selfie_path, p_id_path, now(), null, null, null)
  on conflict (user_id) do update set
    status = 'pending', id_type = excluded.id_type, selfie_path = excluded.selfie_path,
    id_path = excluded.id_path, submitted_at = now(), reject_reason = null,
    reviewed_at = null, reviewed_by = null;
end;
$$;

-- Public card for one person: never includes date of birth.
create function public.profile_card(uid uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'name', p.name, 'age', age_of(p.dob), 'gender', p.gender,
    'gender_custom', p.gender_custom, 'orientations', p.orientations,
    'city', p.city, 'state', p.state, 'bio', p.bio, 'prompts', p.prompts,
    'verified', is_verified(p.id), 'photos', photo_paths(p.id)
  ) from profiles p where p.id = uid;
$$;

-- Next batch of people to swipe on. Same city first, then same state, then India.
create function public.get_feed(batch int default 10) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me profiles;
  my_age int;
  remaining int;
begin
  if not is_verified(uid) then raise exception 'Verify your profile to see the feed'; end if;
  select * into me from profiles where id = uid;
  my_age := age_of(me.dob);
  remaining := greatest((current_plan(uid)).daily_limit - swipes_today(uid), 0);

  return json_build_object(
    'remaining', remaining,
    'profiles', coalesce((
      select json_agg(profile_card(c.id) order by c.rank, c.rnd)
      from (
        select p.id,
               case when lower(p.city) = lower(me.city) and lower(p.state) = lower(me.state) then 0
                    when lower(p.state) = lower(me.state) then 1 else 2 end as rank,
               random() as rnd
        from profiles p
        join verifications v on v.user_id = p.id and v.status = 'approved'
        where p.id <> uid
          and p.status = 'active'
          and p.gender = any (me.show_me)
          and me.gender = any (p.show_me)
          and age_of(p.dob) between me.age_min and me.age_max
          and my_age between p.age_min and p.age_max
          and not exists (select 1 from swipes s where s.swiper = uid and s.swipee = p.id)
          and not is_blocked_pair(uid, p.id)
          and exists (select 1 from photos ph where ph.user_id = p.id)
        order by rank, rnd
        limit least(greatest(batch, 1), 50, remaining)
      ) c
    ), '[]'::json)
  );
end;
$$;

-- Like or pass. Creates a match when the like is mutual.
create function public.swipe(target uuid, p_liked boolean) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  match_id uuid;
begin
  if not is_verified(uid) then raise exception 'Verify your profile first'; end if;
  if not is_verified(target) or is_blocked_pair(uid, target) then raise exception 'Profile not available'; end if;
  if swipes_today(uid) >= (current_plan(uid)).daily_limit then
    raise exception 'Daily limit reached' using errcode = 'P0002';
  end if;

  insert into swipes (swiper, swipee, liked) values (uid, target, p_liked)
  on conflict (swiper, swipee) do nothing;

  if p_liked and exists (select 1 from swipes where swiper = target and swipee = uid and liked) then
    insert into matches (user_a, user_b) values (least(uid, target), greatest(uid, target))
    on conflict (user_a, user_b) do nothing;
    select id into match_id from matches where user_a = least(uid, target) and user_b = greatest(uid, target);
  end if;

  return json_build_object('matched', match_id is not null, 'match_id', match_id);
end;
$$;

-- People who liked me that I haven't answered. Names and photos need a pass.
create function public.likes_received() returns json
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  can_see boolean := (current_plan(uid)).can_see_likes;
  ids uuid[];
begin
  select coalesce(array_agg(s.swiper order by s.created_at desc), '{}') into ids
  from swipes s
  where s.swipee = uid and s.liked
    and not exists (select 1 from swipes m where m.swiper = uid and m.swipee = s.swiper)
    and not is_blocked_pair(uid, s.swiper)
    and is_verified(s.swiper);

  return json_build_object(
    'count', coalesce(array_length(ids, 1), 0),
    'can_see', can_see,
    'profiles', case when can_see
      then coalesce((select json_agg(profile_card(i)) from unnest(ids) as i), '[]'::json)
      else '[]'::json end
  );
end;
$$;

create function public.my_matches() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(x) order by x.last_at desc), '[]'::json) from (
    select m.id as match_id,
           profile_card(case when m.user_a = auth.uid() then m.user_b else m.user_a end) as profile,
           lm.body as last_message, lm.sender as last_sender,
           coalesce(lm.created_at, m.created_at) as last_at
    from matches m
    left join lateral (
      select body, sender, created_at from messages where match_id = m.id order by created_at desc limit 1
    ) lm on true
    where auth.uid() in (m.user_a, m.user_b)
      and not is_blocked_pair(m.user_a, m.user_b)
  ) x;
$$;

create function public.match_detail(p_match_id uuid) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'match_id', m.id,
    'profile', profile_card(case when m.user_a = auth.uid() then m.user_b else m.user_a end)
  ) from matches m
  where m.id = p_match_id and auth.uid() in (m.user_a, m.user_b)
    and not is_blocked_pair(m.user_a, m.user_b);
$$;

create function public.unmatch(p_match_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from matches where id = p_match_id and auth.uid() in (user_a, user_b);
$$;

create function public.block_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null or target = uid then raise exception 'Invalid'; end if;
  insert into blocks (blocker, blocked) values (uid, target) on conflict do nothing;
  delete from matches where user_a = least(uid, target) and user_b = greatest(uid, target);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

create function public.admin_pending_verifications() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'user_id', v.user_id, 'id_type', v.id_type, 'selfie_path', v.selfie_path,
      'id_path', v.id_path, 'submitted_at', v.submitted_at,
      'profile', profile_card(v.user_id), 'dob', p.dob
    ) order by v.submitted_at)
    from verifications v join profiles p on p.id = v.user_id
    where v.status = 'pending'
  ), '[]'::json);
end;
$$;

-- Approve or reject. The app deletes the ID image from storage first; this clears its path.
create function public.admin_review(target uuid, approve boolean, reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update verifications set
    status = case when approve then 'approved' else 'rejected' end,
    reject_reason = case when approve then null else reason end,
    id_path = null,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where user_id = target;
end;
$$;

create function public.admin_set_status(target uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  update profiles set status = p_status where id = target;
end;
$$;

create function public.admin_reports() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    select json_agg(json_build_object(
      'id', r.id, 'reason', r.reason, 'details', r.details, 'created_at', r.created_at,
      'reporter', json_build_object('id', a.id, 'name', a.name),
      'reported', json_build_object('id', b.id, 'name', b.name, 'status', b.status,
                                    'report_count', (select count(*) from reports x where x.reported = b.id))
    ) order by r.created_at desc)
    from reports r join profiles a on a.id = r.reporter join profiles b on b.id = r.reported
    where r.status = 'open'
  ), '[]'::json);
end;
$$;

-- Internal helpers are only used inside the functions above, never called directly by
-- the app (profile_card would otherwise expose any profile by id).
revoke execute on function public.profile_card(uuid), public.photo_paths(uuid),
  public.current_plan(uuid), public.swipes_today(uuid), public.profiles_guard()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- Files live under "<user id>/<file>". Both buckets are private; the app uses signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification', 'verification', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or (public.is_verified(auth.uid())
        and public.is_verified(((storage.foldername(name))[1])::uuid)
        and not public.is_blocked_pair(auth.uid(), ((storage.foldername(name))[1])::uuid))
  ));

-- Users can upload their own documents but never read them back; only admins can view or delete.
create policy "verification upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification admin read" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and public.is_admin());
create policy "verification admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Realtime chat
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
