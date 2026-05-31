'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { WorkoutPost, Comment } from '@/lib/types'
import BottomNav from '@/components/BottomNav'
import BodyMap from '@/components/BodyMap'
import { ArrowLeft, Heart, Star, MapPin, Send, Dumbbell, Trash2, Users, CornerDownRight, ChevronDown, ChevronUp, MoreVertical, Edit2, X, Check } from 'lucide-react'
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

interface CommentWithExtras extends Comment {
  likes_count: number
  user_has_liked: boolean
  replies: CommentWithExtras[]
  parent_id: string | null
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
  const [editCaption, setEditCaption] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [savingPost, setSavingPost] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null)
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
        setEditCaption(p.caption || '')
        setEditTitle(p.title || '')
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
    setSavingPost(true)
    await supabaseRef.current.from('workout_posts').update({
      title: editTitle,
      caption: editCaption,
    }).eq('id', id)
    setPost(prev => prev ? { ...prev, title: editTitle, caption: editCaption } : prev)
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
    setNewComment('')
    setReplyingTo(null)
    await loadComments(currentUserId)
  }

  async function saveCommentEdit(commentId: string) {
    if (!editingCommentText.trim()) return
    await supabaseRef.current.from('comments').update({ content: editingCommentText.trim() }).eq('id', commentId)
    setEditingCommentId(null)
    await loadComments(currentUserId)
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

  const allMuscles = post?.exercises?.flatMap(e => findExercise(e.name)?.muscles || []) || []
  const uniqueMuscles = [...new Set(allMuscles)]
  const totalSets = post?.exercises?.reduce((s, e) => s + e.sets, 0) || 0
  const prExercises = post?.exercises?.filter(e => e.is_pr) || []
  const hasMentions = post?.mentions && post.mentions.length > 0
  const totalComments = comments.reduce((s, c) => s + 1 + c.replies.length, 0)

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

  const CommentItem = ({ comment, isReply = false }: { comment: CommentWithExtras, isReply?: boolean }) => {
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
                  <button onClick={() => setCommentMenuId(menuOpen ? null : comment.id)}
                    className="text-muted press p-1">
                    <MoreVertical size={13} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-border rounded-xl overflow-hidden z-50 shadow-xl min-w-[120px]">
                      <button onClick={() => {
                        setEditingCommentId(comment.id)
                        setEditingCommentText(comment.content)
                        setCommentMenuId(null)
                      }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-surface-3 press">
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => deleteComment(comment.id)}
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
                <textarea value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)}
                  className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-white text-sm resize-none"
                  rows={2} maxLength={200} />
                <div className="flex gap-2">
                  <button onClick={() => setEditingCommentId(null)}
                    className="flex-1 py-1.5 text-xs text-muted border border-border rounded-lg press">Cancel</button>
                  <button onClick={() => saveCommentEdit(comment.id)}
                    className="flex-1 py-1.5 text-xs bg-brand text-white rounded-lg press">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-white/80 text-sm">{comment.content}</p>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 px-1">
            <button onClick={() => toggleCommentLike(comment.id, comment.user_has_liked)} className="flex items-center gap-1 press">
              <Heart size={12} className={comment.user_has_liked ? 'fill-brand text-brand' : 'text-muted'} strokeWidth={comment.user_has_liked ? 0 : 1.8} />
              {comment.likes_count > 0 && <span className={`text-xs font-semibold ${comment.user_has_liked ? 'text-brand' : 'text-muted'}`}>{comment.likes_count}</span>}
            </button>
            {!isReply && (
              <button onClick={() => startReply(comment.id, comment.profiles.username)}
                className="flex items-center gap-1 text-muted press hover:text-white">
                <CornerDownRight size={12} />
                <span className="text-xs">Reply</span>
              </button>
            )}
          </div>
          {comment.replies.map(reply => <CommentItem key={reply.id} comment={reply} isReply />)}
        </div>
      </div>
    )
  }

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

      {/* Edit post panel */}
      {editingPost && (
        <div className="mx-4 mt-3 bg-surface-2 border border-brand/30 rounded-2xl p-4 space-y-3">
          <p className="text-brand text-xs font-semibold uppercase tracking-widest">Editing Post</p>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest font-semibold mb-1 block">Title</label>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
              className="w-full bg-surface-3 border border-border rounded-xl px-4 py-2.5 text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-widest font-semibold mb-1 block">Caption</label>
            <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
              rows={3} maxLength={280}
              className="w-full bg-surface-3 border border-border rounded-xl px-4 py-2.5 text-white text-sm resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingPost(false)}
              className="flex-1 py-2.5 border border-border text-muted rounded-xl text-sm font-semibold press">
              Cancel
            </button>
            <button onClick={savePostEdit} disabled={savingPost}
              className="flex-1 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold press disabled:opacity-40 flex items-center justify-center gap-2">
              <Check size={15} /> {savingPost ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5 mt-3">

        {/* BIG PHOTO */}
        {post.photo_urls?.length > 0 && (
          <div className="relative w-full">
            <img src={post.photo_urls[0]} alt="workout" className="w-full object-cover" style={{ maxHeight: '380px', minHeight: '240px' }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
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
                      {isExpanded && info && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-light-gray/70 text-sm leading-relaxed">{info.description}</p>
                          {ex.notes && (
                            <p className="text-muted text-xs mt-2 italic">📝 {ex.notes}</p>
                          )}
                          {info.muscles && info.muscles.length > 0 && (
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
              {comments.map(c => <CommentItem key={c.id} comment={c} />)}
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
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} alt="Photo" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}

      <BottomNav />
    </div>
  )
}