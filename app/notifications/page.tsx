'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { ArrowLeft, Bell } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  sender_id: string
  type: string
  content: string
  read: boolean
  created_at: string
  sender?: { username: string; avatar_url: string | null }
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (notifs && notifs.length > 0) {
        const senderIds = [...new Set(notifs.map((n: any) => n.sender_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', senderIds)

        const profileMap: Record<string, any> = {}
        if (profiles) profiles.forEach((p: any) => { profileMap[p.id] = p })

        const withSenders = notifs.map((n: any) => ({
          ...n,
          sender: profileMap[n.sender_id] || { username: 'someone', avatar_url: null },
        }))
        setNotifications(withSenders)

        // Mark all as read
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-brand" />
          <h2 className="font-display text-2xl tracking-wide">Notifications</h2>
        </div>
      </header>

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-2 rounded-2xl animate-pulse border border-border" />
          ))
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔔</p>
            <p className="text-white font-display text-2xl">No notifications</p>
            <p className="text-muted text-sm mt-2">Reactions and updates will show here!</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
                ${!n.read ? 'bg-brand/10 border-brand/20' : 'bg-surface-2 border-border'}`}>
              <Link href={`/profile/${n.sender?.username}`}>
                <div className="w-10 h-10 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                  {n.sender?.avatar_url ? (
                    <img src={n.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand font-display font-bold">
                      {n.sender?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">{n.content}</p>
                <p className="text-muted text-xs mt-0.5">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}