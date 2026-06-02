'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Trophy, Flame, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface Entry {
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  value: number
  label: string
  _workouts: number
  _duration: number
  _days: number
  _prs: number
}

type SortMode = 'workouts' | 'duration' | 'days' | 'prs'
type SortDir = 'desc' | 'asc'
type TimePeriod = 'week' | 'month' | 'year' | 'all'

const REACTIONS = ['💪','🔥','👊','🏆','😤']
const rankColors = ['text-yellow-400','text-gray-300','text-orange-400']
const rankBg = ['bg-yellow-400/10 border-yellow-400/30','bg-gray-400/10 border-gray-400/30','bg-orange-400/10 border-orange-400/30']

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'workouts', label: '# Workouts' },
  { value: 'duration', label: 'Gym Time' },
  { value: 'days', label: 'Days Active' },
  { value: 'prs', label: '# PRs' },
]

function getStartDate(period: TimePeriod): Date | null {
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(now.getDate() - now.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1)
  }
  return null
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Entry[]>([])
  const [allPosts, setAllPosts] = useState<any[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({})
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('workouts')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [activeToday, setActiveToday] = useState<{username: string, id: string}[]>([])
  const [reactionSent, setReactionSent] = useState<Record<string, string>>({})
  const [reactionLoading, setReactionLoading] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) { setLoading(false); return }

      const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setCurrentUsername(myProfile?.username ?? null)

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const ids: string[] = [user.id]
      if (friendships) {
        friendships.forEach((f: any) => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id
          if (!ids.includes(otherId)) ids.push(otherId)
        })
      }
      setFriendIds(ids)

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', ids)

      const pMap: Record<string, any> = {}
      if (profilesData) profilesData.forEach((p: any) => { pMap[p.id] = p })
      setProfilesMap(pMap)

      const { data: postsData } = await supabase
        .from('workout_posts')
        .select('user_id, duration_minutes, exercises, created_at, mentions')
        .in('user_id', ids)

      if (!postsData) { setLoading(false); return }
      setAllPosts(postsData)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayActive = postsData
        .filter((r: any) => new Date(r.created_at) >= today && r.user_id !== user.id)
        .reduce((acc: any[], r: any) => {
          const p = pMap[r.user_id]
          if (p && !acc.find((a: any) => a.id === r.user_id)) {
            acc.push({ username: p.username, id: r.user_id })
          }
          return acc
        }, [])
      setActiveToday(todayActive)
      setLoading(false)
    }
    load()
  }, [])

  // Recompute board when posts, period, or friends change
  useEffect(() => {
    if (!allPosts.length && !friendIds.length) return

    const startDate = getStartDate(timePeriod)
    const filteredPosts = startDate
      ? allPosts.filter((r: any) => new Date(r.created_at) >= startDate)
      : allPosts

    const counts: Record<string, any> = {}
    for (const friendId of friendIds) {
      const p = profilesMap[friendId]
      if (!p) continue
      counts[friendId] = {
        user_id: friendId,
        username: p.username,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        workouts: 0,
        duration: 0,
        days: new Set(),
        prs: 0,
      }
    }

    for (const row of filteredPosts) {
      if (counts[row.user_id]) {
        counts[row.user_id].workouts++
        counts[row.user_id].duration += row.duration_minutes || 0
        counts[row.user_id].days.add(new Date(row.created_at).toDateString())
        counts[row.user_id].prs += (row.exercises || []).filter((e: any) => e.is_pr).length
      }
    }

    const entries: Entry[] = Object.values(counts).map((c: any) => ({
      user_id: c.user_id,
      username: c.username,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      value: c.workouts,
      label: 'workouts',
      _workouts: c.workouts,
      _duration: c.duration,
      _days: c.days.size,
      _prs: c.prs,
    }))

    setBoard(entries)
  }, [allPosts, timePeriod, friendIds, profilesMap])

  async function sendReaction(targetUser: {id: string, username: string}, emoji: string) {
    if (!currentUserId || !currentUsername) return
    setReactionLoading(targetUser.id)
    const supabase = supabaseRef.current
    await supabase.from('notifications').insert({
      user_id: targetUser.id,
      sender_id: currentUserId,
      type: 'reaction',
      content: `@${currentUsername} sent you a ${emoji} reaction!`,
      read: false,
    })
    setReactionSent(prev => ({ ...prev, [targetUser.id]: emoji }))
    setReactionLoading(null)
  }

  const sorted = [...board].map(e => {
    const value = sortMode === 'workouts' ? e._workouts : sortMode === 'duration' ? e._duration : sortMode === 'days' ? e._days : e._prs
    const label = sortMode === 'workouts' ? 'workouts' : sortMode === 'duration' ? 'min' : sortMode === 'days' ? 'days' : 'PRs'
    return { ...e, value, label }
  }).sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value)

  const currentPeriodLabel = TIME_OPTIONS.find(t => t.value === timePeriod)?.label || 'All Time'

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-brand" />
            <h2 className="font-display text-3xl tracking-wide">Leaderboard</h2>
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)}
            className="flex items-center gap-1.5 text-xs text-muted font-semibold bg-surface-2 border border-border px-3 py-1.5 rounded-xl press">
            Filters
            <ChevronDown size={13} className={`transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {filtersOpen && (
          <div className="space-y-2 animate-fade-up">
            {/* Time period row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <button onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs font-semibold text-white press">
                  📅 {currentPeriodLabel}
                  <ChevronDown size={13} className={`transition-transform ${timeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {timeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-2xl overflow-hidden z-50 shadow-xl">
                    {TIME_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => { setTimePeriod(t.value); setTimeDropdownOpen(false) }}
                        className={`w-full text-left px-4 py-3 text-sm transition-all press border-b border-border/50 last:border-0
                          ${timePeriod === t.value ? 'bg-brand text-white font-semibold' : 'text-white/70 hover:bg-surface-3'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                className="flex-shrink-0 px-3 py-2 bg-surface-2 border border-border rounded-xl text-xs text-muted press font-semibold">
                {sortDir === 'desc' ? '↓ Most' : '↑ Least'}
              </button>
            </div>

            {/* Sort mode row */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {SORT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setSortMode(o.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press transition-all
                    ${sortMode === o.value ? 'bg-brand text-white' : 'bg-surface-2 text-muted border border-border'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {activeToday.length > 0 && (
        <div className="mx-4 mt-4 bg-brand/10 border border-brand/20 rounded-2xl px-4 py-3">
          <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">🔥 Active Today</p>
          <div className="space-y-2">
            {activeToday.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <Link href={`/profile/${u.username}`} className="text-white text-sm font-semibold">@{u.username}</Link>
                <div className="flex gap-1">
                  {REACTIONS.map(r => (
                    <button key={r}
                      disabled={!!reactionSent[u.id] || reactionLoading === u.id}
                      onClick={() => sendReaction(u, r)}
                      className={`text-base press transition-all disabled:cursor-default
                        ${reactionSent[u.id] === r ? 'scale-125' : reactionSent[u.id] ? 'opacity-30' : 'opacity-60 hover:opacity-100'}`}>
                      {r}
                    </button>
                  ))}
                  {reactionSent[u.id] && <span className="text-brand text-xs ml-1 self-center">sent!</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-end justify-center gap-3">
            {[1,0,2].map(idx => {
              const entry = sorted[idx]
              if (!entry) return null
              const rank = idx + 1
              const heights = ['h-36','h-24','h-16']
              return (
                <Link key={entry.user_id} href={`/profile/${entry.username}`} className="flex flex-col items-center gap-2 press">
                  <div className={`rounded-full bg-surface-3 border-2 overflow-hidden ${idx === 0 ? 'w-16 h-16' : 'w-12 h-12'}`}
                    style={{ borderColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#f97316' }}>
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display font-bold text-xl text-brand">
                        {entry.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-white text-xs font-semibold">@{entry.username}</p>
                    <p className="text-brand text-xs font-bold flex items-center gap-0.5 justify-center">
                      <Flame size={10} />{entry.value} {entry.label}
                    </p>
                  </div>
                  <div className={`${idx === 0 ? 'h-36' : idx === 1 ? 'h-24' : 'h-16'} w-16 rounded-t-xl ${rankBg[idx]} border
                    flex items-center justify-center font-display font-extrabold text-2xl ${rankColors[idx]}`}>
                    {rank}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <main className="px-4 py-3 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-2xl animate-pulse border border-border" />
          ))
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏆</p>
            <p className="text-white font-display text-2xl">No data yet</p>
            <p className="text-muted text-sm mt-2">Add friends and log workouts to compete!</p>
            <Link href="/profile/friends" className="inline-block mt-4 bg-brand text-white font-display text-lg px-6 py-3 rounded-2xl press shadow-lg shadow-brand/20">
              FIND FRIENDS
            </Link>
          </div>
        ) : sorted.map((entry, i) => {
          const isMe = entry.user_id === currentUserId
          return (
            <Link key={entry.user_id} href={`/profile/${entry.username}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all press
                ${isMe ? 'bg-brand/10 border-brand/40' : 'bg-surface-2 border-border'}`}>
              <span className={`font-display font-extrabold text-xl w-7 text-center ${i < 3 ? rankColors[i] : 'text-muted'}`}>{i+1}</span>
              <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand font-display font-bold">
                    {entry.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  @{entry.username} {isMe && <span className="text-brand text-xs">(you)</span>}
                </p>
                {entry.full_name && <p className="text-muted text-xs truncate">{entry.full_name}</p>}
              </div>
              <div className="flex items-center gap-1 text-brand font-bold text-sm flex-shrink-0">
                <Flame size={14} />{entry.value}
                <span className="text-muted text-xs font-normal">{entry.label}</span>
              </div>
            </Link>
          )
        })}
      </main>
      <BottomNav />
    </div>
  )
}