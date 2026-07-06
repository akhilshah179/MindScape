import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as chatApi from '../../services/ai/chatApi'

/**
 * Core hook for managing AI chat state.
 * Handles chat list, active chat, messages, CRUD operations.
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
    const abortRef = useRef(null)

    // ── Load chats on mount ───────────────────────────────────────────────────
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
        setIsLoading(true)
        try {
            const data = await chatApi.getUserChats(userId)
            setChats(data)
        } catch (err) {
            console.error('Failed to load chats:', err)
        } finally {
            setIsLoading(false)
            setChatsLoaded(true)
        }
    }, [userId])

    // ── Select a chat and load its messages ───────────────────────────────────
    const selectChat = useCallback(async (chatId) => {
        if (!chatId) return
        setActiveChatId(chatId)
        setIsLoading(true)
        try {
            const msgs = await chatApi.getChatMessages(chatId)
            setMessages(msgs)
        } catch (err) {
            console.error('Failed to load messages:', err)
            setMessages([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // ── Create a new chat ─────────────────────────────────────────────────────
    const createChat = useCallback(async () => {
        if (!userId) return null
        try {
            const data = await chatApi.createChat(userId)
            const newChat = {
                userId,
                chatId: data.chatId,
                title: data.title || 'New Chat',
                createdAt: data.createdAt,
                updatedAt: data.createdAt,
                messageCount: 0,
                isPinned: false,
                tags: []
            }
            setChats(prev => [newChat, ...prev])
            setActiveChatId(data.chatId)
            setMessages([])
            navigate(`/ai/chat/${data.chatId}`)
            return data.chatId
        } catch (err) {
            console.error('Failed to create chat:', err)
            return null
        }
    }, [userId, navigate])

    // ── Send a message ────────────────────────────────────────────────────────
    const sendMsg = useCallback(async (content, pdfContext = null) => {
        if (!content.trim() || !activeChatId || !userId || isSending) return

        // Optimistic: add user message immediately
        const tempUserMsg = {
            chatId: activeChatId,
            messageId: `temp_${Date.now()}_user`,
            role: 'user',
            content: content.trim(),
            timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, tempUserMsg])
        setIsSending(true)

        try {
            const data = await chatApi.sendMessage(activeChatId, userId, content.trim(), pdfContext)

            // Add AI response
            const aiMsg = {
                chatId: activeChatId,
                messageId: data.messageId,
                role: 'assistant',
                content: data.reply,
                timestamp: new Date().toISOString()
            }
            setMessages(prev => [...prev, aiMsg])

            // Update chat title in sidebar if it changed
            if (data.title) {
                setChats(prev => prev.map(c =>
                    c.chatId === activeChatId
                        ? { ...c, title: data.title, updatedAt: new Date().toISOString(), messageCount: (c.messageCount || 0) + 2 }
                        : c
                ))
            }

            return data.reply
        } catch (err) {
            console.error('Failed to send message:', err)
            // Add error message
            setMessages(prev => [...prev, {
                chatId: activeChatId,
                messageId: `error_${Date.now()}`,
                role: 'assistant',
                content: '⚠️ Failed to get a response. Please try again.',
                timestamp: new Date().toISOString()
            }])
            return null
        } finally {
            setIsSending(false)
        }
    }, [activeChatId, userId, isSending])

    // ── Rename a chat ─────────────────────────────────────────────────────────
    const renameChatFn = useCallback(async (chatId, title) => {
        if (!userId || !title.trim()) return
        try {
            await chatApi.renameChat(userId, chatId, title.trim())
            setChats(prev => prev.map(c =>
                c.chatId === chatId ? { ...c, title: title.trim() } : c
            ))
        } catch (err) {
            console.error('Failed to rename chat:', err)
        }
    }, [userId])

    // ── Delete a chat ─────────────────────────────────────────────────────────
    const deleteChatFn = useCallback(async (chatId) => {
        if (!userId) return
        try {
            await chatApi.deleteChat(userId, chatId)
            setChats(prev => prev.filter(c => c.chatId !== chatId))
            if (activeChatId === chatId) {
                setActiveChatId(null)
                setMessages([])
                navigate('/ai')
            }
        } catch (err) {
            console.error('Failed to delete chat:', err)
        }
    }, [userId, activeChatId, navigate])

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
            setSearchResults(results)
        } catch (err) {
            console.error('Failed to search chats:', err)
            setSearchResults([])
        }
    }, [userId])

    // ── Group chats by time period ────────────────────────────────────────────
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

    for (const chat of chats) {
        const d = new Date(chat.updatedAt || chat.createdAt)
        if (d >= today) groups['Today'].push(chat)
        else if (d >= yesterday) groups['Yesterday'].push(chat)
        else if (d >= weekAgo) groups['Previous 7 Days'].push(chat)
        else if (d >= monthAgo) groups['Previous 30 Days'].push(chat)
        else groups['Older'].push(chat)
    }

    // Remove empty groups
    return Object.fromEntries(
        Object.entries(groups).filter(([, items]) => items.length > 0)
    )
}
