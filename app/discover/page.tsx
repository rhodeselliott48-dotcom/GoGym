'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { WorkoutPost, WorkoutType } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import { Search, ChevronDown, Heart, MessageCircle, MapPin } from 'lucide-react'

const FILTERS: (WorkoutType | 'All')[] = [
  'All', 'Push', 'Pull', 'Upper', 'Lower', 'Legs', 'Full Body',
  'Cardio', 'HIIT', 'Mobility', 'Stairmaster', 'Treadmill', 'Other'
]

const TYPE_STYLE: Record<string, { grad: string; tag: string; accent: string }> = {
  Push:        { grad: 'from-red-950 via-red-900 to-zinc-900',    tag: 'text-red-400 border-red-800',       accent: 'text-red-400'    },
  Pull:        { grad: 'from-red-900 via-red-800 to-zinc-900',    tag: 'text-red-300 border-red-700',       accent: 'text-red-300'    },
  Upper:       { grad: 'from-rose-950 via-rose-900 to-zinc-900',  tag: 'text-rose-400 border-rose-800',     accent: 'text-rose-400'   },
  Lower:       { grad: 'from-red-950 via-red-900 to-stone-900',   tag: 'text-red-400 border-red-800',       accent: 'text-red-400'    },
  Legs:        { grad: 'from-red-950 via-red-900 to-stone-900',   tag: 'text-red-400 border-red-800',       accent: 'text-red-400'    },
  'Full Body': { grad: 'from-orange-950 via-orange-900 to-zinc-900', tag: 'text-orange-400 border-orange-800', accent: 'text-orange-400' },
  Cardio:      { grad: 'from-orange-900 via-orange-800 to-zinc-900', tag: 'text-orange-300 border-orange-700', accent: 'text-orange-300' },
  HIIT:        { grad: 'from-rose-950 via-rose-900 to-zinc-900',  tag: 'text-rose-400 border-rose-800',     accent: 'text-rose-400'   },
  Mobility:    { grad: 'from-zinc-700 via-zinc-800 to-zinc-900',  tag: 'text-zinc-400 border-zinc-600',     accent: 'text-zinc-400'   },
  Stairmaster: { grad: 'from-red-950 via-red-900 to-zinc-900',    tag: 'text-red-400 border-red-800',       accent: 'text-red-400'    },
  Treadmill:   { grad: 'from-orange-950 via-orange-900 to-zinc-900', tag: 'text-orange-400 border-orange-800', accent: 'text-orange-400' },
  Other:       { grad: 'from-zinc-700 via-zinc-800 to-zinc-900',  tag: 'text-zinc-400 border-zinc-600',     accent: 'text-zinc-400'   },
}

function getStyle(type: string | null) {
  return TYPE_STYLE[type ?? 'Other'] ?? TYPE_STYLE['Other']
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function totalSets(exercises: any[]): number {
  if (!exercises?.length) return 0
  return exercises.reduce((sum: number, ex: any) => {
    if (Array.isArray(ex.sets)) return sum + ex.sets.length
    if (typeof ex.sets === 'number') return sum + ex.sets
    return sum
  }, 0)
}

function getInitials(post: WorkoutPost) {
  if (post.profiles?.full_name)
    return post.profiles.full_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  return (post.profiles?.username ?? '??').slice(0, 2).toUpperCase()
}

function getFirstPhoto(post: WorkoutPost): string | null {
  const urls = (post as any).photo_urls
  if (Array.isArray(urls) && urls.length > 0 && urls[0]) return urls[0]
  return null
}

function Avatar({ post, size = 22 }: { post: WorkoutPost; size?: number }) {
  const s = `${size}px`
  if (post.profiles?.avatar_url) {
    return (
      <img
        src={post.profiles.avatar_url}
        alt={post.profiles.username}
        style={{ width: s, height: s }}
        className="rounded-full object-cover border border-white/30 flex-shrink-0"
      />
    )
  }
  return (
    <div
      style={{ width: s, height: s, fontSize: size * 0.36 }}
      className="rounded-full bg-red-900 border border-red-700 flex items-center justify-center font-bold text-red-100 flex-shrink-0"
    >
      {getInitials(post)}
    </div>
  )
}

// ── No-photo fallback: stats card visual ──────────────────────────────────────

function NoPhotoCard({ post, large = false }: { post: WorkoutPost; large?: boolean }) {
  const s = getStyle(post.workout_type ?? null)
  const sets = totalSets(post.exercises ?? [])

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${s.grad} flex flex-col items-center justify-center gap-2 px-3`}>
      {/* Big stats in center */}
      <div className="flex items-end gap-3">
        <div className="text-center">
          <div className={`${large ? 'text-3xl' : 'text-2xl'} font-black text-white`}>{post.exercises?.length ?? 0}</div>
          <div className="text-[9px] tracking-widest text-white/40 uppercase mt-0.5">ex</div>
        </div>
        <div className={`${large ? 'text-2xl' : 'text-lg'} text-white/20 font-thin mb-1`}>·</div>
        <div className="text-center">
          <div className={`${large ? 'text-3xl' : 'text-2xl'} font-black text-white`}>{sets}</div>
          <div className="text-[9px] tracking-widest text-white/40 uppercase mt-0.5">sets</div>
        </div>
        {post.duration_minutes ? (
          <>
            <div className={`${large ? 'text-2xl' : 'text-lg'} text-white/20 font-thin mb-1`}>·</div>
            <div className="text-center">
              <div className={`${large ? 'text-3xl' : 'text-2xl'} font-black text-white`}>{post.duration_minutes}m</div>
              <div className="text-[9px] tracking-widest text-white/40 uppercase mt-0.5">dur</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ── Trending card ─────────────────────────────────────────────────────────────

function TrendingCard({ post, onClick }: { post: WorkoutPost; onClick: () => void }) {
  const sets = totalSets(post.exercises ?? [])
  const photo = getFirstPhoto(post)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden border border-red-900/60 bg-zinc-900 active:scale-[0.985] transition-transform"
    >
      <div className="relative h-48">
        {photo ? (
          <>
            <img src={photo} alt={post.title ?? ''} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
          </>
        ) : (
          <NoPhotoCard post={post} large />
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide">
          🔥 TRENDING
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
          <div className="font-display text-white text-xl leading-tight mb-1.5">
            {post.title ?? post.caption ?? 'Workout'}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar post={post} size={20} />
            <span className="text-white/70 text-xs">@{post.profiles?.username}</span>
            <span className="text-white/40 text-xs">· {timeAgo(post.created_at)}</span>
            {post.gym_location && (
              <span className="text-white/40 text-xs truncate">· 📍 {post.gym_location}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center border-t border-zinc-800">
        <StatCell label="EXERCISES" value={post.exercises?.length ?? 0} />
        <div className="w-px h-8 bg-zinc-800" />
        <StatCell label="SETS" value={sets} />
        <div className="w-px h-8 bg-zinc-800" />
        <StatCell label="DURATION" value={post.duration_minutes ? `${post.duration_minutes}m` : '—'} />
        <div className="flex-1" />
        <div className="flex items-center gap-3 pr-4 text-zinc-500">
          <span className={`flex items-center gap-1 text-xs ${post.user_has_liked ? 'text-red-500' : 'text-zinc-500'}`}>
  <Heart size={13} fill={post.user_has_liked ? 'currentColor' : 'none'} />{post.likes_count ?? 0}
</span>
          <span className="flex items-center gap-1 text-xs">
            <MessageCircle size={13} />{post.comments_count ?? 0}
          </span>
        </div>
      </div>
    </button>
  )
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="px-4 py-2.5 text-center">
      <div className="text-white font-bold text-sm">{value}</div>
      <div className="text-zinc-500 text-[9px] tracking-widest mt-0.5">{label}</div>
    </div>
  )
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ post, onClick }: { post: WorkoutPost; onClick: () => void }) {
  const s = getStyle(post.workout_type ?? null)
  const photo = getFirstPhoto(post)

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 active:scale-[0.97] transition-transform"
    >
      <div className="aspect-square relative">
        {photo ? (
          <>
            <img src={photo} alt={post.title ?? ''} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </>
        ) : (
          <NoPhotoCard post={post} />
        )}

        {post.workout_type && (
          <div className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full border bg-black/50 ${s.tag}`}>
            {post.workout_type.toUpperCase()}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
          <div className="font-display text-white text-xs leading-tight line-clamp-2 drop-shadow">
            {post.title ?? post.caption ?? 'Workout'}
          </div>
        </div>
      </div>

      <div className="px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Avatar post={post} size={18} />
          <span className="text-zinc-400 text-[10px] truncate">@{post.profiles?.username}</span>
          <span className="text-zinc-600 text-[10px] ml-auto flex-shrink-0">{timeAgo(post.created_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-white font-semibold">{post.exercises?.length ?? 0}</span>
          <span className="text-zinc-500">ex</span>
          <span className="text-zinc-700">·</span>
          <span className="text-white font-semibold">{totalSets(post.exercises ?? [])}</span>
          <span className="text-zinc-500">sets</span>
          {post.duration_minutes ? (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-white font-semibold">{post.duration_minutes}m</span>
            </>
          ) : null}
          <div className="flex-1" />
          <span className={`flex items-center gap-1 ${post.user_has_liked ? 'text-red-500' : 'text-zinc-500'}`}>
  <Heart size={11} fill={post.user_has_liked ? 'currentColor' : 'none'} />{post.likes_count ?? 0}
</span>
        </div>
      </div>
    </button>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TrendingSkeleton() {
  return <div className="rounded-2xl h-48 bg-zinc-900 border border-zinc-800 animate-pulse" />
}

function GridSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 animate-pulse">
      <div className="aspect-square bg-zinc-800" />
      <div className="p-3 space-y-2">
        <div className="h-2 bg-zinc-800 rounded w-3/4" />
        <div className="h-2 bg-zinc-800 rounded w-1/2" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [filter, setFilter] = useState<WorkoutType | 'All'>('All')
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()

      const excludeIds: string[] = []
      if (user) {
        excludeIds.push(user.id)
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'accepted')
        if (friendships) {
          friendships.forEach((f: any) => {
            const otherId = f.user_id === user.id ? f.friend_id : f.user_id
            if (!excludeIds.includes(otherId)) excludeIds.push(otherId)
          })
        }
      }

      let query = supabase
        .from('workout_posts')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)

      if (excludeIds.length > 0) {
        query = query.not('user_id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) { console.error(error); setLoading(false); return }

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p: any) => p.user_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
        const profilesMap: Record<string, any> = {}
        if (profilesData) profilesData.forEach((p: any) => { profilesMap[p.id] = p })

        const withCounts = await Promise.all(data.map(async (post: any) => {
          const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            user
              ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
              : Promise.resolve({ data: null }),
          ])
          return {
            ...post,
            profiles: profilesMap[post.user_id] || { username: 'unknown', full_name: null, avatar_url: null },
            likes_count: likes ?? 0,
            comments_count: comments ?? 0,
            user_has_liked: !!likedRes?.data,
          }
        }))

        setPosts(withCounts as WorkoutPost[])
      } else {
        setPosts([])
      }
      setLoading(false)
    }

    load()
  }, [])

  const filtered = posts.filter(p => {
    if (filter !== 'All' && p.workout_type !== filter) return false
    if (location.trim()) {
      const q = location.toLowerCase()
      if (
        !p.city?.toLowerCase().includes(q) &&
        !p.gym_location?.toLowerCase().includes(q)
      ) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.title?.toLowerCase().includes(q) ||
        p.caption?.toLowerCase().includes(q) ||
        p.profiles?.username?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const trendingPost = filtered.length > 0
    ? [...filtered].sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0))[0]
    : null

  const gridPosts = trendingPost ? filtered.filter(p => p.id !== trendingPost.id) : filtered

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">

      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-zinc-900 px-4 pt-12 pb-3">
        <h1 className="font-display text-3xl tracking-wide mb-3">Discover</h1>

        {/* Search + type dropdown */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search workouts or people..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-zinc-500 text-xs px-1">✕</button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap ${
                filter !== 'All'
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              {filter === 'All' ? 'Type' : filter}
              <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {FILTERS.map(t => (
                    <button
                      key={t}
                      onClick={() => { setFilter(t); setDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        filter === t
                          ? 'bg-red-600 text-white font-semibold'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location search */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
          <MapPin size={15} className="text-zinc-500 flex-shrink-0" />
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Filter by city or gym..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          {location && (
            <button onClick={() => setLocation('')} className="text-zinc-500 text-xs px-1">✕</button>
          )}
        </div>
      </header>

      <main className="px-4 pt-4 space-y-5">

        {loading ? (
          <TrendingSkeleton />
        ) : trendingPost ? (
          <TrendingCard post={trendingPost} onClick={() => router.push(`/post/${trendingPost.id}`)} />
        ) : null}

        {!loading && gridPosts.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-500 tracking-widest uppercase">
              {filter === 'All' ? 'Recent workouts' : filter}
            </span>
            <span className="text-[11px] text-zinc-600">{gridPosts.length} posts</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <GridSkeleton key={i} />)}
          </div>
        ) : gridPosts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {gridPosts.map(post => (
              <GridCard key={post.id} post={post} onClick={() => router.push(`/post/${post.id}`)} />
            ))}
          </div>
        ) : !trendingPost ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-display text-white text-2xl">
              {search ? 'No results' : 'Nothing here yet'}
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              {search ? 'Try a different search or filter' : 'No posts from other users yet'}
            </p>
          </div>
        ) : null}

      </main>

      <BottomNav />
    </div>
  )
}