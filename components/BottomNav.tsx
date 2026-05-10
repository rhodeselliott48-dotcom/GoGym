'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
      bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-border
      flex items-center justify-around
      pb-[env(safe-area-inset-bottom)] pt-2 z-50">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = path === href
        const isCreate = href === '/create'
        return (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 press transition-all duration-150
              ${isCreate ? '' : active ? 'text-brand' : 'text-muted hover:text-white'}`}>
            {isCreate ? (
              <div className="bg-brand text-white rounded-2xl p-2.5 -mt-6 shadow-xl shadow-brand/40 border-4 border-[#0f0f0f]">
                <Icon size={22} strokeWidth={2.5} />
              </div>
            ) : (
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            )}
            <span className={`text-[10px] font-semibold tracking-wide uppercase
              ${isCreate ? 'text-brand/70 mt-1' : ''}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
