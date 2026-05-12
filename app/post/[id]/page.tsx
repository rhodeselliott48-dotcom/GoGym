'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { WorkoutPost, Comment } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import BodyMap from '@/components/BodyMap'
import { ArrowLeft, Heart, Star, MapPin, Send, Dumbbell, Trash2, Users } from 'lucide-react'
import Link from 'next/link'
import { findExercise } from '@/lib/exercises'

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function PostDetailPage() {
  const { id } = useParams() as { id: string }
  const [post, setPost] = useState<WorkoutPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      const { data: p } = await supabase.from('workout_posts').select('*').eq('id', id).single()

      if (p) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', p.user_id).single()
        setPost({ ...p, profiles: prof } as WorkoutPost)

        const [{ count: likes }, likedRes, { data: cmts }] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
          user ? supabase.from('post_likes').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
          supabase.from('comments').select('*').eq('post_id', id).order('created_at'),
        ])
        setLikeCount(likes || 0)
        setLiked(!!likedRes.data)

        if (cmts && cmts.length > 0) {
          const commentUserIds = [...new Set(cmts.map((c: any) => c.user_id))]
          const { data: commentProfiles } = await supabase.from('profiles').select('*').in('id', commentUserIds)
          const profileMap: Record<string, any> = {}
          if (commentProfiles) commentProfiles.forEach((p: any) => { profileMap[p.id] = p })
          const cmtsWithProfiles = cmts.map((c: any) => ({ ...c, profiles: profileMap[c.user_id] || { username: 'unknown' } }))
          setComments(cmtsWithProfiles as Comment[])
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function toggleLike() {
    const supabase = supabaseRef.current
    if (!currentUserId) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', currentUserId)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: id, user_id: currentUserId })
      setLikeCount(c => c + 1)
    }
    setLiked(!liked)
  }

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    await supabaseRef.current.from('workout_posts').delete().eq('id', id)
    window.location.href = '/feed'
  }

  async function submitComment() {
    const supabase = supabaseRef.current
    if (!newComment.trim() || !currentUserId) return
    const { data } = await supabase.from('comments')
      .insert({ post_id: id, user_id: currentUserId, content: newComment.trim() })
      .select('*').single()
    if (data) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', currentUserId).single()
      setComments(prev => [...prev, { ...data, profiles: prof } as Comment])
    }
    setNewComment('')
  }

  const allMuscles = post?.exercises?.flatMap(e => findExercise(e.name)?.muscles || []) || []
  const uniqueMuscles = [...new Set(allMuscles)]
  const totalSets = post?.exercises?.reduce((s, e) => s + e.sets, 0) || 0
  const prExercises = post?.exercises?.filter(e => e.is_pr) || []
  const hasMentions = post?.mentions && post.mentions.length > 0

  if (loading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
  if (!post) return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
      <p className="text-white font-display text-2xl">Post not found</p>
      <Link href="/feed" className="text-brand text-sm">Back to feed</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav">
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h2 className="font-display text-xl tracking-wide">{post.title || 'Workout'}</h2>
          <p className="text-muted text-xs">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUserId === post.user_id && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-red-400 hover:text-red-300 press p-1 disabled:opacity-50">
              <Trash2 size={18} />
            </button>
          )}
          <button onClick={toggleLike} className="flex items-center gap-1.5 press">
            <Heart size={20} className={liked ? 'fill-brand text-brand' : 'text-muted'} strokeWidth={liked ? 0 : 1.8} />
            <span className={`text-sm font-bold ${liked ? 'text-brand' : 'text-muted'}`}>{likeCount}</span>
          </button>
        </div>
      </header>

      <div className="px-4 py-5 space-y-5">
        {/* User info */}
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.profiles?.username}`}>
            <div className="w-12 h-12 rounded-full bg-surface-3 border-2 border-brand/30 overflow-hidden">
              {post.profiles?.avatar_url ? (
                <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand font-display text-xl">
                  {post.profiles?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </Link>
          <div>
            <Link href={`/profile/${post.profiles?.username}`}>
              <p className="font-semibold text-white">@{post.profiles?.username}</p>
            </Link>
            <div className="flex items-center gap-3 text-muted text-xs mt-0.5">
              <span>{timeAgo(post.created_at)}</span>
              {post.gym_location && <span className="flex items-center gap-0.5"><MapPin size={10} />{post.gym_location}</span>}
              {post.city && <span>{post.city}</span>}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full flex items-center gap-1">
            <Dumbbell size={11} />{post.workout_type}
          </span>
          <span className="text-xs bg-surface-2 text-white/60 border border-border px-3 py-1 rounded-full">{post.mood}</span>
          {post.session_type !== 'Solo' && (
            <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Users size={10} />{post.session_type}
            </span>
          )}
        </div>

        {/* Mentions */}
        {hasMentions && (
          <div className="flex items-center gap-1.5 flex-wrap bg-surface-2 rounded-xl px-4 py-3 border border-border">
            <span className="text-muted text-xs font-semibold uppercase tracking-wide">With</span>
            {post.mentions.map((username: string, i: number) => (
              <Link key={i} href={`/profile/${username}`}
                className="text-xs text-brand font-semibold bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                @{username}
              </Link>
            ))}
            {post.group_name && (
              <span className="text-xs text-white/50 ml-1">· {post.group_name}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Exercises', value: post.exercises?.length || 0 },
            { label: 'Total Sets', value: totalSets },
            { label: 'Duration', value: post.duration_minutes ? `${post.duration_minutes}m` : '—' },
          ].map(s => (
            <div key={s.label} className="bg-surface-2 rounded-2xl border border-border p-3 text-center">
              <p className="font-display text-2xl text-brand">{s.value}</p>
              <p className="text-muted text-[10px] uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* PRs */}
        {prExercises.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-yellow-400 font-bold text-sm flex items-center gap-2 mb-2">
              <Star size={14} className="fill-yellow-400" /> Personal Records 🏆
            </p>
            {prExercises.map((e, i) => (
              <p key={i} className="text-yellow-300/80 text-sm">{e.name} — {e.sets} sets × {e.reps} reps {e.weight ? `@ ${e.weight}lbs` : ''}</p>
            ))}
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="text-white/80 text-sm leading-relaxed">{post.caption}</p>
        )}

        {/* Exercise list */}
        {post.exercises?.length > 0 && (
          <div>
            <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-3">Exercises</h3>
            <div className="space-y-2">
              {post.exercises.map((ex, i) => {
                const info = findExercise(ex.name)
                return (
                  <div key={i} className="bg-surface-2 rounded-xl border border-border px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-brand font-display text-sm w-5">{i+1}</span>
                        <div>
                          <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                            {ex.name}
                            {ex.is_pr && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                          </p>
                          {info && <p className="text-muted text-xs mt-0.5">{info.description.slice(0, 60)}...</p>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-brand font-semibold text-sm">{ex.sets}×{ex.reps}</p>
                        {ex.weight && <p className="text-muted text-xs">{ex.weight} lbs</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Body Map */}
        {uniqueMuscles.length > 0 && (
          <div className="bg-surface-2 rounded-2xl border border-border p-4">
            <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-1">Muscles Targeted</h3>
            <p className="text-muted text-xs mb-3">{uniqueMuscles.join(' · ')}</p>
            <BodyMap muscles={uniqueMuscles} />
          </div>
        )}

        {/* Photos */}
        {post.photo_urls?.length > 0 && (
          <div>
            <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-3">Session Photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {post.photo_urls.map((url, i) => (
                <button key={i} onClick={() => setSelectedPhoto(url)}
                  className={`relative rounded-2xl overflow-hidden ${i === 0 && post.photo_urls.length % 2 !== 0 ? 'col-span-2' : ''}`}>
                  <img src={url} alt={`photo ${i+1}`} className="w-full h-48 object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div>
          <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-3">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>
          {comments.length === 0 && (
            <p className="text-muted text-sm text-center py-4">No comments yet. Be the first!</p>
          )}
          <div className="space-y-3 mb-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <Link href={`/profile/${c.profiles.username}`}>
                  <div className="w-8 h-8 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
                    {c.profiles.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-brand text-xs font-bold">
                        {c.profiles.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 bg-surface-2 rounded-2xl px-3 py-2 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-brand text-xs font-semibold">@{c.profiles.username}</span>
                    <span className="text-muted text-xs">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-white/80 text-sm">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitComment()}
              placeholder="Add a comment..." maxLength={200}
              className="flex-1 bg-surface-2 border border-border rounded-2xl px-4 py-3 text-white text-sm placeholder-muted" />
            <button onClick={submitComment} disabled={!newComment.trim()}
              className="bg-brand text-white rounded-2xl px-4 press disabled:opacity-40">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="Photo" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}

      <BottomNav />
    </div>
  )
}