export interface ExerciseInfo {
  description: string
  muscles: string[]
  category: string
}

export const EXERCISE_DB: Record<string, ExerciseInfo> = {
  // PUSH
  'bench press': { description: 'Lie on a flat bench and press a barbell from chest to full arm extension. King of chest exercises.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'incline bench press': { description: 'Bench press on an incline (30-45°) to emphasize the upper chest.', muscles: ['upper-chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'decline bench press': { description: 'Press on a decline angle to hit the lower chest harder.', muscles: ['chest', 'triceps'], category: 'Push' },
  'incline chest press': { description: 'Press dumbbells or a barbell on an incline to target the upper chest.', muscles: ['upper-chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'dumbbell press': { description: 'Press dumbbells from chest height to full extension, allowing greater range of motion than barbell.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'incline dumbbell press': { description: 'Press dumbbells on an incline to target the upper chest with greater range of motion.', muscles: ['upper-chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'push up': { description: 'Bodyweight push from the floor. Works chest, shoulders and triceps. Never goes out of style.', muscles: ['chest', 'front-shoulders', 'triceps'], category: 'Push' },
  'overhead press': { description: 'Press a barbell or dumbbells overhead from shoulder height. The ultimate shoulder builder.', muscles: ['shoulders', 'triceps', 'upper-chest'], category: 'Push' },
  'dumbbell shoulder press': { description: 'Press dumbbells overhead for shoulder size and stability.', muscles: ['shoulders', 'triceps'], category: 'Push' },
  'arnold press': { description: 'Rotating dumbbell press that hits all three heads of the deltoid.', muscles: ['shoulders', 'triceps', 'front-shoulders'], category: 'Push' },
  'lateral raise': { description: 'Raise dumbbells to the side to shoulder height. Isolates the medial deltoid for wide shoulders.', muscles: ['side-shoulders'], category: 'Push' },
  'front raise': { description: 'Raise dumbbells or a plate to the front to target the anterior deltoid.', muscles: ['front-shoulders'], category: 'Push' },
  'pec deck': { description: 'Machine fly movement that isolates the chest with constant tension throughout the rep.', muscles: ['chest'], category: 'Push' },
  'peck deck flys': { description: 'Machine fly movement that isolates the chest with constant tension throughout the rep.', muscles: ['chest'], category: 'Push' },
  'cable fly': { description: 'Cable crossover that keeps constant tension on the chest. Great for the inner chest.', muscles: ['chest', 'front-shoulders'], category: 'Push' },
  'dumbbell fly': { description: 'Stretch and squeeze the chest with dumbbells in a wide arc. Great chest stretch.', muscles: ['chest', 'front-shoulders'], category: 'Push' },
  'chest dip': { description: 'Lean forward on dip bars to target the chest. Bodyweight compound push.', muscles: ['chest', 'triceps', 'front-shoulders'], category: 'Push' },
  'tricep pushdown': { description: 'Push a cable attachment downward to isolate the triceps. Great for arm size.', muscles: ['triceps'], category: 'Push' },
  'tricep pulldown': { description: 'Push a cable attachment downward to isolate the triceps. Great for arm size.', muscles: ['triceps'], category: 'Push' },
  'cable triceps pushdown': { description: 'Push a cable attachment downward to isolate the triceps. Great for arm size.', muscles: ['triceps'], category: 'Push' },
  'skull crusher': { description: 'Lower a barbell or EZ bar to your forehead and extend. Brutal tricep isolation.', muscles: ['triceps'], category: 'Push' },
  'overhead tricep extension': { description: 'Extend a dumbbell or cable overhead to stretch and work the long head of the tricep.', muscles: ['triceps'], category: 'Push' },
  'close grip bench press': { description: 'Narrow grip bench press that shifts emphasis to the triceps.', muscles: ['triceps', 'chest'], category: 'Push' },
  'jm press': { description: 'Hybrid between a close-grip bench press and skull crusher. Serious tricep mass builder.', muscles: ['triceps', 'chest'], category: 'Push' },
  'tricep dip': { description: 'Dip between parallel bars or a bench to hammer the triceps.', muscles: ['triceps', 'chest'], category: 'Push' },

  // PULL
  'pull up': { description: 'Hang from a bar and pull yourself up until chin clears. Best back width builder.', muscles: ['lats', 'biceps', 'rear-shoulders'], category: 'Pull' },
  'chin up': { description: 'Underhand grip pull-up that adds more bicep involvement.', muscles: ['lats', 'biceps'], category: 'Pull' },
  'lat pulldown': { description: 'Pull a cable bar to your chest to simulate pull-ups. Great for lat development.', muscles: ['lats', 'biceps'], category: 'Pull' },
  'close grip lat pulldown': { description: 'Narrow grip pulldown that increases the range of motion and lat stretch.', muscles: ['lats', 'biceps'], category: 'Pull' },
  'barbell row': { description: 'Hinge at the hips and row a barbell to your stomach. Builds serious back thickness.', muscles: ['back', 'rear-shoulders', 'biceps'], category: 'Pull' },
  'dumbbell row': { description: 'Single arm rowing movement for the back. Great for unilateral development.', muscles: ['back', 'biceps'], category: 'Pull' },
  'cable row': { description: 'Seated row on a cable machine. Constant tension for back thickness.', muscles: ['back', 'biceps', 'rear-shoulders'], category: 'Pull' },
  'chest supported row': { description: 'Row with chest supported on an incline bench. Eliminates lower back fatigue.', muscles: ['back', 'rear-shoulders', 'biceps'], category: 'Pull' },
  'pendlay row': { description: 'Dead stop barbell row from the floor. Explosive back builder.', muscles: ['back', 'rear-shoulders', 'biceps'], category: 'Pull' },
  'face pull': { description: 'Pull a rope to your face level to target rear delts and upper back. Great for posture.', muscles: ['rear-shoulders', 'upper-back'], category: 'Pull' },
  'rear delt fly': { description: 'Raise dumbbells to the rear to isolate the posterior deltoid.', muscles: ['rear-shoulders', 'upper-back'], category: 'Pull' },
  'shrug': { description: 'Shrug your shoulders upward with heavy weight to build the traps.', muscles: ['upper-back'], category: 'Pull' },
  'bicep curl': { description: 'Curl a dumbbell or barbell to work the biceps. Classic arm exercise.', muscles: ['biceps'], category: 'Pull' },
  'hammer curl': { description: 'Neutral grip curl that targets the brachialis and brachioradialis along with the bicep.', muscles: ['biceps', 'forearms'], category: 'Pull' },
  'preacher curl': { description: 'Curl on a preacher bench for strict bicep isolation with no cheating.', muscles: ['biceps'], category: 'Pull' },
  'concentration curl': { description: 'Single arm curl braced against your knee. Peak bicep contraction.', muscles: ['biceps'], category: 'Pull' },
  'cable curl': { description: 'Curl with a cable for constant tension on the bicep throughout the movement.', muscles: ['biceps'], category: 'Pull' },
  'incline curl': { description: 'Curl on an incline bench for a longer bicep stretch and better peak.', muscles: ['biceps'], category: 'Pull' },
  'straight bar curl': { description: 'Standard barbell curl for maximum bicep overload.', muscles: ['biceps'], category: 'Pull' },
  'reverse curl': { description: 'Overhand grip curl that targets the brachialis and forearms.', muscles: ['forearms', 'biceps'], category: 'Pull' },
  'seated cable row': { description: 'Seated row using a cable machine for constant back tension.', muscles: ['back', 'biceps', 'rear-shoulders'], category: 'Pull' },

  // LEGS
  'squat': { description: 'The king of all exercises. Bar on your back, squat to parallel or below. Full lower body.', muscles: ['quads', 'glutes', 'hamstrings', 'core'], category: 'Legs' },
  'front squat': { description: 'Barbell held in front of shoulders for more quad emphasis and upright torso.', muscles: ['quads', 'core', 'glutes'], category: 'Legs' },
  'goblet squat': { description: 'Squat holding a dumbbell or kettlebell at chest. Great for beginners and mobility.', muscles: ['quads', 'glutes', 'core'], category: 'Legs' },
  'bulgarian split squat': { description: 'Rear foot elevated split squat. Brutal unilateral quad and glute builder.', muscles: ['quads', 'glutes', 'hamstrings'], category: 'Legs' },
  'leg press': { description: 'Press weight away from you on a sled. Great quad builder with less spinal load.', muscles: ['quads', 'glutes'], category: 'Legs' },
  'hack squat': { description: 'Squat on a fixed angle sled for quad-dominant leg development.', muscles: ['quads', 'glutes'], category: 'Legs' },
  'romanian deadlift': { description: 'Hinge at hips with slight knee bend to stretch and load the hamstrings.', muscles: ['hamstrings', 'glutes', 'lower-back'], category: 'Legs' },
  'stiff leg deadlift': { description: 'Deadlift with minimal knee bend for maximum hamstring stretch.', muscles: ['hamstrings', 'glutes', 'lower-back'], category: 'Legs' },
  'leg curl': { description: 'Curl weight with your legs to isolate the hamstrings on a machine.', muscles: ['hamstrings'], category: 'Legs' },
  'lying leg curl': { description: 'Lying position leg curl for hamstring isolation.', muscles: ['hamstrings'], category: 'Legs' },
  'seated leg curl': { description: 'Seated leg curl for hamstring isolation with constant tension.', muscles: ['hamstrings'], category: 'Legs' },
  'leg extension': { description: 'Extend your legs on a machine to isolate the quadriceps.', muscles: ['quads'], category: 'Legs' },
  'lunge': { description: 'Step forward into a lunge to work quads, glutes and hamstrings unilaterally.', muscles: ['quads', 'glutes', 'hamstrings'], category: 'Legs' },
  'walking lunge': { description: 'Continuous lunge movement for legs and glutes. Great for conditioning too.', muscles: ['quads', 'glutes', 'hamstrings'], category: 'Legs' },
  'calf raise': { description: 'Rise on your toes to work the calves. Often neglected, always needed.', muscles: ['calves'], category: 'Legs' },
  'seated calf raise': { description: 'Calf raise while seated to target the soleus muscle.', muscles: ['calves'], category: 'Legs' },
  'hip thrust': { description: 'Drive your hips upward with a barbell across your lap. Best glute builder.', muscles: ['glutes', 'hamstrings'], category: 'Legs' },
  'glute bridge': { description: 'Bridge your hips off the floor to activate and build the glutes.', muscles: ['glutes', 'hamstrings'], category: 'Legs' },
  'sumo deadlift': { description: 'Wide stance deadlift that shifts emphasis to the inner thighs and glutes.', muscles: ['glutes', 'hamstrings', 'quads', 'back'], category: 'Legs' },
  'step up': { description: 'Step onto a box or bench to build unilateral leg strength and balance.', muscles: ['quads', 'glutes'], category: 'Legs' },

  // FULL BODY / COMPOUND
  'deadlift': { description: 'Pull a loaded barbell from the floor to hip height. Total body strength movement.', muscles: ['back', 'glutes', 'hamstrings', 'quads', 'core'], category: 'Full Body' },
  'power clean': { description: 'Explosive barbell movement from floor to front rack. Full body power.', muscles: ['quads', 'glutes', 'back', 'shoulders', 'core'], category: 'Full Body' },
  'thruster': { description: 'Front squat into overhead press. Total body conditioning movement.', muscles: ['quads', 'glutes', 'shoulders', 'triceps', 'core'], category: 'Full Body' },
  'burpee': { description: 'Drop to the floor and jump back up. Full body conditioning and cardio.', muscles: ['chest', 'quads', 'core', 'shoulders'], category: 'Full Body' },
  'clean and press': { description: 'Pull the bar from floor to shoulders then press overhead. Full body power.', muscles: ['back', 'quads', 'glutes', 'shoulders', 'triceps'], category: 'Full Body' },

  // CORE
  'plank': { description: 'Hold a push-up position on forearms. Core stability staple.', muscles: ['core'], category: 'Cardio' },
  'crunch': { description: 'Curl your upper body toward your knees to target the abs.', muscles: ['core'], category: 'Full Body' },
  'ab rollout': { description: 'Roll a wheel or barbell away from you to fully extend and challenge the core.', muscles: ['core'], category: 'Full Body' },
  'hanging leg raise': { description: 'Hang from a bar and raise your legs to hit the lower abs.', muscles: ['core'], category: 'Full Body' },
  'russian twist': { description: 'Rotate side to side while seated to work the obliques.', muscles: ['core'], category: 'Full Body' },
  'cable crunch': { description: 'Kneel and crunch a cable attachment down to your knees. Loaded ab work.', muscles: ['core'], category: 'Full Body' },
  'sit up': { description: 'Full range crunch that works the entire rectus abdominis.', muscles: ['core'], category: 'Full Body' },

  // CARDIO / MACHINES
  'running': { description: 'Sustained cardiovascular exercise. Build your engine.', muscles: ['quads', 'hamstrings', 'calves', 'core'], category: 'Cardio' },
  'cycling': { description: 'Pedal on a stationary or regular bike for low-impact cardio.', muscles: ['quads', 'hamstrings', 'calves'], category: 'Cardio' },
  'rowing': { description: 'Full body cardio on a rowing machine. Works back, legs and arms.', muscles: ['back', 'quads', 'biceps', 'core'], category: 'Cardio' },
  'jump rope': { description: 'Skip rope for high-intensity cardio and coordination.', muscles: ['calves', 'core', 'shoulders'], category: 'Cardio' },
  'box jump': { description: 'Explosive jump onto a box. Builds power and conditions the legs.', muscles: ['quads', 'glutes', 'calves'], category: 'Cardio' },
  'battle ropes': { description: 'Slam and wave heavy ropes for intense upper body and cardio conditioning.', muscles: ['shoulders', 'core', 'back'], category: 'Cardio' },
  'sled push': { description: 'Drive a weighted sled across the floor. Full body conditioning.', muscles: ['quads', 'glutes', 'core', 'shoulders'], category: 'Cardio' },
  'farmers walk': { description: 'Walk with heavy dumbbells or handles. Full body strength and conditioning.', muscles: ['forearms', 'core', 'quads', 'upper-back'], category: 'Full Body' },
  'stairmaster': { description: 'Climb stairs on a machine for low-impact cardio and glute activation.', muscles: ['glutes', 'quads', 'calves', 'hamstrings'], category: 'Cardio' },
  'treadmill': { description: 'Walk or run on a treadmill for controlled cardiovascular training.', muscles: ['quads', 'hamstrings', 'calves', 'core'], category: 'Cardio' },
}

// Machine prefix support — if someone types "machine bench press" it still maps
export function findExercise(name: string): ExerciseInfo | null {
  const key = name.toLowerCase().trim()
  // Direct match
  if (EXERCISE_DB[key]) return EXERCISE_DB[key]
  // Strip "machine " prefix and try again
  const stripped = key.replace(/^machine\s+/, '')
  if (EXERCISE_DB[stripped]) return EXERCISE_DB[stripped]
  // Partial match
  const match = Object.keys(EXERCISE_DB).find(k => key.includes(k) || k.includes(key))
  if (match) return EXERCISE_DB[match]
  // Partial match after stripping machine prefix
  const strippedMatch = Object.keys(EXERCISE_DB).find(k => stripped.includes(k) || k.includes(stripped))
  return strippedMatch ? EXERCISE_DB[strippedMatch] : null
}

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