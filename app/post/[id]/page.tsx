'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { WorkoutPost, Comment, Exercise, WorkoutType, Mood } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import BodyMap from '@/components/BodyMap'
import { ArrowLeft, Heart, Star, MapPin, Send, Dumbbell, Trash2, Users, CornerDownRight, ChevronDown, ChevronUp, MoreVertical, Edit2, Check, Plus, Globe, Lock } from 'lucide-react'
import Link from 'next/link'
import { findExercise } from '@/lib/exercises'

const WORKOUT_TYPES: WorkoutType[] = ['Push', 'Pull', 'Upper', 'Lower', 'Legs', 'Full Body', 'Cardio', 'HIIT', 'Mobility', 'Stairmaster', 'Treadmill', 'Other']
const MOODS: Mood[] = ['🔒 Locked In', '😴 Tired', '😊 Great', '🔥 On Fire', '💪 Strong', '💀 Dead Inside']
const SET_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1)
const REP_OPTIONS = ['1','2','3','4','5','6','7','8','9','10','11','12','15','20','25','30','AMRAP','Failure']
const INCLINE_OPTIONS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']
const SPEED_OPTIONS = ['1.0','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0','8.0','9.0','10.0']

function emptyExercise(): Exercise { return { name: '', sets: 3, reps: '10', weight: '', is_pr: false, notes: '' } }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface CommentWithExtras extends Comment {
  likes_count: number
  user_has_liked: boolean
  replies: CommentWithExtras[]
  parent_id: string | null
}

// Standalone comment item — NOT inside the main component
function CommentItem({
  comment, isReply, currentUserId,
  commentMenuId, setCommentMenuId,
  editingCommentId, editingCommentText, setEditingCommentText,
  onStartEdit, onSaveEdit, onDelete,
  onToggleLike, onReply,
}: {
  comment: CommentWithExtras
  isReply: boolean
  currentUserId: string | null
  commentMenuId: string | null
  setCommentMenuId: (id: string | null) => void
  editingCommentId: string | null
  editingCommentText: string
  setEditingCommentText: (t: string) => void
  onStartEdit: (id: string, content: string) => void
  onSaveEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleLike: (id: string, liked: boolean) => void
  onReply: (id: string, username: string) => void
}) {
  const isOwnComment = currentUserId === comment.user_id
  const isEditing = editingCommentId === comment.id
  const menuOpen = commentMenuId === comment.id

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-10 mt-2' : ''}`}>
      <Link href={`/profile/${comment.profiles.username}`}>
        <div className="w-8 h-8 rounded-full bg-surface-3 border border-border overflow-hidden flex-shrink-0">
          {comment.profiles.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-brand text-xs font-bold">
              {comment.profiles.username[0].toUpperCase()}
            </div>
          )}
        </div>
      </Link>
      <div className="flex-1">
        <div className="bg-surface-2 rounded-2xl px-3 py-2 border border-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-brand text-xs font-semibold">@{comment.profiles.username}</span>
              <span className="text-muted text-xs">{timeAgo(comment.created_at)}</span>
            </div>
            {isOwnComment && (
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setCommentMenuId(menuOpen ? null : comment.id) }}
                  className="text-muted press p-1">
                  <MoreVertical size={13} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-xl overflow-hidden z-50 shadow-xl min-w-[120px]"
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { onStartEdit(comment.id, comment.content); setCommentMenuId(null) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-surface-3 press">
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-surface-3 press">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingCommentText}
                onChange={e => setEditingCommentText(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-white text-sm resize-none"
                rows={2}
                maxLength={200}
                autoFocus
              />
              <div className="flex gap-2">
                <button
  onClick={() => { onStartEdit(comment.id, comment.content); setCommentMenuId(null) }}
                  className="flex-1 py-1.5 text-xs text-muted border border-border rounded-lg press">
                  Cancel
                </button>
                <button
                  onClick={() => onSaveEdit(comment.id)}
                  className="flex-1 py-1.5 text-xs bg-brand text-white rounded-lg press">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-white/80 text-sm">{comment.content}</p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 px-1">
          <button onClick={() => onToggleLike(comment.id, comment.user_has_liked)} className="flex items-center gap-1 press">
            <Heart size={12} className={comment.user_has_liked ? 'fill-brand text-brand' : 'text-muted'} strokeWidth={comment.user_has_liked ? 0 : 1.8} />
            {comment.likes_count > 0 && (
              <span className={`text-xs font-semibold ${comment.user_has_liked ? 'text-brand' : 'text-muted'}`}>{comment.likes_count}</span>
            )}
          </button>
          {!isReply && (
            <button onClick={() => onReply(comment.id, comment.profiles.username)}
              className="flex items-center gap-1 text-muted press hover:text-white">
              <CornerDownRight size={12} />
              <span className="text-xs">Reply</span>
            </button>
          )}
        </div>
        {comment.replies.map(reply => (
          <CommentItem
            key={reply.id}
            comment={reply}
            isReply={true}
            currentUserId={currentUserId}
            commentMenuId={commentMenuId}
            setCommentMenuId={setCommentMenuId}
            editingCommentId={editingCommentId}
            editingCommentText={editingCommentText}
            setEditingCommentText={setEditingCommentText}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onDelete={onDelete}
            onToggleLike={onToggleLike}
            onReply={onReply}
          />
        ))}
      </div>
    </div>
  )
}

export default function PostDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [post, setPost] = useState<WorkoutPost | null>(null)
  const [comments, setComments] = useState<CommentWithExtras[]>([])
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [savingPost, setSavingPost] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null)

  // Full edit state
  const [editTitle, setEditTitle] = useState('')
  const [editCaption, setEditCaption] = useState('')
  const [editWorkoutType, setEditWorkoutType] = useState<WorkoutType | ''>('')
  const [editMood, setEditMood] = useState<Mood | ''>('')
  const [editDuration, setEditDuration] = useState('')
  const [editGymLocation, setEditGymLocation] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editExercises, setEditExercises] = useState<Exercise[]>([])
  const [editIsPublic, setEditIsPublic] = useState(true)
  const [editWorkoutDropdown, setEditWorkoutDropdown] = useState(false)
  const [editExpandedNotes, setEditExpandedNotes] = useState<Record<number, boolean>>({})

  const commentInputRef = useRef<HTMLInputElement>(null)
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
        setEditTitle(p.title || '')
        setEditCaption(p.caption || '')
        setEditWorkoutType(p.workout_type || '')
        setEditMood(p.mood || '')
        setEditDuration(p.duration_minutes?.toString() || '')
        setEditGymLocation(p.gym_location || '')
        setEditCity(p.city || '')
        setEditExercises(p.exercises?.length ? p.exercises : [emptyExercise()])
        setEditIsPublic(p.is_public !== false)
        const [{ count: likes }, likedRes] = await Promise.all([
          supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
          user ? supabase.from('post_likes').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null }),
        ])
        setLikeCount(likes || 0)
        setLiked(!!likedRes.data)
        await loadComments(user?.id ?? null)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function loadComments(userId: string | null) {
    const supabase = supabaseRef.current
    const { data: cmts } = await supabase.from('comments').select('*').eq('post_id', id).order('created_at')
    if (!cmts || cmts.length === 0) { setComments([]); return }
    const commentUserIds = [...new Set(cmts.map((c: any) => c.user_id))]
    const { data: commentProfiles } = await supabase.from('profiles').select('*').in('id', commentUserIds)
    const profileMap: Record<string, any> = {}
    if (commentProfiles) commentProfiles.forEach((p: any) => { profileMap[p.id] = p })
    const commentIds = cmts.map((c: any) => c.id)
    const { data: allLikes } = await supabase.from('comment_likes').select('comment_id, user_id').in('comment_id', commentIds)
    const likesMap: Record<string, number> = {}
    const userLikedMap: Record<string, boolean> = {}
    if (allLikes) {
      allLikes.forEach((l: any) => {
        likesMap[l.comment_id] = (likesMap[l.comment_id] || 0) + 1
        if (l.user_id === userId) userLikedMap[l.comment_id] = true
      })
    }
    const cmtsWithExtras: CommentWithExtras[] = cmts.map((c: any) => ({
      ...c,
      profiles: profileMap[c.user_id] || { username: 'unknown', avatar_url: null },
      likes_count: likesMap[c.id] || 0,
      user_has_liked: userLikedMap[c.id] || false,
      replies: [],
      parent_id: c.parent_id || null,
    }))
    const topLevel = cmtsWithExtras.filter(c => !c.parent_id)
    const replies = cmtsWithExtras.filter(c => c.parent_id)
    replies.forEach(reply => {
      const parent = topLevel.find(c => c.id === reply.parent_id)
      if (parent) parent.replies.push(reply)
    })
    setComments(topLevel)
  }

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

  async function toggleCommentLike(commentId: string, currentlyLiked: boolean) {
    const supabase = supabaseRef.current
    if (!currentUserId) return
    if (currentlyLiked) {
      await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: currentUserId })
    }
    await loadComments(currentUserId)
  }

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    await supabaseRef.current.from('workout_posts').delete().eq('id', id)
    router.push('/feed')
  }

  async function savePostEdit() {
    if (!editTitle.trim()) return
    setSavingPost(true)
    await supabaseRef.current.from('workout_posts').update({
      title: editTitle,
      caption: editCaption,
      workout_type: editWorkoutType || 'Other',
      mood: editMood || null,
      duration_minutes: editDuration ? parseInt(editDuration) : null,
      gym_location: editGymLocation,
      city: editCity,
      exercises: editExercises,
      is_public: editIsPublic,
    }).eq('id', id)
    setPost(prev => prev ? {
      ...prev,
      title: editTitle,
      caption: editCaption,
      workout_type: (editWorkoutType || 'Other') as WorkoutType,
      mood: (editMood || null) as Mood | null,
      duration_minutes: editDuration ? parseInt(editDuration) : null,
      gym_location: editGymLocation,
      city: editCity,
      exercises: editExercises,
      is_public: editIsPublic,
    } : prev)
    setEditingPost(false)
    setSavingPost(false)
  }

  async function submitComment() {
  const supabase = supabaseRef.current
  if (!newComment.trim() || !currentUserId) return
  await supabase.from('comments').insert({
    post_id: id,
    user_id: currentUserId,
    content: newComment.trim(),
    parent_id: replyingTo?.id || null,
  })
  // Notify post owner (not yourself)
  if (post && post.user_id !== currentUserId) {
    const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', currentUserId).single()
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      sender_id: currentUserId,
      type: 'comment',
      content: `@${myProfile?.username} commented on your workout: "${newComment.trim().slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
      read: false,
    })
  }
  setNewComment('')
  setReplyingTo(null)
  await loadComments(currentUserId)
}

  async function saveCommentEdit(commentId: string) {
  if (!editingCommentText.trim()) return
  const { error } = await supabaseRef.current
    .from('comments')
    .update({ content: editingCommentText.trim() })
    .eq('id', commentId)
    .eq('user_id', currentUserId!)
  if (!error) {
    setEditingCommentId(null)
    setEditingCommentText('')
    const { data: { user } } = await supabaseRef.current.auth.getUser()
    await loadComments(user?.id ?? null)
  }
}

  async function deleteComment(commentId: string) {
    await supabaseRef.current.from('comments').delete().eq('id', commentId)
    setCommentMenuId(null)
    await loadComments(currentUserId)
  }

  function startReply(commentId: string, username: string) {
    setReplyingTo({ id: commentId, username })
    setNewComment(`@${username} `)
    commentInputRef.current?.focus()
  }

  function startEditComment(commentId: string, content: string) {
  if (!commentId) {
    setEditingCommentId(null)
    setEditingCommentText('')
    return
  }
  setEditingCommentId(commentId)
  setEditingCommentText(content)
}

  function updateEditExercise(i: number, field: keyof Exercise, value: any) {
    setEditExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const allMuscles = post?.exercises?.flatMap(e => findExercise(e.name)?.muscles || []) || []
  const uniqueMuscles = [...new Set(allMuscles)]
  const totalSets = post?.exercises?.reduce((s, e) => s + e.sets, 0) || 0
  const prExercises = post?.exercises?.filter(e => e.is_pr) || []
  const hasMentions = post?.mentions && post.mentions.length > 0
  const totalComments = comments.reduce((s, c) => s + 1 + c.replies.length, 0)
  const isStaircasterOrTreadmill = editWorkoutType === 'Stairmaster' || editWorkoutType === 'Treadmill'

  const commentItemProps = {
    currentUserId,
    commentMenuId,
    setCommentMenuId,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    onStartEdit: startEditComment,
    onSaveEdit: saveCommentEdit,
    onDelete: deleteComment,
    onToggleLike: toggleCommentLike,
    onReply: startReply,
  }

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

  const isOwnPost = currentUserId === post.user_id

  // EDIT MODE
  if (editingPost) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] pb-nav">
        <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setEditingPost(false)} className="text-muted hover:text-white press"><ArrowLeft size={20} /></button>
          <h2 className="font-display text-2xl tracking-wide flex-1">Edit Workout</h2>
          <button onClick={savePostEdit} disabled={savingPost || !editTitle.trim()}
            className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-xl press disabled:opacity-40 flex items-center gap-2">
            <Check size={16} /> {savingPost ? 'Saving...' : 'Save'}
          </button>
        </header>

        <div className="px-4 py-6 space-y-5">
          <div className="flex gap-2">
            <button onClick={() => setEditIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all press
                ${editIsPublic ? 'bg-brand text-white border-brand' : 'bg-surface-2 text-muted border-border'}`}>
              <Globe size={15} /> Public
            </button>
            <button onClick={() => setEditIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all press
                ${!editIsPublic ? 'bg-surface-3 text-white border-white/20' : 'bg-surface-2 text-muted border-border'}`}>
              <Lock size={15} /> Friends Only
            </button>
          </div>

          <div>
            <label className="field-label">Workout Title *</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="field-label">Workout Type</label>
            <div className="relative">
              <button onClick={() => setEditWorkoutDropdown(!editWorkoutDropdown)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all press
                  ${editWorkoutType ? 'bg-brand/10 border-brand text-white' : 'bg-surface-2 border-border text-muted'}`}>
                {editWorkoutType || 'Select type...'}
                <ChevronDown size={16} className={`transition-transform ${editWorkoutDropdown ? 'rotate-180' : ''}`} />
              </button>
              {editWorkoutDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-2xl overflow-hidden z-50 shadow-xl">
                  {WORKOUT_TYPES.map(type => (
                    <button key={type} onClick={() => { setEditWorkoutType(type); setEditWorkoutDropdown(false) }}
                      className={`w-full text-left px-4 py-3 text-sm transition-all press border-b border-border/50 last:border-0
                        ${editWorkoutType === type ? 'bg-brand text-white font-semibold' : 'text-white/70 hover:bg-surface-3'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="field-label">Mood</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MOODS.map(m => (
                <button key={m} type="button" onClick={() => setEditMood(editMood === m ? '' : m)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all press border
                    ${editMood === m ? 'bg-brand text-white border-brand' : 'bg-surface-2 text-white/80 border-border'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Duration (mins)</label>
              <input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} placeholder="60" className="field-input" />
            </div>
            <div>
              <label className="field-label">City</label>
              <input value={editCity} onChange={e => setEditCity(e.target.value)} placeholder="Dallas, TX" className="field-input" />
            </div>
          </div>

          <div>
            <label className="field-label">Gym / Location</label>
            <input value={editGymLocation} onChange={e => setEditGymLocation(e.target.value)} placeholder="e.g. LA Fitness" className="field-input" />
          </div>

          <div>
            <label className="field-label">Exercises</label>
            <div className="space-y-3">
              {editExercises.map((ex, i) => (
                <div key={i} className="bg-surface-2 rounded-2xl border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-brand font-display text-lg w-6">{i+1}</span>
                    <input value={ex.name} onChange={e => updateEditExercise(i, 'name', e.target.value)}
                      placeholder="Exercise name..." className="flex-1 field-input" />
                    <button onClick={() => updateEditExercise(i, 'is_pr', !ex.is_pr)}
                      className={`p-2 rounded-xl border press transition-all ${ex.is_pr ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400' : 'bg-surface-3 border-border text-muted'}`}>
                      <Star size={16} className={ex.is_pr ? 'fill-yellow-400' : ''} />
                    </button>
                    {editExercises.length > 1 && (
                      <button onClick={() => setEditExercises(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-2 text-muted hover:text-red-400 press"><Trash2 size={16} /></button>
                    )}
                  </div>
                  {isStaircasterOrTreadmill ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="field-label">Incline / Setting</label>
                        <select value={ex.sets} onChange={e => updateEditExercise(i, 'sets', parseInt(e.target.value))} className="field-input">
                          {INCLINE_OPTIONS.map(n => <option key={n} value={n}>Level {n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Speed (mph)</label>
                        <select value={ex.reps} onChange={e => updateEditExercise(i, 'reps', e.target.value)} className="field-input">
                          {SPEED_OPTIONS.map(s => <option key={s} value={s}>{s} mph</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="field-label">Sets</label>
                        <select value={ex.sets} onChange={e => updateEditExercise(i, 'sets', parseInt(e.target.value))} className="field-input">
                          {SET_OPTIONS.map(n => <option key={n} value={n}>{n} sets</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Reps</label>
                        <select value={ex.reps} onChange={e => updateEditExercise(i, 'reps', e.target.value)} className="field-input">
                          {REP_OPTIONS.map(r => <option key={r} value={r}>{r} reps</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="field-label">Weight (lbs)</label>
                        <input type="number" value={ex.weight} onChange={e => updateEditExercise(i, 'weight', e.target.value)} placeholder="135" className="field-input" />
                      </div>
                    </div>
                  )}
                  <button onClick={() => setEditExpandedNotes(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="flex items-center gap-1.5 text-muted text-xs font-semibold press hover:text-white">
                    {editExpandedNotes[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {editExpandedNotes[i] ? 'Hide notes' : 'Add notes'}
                  </button>
                  {editExpandedNotes[i] && (
                    <textarea value={ex.notes || ''} onChange={e => updateEditExercise(i, 'notes', e.target.value)}
                      placeholder="e.g. felt heavy on set 2..." rows={2} maxLength={200}
                      className="field-input resize-none text-xs" />
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setEditExercises(prev => [...prev, emptyExercise()])}
              className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-border text-muted flex items-center justify-center gap-2 hover:border-brand/40 hover:text-brand/70 transition-all press">
              <Plus size={18} /><span className="font-semibold text-sm">Add Exercise</span>
            </button>
          </div>

          <div>
            <label className="field-label">Caption</label>
            <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
              rows={3} maxLength={280} className="field-input resize-none" />
            <p className="text-muted text-xs text-right mt-1">{editCaption.length}/280</p>
          </div>

          <button onClick={savePostEdit} disabled={savingPost || !editTitle.trim()}
            className="w-full bg-brand text-white font-display text-xl py-4 rounded-2xl press disabled:opacity-40 shadow-lg shadow-brand/20 tracking-wide">
            {savingPost ? 'SAVING...' : 'SAVE CHANGES ✓'}
          </button>
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

  // VIEW MODE
  return (
    <div className="min-h-screen bg-[#0f0f0f] pb-nav" onClick={() => { setShowPostMenu(false); setCommentMenuId(null) }}>
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/feed" className="text-muted hover:text-white press"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h2 className="font-display text-xl tracking-wide">{post.title || 'Workout'}</h2>
          <p className="text-muted text-xs">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleLike} className="flex items-center gap-1.5 press">
            <Heart size={20} className={liked ? 'fill-brand text-brand' : 'text-muted'} strokeWidth={liked ? 0 : 1.8} />
            <span className={`text-sm font-bold ${liked ? 'text-brand' : 'text-muted'}`}>{likeCount}</span>
          </button>
          {isOwnPost && (
            <div className="relative">
              <button onClick={e => { e.stopPropagation(); setShowPostMenu(!showPostMenu) }}
                className="text-muted hover:text-white press p-1">
                <MoreVertical size={20} />
              </button>
              {showPostMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-2xl overflow-hidden z-50 shadow-xl min-w-[140px]"
                  onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditingPost(true); setShowPostMenu(false) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-white hover:bg-surface-3 press border-b border-border">
                    <Edit2 size={15} /> Edit Post
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-surface-3 press">
                    <Trash2 size={15} /> Delete Post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="space-y-5 mt-3">
        {post.photo_urls?.length > 0 && (
          <div className="relative w-full">
  <img src={post.photo_urls[0]} alt="workout" className="w-full object-cover cursor-pointer" style={{ maxHeight: '380px', minHeight: '240px' }} onClick={() => setSelectedPhoto(post.photo_urls[0])} />
  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <div className="flex items-end justify-between">
                <div>
                  {post.title && <h1 className="font-display text-3xl text-white tracking-wide leading-tight mb-1">{post.title}</h1>}
                  <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-surface-3 border border-white/30 overflow-hidden">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-brand text-xs font-bold">
                          {post.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-white/90 text-sm font-semibold">@{post.profiles?.username}</span>
                    <span className="text-white/50 text-xs">{timeAgo(post.created_at)}</span>
                  </Link>
                </div>
                {post.photo_urls.length > 1 && (
                  <div className="flex gap-1">
                    {post.photo_urls.slice(1).map((url, i) => (
                      <button key={i} onClick={() => setSelectedPhoto(url)} className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 press">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 space-y-5">
          {!post.photo_urls?.length && (
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
          )}

          {!post.photo_urls?.length && post.title && (
            <h1 className="font-display text-3xl text-white tracking-wide">{post.title}</h1>
          )}

          {post.photo_urls?.length > 0 && (post.gym_location || post.city) && (
            <div className="flex items-center gap-1.5 text-muted text-xs">
              <MapPin size={11} />
              <span>{[post.gym_location, post.city].filter(Boolean).join(' · ')}</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Dumbbell size={11} />{post.workout_type}
            </span>
            {post.mood && <span className="text-xs bg-surface-2 text-white/60 border border-border px-3 py-1 rounded-full">{post.mood}</span>}
            {post.session_type !== 'Solo' && (
              <span className="text-xs bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full flex items-center gap-1">
                <Users size={10} />{post.session_type}
              </span>
            )}
          </div>

          {hasMentions && (
            <div className="flex items-center gap-1.5 flex-wrap bg-surface-2 rounded-xl px-4 py-3 border border-border">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">With</span>
              {post.mentions.map((username: string, i: number) => (
                <Link key={i} href={`/profile/${username}`}
                  className="text-xs text-brand font-semibold bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
                  @{username}
                </Link>
              ))}
              {post.group_name && <span className="text-xs text-white/50 ml-1">· {post.group_name}</span>}
            </div>
          )}

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

          {post.caption && <p className="text-white/80 text-sm leading-relaxed">{post.caption}</p>}

          {post.exercises?.length > 0 && (
            <div>
              <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-3">Exercises</h3>
              <div className="space-y-2">
                {post.exercises.map((ex, i) => {
                  const info = findExercise(ex.name)
                  const isExpanded = expandedExercise === i
                  return (
                    <button key={i} onClick={() => setExpandedExercise(isExpanded ? null : i)}
                      className="w-full bg-surface-2 rounded-xl border border-border px-4 py-3 text-left transition-all press">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-brand font-display text-sm w-5 flex-shrink-0">{i+1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-sm flex items-center gap-1.5">
                              {ex.name}
                              {ex.is_pr && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                            </p>
                            {!isExpanded && info && (
                              <p className="text-muted text-xs mt-0.5 truncate">{info.description.slice(0, 50)}...</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <div className="text-right">
                            <p className="text-brand font-semibold text-sm">{ex.sets}×{ex.reps}</p>
                            {ex.weight && <p className="text-muted text-xs">{ex.weight} lbs</p>}
                          </div>
                          {info && (isExpanded ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />)}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border">
                          {info && <p className="text-light-gray/70 text-sm leading-relaxed">{info.description}</p>}
                          {ex.notes && <p className="text-muted text-xs mt-2 italic">📝 {ex.notes}</p>}
                          {info?.muscles && info.muscles.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {info.muscles.map(m => (
                                <span key={m} className="text-xs bg-brand/10 text-brand border border-brand/20 px-2 py-0.5 rounded-full">{m}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {uniqueMuscles.length > 0 && (
            <div className="bg-surface-2 rounded-2xl border border-border p-4">
              <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-1">Muscles Targeted</h3>
              <p className="text-muted text-xs mb-3">{uniqueMuscles.join(' · ')}</p>
              <BodyMap muscles={uniqueMuscles} />
            </div>
          )}

          <div>
            <h3 className="font-display text-lg tracking-wide text-white/60 uppercase mb-3">
              Comments {totalComments > 0 && `(${totalComments})`}
            </h3>
            {comments.length === 0 && (
              <p className="text-muted text-sm text-center py-4">No comments yet. Be the first!</p>
            )}
            <div className="space-y-4 mb-4">
              {comments.map(c => (
                <CommentItem key={c.id} comment={c} isReply={false} {...commentItemProps} />
              ))}
            </div>

            {replyingTo && (
              <div className="flex items-center gap-2 bg-brand/10 border border-brand/20 rounded-xl px-3 py-2 mb-2">
                <CornerDownRight size={14} className="text-brand" />
                <span className="text-brand text-xs flex-1">Replying to @{replyingTo.username}</span>
                <button onClick={() => { setReplyingTo(null); setNewComment('') }} className="text-muted press">✕</button>
              </div>
            )}

            <div className="flex gap-2">
              <input ref={commentInputRef} value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : 'Add a comment...'}
                maxLength={200}
                className="flex-1 bg-surface-2 border border-border rounded-2xl px-4 py-3 text-white text-sm placeholder-muted" />
              <button onClick={submitComment} disabled={!newComment.trim()}
                className="bg-brand text-white rounded-2xl px-4 press disabled:opacity-40">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedPhoto && (
  <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
    <button
      onClick={() => setSelectedPhoto(null)}
      className="absolute top-12 right-5 bg-zinc-800 border border-zinc-700 rounded-full p-2.5 z-10 active:scale-95 transition-transform"
    >
      <ArrowLeft size={20} className="text-white" />
    </button>
    <img src={selectedPhoto} alt="Photo" className="max-w-full max-h-full object-contain rounded-2xl" />
  </div>
)}

      <BottomNav />
    </div>
  )
}