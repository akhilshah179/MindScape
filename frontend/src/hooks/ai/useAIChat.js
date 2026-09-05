import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as chatApi from '../../services/ai/chatApi'

/**
 * High-performance hook for managing AI chat state.
 * Features:
 * - In-memory conversation caching (instant switching)
 * - Race-condition immunity with request sequencing
 * - Instant 0ms "New Chat" initialization
 * - Optimistic message delivery with reliable error fallbacks
 */
export function useAIChat(userId) {
    const navigate = useNavigate()
    const { chatId: urlChatId } = useParams()

    const [chats, setChats] = useState([])
    const [messages, setMessages] = useState([])
    const [activeChatId, setActiveChatId] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [chatsLoaded, setChatsLoaded] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState(null)

    // Cache: Map<chatId, Message[]>
    const messagesCacheRef = useRef(new Map())
    // Active request tracker to prevent race conditions on fast switching
    const activeReqIdRef = useRef(0)

    // ── Load chats on mount / user change ─────────────────────────────────────
    useEffect(() => {
        if (!userId) return
        loadChats()
    }, [userId])

    // ── Sync with URL param ───────────────────────────────────────────────────
    useEffect(() => {
        if (urlChatId && urlChatId !== activeChatId) {
            selectChat(urlChatId)
        } else if (!urlChatId) {
            setActiveChatId(null)
            setMessages([])
        }
    }, [urlChatId])

    // ── Load all chats ────────────────────────────────────────────────────────
    const loadChats = useCallback(async () => {
        if (!userId) return
        try {
            const data = await chatApi.getUserChats(userId)
            setChats(data || [])
        } catch (err) {
            console.error('Failed to load chats:', err)
            setChats([])
        } finally {
            setChatsLoaded(true)
        }
    }, [userId])

    // ── Select a chat with instant cache & race-condition protection ───────────
    const selectChat = useCallback(async (chatId) => {
        if (!chatId) return
        setActiveChatId(chatId)

        // 1. Instant cache hit: render immediately (0ms delay)
        const cached = messagesCacheRef.current.get(chatId)
        if (cached && cached.length > 0) {
            setMessages(cached)
            setIsLoading(false)
        } else {
            setMessages([])
            setIsLoading(true)
        }

        // 2. Fetch latest messages with request sequencing to prevent race conditions
        const currentReqId = ++activeReqIdRef.current
        try {
            const msgs = await chatApi.getChatMessages(chatId, userId)
            // Only apply if this request is still the active one
            if (currentReqId === activeReqIdRef.current) {
                setMessages(msgs || [])
                messagesCacheRef.current.set(chatId, msgs || [])
            }
        } catch (err) {
            console.error('Failed to load messages:', err)
            if (currentReqId === activeReqIdRef.current && !cached) {
                setMessages([])
            }
        } finally {
            if (currentReqId === activeReqIdRef.current) {
                setIsLoading(false)
            }
        }
    }, [userId])

    // ── Instant "New Chat" (0ms UI transition, no dummy DB writes) ────────────
    const startNewChat = useCallback(() => {
        setActiveChatId(null)
        setMessages([])
        navigate('/ai')
    }, [navigate])

    // ── Explicit createChat (when needed) ─────────────────────────────────────
    const createChat = useCallback(async (options = {}) => {
        if (!userId) return null
        try {
            const data = await chatApi.createChat(userId, options)
            const newChat = {
                userId,
                chatId: data.chatId,
                title: data.title || 'New Chat',
                fileId: data.fileId || null,
                fileName: data.fileName || null,
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                messageCount: 0,
                isPinned: false,
                tags: []
            }
            setChats(prev => [newChat, ...prev.filter(c => c.chatId !== data.chatId)])
            setActiveChatId(data.chatId)
            setMessages([])
            messagesCacheRef.current.set(data.chatId, [])
            navigate(`/ai/chat/${data.chatId}`)
            return data.chatId
        } catch (err) {
            console.error('Failed to create chat:', err)
            return null
        }
    }, [userId, navigate])

    // ── Send a message (with instant optimistic updates) ───────────────────────
    const sendMsg = useCallback(async (content, pdfContext = null, fileId = null, fileName = null) => {
        const text = content?.trim()
        if (!text || !userId || isSending) return

        let targetChatId = activeChatId
        let isNewConversation = false

        // If at /ai (no active chat), generate chat ID client-side immediately
        if (!targetChatId) {
            targetChatId = crypto.randomUUID()
            isNewConversation = true
            setActiveChatId(targetChatId)
        }

        const now = new Date().toISOString()
        const tempMsgId = `temp_${Date.now()}_user`

        const tempUserMsg = {
            chatId: targetChatId,
            messageId: tempMsgId,
            userId,
            role: 'user',
            content: text,
            timestamp: now
        }

        // Optimistic UI updates
        setMessages(prev => {
            const next = [...prev, tempUserMsg]
            messagesCacheRef.current.set(targetChatId, next)
            return next
        })
        setIsSending(true)

        // Optimistically add chat to sidebar if new
        if (isNewConversation) {
            const newChatCard = {
                userId,
                chatId: targetChatId,
                title: fileName ? `PDF: ${fileName}` : text.slice(0, 35) + (text.length > 35 ? '...' : ''),
                fileId: fileId || null,
                fileName: fileName || null,
                createdAt: now,
                updatedAt: now,
                messageCount: 1,
                isPinned: false,
                tags: []
            }
            setChats(prev => [newChatCard, ...prev])
            navigate(`/ai/chat/${targetChatId}`, { replace: true })
        }

        try {
            const data = await chatApi.sendMessage(
                targetChatId,
                userId,
                text,
                pdfContext,
                fileId,
                fileName
            )

            const aiMsg = {
                chatId: targetChatId,
                messageId: data.messageId,
                userId,
                role: 'assistant',
                content: data.reply,
                timestamp: data.timestamp || new Date().toISOString()
            }

            // Append assistant response to messages and cache
            setMessages(prev => {
                const next = [...prev, aiMsg]
                messagesCacheRef.current.set(targetChatId, next)
                return next
            })

            // Update chat title and timestamp in sidebar
            setChats(prev => prev.map(c =>
                c.chatId === targetChatId
                    ? {
                        ...c,
                        title: data.title || c.title,
                        updatedAt: data.timestamp || new Date().toISOString(),
                        messageCount: (c.messageCount || 0) + 2,
                        fileId: fileId || c.fileId,
                        fileName: fileName || c.fileName
                    }
                    : c
            ))

            return data.reply
        } catch (err) {
            console.error('Failed to send message:', err)
            const errorText = err.response?.data?.error || err.message || 'Failed to get AI response.'
            const errorMsg = {
                chatId: targetChatId,
                messageId: `error_${Date.now()}`,
                userId,
                role: 'assistant',
                content: `⚠️ ${errorText}. Please try again.`,
                timestamp: new Date().toISOString()
            }
            setMessages(prev => {
                const next = [...prev, errorMsg]
                messagesCacheRef.current.set(targetChatId, next)
                return next
            })
            return null
        } finally {
            setIsSending(false)
        }
    }, [activeChatId, userId, isSending, navigate])

    // ── Rename a chat ─────────────────────────────────────────────────────────
    const renameChatFn = useCallback(async (chatId, title) => {
        if (!userId || !title.trim()) return
        const trimmed = title.trim()
        // Optimistic rename
        setChats(prev => prev.map(c =>
            c.chatId === chatId ? { ...c, title: trimmed, updatedAt: new Date().toISOString() } : c
        ))
        try {
            await chatApi.renameChat(userId, chatId, trimmed)
        } catch (err) {
            console.error('Failed to rename chat:', err)
            loadChats() // Rollback on error
        }
    }, [userId, loadChats])

    // ── Delete a chat ─────────────────────────────────────────────────────────
    const deleteChatFn = useCallback(async (chatId) => {
        if (!userId) return
        // Optimistic delete
        messagesCacheRef.current.delete(chatId)
        setChats(prev => prev.filter(c => c.chatId !== chatId))
        if (activeChatId === chatId) {
            setActiveChatId(null)
            setMessages([])
            navigate('/ai')
        }
        try {
            await chatApi.deleteChat(userId, chatId)
        } catch (err) {
            console.error('Failed to delete chat:', err)
            loadChats() // Rollback on error
        }
    }, [userId, activeChatId, navigate, loadChats])

    // ── Search chats ──────────────────────────────────────────────────────────
    const searchChatsFn = useCallback(async (query) => {
        setSearchQuery(query)
        if (!query.trim()) {
            setSearchResults(null)
            return
        }
        if (!userId) return
        try {
            const results = await chatApi.searchChats(userId, query)
            setSearchResults(results || [])
        } catch (err) {
            console.error('Failed to search chats:', err)
            setSearchResults([])
        }
    }, [userId])

    // ── Group chats by date category ──────────────────────────────────────────
    const displayChats = searchResults !== null ? searchResults : chats
    const groupedChats = groupChatsByDate(displayChats)

    return {
        chats: displayChats,
        groupedChats,
        messages,
        activeChatId,
        isLoading,
        isSending,
        chatsLoaded,
        searchQuery,
        isSearching: searchResults !== null,
        startNewChat,
        createChat,
        selectChat: (chatId) => {
            navigate(`/ai/chat/${chatId}`)
        },
        sendMessage: sendMsg,
        renameChat: renameChatFn,
        deleteChat: deleteChatFn,
        searchChats: searchChatsFn,
        clearSearch: () => { setSearchQuery(''); setSearchResults(null) },
        refreshChats: loadChats,
    }
}

// ─── Helper: group chats by date category ─────────────────────────────────────
function groupChatsByDate(chats) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30)

    const groups = {
        'Today': [],
        'Yesterday': [],
        'Previous 7 Days': [],
        'Previous 30 Days': [],
        'Older': [],
    }

    for (const chat of chats || []) {
        const d = new Date(chat.updatedAt || chat.createdAt || 0)
        if (d >= today) groups['Today'].push(chat)
        else if (d >= yesterday) groups['Yesterday'].push(chat)
        else if (d >= weekAgo) groups['Previous 7 Days'].push(chat)
        else if (d >= monthAgo) groups['Previous 30 Days'].push(chat)
        else groups['Older'].push(chat)
    }

    return Object.fromEntries(
        Object.entries(groups).filter(([, items]) => items.length > 0)
    )
}
