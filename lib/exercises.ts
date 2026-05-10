export interface ExerciseInfo {
  description: string
  muscles: string[]
  category: string
}

export const EXERCISE_DB: Record<string, ExerciseInfo> = {
  'bench press': { description: 'Lie on a flat bench and press a barbell from chest to full arm extension. King of chest exercises.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'incline bench press': { description: 'Bench press on an incline (30-45°) to emphasize the upper chest.', muscles: ['upper-chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'incline chest press': { description: 'Press dumbbells or a barbell on an incline to target the upper chest.', muscles: ['upper-chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'dumbbell press': { description: 'Press dumbbells from chest height to full extension, allowing greater range of motion than barbell.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'push up': { description: 'Bodyweight push from the floor. Works chest, shoulders and triceps. Never goes out of style.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'overhead press': { description: 'Press a barbell or dumbbells overhead from shoulder height. The ultimate shoulder builder.', muscles: ['shoulders', 'triceps', 'upper-chest'], category: 'Push' },
  'lateral raise': { description: 'Raise dumbbells to the side to shoulder height. Isolates the medial deltoid for wide shoulders.', muscles: ['side-shoulders'], category: 'Push' },
  'lat raise machine': { description: 'Machine version of lateral raises for controlled deltoid isolation.', muscles: ['side-shoulders'], category: 'Push' },
  'pec deck': { description: 'Machine fly movement that isolates the chest with constant tension throughout the rep.', muscles: ['chest'], category: 'Push' },
  'peck deck flys': { description: 'Machine fly movement that isolates the chest with constant tension throughout the rep.', muscles: ['chest'], category: 'Push' },
  'cable fly': { description: 'Cable crossover that keeps constant tension on the chest. Great for the inner chest.', muscles: ['chest', 'front-shoulders'], category: 'Push' },
  'tricep pushdown': { description: 'Push a cable attachment downward to isolate the triceps. Great for arm size.', muscles: ['triceps'], category: 'Push' },
  'cable triceps pushdown': { description: 'Push a cable attachment downward to isolate the triceps. Great for arm size.', muscles: ['triceps'], category: 'Push' },
  'skull crusher': { description: 'Lower a barbell or EZ bar to your forehead and extend. Brutal tricep isolation.', muscles: ['triceps'], category: 'Push' },
  'jm press': { description: 'Hybrid between a close-grip bench press and skull crusher. Serious tricep mass builder.', muscles: ['triceps', 'chest'], category: 'Push' },
  'dumbell shoulder press': { description: 'Press dumbbells overhead for shoulder size and stability.', muscles: ['shoulders', 'triceps'], category: 'Push' },
  'pull up': { description: 'Hang from a bar and pull yourself up until chin clears. Best back width builder.', muscles: ['lats', 'biceps', 'rear-shoulders'], category: 'Pull' },
  'lat pulldown': { description: 'Pull a cable bar to your chest to simulate pull-ups. Great for lat development.', muscles: ['lats', 'biceps'], category: 'Pull' },
  'barbell row': { description: 'Hinge at the hips and row a barbell to your stomach. Builds serious back thickness.', muscles: ['back', 'rear-shoulders', 'biceps'], category: 'Pull' },
  'dumbbell row': { description: 'Single arm rowing movement for the back. Great for unilateral development.', muscles: ['back', 'biceps'], category: 'Pull' },
  'cable row': { description: 'Seated row on a cable machine. Constant tension for back thickness.', muscles: ['back', 'biceps', 'rear-shoulders'], category: 'Pull' },
  'face pull': { description: 'Pull a rope to your face level to target rear delts and upper back. Great for posture.', muscles: ['rear-shoulders', 'upper-back'], category: 'Pull' },
  'bicep curl': { description: 'Curl a dumbbell or barbell to work the biceps. Classic arm exercise.', muscles: ['biceps'], category: 'Pull' },
  'hammer curl': { description: 'Neutral grip curl that targets the brachialis and brachioradialis along with the bicep.', muscles: ['biceps', 'forearms'], category: 'Pull' },
  'squat': { description: 'The king of all exercises. Bar on your back, squat to parallel or below. Full lower body.', muscles: ['quads', 'glutes', 'hamstrings', 'core'], category: 'Legs' },
  'leg press': { description: 'Press weight away from you on a sled machine. Great quad builder with less spinal load.', muscles: ['quads', 'glutes'], category: 'Legs' },
  'romanian deadlift': { description: 'Hinge at hips with slight knee bend to stretch and load the hamstrings. RDL for short.', muscles: ['hamstrings', 'glutes', 'lower-back'], category: 'Legs' },
  'leg curl': { description: 'Curl weight with your legs to isolate the hamstrings on a machine.', muscles: ['hamstrings'], category: 'Legs' },
  'leg extension': { description: 'Extend your legs on a machine to isolate the quadriceps.', muscles: ['quads'], category: 'Legs' },
  'calf raise': { description: 'Rise on your toes to work the calves. Often neglected, always needed.', muscles: ['calves'], category: 'Legs' },
  'deadlift': { description: 'Pull a loaded barbell from the floor to hip height. Total body strength movement.', muscles: ['back', 'glutes', 'hamstrings', 'quads', 'core'], category: 'Full Body' },
  'hip thrust': { description: 'Drive your hips upward with a barbell across your lap. Best glute builder.', muscles: ['glutes', 'hamstrings'], category: 'Legs' },
  'plank': { description: 'Hold a push-up position on forearms. Core stability staple.', muscles: ['core'], category: 'Cardio' },
  'running': { description: 'Sustained cardiovascular exercise. Build your engine.', muscles: ['quads', 'hamstrings', 'calves', 'core'], category: 'Cardio' },
}

export function findExercise(name: string): ExerciseInfo | null {
  const key = name.toLowerCase().trim()
  if (EXERCISE_DB[key]) return EXERCISE_DB[key]
  const match = Object.keys(EXERCISE_DB).find(k => key.includes(k) || k.includes(key))
  return match ? EXERCISE_DB[match] : null
}

// Muscle groups for body map highlighting
export const MUSCLE_COLORS: Record<string, string> = {
  'chest': '#E8272A',
  'upper-chest': '#E8272A',
  'lats': '#E8272A',
  'back': '#E8272A',
  'upper-back': '#E8272A',
  'shoulders': '#E8272A',
  'front-shoulders': '#E8272A',
  'side-shoulders': '#E8272A',
  'rear-shoulders': '#E8272A',
  'biceps': '#E8272A',
  'triceps': '#E8272A',
  'forearms': '#E8272A',
  'quads': '#E8272A',
  'hamstrings': '#E8272A',
  'glutes': '#E8272A',
  'calves': '#E8272A',
  'core': '#E8272A',
  'lower-back': '#E8272A',
}
