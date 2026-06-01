'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import BottomNav from '@/components/BottomNav'
import MissionModal from '@/components/MissionModal'
import { Bell, X, Zap } from 'lucide-react'
import Link from 'next/link'

const NUDGES = [
  { emoji: '💪', title: 'Time to grind.', sub: 'You haven\'t logged today. Let\'s fix that.' },
  { emoji: '🔥', title: 'Streak on the line.', sub: 'Log a workout to keep your streak alive.' },
  { emoji: '😤', title: 'Your friends are lifting.', sub: 'Don\'t let them get ahead. Log now.' },
  { emoji: '⚡', title: 'No workout yet today.', sub: 'Even 20 minutes counts. Let\'s go.' },
  { emoji: '🏆', title: 'Champions show up daily.', sub: 'Log your workout and stay on top.' },
]

export default function FeedPage() {
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeToday, setActiveToday] = useState<{username: string, id: string}[]>([])
  const [hasFriends, setHasFriends] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [showNudge, setShowNudge] = useState(false)
  const [nudge] = useState(() => NUDGES[Math.floor(Math.random() * NUDGES.length)])
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) { setLoading(false); return }

      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setPendingCount(unread || 0)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const friendIds: string[] = []
      if (friendships && friendships.length > 0) {
        setHasFriends(true)
        friendships.forEach((f: any) => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id
          if (!friendIds.includes(otherId)) friendIds.push(otherId)
        })
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count: todayCount } = await supabase
        .from('workout_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())

      if (!todayCount || todayCount === 0) {
        setTimeout(() => setShowNudge(true), 2500)
      }

      if (friendIds.length === 0 && !myProfile) {
        setPosts([])
        setLoading(false)
        return
      }

      const { data: friendPosts } = friendIds.length > 0 ? await supabase
        .from('workout_posts')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30) : { data: [] }

      const { data: mentionedPosts } = myProfile ? await supabase
        .from('workout_posts')
        .select('*')
        .contains('mentions', [myProfile.username])
        .order('created_at', { ascending: false })
        .limit(30) : { data: [] }

      const allPosts = [...(friendPosts || []), ...(mentionedPosts || [])]
      const seen = new Set()
      const dedupedPosts = allPosts.filter((p: any) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (dedupedPosts.length > 0) {
        const userIds = [...new Set(dedupedPosts.map((p: any) => p.user_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds)
        const profilesMap: Record<string, any> = {}
        if (profilesData) profilesData.forEach((p: any) => { profilesMap[p.id] = p })

        const withCounts = await Promise.all(dedupedPosts.map(async (post: any) => {
          const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle(),
          ])
          return {
            ...post,
            profiles: profilesMap[post.user_id] || { username: 'unknown', full_name: null, avatar_url: null },
            likes_count: likes || 0,
            comments_count: comments || 0,
            user_has_liked: !!likedRes.data,
          }
        }))

        setPosts(withCounts as WorkoutPost[])

        const today = new Date()
        today.setHours(0,0,0,0)
        const active = withCounts
          .filter((p: any) => new Date(p.created_at) >= today && p.user_id !== user.id)
          .reduce((acc: any[], p: any) => {
            if (!acc.find((a) => a.id === p.user_id)) {
              acc.push({ username: p.profiles.username, id: p.user_id })
            }
            return acc
          }, [])
        setActiveToday(active)
      } else {
        setPosts([])
      }
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <MissionModal />
          <Link href="/notifications" className="text-muted hover:text-white press relative">
            <Bell size={20} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {activeToday.length > 0 && (
        <div className="mx-4 mt-4 bg-brand/10 border border-brand/20 rounded-2xl px-4 py-3">
          <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">🔥 Active Today</p>
          <div className="flex gap-2 flex-wrap">
            {activeToday.map(u => (
              <Link key={u.id} href={`/profile/${u.username}`}
                className="bg-surface-2 border border-border rounded-full px-3 py-1 text-xs text-white font-medium press">
                @{u.username}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-5 pb-2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
        <p className="text-light-gray/50 text-xs uppercase tracking-widest font-semibold">Friends Feed</p>
        <span className="text-muted text-xs">· {posts.length} workouts</span>
      </div>

      <main className="px-4 pb-4 space-y-4 stagger">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-surface-2 rounded-2xl h-48 animate-pulse border border-border" />
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">👥</p>
            <p className="text-white font-display text-3xl">No posts yet</p>
            <p className="text-muted text-sm mt-2 mb-6">
              {hasFriends ? "Your friends haven't posted yet!" : 'Add friends to see their workouts here!'}
            </p>
            {!hasFriends && (
              <Link href="/profile/friends"
                className="bg-brand text-white font-display text-lg px-6 py-3 rounded-2xl press shadow-lg shadow-brand/20">
                FIND FRIENDS
              </Link>
            )}
          </div>
        ) : (
          posts.map(post => (
            <WorkoutCard key={post.id} post={post} currentUserId={currentUserId ?? undefined} />
          ))
        )}
      </main>

      {showNudge && (
        <div className="fixed inset-0 z-[60] flex items-end" onClick={() => setShowNudge(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-auto bg-[#1a1a1a] border border-border rounded-t-3xl px-5 pt-4 pb-10 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <button onClick={() => setShowNudge(false)}
              className="absolute top-4 right-4 text-muted press p-1">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{nudge.emoji}</span>
              <div>
                <p className="font-display text-2xl text-white tracking-wide">{nudge.title}</p>
                <p className="text-muted text-sm">{nudge.sub}</p>
              </div>
            </div>
            <Link href="/create"
              onClick={() => setShowNudge(false)}
              className="w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press shadow-lg shadow-brand/20 tracking-wide flex items-center justify-center gap-2">
              <Zap size={18} /> LOG WORKOUT NOW
            </Link>
            <button onClick={() => setShowNudge(false)}
              className="w-full mt-3 py-2 text-muted text-sm font-semibold press">
              Maybe later
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}