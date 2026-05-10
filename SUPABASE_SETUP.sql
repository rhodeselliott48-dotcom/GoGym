-- ============================================
-- GoGym Beta v0.2 — Full Supabase Setup SQL
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  gym_location text,
  city text,
  favorite_split text,
  favorite_exercises text[] default '{}',
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- 2. WORKOUT POSTS TABLE
create table if not exists public.workout_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  caption text default '',
  workout_type text not null,
  mood text not null,
  session_type text default 'Solo',
  photo_urls text[] default '{}',
  duration_minutes int,
  gym_location text,
  city text,
  exercises jsonb default '[]',
  tagged_users text[] default '{}',
  group_name text,
  created_at timestamptz default now() not null
);

alter table public.workout_posts enable row level security;
create policy "Posts viewable by all" on public.workout_posts for select using (true);
create policy "Users insert own posts" on public.workout_posts for insert with check (auth.uid() = user_id);
create policy "Users delete own posts" on public.workout_posts for delete using (auth.uid() = user_id);

-- 3. POST LIKES TABLE
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.workout_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;
create policy "Likes viewable by all" on public.post_likes for select using (true);
create policy "Users insert own likes" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users delete own likes" on public.post_likes for delete using (auth.uid() = user_id);

-- 4. POST COMMENTS TABLE
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.workout_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now() not null
);

alter table public.post_comments enable row level security;
create policy "Comments viewable by all" on public.post_comments for select using (true);
create policy "Users insert own comments" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- 5. FRIENDSHIPS TABLE
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now() not null,
  unique(user_a, user_b)
);

alter table public.friendships enable row level security;
create policy "Friendships viewable by involved users" on public.friendships for select using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Users insert own requests" on public.friendships for insert with check (auth.uid() = user_a);
create policy "Users update own friendships" on public.friendships for update using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Users delete own friendships" on public.friendships for delete using (auth.uid() = user_a or auth.uid() = user_b);

-- 6. AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. STORAGE BUCKET POLICIES
-- (Make sure you created the 'workout-photos' bucket as PUBLIC first)
create policy "Public read workout photos"
  on storage.objects for select
  using (bucket_id = 'workout-photos');

create policy "Auth users upload photos"
  on storage.objects for insert
  with check (bucket_id = 'workout-photos' and auth.role() = 'authenticated');

create policy "Users delete own photos"
  on storage.objects for delete
  using (bucket_id = 'workout-photos' and auth.uid()::text = (storage.foldername(name))[1]);
