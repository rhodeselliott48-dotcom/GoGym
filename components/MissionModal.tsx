'use client'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function MissionModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className="press text-left">
        <h1 className="font-display text-4xl tracking-wide text-white leading-none">Go<span className="text-brand">Gym</span></h1>
        <p className="text-light-gray/50 text-xs tracking-widest uppercase font-medium">Lift Together</p>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="animate-slide-up w-full max-w-md mx-auto bg-surface rounded-t-3xl p-6 border-t border-border"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-3xl text-white tracking-wide">Our Mission</h2>
                <p className="text-brand text-xs uppercase tracking-widest font-semibold mt-0.5">Why GoGym exists</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-white press p-2">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {[
                'A social space where lifting becomes more than just a routine—it\'s something you share.',
                'Track workouts, compete with friends, and celebrate progress together in a way that\'s fun, real, and completely your own.',
                'Train together. Compete together. Grow together. Make the gym social, fun, and whatever you want it to be.',
              ].map((text, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <span className="text-brand text-xl mt-0.5 flex-shrink-0">✵</span>
                  <p className="text-light-gray/80 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-5 border-t border-border text-center">
              <p className="text-muted text-xs">GoGym Beta v0.2 · Built for the ones who show up 💪</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
