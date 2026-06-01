'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { WorkoutPost } from '@/lib/types'
import { Heart, MessageCircle, Clock, MapPin, Dumbbell, ChevronRight, Star, Users, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const typeColors: Record<string, string> = {
  'Push':      'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Pull':      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Legs':      'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Full Body': 'bg-brand/20 text-brand border-brand/30',
  'Cardio':    'bg-red-500/20 text-red-400 border-red-500/30',
  'HIIT':      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Mobility':  'bg-green-500/20 text-green-400 border-green-500/30',
  'Other':     'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

function cleanUsername(username: string) {
  return username.replace('@', '').trim()
}

export default function WorkoutCard({ post, currentUserId }: { post: WorkoutPost; currentUserId?: string }) {
  const [liked, setLiked] = useState(post.user_has_liked || false)
  const [likeCount, setLikeCount] = useState(post.likes_count || 0)
  const [showShareModal, setShowShareModal] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const shareCardRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const colorClass = typeColors[post.workout_type] || typeColors['Other']
  const totalSets = post.exercises?.reduce((sum, e) => sum + (e.sets || 0), 0) || 0
  const hasPR = post.exercises?.some(e => e.is_pr)
  const hasMentions = post.mentions && post.mentions.length > 0
  const profileUsername = cleanUsername(post.profiles?.username || '')
  const prCount = post.exercises?.filter(e => e.is_pr).length || 0

  async function toggleLike() {
    if (!currentUserId) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId })
      setLikeCount(c => c + 1)
      if (post.user_id !== currentUserId) {
        const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUserId).single()
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          sender_id: currentUserId,
          type: 'like',
          content: `@${myProfile?.username} liked your workout "${post.title || 'post'}" 🔥`,
          read: false,
        })
      }
    }
    setLiked(!liked)
  }

  async function handleShare() {
    if (!shareCardRef.current) return
    setCapturing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#0f0f0f',
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob(async blob => {
        if (!blob) { setCapturing(false); return }
        const file = new File([blob], 'gogym-workout.png', { type: 'image/png' })
        try {
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: post.title || 'GoGym Workout',
              text: `Check out my workout on GoGym!`,
            })
          } else {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'gogym-workout.png'
            a.click()
            URL.revokeObjectURL(url)
          }
        } catch (e) {
          // user cancelled
        }
        setShowShareModal(false)
        setCapturing(false)
      }, 'image/png')
    } catch (err) {
      console.error(err)
      setShowShareModal(false)
      setCapturing(false)
    }
  }

  return (
    <>
      <article className="bg-surface-2 rounded-2xl overflow-hidden border border-border">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <Link href={`/profile/${profileUsername}`}>
            <div className="w-9 h-9 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt={profileUsername} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand font-semibold text-sm">
                  {profileUsername[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profile/${profileUsername}`}>
              <p className="font-semibold text-white text-sm leading-tight">@{profileUsername}</p>
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-muted text-xs">{timeAgo(post.created_at)}</span>
              {post.gym_location && (
                <span className="flex items-center gap-0.5 text-muted text-xs">
                  <MapPin size={9} />{post.gym_location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasPR && (
              <div className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-2 py-0.5">
                <Star size={9} className="text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-[10px] font-bold">PR</span>
              </div>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${colorClass}`}>
              <Dumbbell size={9} />{post.workout_type}
            </span>
          </div>
        </div>

        {/* Title */}
        {post.title && (
          <div className="px-4 pb-3">
            <h3 className="font-display text-2xl text-white tracking-tight leading-tight">{post.title}</h3>
          </div>
        )}

        {/* Photo */}
        {post.photo_urls?.length > 0 && (
          <div className="relative w-full mb-3">
            <img src={post.photo_urls[0]} alt="workout" className="w-full object-cover" style={{ maxHeight: '320px', minHeight: '200px' }} />
            {post.photo_urls.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full">
                +{post.photo_urls.length - 1} more
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
          {post.mood && <span className="text-xs bg-surface-3 text-white/50 px-2.5 py-1 rounded-full border border-border">{post.mood}</span>}
          {post.session_type && post.session_type !== 'Solo' && (
            <span className="text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20 flex items-center gap-1">
              <Users size={9} />{post.session_type}
            </span>
          )}
          {hasMentions && post.mentions.map((username, i) => (
            <Link key={i} href={`/profile/${cleanUsername(username)}`}
              className="text-xs text-brand font-semibold bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
              @{cleanUsername(username)}
            </Link>
          ))}
        </div>

        {/* Stats */}
        {(post.exercises?.length > 0 || post.duration_minutes) && (
          <div className="mx-4 mb-3 bg-surface-3 rounded-xl px-4 py-2.5 flex items-center gap-5 border border-border">
            {post.exercises?.length > 0 && (
              <div>
                <p className="text-white font-bold text-sm">{post.exercises.length}</p>
                <p className="text-muted text-[10px] uppercase tracking-wide">exercises</p>
              </div>
            )}
            {totalSets > 0 && (
              <div>
                <p className="text-white font-bold text-sm">{totalSets}</p>
                <p className="text-muted text-[10px] uppercase tracking-wide">sets</p>
              </div>
            )}
            {post.duration_minutes && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-brand" />
                <div>
                  <p className="text-white font-bold text-sm">{post.duration_minutes}m</p>
                  <p className="text-muted text-[10px] uppercase tracking-wide">duration</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="px-4 pb-3 text-white/70 text-sm leading-relaxed">{post.caption}</p>
        )}

        {/* Actions */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="flex items-center gap-1.5 press transition-colors">
              <Heart size={18} className={liked ? 'fill-brand text-brand' : 'text-muted'} strokeWidth={liked ? 0 : 1.8} />
              <span className={`text-sm font-semibold ${liked ? 'text-brand' : 'text-muted'}`}>{likeCount}</span>
            </button>
            <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 text-muted press">
              <MessageCircle size={18} strokeWidth={1.8} />
              <span className="text-sm font-semibold">{post.comments_count || 0}</span>
            </Link>
            <button onClick={() => setShowShareModal(true)} className="press text-muted hover:text-white transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </button>
          </div>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1 press">
            <span className="text-brand text-xs font-semibold">View details</span>
            <ChevronRight size={14} className="text-brand" />
          </Link>
        </div>
      </article>

      {/* Share modal — rendered outside article, controlled by state */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setShowShareModal(false)}>
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute -top-10 right-0 text-white/60 press p-2">
              <X size={22} />
            </button>

            {/* Share card — captured by html2canvas */}
            <div ref={shareCardRef} style={{
              background: 'linear-gradient(160deg, #1a1a1a 0%, #0f0f0f 100%)',
              borderRadius: '20px',
              padding: '28px 24px',
              fontFamily: 'system-ui, sans-serif',
              color: 'white',
              border: '1px solid #2e2e2e',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#E8272A', borderRadius: '20px 20px 0 0' }} />

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>
                  {post.workout_type}{post.mood ? ` · ${post.mood}` : ''}
                </div>
                <div style={{ fontSize: '26px', fontWeight: '800', lineHeight: 1.1, color: 'white' }}>
                  {post.title || 'Workout'}
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  @{profileUsername}{post.gym_location ? ` · 📍 ${post.gym_location}` : ''}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {[
                  { label: 'Exercises', value: post.exercises?.length || 0 },
                  { label: 'Total Sets', value: totalSets },
                  { label: 'Duration', value: post.duration_minutes ? `${post.duration_minutes}m` : '—' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#1e1e1e', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid #2e2e2e' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#E8272A' }}>{s.value}</div>
                    <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {prCount > 0 && (
                <div style={{ background: '#1a1500', border: '1px solid #3a3000', borderRadius: '10px', padding: '8px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>⭐</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '700' }}>{prCount} PR{prCount > 1 ? 's' : ''} Smashed!</span>
                </div>
              )}

              {post.exercises && post.exercises.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  {post.exercises.slice(0, 4).map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1e1e1e' }}>
                      <span style={{ fontSize: '12px', color: '#ccc' }}>{ex.name}</span>
                      <span style={{ fontSize: '12px', color: '#E8272A', fontWeight: '700' }}>
                        {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ''}
                      </span>
                    </div>
                  ))}
                  {post.exercises.length > 4 && (
                    <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>+{post.exercises.length - 4} more exercises</div>
                  )}
                </div>
              )}

              {post.caption && (
                <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginBottom: '18px', borderLeft: '2px solid #E8272A', paddingLeft: '10px' }}>
                  "{post.caption.slice(0, 100)}{post.caption.length > 100 ? '...' : ''}"
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #2e2e2e' }}>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'white' }}>
                  Go<span style={{ color: '#E8272A' }}>Gym</span>
                </div>
                <div style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Lift Together
                </div>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={capturing}
              className="mt-4 w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press disabled:opacity-50 shadow-lg shadow-brand/20 tracking-wide flex items-center justify-center gap-2">
              {capturing ? 'Generating...' : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Share Workout
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  )
}