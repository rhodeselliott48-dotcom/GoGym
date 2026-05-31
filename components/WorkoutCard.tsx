'use client'
import Link from 'next/link'
import { useState } from 'react'
import { WorkoutPost } from '@/lib/types'
import { Heart, MessageCircle, Clock, MapPin, Dumbbell, ChevronRight, Star, Users } from 'lucide-react'
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
  const supabase = createClient()
  const colorClass = typeColors[post.workout_type] || typeColors['Other']
  const totalSets = post.exercises?.reduce((sum, e) => sum + (e.sets || 0), 0) || 0
  const hasPR = post.exercises?.some(e => e.is_pr)
  const hasMentions = post.mentions && post.mentions.length > 0
  const profileUsername = cleanUsername(post.profiles?.username || '')

  async function toggleLike() {
    if (!currentUserId) return
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      setLikeCount(c => c - 1)
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: currentUserId })
      setLikeCount(c => c + 1)
    }
    setLiked(!liked)
  }

  return (
    <article className="bg-surface-2 rounded-2xl overflow-hidden border border-border">

      {/* Header — avatar + name + time */}
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

      {/* BIG Photo — full width, prominent */}
      {post.photo_urls?.length > 0 && (
        <div className="relative w-full mb-3">
          <img
            src={post.photo_urls[0]}
            alt="workout"
            className="w-full object-cover"
            style={{ maxHeight: '320px', minHeight: '200px' }}
          />
          {post.photo_urls.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full">
              +{post.photo_urls.length - 1} more
            </div>
          )}
        </div>
      )}

      {/* Tags row */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-surface-3 text-white/50 px-2.5 py-1 rounded-full border border-border">{post.mood}</span>
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

      {/* Stats bar */}
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
        </div>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1 press">
          <span className="text-brand text-xs font-semibold">View details</span>
          <ChevronRight size={14} className="text-brand" />
        </Link>
      </div>
    </article>
  )
}