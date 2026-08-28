import { useMemo } from 'react'
import { useQuizScores } from './useStudyTracker'

export function useRecommendations() {
    const { scores, weakTopics } = useQuizScores()

    const recommendations = useMemo(() => {
        if (!scores.length) {
            return ["Start by uploading a PDF and taking your first quiz."]
        }

        const recs = []

        // Weak topics
        if (weakTopics.length > 0) {
            recs.push(`Revise: ${weakTopics[0].topic}`)
        }

        // Low score subjects
        const avgBySubject = {}
        scores.forEach(s => {
            if (!avgBySubject[s.subjectName]) avgBySubject[s.subjectName] = []
            avgBySubject[s.subjectName].push(s.pct)
        })

        Object.entries(avgBySubject).forEach(([subject, arr]) => {
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length
            if (avg < 60) {
                recs.push(`Focus on ${subject} (avg ${Math.round(avg)}%)`)
            }
        })

        return recs.slice(0, 3)
    }, [scores, weakTopics])

    return { recommendations }
}