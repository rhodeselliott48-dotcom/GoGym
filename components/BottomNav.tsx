'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, PlusSquare, Compass, Trophy, User, Camera, ImageIcon } from 'lucide-react'

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
  const [showSheet, setShowSheet] = useState(false)
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

  function pickCamera() {
    setShowSheet(false)
    setTimeout(() => cameraRef.current?.click(), 150)
  }

  function pickLibrary() {
    setShowSheet(false)
    setTimeout(() => libraryRef.current?.click(), 150)
  }

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={handleFiles} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*"
        onChange={handleFiles} className="hidden" />

      {/* Slide-up sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-[60] flex items-end"
          onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-auto bg-[#1a1a1a] border border-border rounded-t-3xl px-4 pt-3 pb-10 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            {/* Handle bar */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

            <button onClick={pickCamera}
              className="w-full flex items-center gap-4 bg-surface-2 border border-border rounded-2xl px-5 py-4 mb-3 press active:scale-95 transition-all">
              <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <Camera size={22} className="text-brand" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">Take Photo</p>
                <p className="text-muted text-sm">Open camera now</p>
              </div>
            </button>

            <button onClick={pickLibrary}
              className="w-full flex items-center gap-4 bg-surface-2 border border-border rounded-2xl px-5 py-4 mb-3 press active:scale-95 transition-all">
              <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                <ImageIcon size={22} className="text-brand" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-base">Camera Roll</p>
                <p className="text-muted text-sm">Choose from your library</p>
              </div>
            </button>

            <button onClick={() => { setShowSheet(false); router.push('/create') }}
              className="w-full py-3 text-muted text-sm font-semibold press">
              Skip — log without photo
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
        bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-border
        flex items-center justify-around
        pb-[env(safe-area-inset-bottom)] pt-2 z-50">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = path === href
          const isCreate = href === '/create'
          if (isCreate) {
            return (
              <button key={href} onClick={() => setShowSheet(true)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 press transition-all duration-150">
                <div className="bg-brand text-white rounded-2xl p-2.5 -mt-6 shadow-xl shadow-brand/40 border-4 border-[#0f0f0f]">
                  <Icon size={22} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-semibold tracking-wide uppercase text-brand/70 mt-1">{label}</span>
              </button>
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