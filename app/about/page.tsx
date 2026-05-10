import BottomNav from '@/components/BottomNav'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-nav">
      <header className="sticky top-0 z-40 glass border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/profile" className="text-muted hover:text-white press"><ArrowLeft size={20}/></Link>
        <h2 className="font-display text-2xl text-white tracking-wide">About</h2>
      </header>
      <div className="px-6 py-10 space-y-10">
        <div className="text-center">
          <h1 className="font-display text-7xl text-white tracking-wide">Go<span className="text-brand">Gym</span></h1>
          <p className="text-light/40 tracking-[0.3em] uppercase text-sm mt-1">Lift Together</p>
          <div className="w-12 h-0.5 bg-brand mx-auto mt-4"/>
        </div>
        <div className="space-y-4">
          {['A social space where lifting becomes more than just a routine—it\'s something you share.','Track workouts, compete with friends, and celebrate progress together in a way that\'s fun, real, and completely your own.','Train together. Compete together. Grow together. Make the gym social, fun, and whatever you want it to be.'].map((p,i) => (
            <div key={i} className="flex gap-3"><span className="text-brand text-lg flex-shrink-0 mt-0.5">✵</span><p className="text-light/70 text-sm leading-relaxed">{p}</p></div>
          ))}
        </div>
        <div>
          <h3 className="font-display text-xl text-brand uppercase tracking-widest mb-3">Beta Features</h3>
          <ul className="space-y-2">{['✅ Sign up & create your profile','✅ Log workouts with exercises, sets & reps','✅ Track PRs','✅ Upload up to 5 photos per post','✅ Activity feed with likes & comments','✅ Discover & filter by type + city','✅ Leaderboard — workouts, time, PRs, days active','✅ Friends system — add & follow people','✅ Body map — see muscles targeted','✅ Exercise descriptions for new lifters','✅ Badges — earn them as you grind'].map(f=><li key={f} className="text-sm text-light/70">{f}</li>)}</ul>
        </div>
        <div>
          <h3 className="font-display text-xl text-white/30 uppercase tracking-widest mb-3">Coming Soon</h3>
          <ul className="space-y-2">{['🔜 Video reels','🔜 AI coaching assistant','🔜 Gym-specific leaderboards','🔜 Weekly challenges','🔜 Premium subscription','🔜 GoGym Store','🔜 Native iOS app'].map(f=><li key={f} className="text-sm text-light/30">{f}</li>)}</ul>
        </div>
        <div className="text-center space-y-1">
          <p className="font-display text-2xl text-brand tracking-widest">LIFT TOGETHER</p>
          <p className="text-muted text-xs">GoGym Beta v0.2 · © 2024</p>
        </div>
      </div>
      <BottomNav/>
    </div>
  )
}
