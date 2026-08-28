// src/hooks/usePersonalization.js
import { useState, useEffect } from 'react';

export function usePersonalization(userId) {
    const [activity, setActivity] = useState({
        lastSubject: null,
        lastActiveDate: null,
        studyStreak: 0
    });

    useEffect(() => {
        // Load from LocalStorage (MVP version)
        const stored = localStorage.getItem(`studymate_prefs_${userId}`);
        if (stored) setActivity(JSON.parse(stored));
    }, [userId]);

    const updateLastSubject = (subjectName) => {
        const updated = {
            ...activity,
            lastSubject: subjectName,
            lastActiveDate: new Date().toISOString()
        };
        setActivity(updated);
        localStorage.setItem(`studymate_prefs_${userId}`, JSON.stringify(updated));
    };

    const getSmartSuggestions = () => {
        if (!activity.lastSubject) return "Start by exploring your first subject!";

        const daysSince = Math.floor((new Date() - new Date(activity.lastActiveDate)) / (1000 * 3600 * 24));

        if (daysSince > 3) {
            return `Ready to catch up? You haven't revised ${activity.lastSubject} in 3 days.`;
        }
        return `Jump back in! Continue where you left off in ${activity.lastSubject}.`;
    };

    return { activity, updateLastSubject, getSmartSuggestions };
}
