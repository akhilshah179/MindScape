// useStudyTracker.js
// Central hook for all study analytics stored in localStorage.
// Data shape:
//   studymate_streak   : { lastDate: 'YYYY-MM-DD', count: N, longestStreak: N }
//   studymate_sessions : [{ date, durationSeconds, subjectName }]
//   studymate_scores   : [{ id, date, subjectName, fileName, score, total, pct, wrongTopics: [string] }]

import { useState, useEffect, useRef, useCallback } from 'react'

const KEYS = {
    streak: 'studymate_streak',
    sessions: 'studymate_sessions',
    scores: 'studymate_scores',
}

function today() {
    return new Date().toISOString().slice(0, 10)
}

function load(key, fallback) {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
}

function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { }
}

// ── Streak ────────────────────────────────────────────────────────────────────
export function useStreak() {
    const [streak, setStreak] = useState(() => load(KEYS.streak, { lastDate: null, count: 0, longestStreak: 0 }))

    // Call once on login / app load to tick the streak
    const tickStreak = useCallback(() => {
        setStreak(prev => {
            const t = today()
            if (prev.lastDate === t) return prev           // already ticked today

            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yStr = yesterday.toISOString().slice(0, 10)

            const newCount = prev.lastDate === yStr ? prev.count + 1 : 1
            const newLongest = Math.max(newCount, prev.longestStreak || 0)
            const next = { lastDate: t, count: newCount, longestStreak: newLongest }
            save(KEYS.streak, next)
            return next
        })
    }, [])

    return { streak, tickStreak }
}

// ── Session timer ─────────────────────────────────────────────────────────────
export function useSessionTimer(subjectName) {
    const startRef = useRef(Date.now())
    const activeRef = useRef(true)

    // Pause when tab hidden
    useEffect(() => {
        const onVisibility = () => { activeRef.current = !document.hidden }
        document.addEventListener('visibilitychange', onVisibility)
        return () => document.removeEventListener('visibilitychange', onVisibility)
    }, [])

    // Save session on unmount
    useEffect(() => {
        return () => {
            const seconds = Math.round((Date.now() - startRef.current) / 1000)
            if (seconds < 10) return                       // ignore accidental opens
            const sessions = load(KEYS.sessions, [])
            sessions.push({ date: today(), durationSeconds: seconds, subjectName: subjectName || 'General' })
            // Keep last 90 days only
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90)
            const kept = sessions.filter(s => new Date(s.date) >= cutoff)
            save(KEYS.sessions, kept)
        }
    }, [subjectName])
}

// ── Quiz scores ───────────────────────────────────────────────────────────────
export function saveQuizScore({ subjectName, fileName, score, total, questions, answers }) {
    const wrongTopics = (questions || [])
        .filter((_, i) => !answers[i]?.correct)
        .map(q => q.question?.slice(0, 80) || '')               // store first 80 chars of wrong Qs

    const entry = {
        id: Date.now(),
        date: today(),
        subjectName: subjectName || 'General',
        fileName: fileName || 'document.pdf',
        score: score || 0,
        total: total || 5,
        pct: Math.round(((score || 0) / (total || 5)) * 100),
        wrongTopics,
    }

    const scores = load(KEYS.scores, [])
    scores.push(entry)
    save(KEYS.scores, scores)
    window.dispatchEvent(new Event('studymate_scores_updated'))
    return entry
}

export function useQuizScores(userId = null) {
    const [scores, setScores] = useState(() => load(KEYS.scores, []))
    const [isLoading, setIsLoading] = useState(false)

    const refresh = useCallback(async () => {
        const local = load(KEYS.scores, [])
        setScores(local)

        // Asynchronously synchronize with backend database
        try {
            const { getUserQuizScores } = await import('../services/fileApi')
            const dbScores = await getUserQuizScores(userId)
            if (Array.isArray(dbScores) && dbScores.length > 0) {
                // Merge unique scores by timestamp / id
                const merged = [...dbScores]
                for (const l of local) {
                    if (!merged.some(m => m.id === l.id || (m.timestamp && l.timestamp && m.timestamp === l.timestamp))) {
                        merged.push(l)
                    }
                }
                merged.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0))
                save(KEYS.scores, merged)
                setScores(merged)
            }
        } catch (_) {}
    }, [userId])

    useEffect(() => {
        refresh()
        window.addEventListener('studymate_scores_updated', refresh)
        return () => window.removeEventListener('studymate_scores_updated', refresh)
    }, [refresh])

    // Per-subject aggregates
    const bySubject = scores.reduce((acc, s) => {
        const subj = s.subjectName || 'General'
        if (!acc[subj]) acc[subj] = []
        acc[subj].push(s)
        return acc
    }, {})

    // Weak topics = questions missed >= 1 time
    const weakTopics = Object.entries(
        scores.flatMap(s => s.wrongTopics || []).reduce((acc, t) => {
            if (t) acc[t] = (acc[t] || 0) + 1
            return acc
        }, {})
    )
        .filter(([, count]) => count >= 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([topic, count]) => ({ topic, count }))

    return { scores, bySubject, weakTopics, refresh, isLoading }
}

// ── Sessions analytics ────────────────────────────────────────────────────────
export function useSessions() {
    const [sessions] = useState(() => load(KEYS.sessions, []))

    const totalMinutes = Math.round(
        sessions.reduce((a, s) => a + s.durationSeconds, 0) / 60
    )

    // Last 7 days
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().slice(0, 10)
        const mins = sessions
            .filter(s => s.date === dateStr)
            .reduce((a, s) => a + Math.round(s.durationSeconds / 60), 0)
        return { date: dateStr, label: d.toLocaleDateString('en', { weekday: 'short' }), mins }
    })

    return { sessions, totalMinutes, last7 }
}
export function getRevisionPlan(weakTopics) {
    const now = new Date()

    return weakTopics.map((w, i) => {
        const days = [1, 3, 7][i % 3]
        const nextDate = new Date(now)
        nextDate.setDate(now.getDate() + days)

        return {
            topic: w.topic,
            reviseOn: nextDate.toDateString(),
        }
    })
}