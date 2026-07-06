import { DIFFICULTY_COLORS } from '../../services/coding/problems'
import { useNavigate } from 'react-router-dom'

export default function ProblemCard({ problem, solved }) {
  const navigate = useNavigate()
  const diff = DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS.Easy

  return (
    <button
      onClick={() => navigate(`/coding/problem/${problem.id}`)}
      className="w-full group text-left bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-indigo-500/30
        rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Solved indicator */}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]
            ${solved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/[0.04] text-white/20'}`}>
            {solved ? '✓' : ''}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-white/90 group-hover:text-white truncate transition-colors">
              {problem.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-white/25 px-1.5 py-0.5 bg-white/[0.03] rounded">
                {problem.category}
              </span>
            </div>
          </div>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${diff.bg} ${diff.text} border ${diff.border}`}>
          {problem.difficulty}
        </span>
      </div>
    </button>
  )
}
