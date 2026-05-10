'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Profile, WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import { ArrowLeft, Flame, UserPlus, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function PublicProfilePage() {
  const { username } = useParams() as { username: string }
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<'none'|'pending'|'friends'>('none')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data: p } = await supabase.from('profiles').select('*').eq('username', username).single()
      if (!p) { setLoading(false); return }
      setProfile(p)

      const { data: w } = await supabase.from('workout_posts').select('*, profiles(*)')
        .eq('user_id', p.id).order('created_at', { ascending: false })
      if (w) setPosts(w as WorkoutPost[])

      if (user && user.id !== p.id) {
        const { data: fs } = await supabase.from('friendships').select('status')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${p.id}),and(sender_id.eq.${p.id},receiver_id.eq.${user.id})`)
          .single()
        if (fs) setFriendStatus(fs.status === 'accepted' ? 'friends' : 'pending')
      }
      setLoading(false)
    }
    load()
  }, [username])

  async function addFriend() {
    if (!currentUserId || !profile) return
    await supabase.from('friendships').insert({ sender_id: currentUserId, receiver_id: profile.id, status: 'pending', user_id: currentUserId, friend_id: profile.id })
    setFriendStatus('pending')
  }

  const totalPRs = posts.reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
  if (!profile) return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
      <p className="text-white font-display text-2xl">User not found</p>
      <Link href="/feed" className="text-brand text-sm">Back to feed</Link>
    </div>
  )

  const isOwnProfile = currentUserId === profile.id

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
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

      <div className="px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-surface-3 border-2 border-brand/50 overflow-hidden">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={80} height={80} className="object-cover" />
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

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Workouts', value: posts.length },
            { label: 'PRs', value: totalPRs },
            { label: 'Split', value: profile.favorite_split || '—' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <p className="font-display text-xl text-brand">{s.value}</p>
              <p className="text-muted text-[10px] uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {profile.bio && <p className="text-white/70 text-sm leading-relaxed">{profile.bio}</p>}
      </div>

      <div className="px-4 space-y-4 stagger">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-brand" />
          <h3 className="font-display text-lg tracking-wide text-white/60 uppercase">{posts.length} Workouts</h3>
        </div>
        {posts.map(post => <WorkoutCard key={post.id} post={post} currentUserId={currentUserId ?? undefined} />)}
      </div>
      <BottomNav />
    </div>
  )
}
