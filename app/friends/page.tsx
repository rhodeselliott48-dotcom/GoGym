'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import { Search, UserPlus, Check, X, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface FriendEntry { id:string; profile:Profile; status:'accepted'|'pending_sent'|'pending_received' }

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [currentUser, setCurrentUser] = useState<Profile|null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(p)

      const { data: friendships } = await supabase.from('friendships')
        .select('id, user_a, user_b, status, profiles!friendships_user_b_fkey(*), profiles!friendships_user_a_fkey(*)')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)

      if (friendships) {
        const entries: FriendEntry[] = friendships.map((f: any) => {
          const isA = f.user_a === user.id
          const otherProfile = isA ? f['profiles!friendships_user_b_fkey'] : f['profiles!friendships_user_a_fkey']
          let status: FriendEntry['status'] = 'accepted'
          if (f.status === 'pending') status = isA ? 'pending_sent' : 'pending_received'
          return { id: f.id, profile: otherProfile, status }
        }).filter(e => e.profile)
        setFriends(entries)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!search.trim() || search.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${search}%`).neq('id', currentUser?.id).limit(8)
      setResults((data||[]) as Profile[])
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  async function sendRequest(toId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('friendships').insert({ user_a: user.id, user_b: toId, status:'pending' })
    setResults(prev => prev.filter(p => p.id !== toId))
  }

  async function respondRequest(friendshipId: string, accept: boolean) {
    if (accept) {
      await supabase.from('friendships').update({ status:'accepted' }).eq('id', friendshipId)
      setFriends(prev => prev.map(f => f.id === friendshipId ? {...f, status:'accepted'} : f))
    } else {
      await supabase.from('friendships').delete().eq('id', friendshipId)
      setFriends(prev => prev.filter(f => f.id !== friendshipId))
    }
  }

  const accepted = friends.filter(f => f.status === 'accepted')
  const pending = friends.filter(f => f.status === 'pending_received')
  const sent = friends.filter(f => f.status === 'pending_sent')
  const friendIds = new Set(friends.map(f => f.profile?.id))

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-nav">
      <header className="sticky top-0 z-40 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/profile" className="text-muted hover:text-white press"><ArrowLeft size={20}/></Link>
        <h2 className="font-display text-3xl text-white tracking-wide">Friends</h2>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Search */}
        <div>
          <label className="text-xs text-muted uppercase tracking-widest font-bold mb-2 block">Find People</label>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by @username..."
              className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-white placeholder-muted text-sm"/>
          </div>
          {results.length > 0 && (
            <div className="mt-2 bg-surface rounded-2xl border border-border overflow-hidden">
              {results.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                  <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                    {p.avatar_url ? <Image src={p.avatar_url} alt="" width={40} height={40} className="object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-brand">{p.username[0].toUpperCase()}</div>}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">@{p.username}</p>
                    {p.full_name && <p className="text-muted text-xs">{p.full_name}</p>}
                  </div>
                  {!friendIds.has(p.id) && (
                    <button onClick={() => sendRequest(p.id)}
                      className="bg-brand text-white text-xs font-bold px-3 py-1.5 rounded-xl press flex items-center gap-1">
                      <UserPlus size={12}/> Add
                    </button>
                  )}
                  {friendIds.has(p.id) && <span className="text-muted text-xs">Already friends</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mb-3">Friend Requests ({pending.length})</p>
            <div className="space-y-2">
              {pending.map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-surface rounded-2xl border border-brand/30 px-4 py-3">
                  <Link href={`/profile/${f.profile.username}`}>
                    <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                      {f.profile.avatar_url ? <Image src={f.profile.avatar_url} alt="" width={40} height={40} className="object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-brand">{f.profile.username[0].toUpperCase()}</div>}
                    </div>
                  </Link>
                  <div className="flex-1"><p className="text-white font-semibold text-sm">@{f.profile.username}</p></div>
                  <div className="flex gap-2">
                    <button onClick={() => respondRequest(f.id, true)} className="bg-brand text-white p-2 rounded-xl press"><Check size={16}/></button>
                    <button onClick={() => respondRequest(f.id, false)} className="bg-surface-3 text-muted p-2 rounded-xl press border border-border"><X size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends list */}
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-bold mb-3">Friends ({accepted.length})</p>
          {loading ? Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-surface rounded-2xl animate-pulse border border-border mb-2"/>) :
            accepted.length === 0 ? <p className="text-muted text-sm text-center py-6">No friends yet. Search for people above!</p> :
            <div className="space-y-2">
              {accepted.map(f => (
                <Link key={f.id} href={`/profile/${f.profile.username}`}
                  className="flex items-center gap-3 bg-surface rounded-2xl border border-border px-4 py-3 press">
                  <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                    {f.profile.avatar_url ? <Image src={f.profile.avatar_url} alt="" width={40} height={40} className="object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-brand">{f.profile.username[0].toUpperCase()}</div>}
                  </div>
                  <div className="flex-1"><p className="text-white font-semibold text-sm">@{f.profile.username}</p>{f.profile.full_name && <p className="text-muted text-xs">{f.profile.full_name}</p>}</div>
                </Link>
              ))}
            </div>
          }
        </div>

        {sent.length > 0 && (
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-bold mb-3">Sent Requests</p>
            <div className="space-y-2">
              {sent.map(f => (
                <div key={f.id} className="flex items-center gap-3 bg-surface rounded-2xl border border-border px-4 py-3 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center font-display text-brand">{f.profile.username[0].toUpperCase()}</div>
                  </div>
                  <div className="flex-1"><p className="text-white font-semibold text-sm">@{f.profile.username}</p><p className="text-muted text-xs">Request pending</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav/>
    </div>
  )
}
