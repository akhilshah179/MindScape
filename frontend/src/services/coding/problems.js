// Client-side problem definitions for instant loading
// These mirror backend/services/problemsData.js but are used for instant UI rendering

export const DIFFICULTY_COLORS = {
  Easy: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  Medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  Hard: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-400' },
}

export const CATEGORIES = [
  'Array', 'String', 'Tree', 'LinkedList', 'DP',
  'Graph', 'Stack', 'Math', 'Sorting', 'Binary Search',
  'Hash Table', 'Two Pointers', 'Sliding Window', 'Backtracking', 'Matrix'
]

export const LANGUAGES = [
  { id: 'cpp', name: 'C++', icon: '⚙️', monacoLang: 'cpp' },
  { id: 'java', name: 'Java', icon: '☕', monacoLang: 'java' },
  { id: 'python', name: 'Python', icon: '🐍', monacoLang: 'python' },
  { id: 'javascript', name: 'JavaScript', icon: '🟨', monacoLang: 'javascript' },
]

export const VERDICT_STYLES = {
  'Accepted': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: '✓' },
  'Wrong Answer': { bg: 'bg-red-500/10', text: 'text-red-400', icon: '✕' },
  'Time Limit Exceeded': { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: '⏱' },
  'Runtime Error': { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: '💥' },
  'Compilation Error': { bg: 'bg-red-500/10', text: 'text-red-400', icon: '🔧' },
  'Failed': { bg: 'bg-red-500/10', text: 'text-red-400', icon: '✕' },
}
