'use client'

interface BodyMapProps {
  muscles: string[]
}

function isActive(muscles: string[], ...targets: string[]) {
  return targets.some(t => muscles.includes(t))
}

export default function BodyMap({ muscles }: BodyMapProps) {
  const active = '#E8272A'
  const inactive = '#2e2e2e'
  const skin = '#3a3a3a'

  const c = (targets: string[]) => isActive(muscles, ...targets) ? active : inactive
  const s = (targets: string[]) => isActive(muscles, ...targets) ? active : skin

  return (
    <div className="flex gap-4 justify-center py-2">
      {/* Front */}
      <div className="text-center">
        <p className="text-xs text-muted mb-1 uppercase tracking-widest">Front</p>
        <svg viewBox="0 0 80 160" width="80" height="160" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="40" cy="14" rx="10" ry="12" fill={skin} />
          {/* Neck */}
          <rect x="36" y="24" width="8" height="6" fill={skin} />
          {/* Upper chest */}
          <path d="M24 30 Q40 28 56 30 L56 42 Q40 44 24 42 Z" fill={s(['chest','upper-chest'])} opacity="0.9"/>
          {/* Lower chest */}
          <path d="M24 42 Q40 44 56 42 L54 52 Q40 54 26 52 Z" fill={s(['chest'])} opacity="0.8"/>
          {/* Left shoulder */}
          <ellipse cx="18" cy="35" rx="8" ry="6" fill={s(['shoulders','front-shoulders','side-shoulders'])} />
          {/* Right shoulder */}
          <ellipse cx="62" cy="35" rx="8" ry="6" fill={s(['shoulders','front-shoulders','side-shoulders'])} />
          {/* Left bicep */}
          <rect x="10" y="42" width="10" height="22" rx="5" fill={s(['biceps'])} />
          {/* Right bicep */}
          <rect x="60" y="42" width="10" height="22" rx="5" fill={s(['biceps'])} />
          {/* Left forearm */}
          <rect x="9" y="65" width="9" height="18" rx="4" fill={s(['forearms'])} />
          {/* Right forearm */}
          <rect x="62" y="65" width="9" height="18" rx="4" fill={s(['forearms'])} />
          {/* Core/abs */}
          <rect x="28" y="52" width="10" height="8" rx="2" fill={c(['core'])} opacity="0.9" />
          <rect x="42" y="52" width="10" height="8" rx="2" fill={c(['core'])} opacity="0.9" />
          <rect x="28" y="62" width="10" height="8" rx="2" fill={c(['core'])} opacity="0.9" />
          <rect x="42" y="62" width="10" height="8" rx="2" fill={c(['core'])} opacity="0.9" />
          <rect x="28" y="72" width="10" height="7" rx="2" fill={c(['core'])} opacity="0.9" />
          <rect x="42" y="72" width="10" height="7" rx="2" fill={c(['core'])} opacity="0.9" />
          {/* Hips */}
          <path d="M26 80 Q40 82 54 80 L56 94 Q40 96 24 94 Z" fill={s(['glutes'])} opacity="0.6"/>
          {/* Left quad */}
          <rect x="26" y="94" width="13" height="32" rx="6" fill={s(['quads'])} />
          {/* Right quad */}
          <rect x="41" y="94" width="13" height="32" rx="6" fill={s(['quads'])} />
          {/* Left knee */}
          <ellipse cx="32" cy="128" rx="7" ry="4" fill={skin} />
          {/* Right knee */}
          <ellipse cx="48" cy="128" rx="7" ry="4" fill={skin} />
          {/* Left calf */}
          <rect x="27" y="132" width="11" height="22" rx="5" fill={s(['calves'])} />
          {/* Right calf */}
          <rect x="42" y="132" width="11" height="22" rx="5" fill={s(['calves'])} />
        </svg>
      </div>

      {/* Back */}
      <div className="text-center">
        <p className="text-xs text-muted mb-1 uppercase tracking-widest">Back</p>
        <svg viewBox="0 0 80 160" width="80" height="160" xmlns="http://www.w3.org/2000/svg">
          {/* Head */}
          <ellipse cx="40" cy="14" rx="10" ry="12" fill={skin} />
          {/* Neck */}
          <rect x="36" y="24" width="8" height="6" fill={skin} />
          {/* Traps/upper back */}
          <path d="M24 30 Q40 26 56 30 L58 44 Q40 40 22 44 Z" fill={s(['back','upper-back'])} opacity="0.9"/>
          {/* Lats */}
          <path d="M22 44 L18 64 L28 72 L40 70 L52 72 L62 64 L58 44 Q40 40 22 44Z" fill={s(['lats','back'])} opacity="0.85"/>
          {/* Rear delts */}
          <ellipse cx="18" cy="36" rx="8" ry="6" fill={s(['rear-shoulders','shoulders'])} />
          <ellipse cx="62" cy="36" rx="8" ry="6" fill={s(['rear-shoulders','shoulders'])} />
          {/* Triceps */}
          <rect x="10" y="42" width="10" height="22" rx="5" fill={s(['triceps'])} />
          <rect x="60" y="42" width="10" height="22" rx="5" fill={s(['triceps'])} />
          {/* Forearms */}
          <rect x="9" y="65" width="9" height="18" rx="4" fill={s(['forearms'])} />
          <rect x="62" y="65" width="9" height="18" rx="4" fill={s(['forearms'])} />
          {/* Lower back */}
          <rect x="28" y="70" width="24" height="14" rx="3" fill={c(['lower-back'])} opacity="0.85"/>
          {/* Glutes */}
          <path d="M26 84 Q40 88 54 84 L56 100 Q40 104 24 100 Z" fill={s(['glutes'])} opacity="0.9"/>
          {/* Hamstrings */}
          <rect x="26" y="100" width="13" height="30" rx="6" fill={s(['hamstrings'])} />
          <rect x="41" y="100" width="13" height="30" rx="6" fill={s(['hamstrings'])} />
          {/* Knees */}
          <ellipse cx="32" cy="132" rx="7" ry="4" fill={skin} />
          <ellipse cx="48" cy="132" rx="7" ry="4" fill={skin} />
          {/* Calves */}
          <rect x="27" y="136" width="11" height="18" rx="5" fill={s(['calves'])} />
          <rect x="42" y="136" width="11" height="18" rx="5" fill={s(['calves'])} />
        </svg>
      </div>
    </div>
  )
}
