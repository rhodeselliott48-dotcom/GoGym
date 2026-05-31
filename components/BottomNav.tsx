'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, PlusSquare, Compass, Trophy, User, Camera, Image, X } from 'lucide-react'

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
  const [showPopup, setShowPopup] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  function handlePhotosChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) { router.push('/create'); return }
    const previews = files.map(f => URL.createObjectURL(f))
    sessionStorage.setItem('create_photos', JSON.stringify(previews))
    sessionStorage.setItem('create_photo_count', String(files.length))
    // Store files via a custom event so create page can pick them up
    const event = new CustomEvent('gogym_photos', { detail: { files } })
    window.dispatchEvent(event)
    router.push('/create?photos=1')
    setShowPopup(false)
  }

  return (
    <>
      {/* Photo inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        multiple onChange={handlePhotosChosen} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*"
        multiple onChange={handlePhotosChosen} className="hidden" />

      {/* Popup overlay */}
      {showPopup && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setShowPopup(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-border rounded-t-3xl p-6 pb-10 space-y-3 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <p className="text-white font-display text-2xl tracking-wide text-center mb-4">Add Photos</p>

            <button onClick={() => { setShowPopup(false); setTimeout(() => cameraRef.current?.click(), 100) }}
              className="w-full flex items-center gap-4 bg-surface-2 border border-border rounded-2xl px-5 py-4 press hover:border-brand/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Camera size={20} className="text-brand" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Take Photo</p>
                <p className="text-muted text-xs">Open your camera now</p>
              </div>
            </button>

            <button onClick={() => { setShowPopup(false); setTimeout(() => libraryRef.current?.click(), 100) }}
              className="w-full flex items-center gap-4 bg-surface-2 border border-border rounded-2xl px-5 py-4 press hover:border-brand/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Image size={20} className="text-brand" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Choose from Library</p>
                <p className="text-muted text-xs">Pick up to 5 photos</p>
              </div>
            </button>

            <button onClick={() => { setShowPopup(false); router.push('/create') }}
              className="w-full py-3 text-muted text-sm font-semibold press">
              Skip — just log workout
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
              <button key={href} onClick={() => setShowPopup(true)}
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