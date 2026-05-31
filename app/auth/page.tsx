'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setMessage('')

    if (mode === 'signup') {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single()
      if (existing) { setError('Username already taken.'); setLoading(false); return }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { username: username.toLowerCase(), full_name: fullName } },
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, username: username.toLowerCase(), full_name: fullName })
        setMessage('Account created! Check your email, then log in.')
        setMode('login')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
      router.push('/feed'); router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col px-6 py-12">
      {/* Logo */}
      <div className="text-center pt-10 pb-2">
        <div className="flex justify-center mb-4">
          <img src="/logo.png" alt="GoGym" className="w-24 h-24 rounded-3xl shadow-xl shadow-brand/20" />
        </div>
        <h1 className="font-display text-5xl tracking-wide text-white">Go<span className="text-brand">Gym</span></h1>
        <p className="text-light-gray/60 text-sm mt-1 tracking-widest uppercase font-medium">Lift Together</p>
      </div>

      <div className="flex-1 flex flex-col justify-center mt-8">
        <div className="flex bg-surface-2 rounded-2xl p-1 mb-8 border border-border">
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMessage('') }}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 press
                ${mode === m ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-muted'}`}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your name" />
              <Field label="Username" value={username} onChange={v => setUsername(v.toLowerCase())} placeholder="@handle" />
            </>
          )}
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
          <Field label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3 border border-red-400/20">{error}</p>}
          {message && <p className="text-green-400 text-sm bg-green-400/10 rounded-xl px-4 py-3 border border-green-400/20">{message}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-brand text-white font-display text-2xl py-4 rounded-2xl press
              disabled:opacity-50 shadow-lg shadow-brand/20 tracking-wider mt-2">
            {loading ? '...' : mode === 'login' ? "LET'S GO" : 'JOIN GOGYM'}
          </button>
        </form>
      </div>

      <p className="text-center text-muted text-xs mt-8">v0.5 · Invite only 🤫</p>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-muted uppercase tracking-widest font-semibold mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3.5 text-white
          placeholder-muted text-sm transition-all duration-150" />
    </div>
  )
}