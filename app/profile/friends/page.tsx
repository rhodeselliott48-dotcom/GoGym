'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Search, UserPlus, Check, X, Users } from 'lucide-react'
import Link from 'next/link'

interface UserResult { id: string; username: string; full_name: string | null; avatar_url: string | null }
interface PendingRequest { id: string; sender_id: string; username: string; full_name: string | null; avatar_url: string | null }
interface Friend { id: string; username: string; full_name: string | null; avatar_url: string | null }

export default function FriendsPage() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<string[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())
  const router = useRouter()

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setCurrentUserId(user.id)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      setCurrentUsername(myProfile?.username ?? null)

      const { data: reqs } = await supabase
        .from('friendships')
        .select('id, sender_id')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')

      if (reqs && reqs.length > 0) {
        const senderIds = reqs.map((r: any) => r.sender_id)
        const { data: senderProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', senderIds)

        const profileMap: Record<string, any> = {}
        if (senderProfiles) senderProfiles.forEach((p: any) => { profileMap[p.id] = p })

        const pendingWithProfiles = reqs.map((r: any) => ({
          id: r.id,
          sender_id: r.sender_id,
          username: profileMap[r.sender_id]?.username || 'unknown',
          full_name: profileMap[r.sender_id]?.full_name || null,
          avatar_url: profileMap[r.sender_id]?.avatar_url || null,
        }))
        setPending(pendingWithProfiles)
      }

      const { data: myFriends } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')

      if (myFriends && myFriends.length > 0) {
        const friendIds = myFriends.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
        const { data: fp } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', friendIds)
        if (fp) setFriends(fp)
      }

      const { data: sent } = await supabase
        .from('friendships')
        .select('receiver_id')
        .eq('sender_id', user.id)
        .eq('status', 'pending')
      if (sent) setSentRequests(sent.map((s: any) => s.receiver_id))

      setLoading(false)
    }
    load()
  }, [])

  async function searchUsers() {
    if (!search.trim()) return
    const supabase = supabaseRef.current
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .ilike('username', `%${search}%`)
      .neq('id', currentUserId!)
      .limit(10)
    if (data) setResults(data)
  }

  async function sendRequest(receiverId: string) {
    const supabase = supabaseRef.current
    await supabase.from('friendships').insert({
      sender_id: currentUserId!,
      receiver_id: receiverId,
      user_id: currentUserId!,
      friend_id: receiverId,
      status: 'pending'
    })
    // Send notification to receiver
    await supabase.from('notifications').insert({
      user_id: receiverId,
      sender_id: currentUserId!,
      type: 'friend_request',
      content: `@${currentUsername} sent you a friend request!`,
      read: false,
    })
    setSentRequests(prev => [...prev, receiverId])
  }

  async function handleRequest(id: string, senderId: string, accept: boolean) {
    const supabase = supabaseRef.current
    if (accept) {
      await supabase.from('friendships').update({
        status: 'accepted',
        user_id: senderId,
        friend_id: currentUserId!
      }).eq('id', id)
      // Notify the sender their request was accepted
      await supabase.from('notifications').insert({
        user_id: senderId,
        sender_id: currentUserId!,
        type: 'friend_accepted',
        content: `@${currentUsername} accepted your friend request! 🤝`,
        read: false,
      })
      const { data: p } = await supabase.from('profiles').select('id, username, full_name, avatar_url').eq('id', senderId).single()
      if (p) setFriends(prev => [...prev, p])
    } else {
      await supabase.from('friendships').delete().eq('id', id)
    }
    setPending(prev => prev.filter(r => r.id !== id))
  }

  const Avatar = ({ user }: { user: { username: string; avatar_url: string | null } }) => (
    <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-brand font-display font-bold">
          {user.username[0].toUpperCase()}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/profile" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <div className="flex items-center gap-2">
          <Users size={18} className="text-brand" />
          <h2 className="font-display text-2xl tracking-wide">Friends</h2>
        </div>
        {pending.length > 0 && (
          <span className="ml-auto bg-brand text-white text-xs font-bold px-2 py-1 rounded-full">
            {pending.length} pending
          </span>
        )}
      </header>

      <div className="px-4 py-5 space-y-6">
        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">Find People</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUsers()}
                placeholder="Search by username..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-muted" />
            </div>
            <button onClick={searchUsers} className="bg-brand text-white px-4 rounded-xl font-semibold text-sm press">Go</button>
          </div>

          {results.length > 0 && (
            <div className="mt-3 space-y-2">
              {results.map(u => {
                const isFriend = friends.some(f => f.id === u.id)
                const sent = sentRequests.includes(u.id)
                return (
                  <div key={u.id} className="flex items-center gap-3 bg-surface-2 rounded-2xl px-4 py-3 border border-border">
                    <Avatar user={u} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.username}`}>
                        <p className="font-semibold text-white text-sm">@{u.username}</p>
                      </Link>
                      {u.full_name && <p className="text-muted text-xs">{u.full_name}</p>}
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-brand font-semibold">Friends ✓</span>
                    ) : sent ? (
                      <span className="text-xs text-muted">Requested</span>
                    ) : (
                      <button onClick={() => sendRequest(u.id)}
                        className="flex items-center gap-1 bg-brand text-white text-xs font-semibold px-3 py-2 rounded-xl press">
                        <UserPlus size={14} /> Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {pending.length > 0 && (
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">
              Friend Requests ({pending.length})
            </p>
            <div className="space-y-2">
              {pending.map(req => (
                <div key={req.id} className="flex items-center gap-3 bg-brand/10 rounded-2xl px-4 py-3 border border-brand/20">
                  <Avatar user={req} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">@{req.username}</p>
                    <p className="text-muted text-xs">wants to connect</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRequest(req.id, req.sender_id, true)}
                      className="bg-brand text-white rounded-xl p-2 press"><Check size={16} /></button>
                    <button onClick={() => handleRequest(req.id, req.sender_id, false)}
                      className="bg-surface-3 text-muted rounded-xl p-2 press"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">
            Your Friends ({friends.length})
          </p>
          {friends.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p className="text-3xl mb-2">👥</p>
              <p className="text-sm">Search for friends above to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <Link key={f.id} href={`/profile/${f.username}`}
                  className="flex items-center gap-3 bg-surface-2 rounded-2xl px-4 py-3 border border-border press">
                  <Avatar user={f} />
                  <div>
                    <p className="font-semibold text-white text-sm">@{f.username}</p>
                    {f.full_name && <p className="text-muted text-xs">{f.full_name}</p>}
                  </div>
                  <div className="ml-auto text-muted">→</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}