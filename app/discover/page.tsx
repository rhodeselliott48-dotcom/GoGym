'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { WorkoutPost, WorkoutType } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import BottomNav from '@/components/BottomNav'
import { Search, MapPin } from 'lucide-react'

const TYPES: (WorkoutType | 'All')[] = ['All', 'Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'HIIT', 'Mobility']

export default function DiscoverPage() {
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [filtered, setFiltered] = useState<WorkoutPost[]>([])
  const [filter, setFilter] = useState<WorkoutType | 'All'>('All')
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

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
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        const profilesMap: Record<string, any> = {}
        if (profilesData) profilesData.forEach((p: any) => { profilesMap[p.id] = p })

        const withCounts = await Promise.all(data.map(async (post: any) => {
          const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            user ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          ])
          return {
            ...post,
            profiles: profilesMap[post.user_id] || { username: 'unknown', full_name: null, avatar_url: null },
            likes_count: likes || 0,
            comments_count: comments || 0,
            user_has_liked: !!likedRes?.data,
          }
        }))

        setPosts(withCounts as WorkoutPost[])
        setFiltered(withCounts as WorkoutPost[])
      } else {
        setPosts([])
        setFiltered([])
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let result = posts
    if (filter !== 'All') result = result.filter(p => p.workout_type === filter)
    if (location.trim()) {
      const q = location.toLowerCase()
      result = result.filter(p =>
        p.city?.toLowerCase().includes(q) || p.gym_location?.toLowerCase().includes(q)
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.caption?.toLowerCase().includes(q) ||
        p.title?.toLowerCase().includes(q) ||
        p.profiles?.username?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [filter, search, location, posts])

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <h2 className="font-display text-3xl tracking-wide mb-3">Discover</h2>
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workouts or people..."
            className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-muted text-sm" />
        </div>
        <div className="relative mb-3">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Filter by city or gym..."
            className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-muted text-sm" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all press
                ${filter === t ? 'bg-brand text-white shadow-sm shadow-brand/20' : 'bg-surface-2 text-muted border border-border'}`}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 stagger">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-2 rounded-2xl h-40 animate-pulse border border-border" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="text-white font-display text-2xl">Nothing here</p>
            <p className="text-muted text-sm mt-2">No posts from other users yet</p>
          </div>
        ) : (
          filtered.map(post => <WorkoutCard key={post.id} post={post} currentUserId={currentUserId ?? undefined} />)
        )}
      </main>
      <BottomNav />
    </div>
  )
}