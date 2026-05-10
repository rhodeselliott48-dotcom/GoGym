# GoGym Beta v0.2 — Full Setup Guide

## NEW Supabase SQL (run ALL of this in SQL Editor)

### 1. profiles table (updated)
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  gym_location text,
  city text,
  favorite_split text,
  favorite_exercises text[],
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
```

### 2. workout_posts table (updated with new fields)
```sql
create table public.workout_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  caption text default '',
  workout_type text not null,
  mood text not null,
  session_type text default 'Solo',
  photo_urls text[] default '{}',
  exercises jsonb default '[]',
  duration_minutes int,
  gym_location text,
  city text,
  mentions text[] default '{}',
  group_name text,
  created_at timestamptz default now() not null
);

alter table public.workout_posts enable row level security;
create policy "Posts viewable by everyone" on public.workout_posts for select using (true);
create policy "Users insert own posts" on public.workout_posts for insert with check (auth.uid() = user_id);
create policy "Users delete own posts" on public.workout_posts for delete using (auth.uid() = user_id);
```

### 3. post_likes table
```sql
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.workout_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;
create policy "Likes viewable by everyone" on public.post_likes for select using (true);
create policy "Users manage own likes" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users delete own likes" on public.post_likes for delete using (auth.uid() = user_id);
```

### 4. comments table
```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.workout_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Comments viewable by everyone" on public.comments for select using (true);
create policy "Users insert own comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = user_id);
```

### 5. friendships table
```sql
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending',
  created_at timestamptz default now(),
  unique(sender_id, receiver_id)
);

alter table public.friendships enable row level security;
create policy "Friendships viewable by participants" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id or auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users insert friendships" on public.friendships for insert with check (auth.uid() = sender_id);
create policy "Users update friendships" on public.friendships for update using (auth.uid() = receiver_id or auth.uid() = sender_id);
create policy "Users delete friendships" on public.friendships for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);
```

### 6. Auto-create profile trigger
```sql
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 7. Storage bucket
- Name: `workout-photos`
- Public: YES

```sql
create policy "Public read" on storage.objects for select using (bucket_id = 'workout-photos');
create policy "Auth upload" on storage.objects for insert with check (bucket_id = 'workout-photos' and auth.role() = 'authenticated');
create policy "Own delete" on storage.objects for delete using (bucket_id = 'workout-photos' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Local setup
```bash
cd gogym
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key
npm install
npm run dev
```

## Deploy to Vercel
1. Push to GitHub
2. Import repo on vercel.com
3. Add env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Deploy!
