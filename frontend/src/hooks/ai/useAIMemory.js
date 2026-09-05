import { useState, useCallback, useEffect } from 'react'
import * as chatApi from '../../services/ai/chatApi'

/**
 * Hook for managing AI memory — user preferences, goals, learning context.
 */
export function useAIMemory(userId) {
    const [memories, setMemories] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)

    // Load memory on mount
    useEffect(() => {
        if (!userId) return
        loadMemory()
    }, [userId])

    const loadMemory = useCallback(async () => {
        if (!userId) return
        setIsLoading(true)
        try {
            const data = await chatApi.getMemory(userId)
            setMemories(data)
        } catch (err) {
            console.error('Failed to load memory:', err)
        } finally {
            setIsLoading(false)
            setLoaded(true)
        }
    }, [userId])

    const setMemoryItem = useCallback(async (key, value) => {
        if (!userId || !key) return
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_')
        const trimmedVal = String(value).trim()

        // Optimistic update
        setMemories(prev => {
            const existing = prev.findIndex(m => m.memoryKey === normalizedKey)
            if (existing >= 0) {
                const updated = [...prev]
                updated[existing] = { ...updated[existing], value: trimmedVal, source: 'manual', updatedAt: new Date().toISOString() }
                return updated
            }
            return [...prev, { userId, memoryKey: normalizedKey, value: trimmedVal, source: 'manual', updatedAt: new Date().toISOString() }]
        })

        try {
            await chatApi.setMemoryItem(userId, normalizedKey, trimmedVal)
        } catch (err) {
            console.error('Failed to set memory:', err)
            loadMemory()
        }
    }, [userId, loadMemory])

    const deleteMemoryItem = useCallback(async (key) => {
        if (!userId || !key) return
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_')

        // Optimistic update
        setMemories(prev => prev.filter(m => m.memoryKey !== normalizedKey && m.memoryKey !== key))

        try {
            await chatApi.deleteMemoryItem(userId, normalizedKey)
        } catch (err) {
            console.error('Failed to delete memory:', err)
            loadMemory()
        }
    }, [userId, loadMemory])

    const clearAll = useCallback(async () => {
        if (!userId) return
        try {
            await chatApi.clearAllMemory(userId)
            setMemories([])
        } catch (err) {
            console.error('Failed to clear memory:', err)
        }
    }, [userId])

    return {
        memories,
        isLoading,
        loaded,
        setMemoryItem,
        deleteMemoryItem,
        clearAll,
        refresh: loadMemory,
    }
}
