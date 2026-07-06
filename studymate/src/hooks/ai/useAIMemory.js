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
        if (!userId) return
        try {
            await chatApi.setMemoryItem(userId, key, value)
            // Optimistic update
            setMemories(prev => {
                const existing = prev.findIndex(m => m.memoryKey === key)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = { ...updated[existing], value, source: 'manual', updatedAt: new Date().toISOString() }
                    return updated
                }
                return [...prev, { userId, memoryKey: key, value, source: 'manual', updatedAt: new Date().toISOString() }]
            })
        } catch (err) {
            console.error('Failed to set memory:', err)
        }
    }, [userId])

    const deleteMemoryItem = useCallback(async (key) => {
        if (!userId) return
        try {
            await chatApi.deleteMemoryItem(userId, key)
            setMemories(prev => prev.filter(m => m.memoryKey !== key))
        } catch (err) {
            console.error('Failed to delete memory:', err)
        }
    }, [userId])

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
