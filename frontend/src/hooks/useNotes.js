import { useState, useEffect } from 'react'

export function useNotes(fileId) {
    const [notes, setNotes] = useState([])

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem(`studymate_notes_${fileId}`)) || []
        setNotes(saved)
    }, [fileId])

    const addNote = (text) => {
        const updated = [...notes, { text, date: new Date().toISOString() }]
        setNotes(updated)
        localStorage.setItem(`studymate_notes_${fileId}`, JSON.stringify(updated))
    }

    return { notes, addNote }
}