import { useCallback, useEffect, useState } from 'react'
import * as chatApi from '../../services/ai/chatApi'

// Must match the backend's normalizeMemoryKey
const norm = (k) => String(k || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60)

export function useAIMemory({ onError } = {}) {
  const [memories, setMemories] = useState([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try { setMemories(await chatApi.getMemory()) }
    catch (err) { onError?.(`Couldn't load memory: ${err.message}`) }
    finally { setLoaded(true) }
  }, [onError])

  useEffect(() => { load() }, [load])

  const setMemoryItem = useCallback(async (key, value) => {
    const memoryKey = norm(key)
    if (!memoryKey) return
    const item = { memoryKey, value: String(value).trim(), source: 'manual', updatedAt: new Date().toISOString() }
    setMemories(prev => [item, ...prev.filter(m => m.memoryKey !== memoryKey)])
    try { await chatApi.setMemoryItem(null, key, value) } catch (err) { onError?.(err.message); load() }
  }, [load, onError])

  const deleteMemoryItem = useCallback(async (key) => {
    setMemories(prev => prev.filter(m => m.memoryKey !== key))
    try { await chatApi.deleteMemoryItem(null, key) } catch (err) { onError?.(err.message); load() }
  }, [load, onError])

  const clearAll = useCallback(async () => {
    const before = memories
    setMemories([])
    try { await chatApi.clearAllMemory() } catch (err) { setMemories(before); onError?.(err.message) }
  }, [memories, onError])

  return { memories, loaded, setMemoryItem, deleteMemoryItem, clearAll, refresh: load }
}
