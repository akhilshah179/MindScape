import { useState, useEffect, useRef } from 'react'

// ─── Pomodoro Timer ──────────────────────────────────────────────────────────
function PomodoroTimer() {
    const FOCUS_TIME = 25 * 60
    const BREAK_TIME = 5 * 60

    const [mode, setMode] = useState('focus') // 'focus' | 'break'
    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME)
    const [isActive, setIsActive] = useState(false)
    const [sessionsCompleted, setSessionsCompleted] = useState(0)
    
    // For local analytics
    const [totalDeepWork, setTotalDeepWork] = useState(parseInt(localStorage.getItem('studymate_deepwork') || '0', 10))

    useEffect(() => {
        let interval = null
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1)
            }, 1000)
        } else if (timeLeft === 0) {
            // Timer complete
            setIsActive(false)
            if (mode === 'focus') {
                const newTotal = totalDeepWork + 25
                setTotalDeepWork(newTotal)
                localStorage.setItem('studymate_deepwork', newTotal.toString())
                setSessionsCompleted(s => s + 1)
                setMode('break')
                setTimeLeft(BREAK_TIME)
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}) // gentle chime
                alert("Focus session complete! Time for a 5-minute break.")
            } else {
                setMode('focus')
                setTimeLeft(FOCUS_TIME)
                alert("Break is over! Time to focus.")
            }
        }
        return () => clearInterval(interval)
    }, [isActive, timeLeft, mode, totalDeepWork])

    const toggleTimer = () => setIsActive(!isActive)
    const resetTimer = () => {
        setIsActive(false)
        setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME)
    }

    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0')
    const secs = (timeLeft % 60).toString().padStart(2, '0')

    const p = ((mode === 'focus' ? FOCUS_TIME : BREAK_TIME) - timeLeft) / (mode === 'focus' ? FOCUS_TIME : BREAK_TIME) * 100

    return (
        <div className="bg-white dark:bg-[#06060a] rounded-lg p-6 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col h-[600px] font-sans">
            <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">Session Timer</h3>
            <p className="text-slate-500 dark:text-white/60 text-xs mb-8">Maintain focus intervals for deep work</p>
            
            <div className="flex justify-center gap-2 mb-8">
                <button onClick={() => { setMode('focus'); setIsActive(false); setTimeLeft(FOCUS_TIME) }}
                    className={`px-5 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${mode === 'focus' ? 'bg-slate-800 dark:bg-violet-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                    Focus (25m)
                </button>
                <button onClick={() => { setMode('break'); setIsActive(false); setTimeLeft(BREAK_TIME) }}
                    className={`px-5 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${mode === 'break' ? 'bg-slate-400 dark:bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                    Break (5m)
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 flex items-center justify-center mb-10">
                    <svg className="w-full h-full absolute transform -rotate-90">
                        <circle cx="96" cy="96" r="88" className="stroke-slate-100 dark:stroke-white/5" strokeWidth="4" fill="none" />
                        <circle cx="96" cy="96" r="88" className={`transition-all duration-1000 ease-linear ${mode === 'focus' ? 'stroke-slate-800 dark:stroke-violet-500' : 'stroke-slate-400 dark:stroke-emerald-500'}`} 
                            strokeWidth="4" fill="none" strokeLinecap="round"
                            style={{ strokeDasharray: 2 * Math.PI * 88, strokeDashoffset: (2 * Math.PI * 88) * (1 - p / 100) }} />
                    </svg>
                    <div className="text-center z-10 flex flex-col items-center">
                        <div className="text-5xl font-semibold text-slate-900 dark:text-white tracking-tighter tabular-nums">{mins}:{secs}</div>
                        <div className="text-[10px] font-medium mt-1 tracking-widest text-slate-400 dark:text-white/50 uppercase">{mode === 'focus' ? 'Focusing' : 'Resting'}</div>
                    </div>
                </div>

                <div className="flex gap-3 w-full max-w-[240px]">
                    <button onClick={toggleTimer} className={`flex-1 py-3 rounded text-white font-medium text-sm shadow-sm transition-colors ${isActive ? 'bg-slate-500 hover:bg-slate-600' : 'bg-slate-900 dark:bg-violet-600 hover:bg-black dark:hover:bg-violet-500'}`}>
                        {isActive ? 'Pause' : 'Start Timer'}
                    </button>
                    <button onClick={resetTimer} className="w-12 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/80 rounded transition flex items-center justify-center font-bold" aria-label="Reset Timer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </button>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/10 pt-6">
                <div className="text-center">
                    <p className="text-xl font-semibold text-slate-800 dark:text-white/90 leading-none">{sessionsCompleted}</p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-widest mt-1.5">Sessions</p>
                </div>
                <div className="text-center">
                    <p className="text-xl font-semibold text-slate-800 dark:text-white/90 leading-none">{totalDeepWork}m</p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-white/50 uppercase tracking-widest mt-1.5">Total Focus</p>
                </div>
            </div>
        </div>
    )
}

// ─── Task Kanban Board ────────────────────────────────────────────────────────
function KanbanBoard() {
    const [tasks, setTasks] = useState(() => {
        try { return JSON.parse(localStorage.getItem('studymate_tasks') || '[]') } 
        catch { return [] }
    })
    const [newTask, setNewTask] = useState('')

    useEffect(() => {
        localStorage.setItem('studymate_tasks', JSON.stringify(tasks))
    }, [tasks])

    const addTask = (e) => {
        e.preventDefault()
        if (!newTask.trim()) return
        setTasks(prev => [...prev, { id: Date.now().toString(), text: newTask.trim(), status: 'todo' }])
        setNewTask('')
    }

    const moveTask = (id, newStatus) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    }

    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id))
    }

    const columns = [
        { id: 'todo', title: 'To Do', color: 'bg-slate-50 dark:bg-white/5' },
        { id: 'progress', title: 'In Progress', color: 'bg-slate-50 dark:bg-white/5' },
        { id: 'done', title: 'Completed', color: 'bg-slate-50 dark:bg-white/5' }
    ]

    return (
        <div className="bg-white dark:bg-[#06060a] rounded-lg p-6 border border-slate-200 dark:border-white/10 shadow-sm col-span-2 flex flex-col h-[600px]">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                    <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">Task Management</h3>
                    <p className="text-slate-500 dark:text-white/60 text-xs">Organize and track your active coursework</p>
                </div>
                <form onSubmit={addTask} className="flex gap-2 w-80">
                    <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)}
                        placeholder="Log a new task..." className="flex-1 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-slate-800 dark:focus:border-violet-500 dark:text-white transition-colors" />
                    <button type="submit" disabled={!newTask.trim()} className="bg-slate-900 dark:bg-violet-600 hover:bg-black dark:hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors">Add</button>
                </form>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-5 min-h-0">
                {columns.map(col => (
                    <div key={col.id} className={`${col.color} border border-slate-200 dark:border-white/10 rounded p-4 flex flex-col h-full`}>
                        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
                            <h4 className="text-slate-700 dark:text-white/80 font-semibold text-xs tracking-wider uppercase">{col.title}</h4>
                            <span className="bg-white dark:bg-[#06060a] px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/10">{tasks.filter(t => t.status === col.id).length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2.5 pb-2 pr-1">
                            {tasks.filter(t => t.status === col.id).map(t => (
                                <div key={t.id} className="bg-white dark:bg-[#06060a] p-3.5 rounded border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/30 transition-colors group flex flex-col">
                                    <p className={`text-sm font-medium mb-4 leading-snug ${col.id === 'done' ? 'text-slate-400 dark:text-white/40 line-through' : 'text-slate-800 dark:text-white/90'}`}>{t.text}</p>
                                    <div className="flex justify-between items-center mt-auto">
                                        <button onClick={() => deleteTask(t.id)} className="text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-red-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                                        <div className="flex gap-1 ml-auto">
                                            {col.id !== 'todo' && <button onClick={() => moveTask(t.id, col.id === 'done' ? 'progress' : 'todo')} className="w-7 h-7 rounded bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/80 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors" aria-label="Move left">←</button>}
                                            {col.id !== 'done' && <button onClick={() => moveTask(t.id, col.id === 'todo' ? 'progress' : 'done')} className="w-7 h-7 rounded bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/80 flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors" aria-label="Move right">→</button>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tasks.filter(t => t.status === col.id).length === 0 && (
                                <div className="h-20 border border-dashed border-slate-200 dark:border-white/10 rounded flex items-center justify-center text-slate-400 dark:text-white/40 text-xs">
                                    No tasks here
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Main Productivity Dashboard ──────────────────────────────────────────────
export default function ProductivityDashboard() {
    return (
        <div className="animate-fade-in max-w-6xl mx-auto pb-8 font-sans">
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Productivity</h2>
                <p className="text-slate-500 dark:text-white/60 text-sm mt-1">Manage your tasks and track focused sessions gracefully.</p>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 1 Column for Pomodoro */}
                <PomodoroTimer />
                
                {/* 2 Columns for Kanban */}
                <KanbanBoard />
            </div>
        </div>
    )
}

