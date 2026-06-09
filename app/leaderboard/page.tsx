'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Trophy, Flame, ChevronDown, Zap, MapPin, Navigation } from 'lucide-react'
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
  _sets: number
  _reps: number
  _city: string | null
  _gym: string | null
}

type SortMode = 'workouts' | 'duration' | 'days' | 'prs' | 'sets' | 'reps'
type SortDir = 'desc' | 'asc'
type TimePeriod = 'week' | 'month' | 'year' | 'all'
type Scope = 'friends' | 'nearme' | 'global'

const REACTIONS = ['💪','🔥','👊','🏆','😤']
const rankColors = ['text-yellow-400','text-zinc-300','text-orange-400']
const rankGlow = ['shadow-yellow-500/30','shadow-zinc-400/20','shadow-orange-500/20']
const rankBorder = ['border-yellow-500/50','border-zinc-500/40','border-orange-500/40']
const rankBg = ['bg-yellow-500/10','bg-zinc-500/10','bg-orange-500/10']
const medalEmoji = ['🥇','🥈','🥉']
const NEAR_ME_RADIUS_MILES = 25

const TIME_OPTIONS: { value: TimePeriod; label: string; emoji: string }[] = [
  { value: 'week',  label: 'This Week',  emoji: '📅' },
  { value: 'month', label: 'This Month', emoji: '🗓️' },
  { value: 'year',  label: 'This Year',  emoji: '📆' },
  { value: 'all',   label: 'All Time',   emoji: '🏅' },
]

const SORT_OPTIONS: { value: SortMode; label: string; emoji: string }[] = [
  { value: 'workouts', label: 'Workouts', emoji: '🏋️' },
  { value: 'sets',     label: 'Sets',     emoji: '🔢' },
  { value: 'reps',     label: 'Reps',     emoji: '🔁' },
  { value: 'duration', label: 'Gym Time', emoji: '⏱️' },
  { value: 'days',     label: 'Days',     emoji: '📅' },
  { value: 'prs',      label: 'PRs',      emoji: '⭐' },
]

function getStartDate(period: TimePeriod): Date | null {
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(now.getDate() - now.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
  return null
}

// Haversine formula — distance between two lat/lng points in miles
function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Avatar({ entry, size = 'md' }: { entry: Entry; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-10 h-10 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }
  return (
    <div className={`${sizes[size]} rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-red-500`}>
      {entry.avatar_url
        ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
        : <span>{entry.username[0].toUpperCase()}</span>
      }
    </div>
  )
}

export default function LeaderboardPage() {
  const [allPosts, setAllPosts] = useState<any[]>([])
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [friendsBoard, setFriendsBoard] = useState<Entry[]>([])
  const [globalBoard, setGlobalBoard] = useState<Entry[]>([])
  const [nearMeBoard, setNearMeBoard] = useState<Entry[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('workouts')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('friends')
  const [activeToday, setActiveToday] = useState<{username: string, id: string}[]>([])
  const [reactionSent, setReactionSent] = useState<Record<string, string>>({})
  const [reactionLoading, setReactionLoading] = useState<string | null>(null)
  // Near Me state
  const [nearMeCity, setNearMeCity] = useState<string>('')
  const [nearMeLat, setNearMeLat] = useState<number | null>(null)
  const [nearMeLon, setNearMeLon] = useState<number | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationDetected, setLocationDetected] = useState(false)
  const [nearMeCount, setNearMeCount] = useState(0)
  const [showCityInput, setShowCityInput] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)
      if (!user) { setLoading(false); return }

      const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      setCurrentUsername(myProfile?.username ?? null)

      // Friends
      const { data: friendships } = await supabase
        .from('friendships').select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted')

      const ids: string[] = [user.id]
      if (friendships) {
        friendships.forEach((f: any) => {
          const otherId = f.user_id === user.id ? f.friend_id : f.user_id
          if (!ids.includes(otherId)) ids.push(otherId)
        })
      }
      setFriendIds(ids)

      // Profiles for friends
      const { data: friendProfilesData } = await supabase
        .from('profiles').select('id, username, full_name, avatar_url').in('id', ids)
      const pMap: Record<string, any> = {}
      if (friendProfilesData) friendProfilesData.forEach((p: any) => { pMap[p.id] = p })
      setProfilesMap(pMap)

      // All public posts for global + near me (grab city/gym too)
      const { data: allPublicPosts } = await supabase
        .from('workout_posts')
        .select('user_id, duration_minutes, exercises, created_at, city, gym_location')
        .eq('is_public', true)

      // Friends posts
      const { data: friendPostsData } = await supabase
        .from('workout_posts')
        .select('user_id, duration_minutes, exercises, created_at, city, gym_location')
        .in('user_id', ids)

      if (!friendPostsData) { setLoading(false); return }
      setAllPosts(friendPostsData)

      // Active today
      const today = new Date(); today.setHours(0,0,0,0)
      const todayActive = friendPostsData
        .filter((r: any) => new Date(r.created_at) >= today && r.user_id !== user.id)
        .reduce((acc: any[], r: any) => {
          const p = pMap[r.user_id]
          if (p && !acc.find((a: any) => a.id === r.user_id)) acc.push({ username: p.username, id: r.user_id })
          return acc
        }, [])
      setActiveToday(todayActive)

      // Build global board
      if (allPublicPosts) {
        const allUserIds = [...new Set(allPublicPosts.map((p: any) => p.user_id))]
        const { data: allProfilesData } = await supabase
          .from('profiles').select('id, username, full_name, avatar_url').in('id', allUserIds)
        const allProfilesMap: Record<string, any> = {}
        if (allProfilesData) allProfilesData.forEach((p: any) => { allProfilesMap[p.id] = p })

        const globalCounts: Record<string, any> = {}
        for (const post of allPublicPosts) {
          const p = allProfilesMap[post.user_id]
          if (!p) continue
          if (!globalCounts[post.user_id]) {
            globalCounts[post.user_id] = {
              user_id: post.user_id, username: p.username, full_name: p.full_name,
              avatar_url: p.avatar_url, workouts: 0, duration: 0, days: new Set(),
              prs: 0, sets: 0, reps: 0,
              _city: post.city || null, _gym: post.gym_location || null,
            }
          }
          globalCounts[post.user_id].workouts++
          globalCounts[post.user_id].duration += post.duration_minutes || 0
          globalCounts[post.user_id].days.add(new Date(post.created_at).toDateString())
          const exs = post.exercises || []
          exs.forEach((e: any) => {
            globalCounts[post.user_id].prs += e.is_pr ? 1 : 0
            const sets = Array.isArray(e.sets) ? e.sets.length : (parseInt(e.sets) || 0)
            const reps = parseInt(e.reps) || 0
            globalCounts[post.user_id].sets += sets
            globalCounts[post.user_id].reps += sets * reps
          })
          // Keep most recent city/gym
          if (post.city) globalCounts[post.user_id]._city = post.city
          if (post.gym_location) globalCounts[post.user_id]._gym = post.gym_location
        }

        const globalEntries: Entry[] = Object.values(globalCounts).map((c: any) => ({
          user_id: c.user_id, username: c.username, full_name: c.full_name, avatar_url: c.avatar_url,
          value: c.workouts, label: 'workouts',
          _workouts: c.workouts, _duration: c.duration, _days: c.days.size,
          _prs: c.prs, _sets: c.sets, _reps: c.reps,
          _city: c._city, _gym: c._gym,
        }))
        setGlobalBoard(globalEntries)
      }

      setLoading(false)
    }
    load()
  }, [])

  // Build friends board when posts or time changes
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
        user_id: friendId, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url,
        workouts: 0, duration: 0, days: new Set(), prs: 0, sets: 0, reps: 0,
        _city: null, _gym: null,
      }
    }

    for (const row of filteredPosts) {
      if (counts[row.user_id]) {
        counts[row.user_id].workouts++
        counts[row.user_id].duration += row.duration_minutes || 0
        counts[row.user_id].days.add(new Date(row.created_at).toDateString())
        if (row.city) counts[row.user_id]._city = row.city
        if (row.gym_location) counts[row.user_id]._gym = row.gym_location
        const exs = row.exercises || []
        exs.forEach((e: any) => {
          counts[row.user_id].prs += e.is_pr ? 1 : 0
          const sets = Array.isArray(e.sets) ? e.sets.length : (parseInt(e.sets) || 0)
          const reps = parseInt(e.reps) || 0
          counts[row.user_id].sets += sets
          counts[row.user_id].reps += sets * reps
        })
      }
    }

    const entries: Entry[] = Object.values(counts).map((c: any) => ({
      user_id: c.user_id, username: c.username, full_name: c.full_name, avatar_url: c.avatar_url,
      value: c.workouts, label: 'workouts',
      _workouts: c.workouts, _duration: c.duration, _days: c.days.size,
      _prs: c.prs, _sets: c.sets, _reps: c.reps,
      _city: c._city, _gym: c._gym,
    }))
    setFriendsBoard(entries)
  }, [allPosts, timePeriod, friendIds, profilesMap])

  // Build Near Me board when lat/lon changes
  useEffect(() => {
    if (nearMeLat === null || nearMeLon === null) return
    const source = globalBoard.length > 0 ? globalBoard : []
    // Filter to users who have a city that geocodes within radius
    // Since we store city as text, we filter by matching city name to nearMeCity for now
    // (full coordinate filtering requires storing lat/lon per post — use city match as proxy)
    const cityLower = nearMeCity.toLowerCase().split(',')[0].trim()
    const nearby = source.filter(e =>
      e._city?.toLowerCase().includes(cityLower) ||
      e._gym?.toLowerCase().includes(cityLower)
    )
    setNearMeBoard(nearby)
    setNearMeCount(nearby.length)
  }, [nearMeLat, nearMeLon, nearMeCity, globalBoard])

  async function handleDetectLocation() {
    if (!navigator.geolocation) return
    setDetectingLocation(true)
    setLocationDetected(false)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          setNearMeLat(latitude)
          setNearMeLon(longitude)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const cityName = data.address?.city || data.address?.town || data.address?.village || ''
          const state = data.address?.state_code || data.address?.state || ''
          const combined = cityName && state ? `${cityName}, ${state}` : cityName || state || ''
          if (combined) setNearMeCity(combined)
          setLocationDetected(true)
        } catch {
          // silently fail
        }
        setDetectingLocation(false)
      },
      () => { setDetectingLocation(false) }
    )
  }

  async function handleCitySearch() {
    if (!cityInput.trim()) return
    setDetectingLocation(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput)}&format=json&limit=1`
      )
      const data = await res.json()
      if (data[0]) {
        setNearMeLat(parseFloat(data[0].lat))
        setNearMeLon(parseFloat(data[0].lon))
        setNearMeCity(cityInput.trim())
        setLocationDetected(true)
        setShowCityInput(false)
        setCityInput('')
      }
    } catch { }
    setDetectingLocation(false)
  }

  async function sendReaction(targetUser: {id: string, username: string}, emoji: string) {
    if (!currentUserId || !currentUsername) return
    setReactionLoading(targetUser.id)
    await supabaseRef.current.from('notifications').insert({
      user_id: targetUser.id, sender_id: currentUserId, type: 'reaction',
      content: `@${currentUsername} sent you a ${emoji} reaction!`, read: false,
    })
    setReactionSent(prev => ({ ...prev, [targetUser.id]: emoji }))
    setReactionLoading(null)
  }

  function buildSorted(board: Entry[]) {
    return [...board].map(e => {
      const valueMap = { workouts: e._workouts, duration: e._duration, days: e._days, prs: e._prs, sets: e._sets, reps: e._reps }
      const labelMap = { workouts: 'workouts', duration: 'min', days: 'days', prs: 'PRs', sets: 'sets', reps: 'reps' }
      return { ...e, value: valueMap[sortMode], label: labelMap[sortMode] }
    }).sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value)
  }

  const activeBoard = scope === 'friends' ? friendsBoard : scope === 'global' ? globalBoard : nearMeBoard
  const sorted = buildSorted(activeBoard)
  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)
  const currentPeriod = TIME_OPTIONS.find(t => t.value === timePeriod)!

  function renderNearMePrompt() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <MapPin size={28} className="text-red-500" />
        </div>
        <p className="font-display text-white text-2xl mb-2">Find Local Lifters</p>
        <p className="text-zinc-500 text-sm mb-6">See who's grinding within {NEAR_ME_RADIUS_MILES} miles of you</p>
        <button
          onClick={handleDetectLocation}
          disabled={detectingLocation}
          className="flex items-center gap-2 bg-red-600 text-white font-bold px-6 py-3 rounded-2xl press mb-3 disabled:opacity-50">
          <Navigation size={16} />
          {detectingLocation ? 'Finding your location...' : '📍 Find Me'}
        </button>
        <button
          onClick={() => setShowCityInput(true)}
          className="text-zinc-500 text-sm font-semibold press hover:text-white transition-colors">
          or enter a city manually
        </button>
        {showCityInput && (
          <div className="mt-4 flex gap-2 w-full max-w-xs">
            <input
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
              placeholder="e.g. Dallas, TX"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
            />
            <button
              onClick={handleCitySearch}
              className="bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl press text-sm">
              Go
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderNearMeBanner() {
    return (
      <div className="flex items-center gap-3 bg-red-950/40 border border-red-900/50 rounded-2xl px-4 py-3 mb-4">
        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest">Near Me</p>
          <p className="text-white text-sm font-semibold truncate">📍 {nearMeCity}</p>
          <p className="text-zinc-500 text-xs">Within {NEAR_ME_RADIUS_MILES} miles · {nearMeCount} lifter{nearMeCount !== 1 ? 's' : ''} found</p>
        </div>
        <button
          onClick={() => { setLocationDetected(false); setNearMeLat(null); setNearMeLon(null); setNearMeCity(''); setNearMeBoard([]) }}
          className="text-zinc-500 text-xs font-semibold press hover:text-white transition-colors border border-zinc-700 rounded-xl px-3 py-1.5">
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-24">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-zinc-900 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={22} className="text-red-500" />
            <h1 className="font-display text-3xl tracking-wide text-white">Leaderboard</h1>
          </div>
          {/* Time picker */}
          <div className="relative">
            <button onClick={() => setTimeDropdownOpen(!timeDropdownOpen)}
              className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white">
              {currentPeriod.emoji} {currentPeriod.label}
              <ChevronDown size={12} className={`transition-transform ${timeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {timeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTimeDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden z-50 shadow-2xl">
                  {TIME_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => { setTimePeriod(t.value); setTimeDropdownOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${timePeriod === t.value ? 'bg-red-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800'}`}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sort chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SORT_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSortMode(o.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                sortMode === o.value ? 'bg-red-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
              }`}>
              <span>{o.emoji}</span>{o.label}
            </button>
          ))}
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
            {sortDir === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        {/* Scope tabs */}
        <div className="flex gap-0 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          {([
            { value: 'friends', label: '👥 Friends' },
            { value: 'nearme',  label: '📍 Near Me' },
            { value: 'global',  label: '🌐 Global'  },
          ] as { value: Scope; label: string }[]).map(s => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              className={`flex-1 py-2.5 text-xs font-bold transition-all
                ${scope === s.value ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-white'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {/* Active today banner — friends only */}
      {scope === 'friends' && activeToday.length > 0 && (
        <div className="mx-4 mt-4 bg-red-950/40 border border-red-900/50 rounded-2xl px-4 py-3">
          <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Zap size={12} /> Active Today
          </p>
          <div className="space-y-2">
            {activeToday.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <Link href={`/profile/${u.username}`} className="text-white text-sm font-semibold">@{u.username}</Link>
                <div className="flex gap-1">
                  {REACTIONS.map(r => (
                    <button key={r} disabled={!!reactionSent[u.id] || reactionLoading === u.id}
                      onClick={() => sendReaction(u, r)}
                      className={`text-base press transition-all disabled:cursor-default
                        ${reactionSent[u.id] === r ? 'scale-125' : reactionSent[u.id] ? 'opacity-30' : 'opacity-60 hover:opacity-100'}`}>
                      {r}
                    </button>
                  ))}
                  {reactionSent[u.id] && <span className="text-red-400 text-xs ml-1 self-center">sent!</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Near Me location banner or prompt */}
      {scope === 'nearme' && !locationDetected && !loading && renderNearMePrompt()}

      {scope === 'nearme' && locationDetected && (
        <div className="px-4 pt-4">
          {renderNearMeBanner()}
        </div>
      )}

      {/* Podium */}
      {!loading && locationDetected || scope !== 'nearme' ? (
        <>
          {!loading && top3.length >= 3 && (scope !== 'nearme' || locationDetected) && (
            <div className="px-4 pt-6 pb-2">
              <div className="flex items-end justify-center gap-4">
                {[1, 0, 2].map(idx => {
                  const entry = top3[idx]
                  if (!entry) return null
                  const rank = idx + 1
                  const isFirst = idx === 0
                  const podiumH = isFirst ? 'h-32' : idx === 1 ? 'h-20' : 'h-14'

                  return (
                    <Link key={entry.user_id} href={`/profile/${entry.username}`}
                      className="flex flex-col items-center gap-1.5 press flex-1 max-w-[100px]">
                      {isFirst && <span className="text-xl -mb-1">👑</span>}
                      <div className={`rounded-full border-2 overflow-hidden shadow-lg ${rankBorder[idx]} ${rankGlow[idx]} ${isFirst ? 'w-16 h-16' : 'w-12 h-12'}`}>
                        {entry.avatar_url
                          ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <div className={`w-full h-full flex items-center justify-center font-bold ${isFirst ? 'text-xl' : 'text-base'} text-red-500 bg-zinc-800`}>
                              {entry.username[0].toUpperCase()}
                            </div>
                        }
                      </div>
                      <div className="text-center">
                        <p className="text-white text-[11px] font-bold truncate w-full">@{entry.username}</p>
                        <p className={`text-[10px] font-black flex items-center gap-0.5 justify-center ${rankColors[idx]}`}>
                          <Flame size={9} />{entry.value} {entry.label}
                        </p>
                        {entry._gym && (
                          <p className="text-zinc-600 text-[9px] truncate">📍 {entry._gym}</p>
                        )}
                      </div>
                      <div className={`w-full ${podiumH} rounded-t-xl ${rankBg[idx]} border ${rankBorder[idx]} flex items-center justify-center`}>
                        <span className={`font-display font-black text-3xl ${rankColors[idx]}`}>{rank}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* List */}
          <main className="px-4 pt-4 space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse border border-zinc-800" />
              ))
            ) : sorted.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🏆</p>
                <p className="text-white font-display text-2xl">
                  {scope === 'nearme' ? 'No lifters found nearby' : scope === 'global' ? 'No public posts yet' : 'No data yet'}
                </p>
                <p className="text-zinc-500 text-sm mt-2">
                  {scope === 'nearme'
                    ? 'Try a different city or check back later'
                    : scope === 'global'
                    ? 'Be the first to post a public workout!'
                    : 'Add friends and log workouts to compete!'}
                </p>
                {scope === 'friends' && (
                  <Link href="/profile/friends"
                    className="inline-block mt-4 bg-red-600 text-white font-display text-lg px-6 py-3 rounded-2xl press shadow-lg">
                    FIND FRIENDS
                  </Link>
                )}
              </div>
            ) : sorted.map((entry, i) => {
              const isMe = entry.user_id === currentUserId
              const isTop3 = i < 3
              return (
                <Link key={entry.user_id} href={`/profile/${entry.username}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all press ${
                    isMe ? 'bg-red-950/30 border-red-800/50' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3
                      ? <span className="text-lg">{medalEmoji[i]}</span>
                      : <span className="text-zinc-500 font-bold text-sm">{i + 1}</span>
                    }
                  </div>
                  <Avatar entry={entry} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      @{entry.username}
                      {isMe && <span className="text-red-400 text-xs ml-1">(you)</span>}
                    </p>
                    {/* Show gym location on Near Me, full name elsewhere */}
                    {scope === 'nearme' && entry._gym ? (
                      <p className="text-zinc-500 text-xs truncate flex items-center gap-1">
                        <MapPin size={9} />{entry._gym}
                      </p>
                    ) : entry.full_name ? (
                      <p className="text-zinc-500 text-xs truncate">{entry.full_name}</p>
                    ) : entry._city ? (
                      <p className="text-zinc-500 text-xs truncate flex items-center gap-1">
                        <MapPin size={9} />{entry._city}
                      </p>
                    ) : null}
                  </div>
                  <div className={`flex items-center gap-1 font-black text-sm flex-shrink-0 ${isTop3 ? rankColors[i] : 'text-red-500'}`}>
                    <Flame size={13} />
                    <span>{entry.value}</span>
                    <span className="text-zinc-500 text-xs font-normal ml-0.5">{entry.label}</span>
                  </div>
                </Link>
              )
            })}
          </main>
        </>
      ) : null}

      <BottomNav />
    </div>
  )
}
