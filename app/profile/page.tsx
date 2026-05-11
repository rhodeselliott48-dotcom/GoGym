'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { Profile, WorkoutPost } from '@/lib/types'
import WorkoutCard from '@/components/WorkoutCard'
import { LogOut, Camera, Edit2, Check, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const FAV_SPLITS = ['PPL', 'Bro Split', 'Upper/Lower', '5/3/1', 'Full Body', 'PHUL', 'Other']

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<WorkoutPost[]>([])
  const [friendCount, setFriendCount] = useState(0)
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
  const avatarRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: p }, { data: w }, { count: fc }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('workout_posts').select(`*, profiles(id, username, full_name, avatar_url, bio, gym_location, city, favorite_split, favorite_exercises, created_at)`).eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('friendships').select('*', { count: 'exact', head: true }).or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted'),
      ])

      if (p) {
        setProfile(p)
        setFullName(p.full_name ?? '')
        setBio(p.bio ?? '')
        setGymLocation(p.gym_location ?? '')
        setCity(p.city ?? '')
        setFavSplit(p.favorite_split ?? '')
        setFavExercises(p.favorite_exercises?.length ? [...p.favorite_exercises, ...Array(3).fill('')].slice(0,3) : ['','',''])
      }
      if (w) setPosts(w as WorkoutPost[])
      setFriendCount(fc || 0)
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setSaveError('')

    try {
      let avatar_url = profile.avatar_url

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const uniquePath = `avatars/${profile.id}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('workout-photos')
          .upload(uniquePath, avatarFile, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          setSaveError('Photo upload failed: ' + uploadError.message)
          setSaving(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('workout-photos')
          .getPublicUrl(uniquePath)

        avatar_url = urlData.publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          bio,
          avatar_url,
          gym_location: gymLocation,
          city,
          favorite_split: favSplit,
          favorite_exercises: favExercises.filter(Boolean),
        })
        .eq('id', profile.id)

      if (updateError) {
        setSaveError('Save failed: ' + updateError.message)
        setSaving(false)
        return
      }

      setProfile(prev => prev ? {
        ...prev,
        full_name: fullName,
        bio,
        avatar_url,
        gym_location: gymLocation,
        city,
        favorite_split: favSplit,
        favorite_exercises: favExercises.filter(Boolean),
      } : prev)

      setEditing(false)
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err: any) {
      setSaveError('Something went wrong: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const badges = getBadges(posts, friendCount)
  const totalPRs = posts.reduce((s, p) => s + (p.exercises?.filter(e => e.is_pr).length || 0), 0)

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
              <button onClick={handleSave} disabled={saving} className="text-brand press p-2 flex items-center gap-1">
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" /> : <Check size={18} />}
              </button>
            </div>
          )}
          <Link href="/profile/friends" className="text-muted hover:text-white press px-2 py-1 text-xs font-semibold">Friends</Link>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
            className="text-muted hover:text-red-400 press p-2"><LogOut size={18} /></button>
        </div>
      </header>

      <div className="px-4 pt-6 pb-4 space-y-5">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-3 border-2 border-brand/50 overflow-hidden">
              {(avatarPreview || profile?.avatar_url) ? (
                <img
                  src={avatarPreview || profile!.avatar_url!}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
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
            { label: 'Streak', value: '—' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 rounded-2xl border border-border px-2 py-3 text-center">
              <p className="font-display text-2xl text-brand">{s.value}</p>
              <p className="text-muted text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Edit fields */}
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

        {/* Badges */}
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

        <Link href="/about" className="block text-center text-muted text-xs underline underline-offset-4 hover:text-white">
          About GoGym Beta
        </Link>
      </div>

      {/* Posts */}
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
          posts.map(post => <WorkoutCard key={post.id} post={post} />)
        )}
      </div>
      <BottomNav />
    </div>
  )
}
