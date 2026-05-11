export type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Full Body' | 'Cardio' | 'HIIT' | 'Mobility' | 'Other'
export type Mood = '🔥 On Fire' | '💪 Strong' | '😤 Grind' | '😴 Tired' | '😊 Good'
export type SessionType = 'Solo' | 'Joint' | 'Group' | 'Live'
export type FavSplit = 'PPL' | 'Bro Split' | 'Upper/Lower' | '5/3/1' | 'Full Body' | 'PHUL' | 'Other'

export interface Exercise {
  name: string
  sets: number
  reps: string
  weight: string
  is_pr: boolean
  description?: string
}

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  gym_location: string | null
  favorite_split: string | null
  favorite_exercises: string[] | null
  city: string | null
  created_at: string
}

export interface WorkoutPost {
  id: string
  user_id: string
  title: string
  caption: string
  workout_type: WorkoutType
  mood: Mood
  session_type: SessionType
  photo_urls: string[]
  exercises: Exercise[]
  duration_minutes: number | null
  gym_location: string | null
  city: string | null
  mentions: string[]
  group_name: string | null
  created_at: string
  profiles: Profile
  likes_count?: number
  comments_count?: number
  user_has_liked?: boolean
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles: Profile
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  profiles?: Profile
}