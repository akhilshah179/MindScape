import BadgeCard from './BadgeCard'

export default function GamificationPanel({ profile = {} }) {
  const { xp = 0, level = 0, badges = [], allBadges = [] } = profile
  const nextLevelXP = profile.nextLevelXP || Math.pow(level + 1, 2) * 100
  const currentLevelXP = Math.pow(level, 2) * 100
  const progress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 0

  const earnedIds = new Set((badges || []).map(b => typeof b === 'string' ? b : b.id))

  return (
    <div className="space-y-4">
      {/* Level & XP */}
      <div className="bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-violet-500/5 rounded-xl p-5 border border-violet-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/20">
              {level}
            </div>
            <div>
              <p className="text-sm font-bold text-white/80">Level {level}</p>
              <p className="text-[10px] text-white/30">{xp} XP total</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-violet-400 font-semibold">{Math.max(0, nextLevelXP - xp)} XP</p>
            <p className="text-[10px] text-white/20">to next level</p>
          </div>
        </div>

        <div className="w-full h-3 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out relative"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>
        <p className="text-[9px] text-white/20 mt-1.5 text-center">{Math.round(progress)}% to Level {level + 1}</p>
      </div>

      {/* Badges Grid */}
      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white/80">Achievements</h3>
          <span className="text-[10px] text-white/25 px-2 py-0.5 bg-white/[0.04] rounded-md">
            {earnedIds.size}/{allBadges.length || 15}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(allBadges.length > 0 ? allBadges : DEFAULT_BADGES).map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              earned={earnedIds.has(badge.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const DEFAULT_BADGES = [
  { id: 'first-blood', name: 'First Blood', description: 'Solve your first problem', icon: '🗡️' },
  { id: 'ten-down', name: 'Ten Down', description: 'Solve 10 problems', icon: '🔟' },
  { id: 'half-century', name: 'Half Century', description: 'Solve 50 problems', icon: '🏏' },
  { id: 'centurion', name: 'Centurion', description: 'Solve 100 problems', icon: '💯' },
  { id: 'easy-master', name: 'Easy Master', description: 'Solve all Easy problems', icon: '🟢' },
  { id: 'medium-master', name: 'Medium Master', description: 'Solve all Medium problems', icon: '🟡' },
  { id: 'hard-master', name: 'Hard Master', description: 'Solve all Hard problems', icon: '🔴' },
  { id: 'streak-3', name: 'On Fire', description: '3 day streak', icon: '🔥' },
  { id: 'streak-7', name: 'Week Warrior', description: '7 day streak', icon: '⚡' },
  { id: 'streak-30', name: 'Monthly Monster', description: '30 day streak', icon: '👑' },
  { id: 'polyglot', name: 'Polyglot', description: 'Use all 4 languages', icon: '🌐' },
  { id: 'speed-demon', name: 'Speed Demon', description: 'Solve in under 5 min', icon: '⏱️' },
  { id: 'contest-warrior', name: 'Contest Warrior', description: 'Join 5 contests', icon: '🏆' },
  { id: 'bug-hunter', name: 'Bug Hunter', description: 'Use debugger 10 times', icon: '🐛' },
  { id: 'level-10', name: 'Deca Level', description: 'Reach Level 10', icon: '🌟' },
]
