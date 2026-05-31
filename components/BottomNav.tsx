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
    // Reset input so same files can be re-selected if needed
    e.target.value = ''
  }

  return (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        multiple onChange={handleFiles} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*"
        multiple onChange={handleFiles} className="hidden" />

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
        bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-border
        flex items-center justify-around
        pb-[env(safe-area-inset-bottom)] pt-2 z-50">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = path === href
          const isCreate = href === '/create'