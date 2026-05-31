'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { WorkoutType, Mood, SessionType, Exercise } from '@/lib/types'
import { ArrowLeft, Plus, Trash2, Star, Info } from 'lucide-react'
import Link from 'next/link'
import { findExercise } from '@/lib/exercises'

const WORKOUT_TYPES: WorkoutType[] = ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'HIIT', 'Mobility', 'Other']
const MOODS: Mood[] = ['🔥 On Fire', '💪 Strong', '😤 Grind', '😴 Tired', '😊 Good']
const SESSION_TYPES: { value: SessionType; label: string; desc: string }[] = [
  { value: 'Solo',  label: '🧍 Solo',         desc: 'Just you grinding' },
  { value: 'Joint', label: '👥 Joint Session', desc: 'With 1 workout partner' },
  { value: 'Group', label: '🏟️ Group Session', desc: 'Squad workout (2+ people)' },
  { value: 'Live',  label: '📡 Live Session',  desc: 'Coming soon' },
]
const SET_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)
const REP_OPTIONS = ['1','2','3','4','5','6','7','8','9','10','11','12','15','20','25','30','AMRAP','Failure']

function emptyExercise(): Exercise { return { name: '', sets: 3, reps: '10', weight: '', is_pr: false } }

export default function CreatePage() {
  const searchParams = useSearchParams()
  const hasPhotos = searchParams.get('photos') === '1'

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [workoutType, setWorkoutType] = useState<WorkoutType | ''>('')
  const [sessionType, setSessionType] = useState<SessionType>('Solo')
  const [mood, setMood] = useState<Mood | ''>('')
  const [duration, setDuration] = useState('')
  const [gymLocation, setGymLocation] = useState('')
  const [city, setCity] = useState('')
  const [jointPartner, setJointPartner] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [groupName, setGroupName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Pick up photo passed from BottomNav camera/library
  useEffect(() => {
    if (!hasPhotos) return
    function onPhotos(e: Event) {
      const files = (e as CustomEvent).detail.files as File[]
      if (files[0]) {
        setPhoto(files[0])
        setPreview(URL.createObjectURL(files[0]))
      }
    }
    window.addEventListener('gogym_photos', onPhotos)
    return () => window.removeEventListener('gogym_photos', onPhotos)
  }, [hasPhotos])

  function addExercise() { setExercises(prev => [...prev, emptyExercise()]) }
  function removeExercise(i: number) { setExercises(prev => prev.filter((_, idx) => idx !== i)) }
  function updateExercise(i: number, field: keyof Exercise, value: any) {
    setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  async function handleSubmit() {
    if (!workoutType || !mood) { setError('Please complete all required fields'); return }
    if (sessionType === 'Joint' && !jointPartner.trim()) {
      setError('Joint session requires 1 partner username'); return
    }
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const photo_urls: string[] = []
    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('workout-photos').upload(path, photo)
      if (!upErr) {
        const { data } = supabase.storage.from('workout-photos').getPublicUrl(path)
        photo_urls.push(data.publicUrl)
      }
    }

    let mentionList: string[] = []
    if (sessionType === 'Joint' && jointPartner.trim()) {
      mentionList = [jointPartner.trim().replace('@', '')]
    } else if (sessionType === 'Group' && groupMembers.trim()) {
      mentionList = groupMembers.split(',').map(m => m.trim().replace('@', '')).filter(Boolean)
    }

    const { error: postError } = await supabase.from('workout_posts').insert({
      user_id: user.id,
      title,
      caption,
      workout_type: workoutType,
      mood,
      session_type: sessionType,
      photo_urls,
      exercises,
      duration_minutes: duration ? parseInt(duration) : null,
      gym_location: gymLocation,
      city,
      mentions: mentionList,
      group_name: sessionType === 'Group' ? (groupName || null) : null,
    })

    if (postError) { setError('Post failed: ' + postError.message); setLoading(false); return }
    router.push('/feed')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        {preview && (
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0">
            <img src={preview} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <h2 className="font-display text-2xl tracking-wide">Log Workout</h2>
        <div className="ml-auto flex items-center gap-1.5">
          {[1,2,3].map(s => (
            <button key={s} onClick={() => setStep(s)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all press
                ${step === s ? 'bg-brand text-white' : step > s ? 'bg-brand/30 text-brand' : 'bg-surface-3 text-muted'}`}>
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <SectionLabel>Session Details</SectionLabel>
            <div>
              <label className="field-label">Workout Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Push Day Complete 💪" className="field-input" />
            </div>
            <div>
              <label className="field-label">Workout Type *</label>
              <div className="grid grid-cols-4 gap-2">
                {WORKOUT_TYPES.map(type => (
                  <button key={type} type="button" onClick={() => setWorkoutType(type)}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all press border
                      ${workoutType === type ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-surface-2 text-white/70 border-border'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field-label">Session Type</label>
              <div className="space-y-2">
                {SESSION_TYPES.map(s => (
                  <button key={s.value} type="button" disabled={s.value === 'Live'} onClick={() => setSessionType(s.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all press
                      ${sessionType === s.value ? 'bg-brand/10 border-brand text-white' : 'bg-surface-2 border-border text-white/70'}
                      ${s.value === 'Live' ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <div className="text-left">
                      <p className="font-semibold text-sm">{s.label}</p>
                      <p className="text-xs text-muted">{s.desc}</p>
                    </div>
                    {s.value === 'Live' && <span className="text-xs bg-surface-3 text-muted px-2 py-0.5 rounded-full">Soon</span>}
                    {sessionType === s.value && s.value !== 'Live' && <div className="w-2 h-2 rounded-full bg-brand" />}
                  </button>
                ))}
              </div>
            </div>
            {sessionType === 'Joint' && (
              <div className="bg-surface-2 rounded-2xl p-4 border border-brand/20 space-y-2">
                <label className="field-label">Partner Username (1 only)</label>
                <input value={jointPartner} onChange={e => setJointPartner(e.target.value.replace('@', ''))} placeholder="@username" className="field-input" />
                <p className="text-muted text-xs">Joint sessions are limited to 1 workout partner</p>
              </div>
            )}
            {sessionType === 'Group' && (
              <div className="bg-surface-2 rounded-2xl p-4 border border-brand/20 space-y-3">
                <div>
                  <label className="field-label">Group Members (comma separated)</label>
                  <input value={groupMembers} onChange={e => setGroupMembers(e.target.value)} placeholder="@username1, @username2" className="field-input" />
                </div>
                <div>
                  <label className="field-label">Group Name (optional)</label>
                  <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. The Wolfpack" className="field-input" />
                </div>
              </div>
            )}
            <div>
              <label className="field-label">How are you feeling? *</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {MOODS.map(m => (
                  <button key={m} type="button" onClick={() => setMood(m)}
                    className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium transition-all press border
                      ${mood === m ? 'bg-brand text-white border-brand' : 'bg-surface-2 text-white/80 border-border'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Duration (mins)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" className="field-input" />
              </div>
              <div>
                <label className="field-label">City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Dallas, TX" className="field-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Gym / Location</label>
              <input value={gymLocation} onChange={e => setGymLocation(e.target.value)} placeholder="e.g. LA Fitness, 5th St" className="field-input" />
            </div>
            <button onClick={() => setStep(2)} className="w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press shadow-lg shadow-brand/20 tracking-wide">
              NEXT: ADD EXERCISES →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <SectionLabel>Exercises</SectionLabel>
            {exercises.map((ex, i) => {
              const info = ex.name ? findExercise(ex.name) : null
              return (
                <div key={i} className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-display text-lg w-6">{i+1}</span>
                      <input value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} placeholder="Exercise name..." className="flex-1 field-input" />
                      <button onClick={() => updateExercise(i, 'is_pr', !ex.is_pr)}
                        className={`p-2 rounded-xl border press transition-all ${ex.is_pr ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-surface-3 border-border text-muted'}`}>
                        <Star size={16} className={ex.is_pr ? 'fill-yellow-400' : ''} />
                      </button>
                      {exercises.length > 1 && (
                        <button onClick={() => removeExercise(i)} className="p-2 text-muted hover:text-red-400 press"><Trash2 size={16} /></button>
                      )}
                    </div>
                    {info && (
                      <div className="flex items-start gap-2 bg-surface-3 rounded-xl px-3 py-2 border border-border">
                        <Info size={12} className="text-brand mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-light-gray/60 leading-relaxed">{info.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="field-label">Sets</label>
                        <select value={ex.sets} onChange={e => updateExercise(i, 'sets', parseInt(e.target.value))} className="field-input">
                          {SET_OPTIONS.map(n => <option key={n} value={n}>{n} sets</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Reps</label>
                        <select value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} className="field-input">
                          {REP_OPTIONS.map(r => <option key={r} value={r}>{r} reps</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Weight (lbs)</label>
                        <input type="number" value={ex.weight} onChange={e => updateExercise(i, 'weight', e.target.value)} placeholder="135" className="field-input" />
                      </div>
                    </div>
                    {ex.is_pr && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <p className="text-yellow-400 text-xs font-semibold">Personal Record! 🏆</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <button onClick={addExercise}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-muted flex items-center justify-center gap-2 hover:border-brand/40 hover:text-brand/70 transition-all press">
              <Plus size={18} /><span className="font-semibold text-sm">Add Exercise</span>
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep(1)} className="py-4 rounded-2xl border border-border text-muted font-semibold press">← Back</button>
              <button onClick={() => setStep(3)} className="bg-brand text-white font-display text-xl py-4 rounded-2xl press shadow-lg shadow-brand/20 tracking-wide">NEXT →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <SectionLabel>Share Your Session</SectionLabel>

            {/* Photo preview */}
            {preview && (
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <img src={preview} alt="" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-2 left-2">
                  <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full">📸 Photo attached</span>
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Caption</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)}
                placeholder="Talk your shit 💬" rows={3} maxLength={280} className="field-input resize-none" />
              <p className="text-muted text-xs text-right mt-1">{caption.length}/280</p>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

            {(!workoutType || !mood) && (
              <div className="bg-brand/10 border border-brand/20 rounded-2xl px-4 py-3">
                <p className="text-brand text-sm text-center">⚠️ Go back to Step 1 to pick a workout type and mood.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep(2)} className="py-4 rounded-2xl border border-border text-muted font-semibold press">← Back</button>
              <button onClick={handleSubmit} disabled={loading || !workoutType || !mood}
                className="bg-brand text-white font-display text-xl py-4 rounded-2xl press disabled:opacity-40 shadow-lg shadow-brand/20 tracking-wide">
                {loading ? 'POSTING...' : 'POST IT 🔥'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .field-label { display: block; font-size: 0.65rem; color: #666; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 0.375rem; }
        .field-input { width: 100%; background: #1e1e1e; border: 1px solid #2e2e2e; border-radius: 0.75rem; padding: 0.75rem 1rem; color: white; font-size: 0.875rem; transition: all 0.15s; }
        .field-input::placeholder { color: #666; }
      `}</style>

      <BottomNav />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-5 bg-brand rounded-full" />
      <h3 className="font-display text-xl tracking-wide text-white">{children}</h3>
    </div>
  )
}