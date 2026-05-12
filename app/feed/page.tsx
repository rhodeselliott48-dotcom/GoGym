'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import BottomNav from '@/components/BottomNav'
import MissionModal from '@/components/MissionModal'
import { Bell, Users } from 'lucide-react'
import Link from 'next/link'

export default function FeedPage() {
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeToday, setActiveToday] = useState<{username: string, id: string}[]>([])
  const [hasFriends, setHasFriends] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) { setLoading(false); return }

      // Check pending friend requests
      const { count: pending } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
      setPendingCount(pending || 0)

      // Get current user's profile for username
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      // Get friends list
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

      if (friendIds.length === 0 && !myProfile) {
        setPosts([])
        setLoading(false)
        return
      }

      // Fetch posts from friends
      const { data: friendPosts } = friendIds.length > 0 ? await supabase
        .from('workout_posts')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(30) : { data: [] }

      // Fetch posts where current user is mentioned
      const { data: mentionedPosts } = myProfile ? await supabase
        .from('workout_posts')
        .select('*')
        .contains('mentions', [myProfile.username])
        .order('created_at', { ascending: false })
        .limit(30) : { data: [] }

      // Merge and deduplicate
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
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-muted hover:text-white press">
              <Users size={20} />
            </Link>
            <Link href="/notifications" className="text-muted hover:text-white press relative">
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
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
      <BottomNav />
    </div>
  )
}