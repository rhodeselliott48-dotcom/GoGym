'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Check } from 'lucide-react'

const GOALS = [
  { id: 'muscle',    emoji: '💪', label: 'Build muscle',       sub: 'Strength & size'     },
  { id: 'weight',    emoji: '🔥', label: 'Lose weight',        sub: 'Cut & cardio'        },
  { id: 'endurance', emoji: '🏃', label: 'Cardio & endurance', sub: 'Run farther, longer' },
  { id: 'compete',   emoji: '🏆', label: 'Compete & rank',     sub: 'Top the leaderboard' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [suggested, setSuggested] = useState<any[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = supabaseRef.current
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_complete) { router.push('/feed'); return }

      setFullName(profile?.full_name ?? '')
      setUsername(profile?.username ?? '')

      const { data: users } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', user.id)
        .limit(5)

      setSuggested(users ?? [])
    }
    load()
  }, [router])

  async function handleAddFriend(friendId: string) {
    const supabase = supabaseRef.current
    if (!userId) return
    setAdded(prev => new Set(prev).add(friendId))
    await supabase.from('friendships').insert({
      user_id: userId,
      friend_id: friendId,
      status: 'accepted',
    })
  }

  async function handleFinish() {
    const supabase = supabaseRef.current
    if (!userId) return
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: fullName,
      username,
      fitness_goal: goal,
      onboarding_complete: true,
    }).eq('id', userId)
    router.push('/feed')
  }

  const totalSteps = 4

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col px-6 pt-16 pb-10">

      {/* Progress dots */}
      <div className="flex items-center gap-2 justify-center mb-10">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i + 1 === step ? 'w-8 bg-red-500' :
              i + 1 < step  ? 'w-4 bg-red-900' :
                              'w-4 bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Welcome */}
      {step === 1 && (
        <div className="flex flex-col flex-1">
          <div className="text-5xl mb-6">👋</div>
          <h1 className="font-display text-3xl mb-2">Welcome to GoGym</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Track workouts, compete with friends, and hit new PRs together. Let's set up your profile.
          </p>

          <div className="space-y-3 mb-6">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Full name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-600 transition-colors text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 block">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="username"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-red-600 transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={() => setStep(2)}
              disabled={!fullName.trim() || !username.trim()}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              Let's go →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Goal */}
      {step === 2 && (
        <div className="flex flex-col flex-1">
          <div className="text-5xl mb-6">🎯</div>
          <h1 className="font-display text-3xl mb-2">What's your goal?</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            We'll tailor your feed and challenges around it.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {GOALS.map(g => (
              <button
                key={g.id}
                onClick={() => setGoal(g.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                  goal === g.id
                    ? 'border-red-600 bg-red-950/40'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <div className="text-3xl mb-3">{g.emoji}</div>
                <div className="font-bold text-sm text-white text-left">{g.label}</div>
                <div className="text-zinc-500 text-xs mt-0.5 text-left">{g.sub}</div>
                {goal === g.id && (
                  <div className="mt-2 self-end bg-red-600 rounded-full p-0.5">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={() => setStep(3)}
              disabled={!goal}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
            >
              Next →
            </button>
            <button onClick={() => setStep(3)} className="w-full text-zinc-600 text-sm py-2">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Find friends */}
      {step === 3 && (
        <div className="flex flex-col flex-1">
          <div className="text-5xl mb-6">👥</div>
          <h1 className="font-display text-3xl mb-2">Find your crew</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Add some people to kick things off. You can always find more in Discover.
          </p>

          <div className="space-y-3 mb-6">
            {suggested.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-8">No suggested users yet</p>
            )}
            {suggested.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-900 border border-red-800 flex items-center justify-center font-bold text-red-100 text-sm flex-shrink-0">
                    {(user.username ?? '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white">@{user.username}</div>
                  {user.full_name && (
                    <div className="text-zinc-500 text-xs truncate">{user.full_name}</div>
                  )}
                </div>
                <button
                  onClick={() => handleAddFriend(user.id)}
                  disabled={added.has(user.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    added.has(user.id)
                      ? 'border-zinc-700 text-zinc-600 cursor-default'
                      : 'border-red-600 text-red-500 active:scale-95'
                  }`}
                >
                  {added.has(user.id) ? '✓ Added' : '+ Add'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={() => setStep(4)}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
            >
              {added.size > 0 ? `Added ${added.size} — next →` : 'Next →'}
            </button>
            <button onClick={() => setStep(4)} className="w-full text-zinc-600 text-sm py-2">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Ready */}
      {step === 4 && (
        <div className="flex flex-col flex-1">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="font-display text-3xl mb-2">You're all set!</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Log your first workout to unlock your first badge and get on the leaderboard.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-950 border border-red-900 flex items-center justify-center text-2xl flex-shrink-0">
              🏋️
            </div>
            <div>
              <div className="font-bold text-white text-sm">First Rep</div>
              <div className="text-zinc-500 text-xs mt-0.5">Log your first workout to unlock</div>
              <div className="mt-1.5 h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-red-600 rounded-full" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-8 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-950 border border-red-900 flex items-center justify-center text-2xl flex-shrink-0">
              🏆
            </div>
            <div>
              <div className="font-bold text-white text-sm">On the Board</div>
              <div className="text-zinc-500 text-xs mt-0.5">Appear on the leaderboard</div>
              <div className="mt-1.5 h-1.5 w-32 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full w-0 bg-red-600 rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Log my first workout 💪'}
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full text-zinc-600 text-sm py-2"
            >
              Explore the app first
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
