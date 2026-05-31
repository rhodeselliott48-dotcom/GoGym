'use client'
import { useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, PlusSquare, Compass, Trophy, User } from 'lucide-react'

const tabs = [
  { href: '/feed',        icon: Home,       label: 'Feed'    },
  { href: '/discover',    icon: Compass,    label: 'Discover' },
  { href: '/create',      icon: PlusSquare, label: 'Log'     },
  { href: '/leaderboard', icon: Trophy,     label: 'Board'   },
  { href: '/profile',     icon: User,       label: 'Me'      },
]

export default function BottomNav() {
  const path = usePathname()
  const router = useRouter()
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) { router.push('/create'); return }
    const event = new CustomEvent('gogym_photos', { detail: { files } })
    window.dispatchEvent(event)
    router.push('/create?photos=1')
    e.target.value = ''
  }

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={handleFiles} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*"
        onChange={handleFiles} className="hidden" />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
        bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-border
        flex items-center justify-around
        pb-[env(safe-area-inset-bottom)] pt-2 z-50">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = path === href
          const isCreate = href === '/create'
          if (isCreate) {
            return (
              <div key={href} className="flex flex-col items-center gap-0.5 px-3 py-1 relative">
                <button onClick={() => cameraRef.current?.click()}
                  className="bg-brand text-white rounded-2xl p-2.5 -mt-6 shadow-xl shadow-brand/40 border-4 border-[#0f0f0f] press transition-all">
                  <Icon size={22} strokeWidth={2.5} />
                </button>
                <span className="text-[10px] font-semibold tracking-wide uppercase text-brand/70 mt-1">{label}</span>
                <button onClick={() => libraryRef.current?.click()}
                  title="Choose from library"
                  className="absolute -top-3 -right-1 bg-[#1e1e1e] border border-border rounded-full w-6 h-6
                    flex items-center justify-center press hover:border-brand/40 transition-all">
                  <span className="text-[9px] text-muted font-bold">📷</span>
                </button>
              </div>
            )
          }
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 press transition-all duration-150
                ${active ? 'text-brand' : 'text-muted hover:text-white'}`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold tracking-wide uppercase">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}