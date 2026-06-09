'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { WorkoutType, Mood, SessionType, Exercise } from '@/lib/types'
import { ArrowLeft, Plus, Trash2, Star, Info, Lock, Globe, ChevronDown, ChevronUp, Save, Camera, ImagePlus, X, MapPin } from 'lucide-react'
import Link from 'next/link'
import { findExercise, EXERCISE_DB } from '@/lib/exercises'

const WORKOUT_TYPES: WorkoutType[] = [
  'Push', 'Pull', 'Upper', 'Lower', 'Legs', 'Full Body',
  'Cardio', 'HIIT', 'Mobility', 'Stairmaster', 'Treadmill', 'Other'
]
const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: '🔒 Locked In',   emoji: '🔒', label: 'Locked In'   },
  { value: '🔥 On Fire',     emoji: '🔥', label: 'On Fire'     },
  { value: '💪 Strong',      emoji: '💪', label: 'Strong'      },
  { value: '😊 Great',       emoji: '😊', label: 'Great'       },
  { value: '😴 Tired',       emoji: '😴', label: 'Tired'       },
  { value: '💀 Dead Inside', emoji: '💀', label: 'Dead Inside' },
]
const SESSION_TYPES: { value: SessionType; label: string; desc: string }[] = [
  { value: 'Solo',  label: '🧍 Solo',  desc: 'Just you grinding' },
  { value: 'Joint', label: '👥 Joint', desc: 'With 1 workout partner' },
  { value: 'Group', label: '🏟️ Group', desc: 'Squad workout' },
  { value: 'Live',  label: '📡 Live',  desc: 'Coming soon' },
]
const SET_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)
const REP_OPTIONS = ['1','2','3','4','5','6','7','8','9','10','11','12','15','20','25','30','AMRAP','Failure']
const INCLINE_OPTIONS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']
const SPEED_OPTIONS = ['1.0','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','8.0','9.0','10.0']
const ALL_EXERCISE_NAMES = Object.keys(EXERCISE_DB).map(k => k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))

function emptyExercise(): Exercise { return { name: '', sets: 3, reps: '10', weight: '', is_pr: false, notes: '' } }

// ── Exercise name input with autocomplete ─────────────────────────────────────
function ExerciseNameInput({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); return }
    const q = value.toLowerCase()
    const matches = ALL_EXERCISE_NAMES.filter(n => n.toLowerCase().includes(q)).slice(0, 6)
    setSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className="field-input w-full"
      />
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-xl overflow-hidden z-50 shadow-xl">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s); setShowSuggestions(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-surface-3 border-b border-border/40 last:border-0 press"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateForm() {
  const searchParams = useSearchParams()
  const hasPhotos = searchParams.get('photos') === '1'

  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [workoutType, setWorkoutType] = useState<WorkoutType | ''>('')
  const [sessionType, setSessionType] = useState<SessionType>('Solo')
  const [mood, setMood] = useState<Mood | ''>('')
  const [duration, setDuration] = useState(60)
  const [gymLocation, setGymLocation] = useState('')
  const [city, setCity] = useState('')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationDetected, setLocationDetected] = useState(false)
  const [jointPartner, setJointPartner] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [groupName, setGroupName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()])
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({})
  const [caption, setCaption] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPresetSave, setShowPresetSave] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState<any[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const isMachine = workoutType === 'Stairmaster' || workoutType === 'Treadmill'
  const isCardioOnly = workoutType === 'Cardio'
  const isHIIT = workoutType === 'HIIT'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
      setShowPhotoOptions(false)
    }
  }

  function removePhoto() {
    setPhoto(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  async function handleDetectLocation() {
    if (!navigator.geolocation) return
    setDetectingLocation(true)
    setLocationDetected(false)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await res.json()
          const cityName = data.address?.city || data.address?.town || data.address?.village || ''
          const state = data.address?.state_code || data.address?.state || ''
          const combined = cityName && state ? `${cityName}, ${state}` : cityName || state || ''
          if (combined) setCity(combined)
          setLocationDetected(true)
        } catch {
          // silently fail, user can type manually
        }
        setDetectingLocation(false)
      },
      () => {
        setDetectingLocation(false)
      }
    )
  }

  useEffect(() => {
    if (!hasPhotos) return
    const stored = sessionStorage.getItem('gogym_pending_photo')
    if (!stored) return
    try {
      const { data, name, type } = JSON.parse(stored)
      fetch(data)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], name, { type })
          setPhoto(file)
          setPreview(data)
          sessionStorage.removeItem('gogym_pending_photo')
        })
    } catch (e) {
      sessionStorage.removeItem('gogym_pending_photo')
    }
  }, [hasPhotos])

  useEffect(() => {
    loadPresets()
  }, [])

  useEffect(() => {
    if (!title) return
    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('post_drafts').upsert(
        { user_id: user.id, data: { title, workoutType, mood, duration, gymLocation, city, exercises, caption, isPublic, sessionType } },
        { onConflict: 'user_id' }
      )
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }, 2000)
    return () => clearTimeout(timer)
  }, [title, workoutType, mood, duration, gymLocation, city, exercises, caption, isPublic, sessionType])

  async function loadPresets() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('preset_workouts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setPresets(data)
  }

  function addExercise() { setExercises(prev => [...prev, emptyExercise()]) }
  function removeExercise(i: number) {
    setExercises(prev => prev.filter((_, idx) => idx !== i))
    setExpandedNotes(prev => { const next = { ...prev }; delete next[i]; return next })
  }
  function updateExercise(i: number, field: keyof Exercise, value: any) {
    setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }
  function toggleNotes(i: number) {
    setExpandedNotes(prev => ({ ...prev, [i]: !prev[i] }))
  }
  function loadPreset(preset: any) {
    setWorkoutType(preset.workout_type)
    setExercises(preset.exercises)
    setShowPresets(false)
  }

  async function savePreset() {
    if (!presetName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('preset_workouts').insert({
      user_id: user.id,
      name: presetName.trim(),
      workout_type: workoutType || 'Other',
      exercises,
    })
    setPresetName('')
    setShowPresetSave(false)
    setSaving(false)
    await loadPresets()
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Please add a workout title'); return }
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
      workout_type: workoutType || 'Other',
      mood: mood || null,
      session_type: sessionType,
      photo_urls,
      exercises,
      duration_minutes: duration || null,
      gym_location: gymLocation,
      city,
      mentions: mentionList,
      group_name: sessionType === 'Group' ? (groupName || null) : null,
      is_public: isPublic,
    })

    if (postError) { setError('Something went wrong, please try again.'); setLoading(false); return }
    await supabase.from('post_drafts').delete().eq('user_id', user.id)
    setLoading(false)
    setShowPresetSave(true)
  }

  function renderExerciseInputs(i: number, ex: Exercise) {
    if (isMachine) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Incline / Setting</label>
            <select value={ex.sets} onChange={e => updateExercise(i, 'sets', parseInt(e.target.value))} className="field-input">
              {INCLINE_OPTIONS.map(n => <option key={n} value={n}>Level {n}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Speed (mph)</label>
            <select value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} className="field-input">
              {SPEED_OPTIONS.map(s => <option key={s} value={s}>{s} mph</option>)}
            </select>
          </div>
        </div>
      )
    }

    if (isCardioOnly) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Duration (mins)</label>
            <input
              type="number"
              value={ex.sets === 3 ? '' : ex.sets}
              onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || 0)}
              placeholder="30"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Distance (miles)</label>
            <input
              type="number"
              step="0.01"
              value={ex.weight}
              onChange={e => updateExercise(i, 'weight', e.target.value)}
              placeholder="3.1"
              className="field-input"
            />
          </div>
        </div>
      )
    }

    if (isHIIT) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Type</label>
            <input
              value={ex.reps === '10' ? '' : ex.reps}
              onChange={e => updateExercise(i, 'reps', e.target.value)}
              placeholder="e.g. Sprints, Circuits"
              className="field-input" />
          </div>
          <div>
            <label className="field-label">Duration (mins)</label>
            <input type="number" value={ex.weight} onChange={e => updateExercise(i, 'weight', e.target.value)}
              placeholder="30" className="field-input" />
          </div>
        </div>
      )
    }

    return (
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
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h2 className="font-display text-2xl tracking-wide">Log Workout</h2>
          {draftSaved && <p className="text-muted text-[10px]">Draft saved</p>}
        </div>
        <div className="flex items-center gap-2">
          {presets.length > 0 && (
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="text-xs text-brand font-semibold bg-brand/10 border border-brand/20 px-3 py-1.5 rounded-xl press"
            >
              Presets
            </button>
          )}
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => setStep(s)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all press
                ${step === s ? 'bg-brand text-white' : step > s ? 'bg-brand/30 text-brand' : 'bg-surface-3 text-muted'}`}>
              {s}
            </button>
          ))}
        </div>
      </header>

      {/* ── Presets panel ── */}
      {showPresets && (
        <div className="mx-4 mt-2 bg-[#1a1a1a] border border-border rounded-2xl overflow-hidden shadow-xl">
          <p className="text-xs text-muted uppercase tracking-widest font-semibold px-4 py-3 border-b border-border">Your Presets</p>
          {presets.map(p => (
            <div key={p.id} className="flex items-center border-b border-border/50 last:border-0">
              <button onClick={() => loadPreset(p)} className="flex-1 text-left px-4 py-3 press hover:bg-surface-3">
                <p className="text-white font-semibold text-sm">{p.name}</p>
                <p className="text-muted text-xs">{p.workout_type} · {p.exercises.length} exercises</p>
              </button>
              <button
                onClick={async () => { await supabase.from('preset_workouts').delete().eq('id', p.id); await loadPresets() }}
                className="pr-4 pl-2 text-zinc-600 hover:text-red-400 transition-colors press">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-6 space-y-6">

        {/* ══════════════════════════════════════════
            STEP 1 — Session Details
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <SectionLabel>Session Details</SectionLabel>

            {/* Visibility */}
            <div className="flex gap-2">
              <button onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all press
                  ${isPublic ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-surface-2 text-muted border-border'}`}>
                <Globe size={15} /> Public
              </button>
              <button onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all press
                  ${!isPublic ? 'bg-surface-3 text-white border-white/20' : 'bg-surface-2 text-muted border-border'}`}>
                <Lock size={15} /> Friends Only
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="field-label">Workout Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Push Day Complete" className="field-input" />
            </div>

            {/* Workout Type — swipeable scroll row */}
            <div>
              <label className="field-label">Workout Type</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {WORKOUT_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setWorkoutType(workoutType === type ? '' : type)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-full border text-sm font-semibold transition-all press
                      ${workoutType === type
                        ? 'bg-brand/15 border-brand text-white'
                        : 'bg-surface-2 border-border text-muted hover:text-white'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Type */}
            <div>
              <label className="field-label">Session Type</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SESSION_TYPES.map(s => (
                  <button key={s.value} type="button" disabled={s.value === 'Live'} onClick={() => setSessionType(s.value)}
                    className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-medium transition-all press border
                      ${sessionType === s.value ? 'bg-brand text-white border-brand' : 'bg-surface-2 text-white/80 border-border'}
                      ${s.value === 'Live' ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Joint partner */}
            {sessionType === 'Joint' && (
              <div className="bg-surface-2 rounded-2xl p-4 border border-brand/20 space-y-2">
                <label className="field-label">Partner Username (1 only)</label>
                <input value={jointPartner} onChange={e => setJointPartner(e.target.value.replace('@', ''))} placeholder="@username" className="field-input" />
              </div>
            )}

            {/* Group members */}
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

            <button onClick={() => setStep(2)} className="w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press shadow-lg shadow-brand/20 tracking-wide">
              NEXT: ADD EXERCISES →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — Exercises
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <SectionLabel>
              {isMachine ? `${workoutType} Session` : isCardioOnly ? 'Cardio Session' : isHIIT ? 'HIIT Session' : 'Exercises'}
            </SectionLabel>

            {exercises.map((ex, i) => {
              const info = !isCardioOnly && !isHIIT && !isMachine && ex.name ? findExercise(ex.name) : null
              const notesOpen = expandedNotes[i] || false
              return (
                <div key={i} className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-display text-lg w-6">{i + 1}</span>

                      {!isCardioOnly && !isHIIT && !isMachine ? (
                        <ExerciseNameInput
                          value={ex.name}
                          onChange={v => updateExercise(i, 'name', v)}
                          placeholder="Exercise name..."
                        />
                      ) : (
                        <input
                          value={ex.name}
                          onChange={e => updateExercise(i, 'name', e.target.value)}
                          placeholder={
                            isMachine ? `${workoutType} interval ${i + 1}` :
                            isCardioOnly ? 'e.g. Morning Run, Trail Run' :
                            'e.g. HIIT Circuit, Sprints'
                          }
                          className="flex-1 field-input"
                        />
                      )}

                      {!isCardioOnly && !isHIIT && !isMachine && (
                        <button onClick={() => updateExercise(i, 'is_pr', !ex.is_pr)}
                          className={`p-2 rounded-xl border press transition-all ${ex.is_pr ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-surface-3 border-border text-muted'}`}>
                          <Star size={16} className={ex.is_pr ? 'fill-yellow-400' : ''} />
                        </button>
                      )}
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

                    {renderExerciseInputs(i, ex)}

                    {!isCardioOnly && !isHIIT && !isMachine && ex.is_pr && (
                      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        <p className="text-yellow-400 text-xs font-semibold">Personal Record! 🏆</p>
                      </div>
                    )}

                    <button onClick={() => toggleNotes(i)}
                      className="flex items-center gap-1.5 text-muted text-xs font-semibold press hover:text-white transition-colors">
                      {notesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {notesOpen ? 'Hide notes' : 'Add notes'}
                    </button>
                    {notesOpen && (
                      <textarea value={ex.notes || ''} onChange={e => updateExercise(i, 'notes', e.target.value)}
                        placeholder="e.g. felt strong today, rest 90s between sets..."
                        rows={2} maxLength={200}
                        className="field-input resize-none text-xs" />
                    )}
                  </div>
                </div>
              )
            })}

            <button onClick={addExercise}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-border text-muted flex items-center justify-center gap-2 hover:border-brand/40 hover:text-brand/70 transition-all press">
              <Plus size={18} /><span className="font-semibold text-sm">
                {isMachine ? 'Add Interval' : isCardioOnly ? 'Add Run' : isHIIT ? 'Add Circuit' : 'Add Exercise'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep(1)} className="py-4 rounded-2xl border border-border text-muted font-semibold press">← Back</button>
              <button onClick={() => setStep(3)} className="bg-brand text-white font-display text-xl py-4 rounded-2xl press shadow-lg shadow-brand/20 tracking-wide">NEXT →</button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — Finish Strong
            Photo · Caption · Mood · Duration · Location
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <SectionLabel>Finish Strong</SectionLabel>

            {/* 1. Photo */}
            {!preview ? (
              <div>
                <button
                  onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                  className="w-full bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl px-4 py-5 text-center active:scale-[0.98] transition-transform">
                  <div className="text-3xl mb-2">📸</div>
                  <p className="text-white font-bold text-sm">Add a photo</p>
                  <p className="text-zinc-500 text-xs mt-1">Posts with photos <span className="text-brand font-bold">grab way more attention</span></p>
                </button>
                {showPhotoOptions && (
                  <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <button onClick={() => cameraInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800 text-white text-sm font-semibold active:bg-zinc-800 transition-colors">
                      <Camera size={18} className="text-brand" /> Take a photo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-white text-sm font-semibold active:bg-zinc-800 transition-colors">
                      <ImagePlus size={18} className="text-brand" /> Choose from camera roll
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <img src={preview} alt="" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button onClick={removePhoto} className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 active:scale-95 transition-transform">
                  <X size={14} className="text-white" />
                </button>
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full">Photo attached</span>
                  {!isPublic && <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded-full flex items-center gap-1"><Lock size={10} /> Friends Only</span>}
                </div>
              </div>
            )}

            {!preview && !isPublic && (
              <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-3">
                <Lock size={14} className="text-muted" />
                <p className="text-muted text-sm">Friends Only post</p>
              </div>
            )}

            {/* 2. Caption */}
            <div>
              <label className="field-label">Caption</label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write your thoughts down..."
                rows={3}
                maxLength={280}
                className="field-input resize-none"
              />
              <p className="text-muted text-xs text-right mt-1">{caption.length}/280</p>
            </div>

            <div className="h-px bg-border" />

            {/* 3. Mood */}
            <div>
              <label className="field-label">How'd it feel?</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(mood === m.value ? '' : m.value)}
                    className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border transition-all press
                      ${mood === m.value
                        ? 'bg-brand/12 border-brand'
                        : 'bg-surface-2 border-border hover:border-border/60'}`}>
                    <span className="text-2xl">{m.emoji}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${mood === m.value ? 'text-brand' : 'text-muted'}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="field-label">Duration</label>
                <span className="text-brand font-display text-lg tracking-wide">{duration} min</span>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={5}
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full accent-brand h-1 rounded-full cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="text-muted text-[10px]">5 min</span>
                <span className="text-muted text-[10px]">3 hrs</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* 5. Location — open card with Find Me button */}
            <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <MapPin size={16} className="text-brand flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Where are you lifting?</p>
                  <p className="text-muted text-xs mt-0.5">Helps others find workouts near them</p>
                </div>
                <button
                  onClick={handleDetectLocation}
                  disabled={detectingLocation || locationDetected}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all press
                    ${locationDetected
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : detectingLocation
                      ? 'bg-surface-3 border-border text-muted'
                      : 'bg-brand/10 border-brand/30 text-brand'}`}>
                  <MapPin size={12} />
                  {locationDetected ? 'Found!' : detectingLocation ? 'Finding...' : 'Find Me'}
                </button>
              </div>
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="field-label">City</label>
                  <input
                    value={city}
                    onChange={e => { setCity(e.target.value); setLocationDetected(false) }}
                    placeholder="e.g. Dallas, TX"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Gym / Location</label>
                  <input
                    value={gymLocation}
                    onChange={e => setGymLocation(e.target.value)}
                    placeholder="e.g. LA Fitness, 5th St"
                    className="field-input"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}
            {!title.trim() && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
                <p className="text-zinc-500 text-sm text-center">⚠️ Go back to Step 1 and add a workout title first.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep(2)} className="py-4 rounded-2xl border border-border text-muted font-semibold press">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={loading || !title.trim()}
                className="bg-brand text-white font-display text-xl py-4 rounded-2xl press disabled:opacity-40 shadow-lg shadow-brand/20 tracking-wide">
                {loading ? 'POSTING...' : 'POST IT'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Preset save modal (post-submit) ── */}
      {showPresetSave && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end" onClick={() => { setShowPresetSave(false); router.push('/feed') }}>
          <div className="w-full max-w-md mx-auto bg-[#1a1a1a] border border-border rounded-t-3xl p-6 pb-28 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <p className="font-display text-2xl text-white mb-1">Post saved!</p>
            <p className="text-muted text-sm mb-5">Want to save this as a preset workout?</p>
            <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. My Push Day" className="field-input mb-3" />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPresetSave(false); router.push('/feed') }}
                className="flex-1 py-3 rounded-2xl border border-border text-muted font-semibold press">
                Skip
              </button>
              <button
                onClick={async () => { await savePreset(); router.push('/feed') }}
                disabled={saving || !presetName.trim()}
                className="flex-1 py-3 rounded-2xl bg-brand text-white font-semibold press disabled:opacity-40 flex items-center justify-center gap-2">
                <Save size={16} /> Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .field-label { display: block; font-size: 0.65rem; color: #666; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 0.375rem; }
        .field-input { width: 100%; background: #1e1e1e; border: 1px solid #2e2e2e; border-radius: 0.75rem; padding: 0.75rem 1rem; color: white; font-size: 0.875rem; transition: all 0.15s; }
        .field-input::placeholder { color: #666; }
        .scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: #2e2e2e; border-radius: 9999px; height: 4px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; cursor: pointer; border: 3px solid #0f0f0f; }
        input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #ef4444; cursor: pointer; border: 3px solid #0f0f0f; }
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

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f]" />}>
      <CreateForm />
    </Suspense>
  )
}
