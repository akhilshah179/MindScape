import { useState } from 'react'
import { useProblems } from '../../hooks/coding/useProblems'
import ProblemCard from '../../components/coding/ProblemCard'
import { CATEGORIES } from '../../services/coding/problems'

export default function ProblemsPage() {
  const { problems, loading, filters, setFilters } = useProblems()
  const [searchInput, setSearchInput] = useState('')

  const handleSearch = (val) => {
    setSearchInput(val)
    setFilters(prev => ({ ...prev, search: val }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Problems</h1>
        <p className="text-sm text-white/30">Practice DSA problems across all difficulty levels</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-sm">🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search problems..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white/80 placeholder-white/20
              focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1.5">
          {['All', 'Easy', 'Medium', 'Hard'].map(d => (
            <button
              key={d}
              onClick={() => setFilters(prev => ({ ...prev, difficulty: d === 'All' ? '' : d }))}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border
                ${(d === 'All' && !filters.difficulty) || filters.difficulty === d
                  ? d === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : d === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : d === 'Hard' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-white/[0.02] text-white/30 border-white/[0.06] hover:bg-white/[0.05]'}`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white/50
            focus:outline-none focus:border-indigo-500/30 appearance-none cursor-pointer"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Problem count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/20">{problems.length} problem{problems.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Problem list */}
      {!loading && (
        <div className="space-y-2">
          {problems.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <span className="text-3xl block mb-3">🔎</span>
              <p className="text-sm">No problems found</p>
              <p className="text-xs mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            problems.map(p => <ProblemCard key={p.id} problem={p} />)
          )}
        </div>
      )}
    </div>
  )
}
