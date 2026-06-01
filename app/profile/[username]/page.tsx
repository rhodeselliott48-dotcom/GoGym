'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Profile, WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import { ArrowLeft, Flame, UserPlus, Check } from 'lucide-react'
import Link from 'next/link'

interface Badge { id: string; emoji: string; label: string; earned: boolean; desc: string }

function getBadges(posts: WorkoutPost[], friends: number): Badge[] {
  const totalPRs = posts.reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)
  const days = new Set(posts.map(p => new Date(p.created_at).toDateString())).size
  return [
    { id: 'first_post', emoji: '🏋️', label: 'First Rep', desc: 'Logged your first workout', earned: posts.length >= 1 },
    { id: 'ten_workouts', emoji: '🔟', label: 'Ten Deep', desc: '10 workouts logged', earned: posts.length >= 10 },
    { id: 'fifty_workouts', emoji: '💯', label: 'Half Century', desc: '50 workouts logged', earned: posts.length >= 50 },
    { id: 'first_pr', emoji: '⭐', label: 'PR Club', desc: 'Logged your first PR', earned: totalPRs >= 1 },
    { id: 'five_prs', emoji: '🏆', label: 'PR Machine', desc: '5 personal records', earned: totalPRs >= 5 },
    { id: 'seven_days', emoji: '🔥', label: 'Week Warrior', desc: 'Active 7 different days', earned: days >= 7 },
    { id: 'first_friend', emoji: '👥', label: 'Social Lifter', desc: 'Made your first friend', earned: friends >= 1 },
    { id: 'five_friends', emoji: '🤝', label: 'Squad Goals', desc: '5 friends connected', earned: friends >= 5 },
  ]
}

export default function PublicProfilePage() {
  const { username } = useParams() as { username: string }
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [friendCount, setFriendCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<'none'|'pending'|'friends'>('none')
  const [isFriend, setIsFriend] = useState(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const decodedUsername = decodeURIComponent(username)
        .replace('@', '')
        .toLowerCase()
        .trim()

      let { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', decodedUsername)
        .maybeSingle()

      if (!p) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${decodedUsername}%`)
          .maybeSingle()
        p = fallback
      }

      if (!p) { setLoading(false); return }
      setProfile(p)

      const isOwnProfile = user?.id === p.id

      let friendshipAccepted = false
      if (user && !isOwnProfile) {
        const { data: fs } = await supabase
          .from('friendships')
          .select('status')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${user.id})`)
          .maybeSingle()
        if (fs) {
          friendshipAccepted = fs.status === 'accepted'
          setFriendStatus(fs.status === 'accepted' ? 'friends' : 'pending')
        }
      }

      if (isOwnProfile) friendshipAccepted = true
      setIsFriend(friendshipAccepted)

      const { count: fc } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${p.id},friend_id.eq.${p.id}`)
        .eq('status', 'accepted')
      setFriendCount(fc || 0)

      // Only fetch own posts — mentions are shoutouts only
      const { data: ownPosts } = friendshipAccepted
        ? await supabase.from('workout_posts').select('*').eq('user_id', p.id).order('created_at', { ascending: false })
        : await supabase.from('workout_posts').select('*').eq('user_id', p.id).eq('is_public', true).order('created_at', { ascending: false })

      const allPosts = ownPosts || []

      const userIds = [...new Set(allPosts.map((post: any) => post.user_id))]
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds as string[])
      const profilesMap: Record<string, any> = {}
      if (profilesData) profilesData.forEach((prof: any) => { profilesMap[prof.id] = prof })
      profilesMap[p.id] = p

      const postsWithCounts = await Promise.all(allPosts.map(async (post: any) => {
        const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
          user ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        ])
        return {
          ...post,
          profiles: profilesMap[post.user_id] || p,
          likes_count: likes || 0,
          comments_count: comments || 0,
          user_has_liked: !!likedRes?.data,
        }
      }))

      setPosts(postsWithCounts as WorkoutPost[])
      setLoading(false)
    }
    load()
  }, [username])

  async function addFriend() {
    const supabase = supabaseRef.current
    if (!currentUserId || !profile) return
    await supabase.from('friendships').insert({
      sender_id: currentUserId,
      receiver_id: profile.id,
      user_id: currentUserId,
      friend_id: profile.id,
      status: 'pending',
    })
    setFriendStatus('pending')
  }

  const totalPRs = posts.filter(p => p.user_id === profile?.id).reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)
  const badges = profile ? getBadges(posts, friendCount) : []

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
  if (!profile) return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
      <p className="text-white font-display text-2xl">User not found</p>
      <Link href="/discover" className="text-brand text-sm">Back to Discover</Link>
    </div>
  )

  const isOwnProfile = currentUserId === profile.id

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/discover" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <h2 className="font-display text-2xl tracking-wide">@{profile.username}</h2>
        {!isOwnProfile && currentUserId && (
          <div className="ml-auto">
            {friendStatus === 'friends' ? (
              <span className="flex items-center gap-1 text-brand text-xs font-semibold bg-brand/10 px-3 py-1.5 rounded-full border border-brand/20">
                <Check size={12} /> Friends
              </span>
            ) : friendStatus === 'pending' ? (
              <span className="text-xs text-muted bg-surface-2 px-3 py-1.5 rounded-full border border-border">Requested</span>
            ) : (
              <button onClick={addFriend}
                className="flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-3 py-2 rounded-xl press shadow-lg shadow-brand/20">
                <UserPlus size={14} /> Add Friend
              </button>
            )}
          </div>
        )}
      </header>

      <div className="px-4 pt-6 pb-4 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface-3 border-2 border-brand/50 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-3xl text-brand">
                {profile.username[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{profile.full_name || profile.username}</p>
            <p className="text-brand text-sm">@{profile.username}</p>
            {profile.gym_location && <p className="text-muted text-xs mt-0.5">📍 {profile.gym_location}</p>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
  {[
    { label: 'Workouts', value: posts.length },
    { label: 'PRs', value: totalPRs },
    { label: 'Friends', value: friendCount },
    { label: 'Streak', value: (profile.current_streak ?? 0) > 0 ? `${profile.current_streak}🔥` : '0' },
  ].map(s => (
            <div key={s.label} className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <p className="font-display text-2xl text-brand">{s.value}</p>
              <p className="text-muted text-[10px] uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {profile.bio && <p className="text-white/70 text-sm leading-relaxed">{profile.bio}</p>}

        <div className="flex gap-2 flex-wrap">
          {profile.favorite_split && (
            <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full">{profile.favorite_split}</span>
          )}
          {profile.favorite_exercises?.map(ex => (
            <span key={ex} className="text-xs bg-surface-2 text-white/60 border border-border px-3 py-1 rounded-full">{ex}</span>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-brand rounded-full" />
            <h3 className="font-display text-xl tracking-wide">Badges</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {badges.map(b => (
              <div key={b.id} title={b.desc}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-center transition-all
                  ${b.earned ? 'bg-brand/10 border-brand/30' : 'bg-surface-2 border-border opacity-30'}`}>
                <span className="text-2xl">{b.emoji}</span>
                <p className="text-white text-[10px] font-semibold leading-tight">{b.label}</p>
                {!b.earned && <p className="text-muted text-[9px]">Locked</p>}
              </div>
            ))}
          </div>
        </div>

        {!isFriend && !isOwnProfile && (
          <div className="bg-surface-2 border border-border rounded-2xl px-4 py-4 text-center">
            <p className="text-muted text-sm">Add this person as a friend to see their friends-only posts.</p>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4 stagger">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-brand" />
          <h3 className="font-display text-lg tracking-wide text-white/60 uppercase">{posts.length} Workouts</h3>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-muted text-sm">No public workouts yet!</p>
          </div>
        ) : (
          posts.map(post => <WorkoutCard key={post.id} post={post} currentUserId={currentUserId ?? undefined} />)
        )}
      </div>
      <BottomNav />
    </div>
  )
}