import { useEffect, useRef, useCallback, useState } from 'react'
import { uploadData, getUrl } from 'aws-amplify/storage'

export function useCloudSync(userId) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [hasLoaded, setHasLoaded] = useState(false)
    const lastSyncData = useRef('')
    const timeoutRef = useRef(null)

    // Load from cloud on mount
    useEffect(() => {
        if (!userId) return

        const loadFromCloud = async () => {
            try {
                const { url } = await getUrl({ 
                    path: `private/${userId}/meta/app_state.json`,
                    options: { expiresIn: 60 }
                })
                const res = await fetch(url.href)
                if (res.ok) {
                    const data = await res.json()
                    // Restore to localStorage
                    for (const [key, value] of Object.entries(data)) {
                        localStorage.setItem(key, value)
                    }
                    console.log('✅ Cloud state restored to local.')
                    
                    // Dispatch events so hooks refresh!
                    window.dispatchEvent(new Event('studymate_scores_updated'))
                    window.dispatchEvent(new Event('studymate_tasks_updated'))
                }
            } catch (err) {
                console.log('No cloud backup found or error:', err)
            } finally {
                setHasLoaded(true)
            }
        }

        loadFromCloud()
    }, [userId])

    // Save to cloud when localStorage changes (debounced)
    const syncToCloud = useCallback(async () => {
        if (!userId || !hasLoaded) return

        const allData = {}
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('studymate_')) {
                allData[key] = localStorage.getItem(key)
            }
        }

        const currentDataStr = JSON.stringify(allData)
        if (currentDataStr === lastSyncData.current) return // No changes

        setIsSyncing(true)
        try {
            await uploadData({
                path: `private/${userId}/meta/app_state.json`,
                data: new Blob([currentDataStr], { type: 'application/json' }),
                options: { contentType: 'application/json' },
            }).result
            lastSyncData.current = currentDataStr
            console.log('☁️ State synced to cloud.')
        } catch (err) {
            console.error('Failed to sync state:', err)
        } finally {
            setIsSyncing(false)
        }
    }, [userId, hasLoaded])

    // Poll for changes to sync
    useEffect(() => {
        if (!hasLoaded) return

        const interval = setInterval(() => {
            syncToCloud()
        }, 10000) // check every 10s

        // Sync when tabs are closed
        const handleBeforeUnload = () => syncToCloud()
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            clearInterval(interval)
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [syncToCloud, hasLoaded])

    return { isSyncing, hasLoaded }
}
