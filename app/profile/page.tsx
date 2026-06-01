'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Profile, WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import { LogOut, Camera, Edit2, Check, X, ChevronDown, ChevronUp, Flame } from 'lucide-react'
import Link from 'next/link'

const FAV_SPLITS = ['PPL', 'Bro Split', 'Upper/Lower', '5/3/1', 'Full Body', 'PHUL', 'Other']

interface Badge { id: string; emoji: string; label: string; earned: boolean; desc: string; category: string }

function getBadges(posts: WorkoutPost[], friends: number, streak: number): Badge[] {
  const totalPRs = posts.reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)
  const days = new Set(posts.map(p => new Date(p.created_at).toDateString())).size
  const totalSets = posts.reduce((s, p) => s + (p.exercises?.reduce((a, e) => a + e.sets, 0) || 0), 0)
  const totalDuration = posts.reduce((s, p) => s + (p.duration_minutes || 0), 0)
  const pushPosts = posts.filter(p => p.workout_type === 'Push').length
  const pullPosts = posts.filter(p => p.workout_type === 'Pull').length
  const legPosts = posts.filter(p => p.workout_type === 'Legs').length
  const cardioPosts = posts.filter(p => ['Cardio', 'HIIT', 'Treadmill', 'Stairmaster'].includes(p.workout_type)).length
  const photoCount = posts.filter(p => p.photo_urls?.length > 0).length
  const groupPosts = posts.filter(p => p.session_type === 'Group' || p.session_type === 'Joint').length
  const hasFullBody = posts.some(p => p.workout_type === 'Full Body')

  return [
    // Workout milestones
    { id: 'first_post', emoji: '🏋️', label: 'First Rep', desc: 'Log your first workout', earned: posts.length >= 1, category: 'Milestones' },
    { id: 'five_workouts', emoji: '5️⃣', label: 'High Five', desc: '5 workouts logged', earned: posts.length >= 5, category: 'Milestones' },
    { id: 'ten_workouts', emoji: '🔟', label: 'Ten Deep', desc: '10 workouts logged', earned: posts.length >= 10, category: 'Milestones' },
    { id: 'twenty_five', emoji: '💥', label: 'Grinder', desc: '25 workouts logged', earned: posts.length >= 25, category: 'Milestones' },
    { id: 'fifty_workouts', emoji: '💯', label: 'Half Century', desc: '50 workouts logged', earned: posts.length >= 50, category: 'Milestones' },
    { id: 'hundred_workouts', emoji: '🎖️', label: 'Century Club', desc: '100 workouts logged', earned: posts.length >= 100, category: 'Milestones' },
    { id: 'two_fifty', emoji: '👑', label: 'Legend', desc: '250 workouts logged', earned: posts.length >= 250, category: 'Milestones' },

    // PRs
    { id: 'first_pr', emoji: '⭐', label: 'PR Club', desc: 'Log your first PR', earned: totalPRs >= 1, category: 'PRs' },
    { id: 'five_prs', emoji: '🏆', label: 'PR Machine', desc: '5 personal records', earned: totalPRs >= 5, category: 'PRs' },
    { id: 'twenty_prs', emoji: '🥇', label: 'Record Breaker', desc: '20 personal records', earned: totalPRs >= 20, category: 'PRs' },
    { id: 'fifty_prs', emoji: '🔱', label: 'Elite Lifter', desc: '50 personal records', earned: totalPRs >= 50, category: 'PRs' },

    // Streaks
    { id: 'three_streak', emoji: '🔥', label: 'On Fire', desc: '3 day streak', earned: streak >= 3, category: 'Streaks' },
    { id: 'seven_streak', emoji: '⚡', label: 'Week Warrior', desc: '7 day streak', earned: streak >= 7, category: 'Streaks' },
    { id: 'fourteen_streak', emoji: '💪', label: 'Two Week Grind', desc: '14 day streak', earned: streak >= 14, category: 'Streaks' },
    { id: 'thirty_streak', emoji: '🌙', label: 'Month Strong', desc: '30 day streak', earned: streak >= 30, category: 'Streaks' },
    { id: 'hundred_streak', emoji: '🚀', label: 'Unstoppable', desc: '100 day streak', earned: streak >= 100, category: 'Streaks' },

    // Days active
    { id: 'seven_days', emoji: '📅', label: 'Week Active', desc: 'Active 7 different days', earned: days >= 7, category: 'Consistency' },
    { id: 'thirty_days', emoji: '🗓️', label: 'Month Active', desc: 'Active 30 different days', earned: days >= 30, category: 'Consistency' },
    { id: 'hundred_days', emoji: '🏅', label: '100 Day Club', desc: 'Active 100 different days', earned: days >= 100, category: 'Consistency' },

    // Social
    { id: 'first_friend', emoji: '👥', label: 'Social Lifter', desc: 'Made your first friend', earned: friends >= 1, category: 'Social' },
    { id: 'five_friends', emoji: '🤝', label: 'Squad Goals', desc: '5 friends connected', earned: friends >= 5, category: 'Social' },
    { id: 'ten_friends', emoji: '🌐', label: 'Network', desc: '10 friends connected', earned: friends >= 10, category: 'Social' },
    { id: 'group_session', emoji: '🏟️', label: 'Team Player', desc: 'Log a group session', earned: groupPosts >= 1, category: 'Social' },
    { id: 'five_group', emoji: '🎽', label: 'Pack Leader', desc: '5 group sessions', earned: groupPosts >= 5, category: 'Social' },

    // Volume
    { id: 'hundred_sets', emoji: '💦', label: 'Volume King', desc: '100 total sets logged', earned: totalSets >= 100, category: 'Volume' },
    { id: 'thousand_sets', emoji: '🔩', label: 'Iron Will', desc: '1000 total sets logged', earned: totalSets >= 1000, category: 'Volume' },
    { id: 'ten_hours', emoji: '⏱️', label: 'Time Invested', desc: '10 hours in the gym', earned: totalDuration >= 600, category: 'Volume' },
    { id: 'fifty_hours', emoji: '⌛', label: 'Gym Rat', desc: '50 hours in the gym', earned: totalDuration >= 3000, category: 'Volume' },

    // Workout types
    { id: 'push_master', emoji: '🫸', label: 'Push Master', desc: '10 push workouts', earned: pushPosts >= 10, category: 'Speciality' },
    { id: 'pull_master', emoji: '🫷', label: 'Pull Master', desc: '10 pull workouts', earned: pullPosts >= 10, category: 'Speciality' },
    { id: 'leg_day', emoji: '🦵', label: 'Never Skip Legs', desc: '10 leg workouts', earned: legPosts >= 10, category: 'Speciality' },
    { id: 'cardio_king', emoji: '🏃', label: 'Cardio King', desc: '10 cardio sessions', earned: cardioPosts >= 10, category: 'Speciality' },
    { id: 'full_body', emoji: '🧍', label: 'Full Package', desc: 'Log a full body workout', earned: hasFullBody, category: 'Speciality' },

    // Photos
    { id: 'first_photo', emoji: '📸', label: 'Showtime', desc: 'Post your first photo', earned: photoCount >= 1, category: 'Extra' },
    { id: 'ten_photos', emoji: '🎞️', label: 'Content Creator', desc: '10 posts with photos', earned: photoCount >= 10, category: 'Extra' },
  ]
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [friendCount, setFriendCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [gymLocation, setGymLocation] = useState('')
  const [city, setCity] = useState('')
  const [favSplit, setFavSplit] = useState('')
  const [favExercises, setFavExercises] = useState<string[]>(['','',''])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: p }, { count: fc }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('friendships').select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted'),
      ])

      if (p) {
        setProfile(p)
        setFullName(p.full_name ?? '')
        setBio(p.bio ?? '')
        setGymLocation(p.gym_location ?? '')
        setCity(p.city ?? '')
        setFavSplit(p.favorite_split ?? '')
        setFavExercises(p.favorite_exercises?.length ? [...p.favorite_exercises, ...Array(3).fill('')].slice(0,3) : ['','',''])

        // Update streak
        const now = new Date()
        const lastLogged = p.last_logged_at ? new Date(p.last_logged_at) : null
        let newStreak = p.current_streak || 0

        if (!lastLogged) {
          newStreak = 1
        } else {
          const hoursSince = (now.getTime() - lastLogged.getTime()) / (1000 * 60 * 60)
          if (hoursSince < 24) {
            // Already logged today, keep streak
            newStreak = p.current_streak || 1
          } else if (hoursSince < 48) {
            // Within 48 hours — extend streak
            newStreak = (p.current_streak || 0) + 1
          } else {
            // Streak broken
            newStreak = 1
          }
        }

        setStreak(newStreak)

        await supabase.from('profiles').update({
          current_streak: newStreak,
          last_logged_at: now.toISOString(),
          longest_streak: Math.max(newStreak, p.longest_streak || 0),
        }).eq('id', user.id)

        const [{ data: ownPosts }, { data: mentionedPosts }] = await Promise.all([
          supabase.from('workout_posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('workout_posts').select('*').contains('mentions', [p.username]).order('created_at', { ascending: false }),
        ])

        const allPosts = [...(ownPosts || []), ...(mentionedPosts || [])]
        const seen = new Set()
        const dedupedPosts = allPosts.filter((post: any) => {
          if (seen.has(post.id)) return false
          seen.add(post.id)
          return true
        }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        const userIds = [...new Set(dedupedPosts.map((post: any) => post.user_id))]
        const { data: profilesData } = await supabase.from('profiles').select('*').in('id', userIds as string[])
        const profilesMap: Record<string, any> = {}
        if (profilesData) profilesData.forEach((prof: any) => { profilesMap[prof.id] = prof })
        profilesMap[user.id] = p

        const postsWithCounts = await Promise.all(dedupedPosts.map(async (post: any) => {
          const [{ count: likes }, { count: comments }, likedRes] = await Promise.all([
            supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
            supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle(),
          ])
          return {
            ...post,
            profiles: profilesMap[post.user_id] || p,
            likes_count: likes || 0,
            comments_count: comments || 0,
            user_has_liked: !!likedRes.data,
          }
        }))

        setPosts(postsWithCounts as WorkoutPost[])
      }

      setFriendCount(fc || 0)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    const supabase = supabaseRef.current
    if (!profile) return
    setSaving(true); setSaveError('')

    try {
      let avatar_url = profile.avatar_url
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const uniquePath = `avatars/${profile.id}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('workout-photos').upload(uniquePath, avatarFile, { cacheControl: '3600', upsert: false })
        if (uploadError) { setSaveError('Photo upload failed: ' + uploadError.message); setSaving(false); return }
        const { data: urlData } = supabase.storage.from('workout-photos').getPublicUrl(uniquePath)
        avatar_url = urlData.publicUrl
      }

      const { error: updateError } = await supabase.from('profiles').update({
        full_name: fullName, bio, avatar_url, gym_location: gymLocation, city,
        favorite_split: favSplit, favorite_exercises: favExercises.filter(Boolean),
      }).eq('id', profile.id)

      if (updateError) { setSaveError('Save failed: ' + updateError.message); setSaving(false); return }

      setProfile(prev => prev ? { ...prev, full_name: fullName, bio, avatar_url, gym_location: gymLocation, city, favorite_split: favSplit, favorite_exercises: favExercises.filter(Boolean) } : prev)
      setEditing(false); setAvatarFile(null); setAvatarPreview(null)
    } catch (err: any) {
      setSaveError('Something went wrong: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const allBadges = getBadges(posts, friendCount, streak)
  const earnedBadges = allBadges.filter(b => b.earned)
  const unearnedBadges = allBadges.filter(b => !b.earned)
  const totalPRs = posts.filter(p => p.user_id === profile?.id).reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)

  // Group unearned by category
  const unearnedByCategory = unearnedBadges.reduce((acc, b) => {
    if (!acc[b.category]) acc[b.category] = []
    acc[b.category].push(b)
    return acc
  }, {} as Record<string, Badge[]>)

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide">Profile</h2>
        <div className="flex items-center gap-1">
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-muted hover:text-white press p-2"><Edit2 size={18} /></button>
          ) : (
            <div className="flex gap-1">
              <button onClick={() => { setEditing(false); setSaveError('') }} className="text-muted press p-2"><X size={18} /></button>
              <button onClick={handleSave} disabled={saving} className="text-brand press p-2">
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" /> : <Check size={18} />}
              </button>
            </div>
          )}
          <Link href="/profile/friends" className="text-muted hover:text-white press px-2 py-1 text-xs font-semibold">Friends</Link>
          <button onClick={async () => { await supabaseRef.current.auth.signOut(); router.push('/auth') }}
            className="text-muted hover:text-red-400 press p-2"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-3 border-2 border-brand/50 overflow-hidden">
              {(avatarPreview || profile?.avatar_url) ? (
                <img src={avatarPreview || profile!.avatar_url!} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display text-3xl text-brand">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {editing && (
              <button onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-brand text-white rounded-full p-1.5 press shadow-lg">
                <Camera size={14} />
              </button>
            )}
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
              }} />
          </div>
          <div className="flex-1">
            <p className="text-brand font-semibold text-sm">@{profile?.username}</p>
            {editing ? (
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name"
                className="mt-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-white text-sm w-full" />
            ) : (
              <p className="text-white font-semibold mt-0.5 text-lg">{profile?.full_name || 'No name set'}</p>
            )}
            {profile?.gym_location && !editing && (
              <p className="text-muted text-xs mt-0.5">📍 {profile.gym_location}</p>
            )}
          </div>
        </div>

        {saveError && (
          <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3 border border-red-400/20">{saveError}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Workouts', value: posts.length },
            { label: 'PRs', value: totalPRs },
            { label: 'Friends', value: friendCount },
            { label: 'Streak', value: streak > 0 ? `${streak}🔥` : '0' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 rounded-2xl border border-border px-2 py-3 text-center">
              <p className="font-display text-xl text-brand">{s.value}</p>
              <p className="text-muted text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Edit form */}
        {editing ? (
          <div className="space-y-3">
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Write your bio..." rows={2}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-white placeholder-muted text-sm resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <input value={gymLocation} onChange={e => setGymLocation(e.target.value)} placeholder="Your gym"
                className="bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-white text-sm placeholder-muted" />
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="City"
                className="bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-white text-sm placeholder-muted" />
            </div>
            <select value={favSplit} onChange={e => setFavSplit(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-white text-sm">
              <option value="">Favorite split...</option>
              {FAV_SPLITS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="space-y-2">
              <p className="text-xs text-muted uppercase tracking-widest font-semibold">Top 3 Exercises</p>
              {favExercises.map((ex, i) => (
                <input key={i} value={ex} onChange={e => setFavExercises(prev => prev.map((v, idx) => idx === i ? e.target.value : v))}
                  placeholder={`Exercise ${i+1}`}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-white text-sm placeholder-muted" />
              ))}
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press disabled:opacity-50 shadow-lg shadow-brand/20 tracking-wide">
              {saving ? 'SAVING...' : 'SAVE PROFILE ✓'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {profile?.bio && <p className="text-white/70 text-sm leading-relaxed">{profile.bio}</p>}
            <div className="flex gap-3 flex-wrap">
              {profile?.favorite_split && (
                <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full">{profile.favorite_split}</span>
              )}
              {profile?.favorite_exercises?.map(ex => (
                <span key={ex} className="text-xs bg-surface-2 text-white/60 border border-border px-3 py-1 rounded-full">{ex}</span>
              ))}
            </div>
          </div>
        )}

        {/* Badges — earned only shown, unearned collapsible */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-brand rounded-full" />
              <h3 className="font-display text-xl tracking-wide">Badges</h3>
              <span className="text-brand text-xs font-bold bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                {earnedBadges.length}/{allBadges.length}
              </span>
            </div>
            <button onClick={() => setShowAllBadges(!showAllBadges)}
              className="flex items-center gap-1 text-xs text-muted font-semibold press hover:text-white">
              {showAllBadges ? 'Hide locked' : 'View all'}
              {showAllBadges ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Earned badges */}
          {earnedBadges.length === 0 ? (
            <p className="text-muted text-sm text-center py-4">Log workouts to earn your first badge!</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {earnedBadges.map(b => (
  <div key={b.id} title={b.desc}
    className="flex flex-col items-center gap-1 p-3 rounded-2xl border text-center bg-brand/10 border-brand/30">
    <span className="text-2xl">{b.emoji}</span>
    <p className="text-white text-[10px] font-semibold leading-tight">{b.label}</p>
    <p className="text-brand text-[9px] leading-tight">{b.desc}</p>
  </div>
))}
            </div>
          )}

          {/* Locked badges — collapsible by category */}
          {showAllBadges && (
            <div className="space-y-4 animate-fade-up">
              <p className="text-xs text-muted uppercase tracking-widest font-semibold">Locked Badges</p>
              {Object.entries(unearnedByCategory).map(([category, badges]) => (
                <div key={category}>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-2">{category}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {badges.map(b => (
                      <div key={b.id} title={b.desc}
                        className="flex flex-col items-center gap-1 p-3 rounded-2xl border text-center bg-surface-2 border-border opacity-40">
                        <span className="text-2xl">{b.emoji}</span>
                        <p className="text-white text-[10px] font-semibold leading-tight">{b.label}</p>
                        <p className="text-muted text-[9px]">{b.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/about" className="block text-center text-muted text-xs underline underline-offset-4 hover:text-white">
          About GoGym
        </Link>
      </div>

      <div className="px-4 space-y-4 stagger">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-brand rounded-full" />
          <h3 className="font-display text-xl tracking-wide text-white/60 uppercase">Your Posts</h3>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-muted text-sm">No workouts yet. Get after it!</p>
          </div>
        ) : (
          posts.map(post => <WorkoutCard key={post.id} post={post} currentUserId={profile?.id} />)
        )}
      </div>
      <BottomNav />
    </div>
  )
}