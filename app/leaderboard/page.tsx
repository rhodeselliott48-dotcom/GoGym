'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Trophy, Flame, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Entry {
  user_id: string; username: string; full_name: string | null
  avatar_url: string | null; value: number; label: string
}

type SortMode = 'workouts' | 'duration' | 'days' | 'prs'
type SortDir = 'desc' | 'asc'

const REACTIONS = ['💪','🔥','👊','🏆','😤']
const rankColors = ['text-yellow-400','text-gray-300','text-orange-400']
const rankBg = ['bg-yellow-400/10 border-yellow-400/30','bg-gray-400/10 border-gray-400/30','bg-orange-400/10 border-orange-400/30']

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('workouts')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [activeToday, setActiveToday] = useState<{username: string, id: string}[]>([])
  const [reactionSent, setReactionSent] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data } = await supabase.from('workout_posts').select('user_id, duration_minutes, exercises, created_at, profiles(username, full_name, avatar_url)')
      if (!data) { setLoading(false); return }

      const today = new Date(); today.setHours(0,0,0,0)
      const counts: Record<string, any> = {}

      for (const row of data as any[]) {
        const p = row.profiles; if (!p) continue
        if (!counts[row.user_id]) {
          counts[row.user_id] = { user_id: row.user_id, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url, workouts: 0, duration: 0, days: new Set(), prs: 0 }
        }
        counts[row.user_id].workouts++
        counts[row.user_id].duration += row.duration_minutes || 0
        counts[row.user_id].days.add(new Date(row.created_at).toDateString())
        counts[row.user_id].prs += (row.exercises || []).filter((e: any) => e.is_pr).length
        if (new Date(row.created_at) >= today && row.user_id !== user?.id) {
          // track active
        }
      }

      // Active today
      const todayActive = (data as any[])
        .filter(r => new Date(r.created_at) >= today && r.user_id !== user?.id && r.profiles)
        .reduce((acc, r) => {
          if (!acc.find((a: any) => a.id === r.user_id)) acc.push({ username: r.profiles.username, id: r.user_id })
          return acc
        }, [] as any[])
      setActiveToday(todayActive)

      const entries: Entry[] = Object.values(counts).map((c: any) => ({
        user_id: c.user_id, username: c.username, full_name: c.full_name, avatar_url: c.avatar_url,
        value: sortMode === 'workouts' ? c.workouts : sortMode === 'duration' ? c.duration : sortMode === 'days' ? c.days.size : c.prs,
        label: sortMode === 'workouts' ? 'workouts' : sortMode === 'duration' ? 'min' : sortMode === 'days' ? 'days' : 'PRs',
        _data: c,
      }))
      setBoard(entries)
      setLoading(false)
    }
    load()
  }, [])

  const sorted = [...board].map(e => {
    const c = (e as any)._data
    const value = sortMode === 'workouts' ? c.workouts : sortMode === 'duration' ? c.duration : sortMode === 'days' ? c.days.size : c.prs
    const label = sortMode === 'workouts' ? 'workouts' : sortMode === 'duration' ? 'min' : sortMode === 'days' ? 'days' : 'PRs'
    return { ...e, value, label }
  }).sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value)

  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'workouts', label: '# Workouts' },
    { value: 'duration', label: 'Gym Time' },
    { value: 'days',    label: 'Days Active' },
    { value: 'prs',     label: '# PRs' },
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={20} className="text-brand" />
          <h2 className="font-display text-3xl tracking-wide">Leaderboard</h2>
        </div>
        {/* Filter controls */}
        <div className="flex gap-2">
          <div className="flex gap-1.5 flex-1 overflow-x-auto">
            {SORT_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setSortMode(o.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold press transition-all
                  ${sortMode === o.value ? 'bg-brand text-white' : 'bg-surface-2 text-muted border border-border'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex-shrink-0 px-3 py-1.5 bg-surface-2 border border-border rounded-full text-xs text-muted press flex items-center gap-1">
            {sortDir === 'desc' ? '↓ Most' : '↑ Least'}
          </button>
        </div>
      </header>

      {/* Active Today */}
      {activeToday.length > 0 && (
        <div className="mx-4 mt-4 bg-brand/10 border border-brand/20 rounded-2xl px-4 py-3">
          <p className="text-brand text-xs font-bold uppercase tracking-widest mb-2">🔥 Active Today</p>
          <div className="space-y-2">
            {activeToday.map(u => (
              <div key={u.id} className="flex items-center justify-between">
                <Link href={`/profile/${u.username}`} className="text-white text-sm font-semibold">@{u.username}</Link>
                <div className="flex gap-1">
                  {REACTIONS.map(r => (
                    <button key={r} onClick={() => setReactionSent(prev => ({ ...prev, [u.id]: r }))}
                      className={`text-base press transition-all ${reactionSent[u.id] === r ? 'scale-125' : 'opacity-60 hover:opacity-100'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Podium */}
      {!loading && sorted.length >= 3 && (
        <div className="px-4 pt-6 pb-2">
          <div className="flex items-end justify-center gap-3">
            {[1,0,2].map(idx => {
              const entry = sorted[idx]; if (!entry) return null
              const rank = idx + 1
              const heights = ['h-28','h-20','h-16']
              return (
                <Link key={entry.user_id} href={`/profile/${entry.username}`} className="flex flex-col items-center gap-2 press">
                  <div className={`rounded-full bg-surface-3 border-2 overflow-hidden
                    ${idx === 0 ? 'w-16 h-16' : 'w-12 h-12'} ${rankColors[idx]}`}
                    style={{ borderColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : '#f97316' }}>
                    {entry.avatar_url ? (
                      <Image src={entry.avatar_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display font-bold text-xl text-current">
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
                  <div className={`${heights[idx === 0 ? 0 : idx === 1 ? 2 : 1]} w-16 rounded-t-xl ${rankBg[idx]} border
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
        ) : sorted.map((entry, i) => {
          const isMe = entry.user_id === currentUserId
          return (
            <Link key={entry.user_id} href={`/profile/${entry.username}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all press
                ${isMe ? 'bg-brand/10 border-brand/40' : 'bg-surface-2 border-border'}`}>
              <span className={`font-display font-extrabold text-xl w-7 text-center ${i < 3 ? rankColors[i] : 'text-muted'}`}>{i+1}</span>
              <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                {entry.avatar_url ? (
                  <Image src={entry.avatar_url} alt="" width={40} height={40} className="object-cover" />
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
