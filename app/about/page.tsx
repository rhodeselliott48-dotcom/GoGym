import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/profile" className="text-muted hover:text-white press"><ArrowLeft size={20}/></Link>
        <h2 className="font-display text-2xl text-white tracking-wide">About</h2>
      </header>

      <div className="px-6 py-10 space-y-10">

        {/* Logo — no bubble, just the image */}
        <div className="text-center flex flex-col items-center gap-3">
         <Image src="/logo.png" alt="GoGym" width={110} height={110} className="rounded-none" style={{ mixBlendMode: 'lighten' }} />
          <p className="text-white/40 tracking-[0.3em] uppercase text-sm">Lift Together</p>
          <div className="w-12 h-0.5 bg-brand rounded-full" />
        </div>

        {/* Mission — plain text, no bullets */}
        <div className="space-y-4">
          {[
            'A social space where lifting becomes more than just a routine—it\'s something you share.',
            'Track workouts, compete with friends, and celebrate progress together in a way that\'s fun, real, and completely your own.',
            'Train together. Compete together. Grow together. Make the gym social, fun, and whatever you want it to be.',
          ].map((p, i) => (
            <p key={i} className="text-white/70 text-sm leading-relaxed">{p}</p>
          ))}
        </div>

        {/* Features */}
        <div>
          <h3 className="font-display text-xl text-brand uppercase tracking-widest mb-3">v0.5 Features</h3>
          <ul className="space-y-2">
            {[
              'Sign up & create your profile',
              'Log workouts with exercises, sets & reps',
              'Track PRs',
              'Upload photos per post',
              'Activity feed with likes & comments',
              'Discover & filter by type + city',
              'Leaderboard — workouts, time, PRs, days active',
              'Friends system — add & follow people',
              'Body map — see muscles targeted',
              'Exercise descriptions for new lifters',
              'Badges — earn them as you grind',
              'Public & Friends Only posts',
              'Preset workouts',
              'Draft auto-save',
            ].map(f => (
              <li key={f} className="text-sm text-white/70">{f}</li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pt-4">
          <p className="font-display text-2xl text-brand tracking-widest">LIFT TOGETHER</p>
          <p className="text-muted text-xs">GoGym v0.5 · © 2026</p>
        </div>

      </div>
      <BottomNav/>
    </div>
  )
}