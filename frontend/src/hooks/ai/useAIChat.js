import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as chatApi from '../../services/ai/chatApi'

const STALE_MS = 30_000

/**
 * StudyMate chat state.
 * - The server is the source of truth; a per-chat cache makes switching instant.
 * - Switching chats aborts the previous fetch, so a slow response can never overwrite the current chat.
 * - Streaming replies are routed by chatId, so switching away mid-reply doesn't corrupt either chat.
 * - "New chat" is instant: the chat is created on the server only when the first message is sent.
 */
export function useAIChat({ onError } = {}) {
  const navigate = useNavigate()
  const { chatId: urlChatId } = useParams()

  const [chats, setChats] = useState([])
  const [chatsLoaded, setChatsLoaded] = useState(false)
  const [activeChatId, setActiveChatId] = useState(urlChatId || null)
  const [messagesByChat, setMessagesByChat] = useState({})
  const [loadingChatId, setLoadingChatId] = useState(null)
  const [sendingChatIds, setSendingChatIds] = useState(() => new Set())
  const [pendingFile, setPendingFile] = useState(null) // { fileId, fileName } attached to the next message
  const [query, setQuery] = useState('')

  const fetchedAt = useRef(new Map())
  const fetchAbort = useRef(null)
  const streamAborts = useRef(new Map())
  const activeRef = useRef(activeChatId)
  activeRef.current = activeChatId
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const report = (msg) => onErrorRef.current?.(msg)

  const setChatMessages = useCallback((chatId, updater) => {
    setMessagesByChat(prev => ({ ...prev, [chatId]: typeof updater === 'function' ? updater(prev[chatId] || []) : updater }))
  }, [])

  const patchChat = useCallback((chatId, patch) => {
    setChats(prev => prev.map(c => (c.chatId === chatId ? { ...c, ...patch } : c)))
  }, [])

  // ── Load chat list once ──
  const loadChats = useCallback(async () => {
    try {
      setChats(await chatApi.getUserChats())
    } catch (err) {
      report(`Couldn't load your chats: ${err.message}`)
    } finally {
      setChatsLoaded(true)
    }
  }, [])
  useEffect(() => { loadChats() }, [loadChats])

  // ── Open the chat in the URL ──
  useEffect(() => {
    const id = urlChatId || null
    setActiveChatId(id)
    fetchAbort.current?.abort()
    if (!id) return
    const last = fetchedAt.current.get(id)
    if (last && Date.now() - last < STALE_MS) return // fresh in cache
    const ctrl = new AbortController()
    fetchAbort.current = ctrl
    setLoadingChatId(id)
    chatApi.getChat(id, { signal: ctrl.signal })
      .then(({ chat, messages }) => {
        fetchedAt.current.set(id, Date.now())
        // Never clobber an in-flight optimistic exchange
        setMessagesByChat(prev => (sendingRef.current.has(id) ? prev : { ...prev, [id]: messages }))
        setChats(prev => (prev.some(c => c.chatId === id) ? prev.map(c => (c.chatId === id ? { ...c, ...chat } : c)) : [chat, ...prev]))
      })
      .catch(err => {
        if (err.cancelled) return
        if (err.status === 404) { report('That chat no longer exists.'); navigate('/ai', { replace: true }) }
        else report(`Couldn't load this chat: ${err.message}`)
      })
      .finally(() => { if (fetchAbort.current === ctrl) setLoadingChatId(null) })
    return () => ctrl.abort()
  }, [urlChatId, navigate])

  const sendingRef = useRef(sendingChatIds)
  sendingRef.current = sendingChatIds
  const markSending = (chatId, on) => setSendingChatIds(prev => {
    const next = new Set(prev)
    if (on) next.add(chatId); else next.delete(chatId)
    return next
  })

  const startNewChat = useCallback(() => {
    setPendingFile(null)
    navigate('/ai')
  }, [navigate])

  /** Send a message to the active chat (creating it first if this is a new conversation). */
  const sendMessage = useCallback(async (rawContent, { fileId: explicitFileId } = {}) => {
    const content = rawContent?.trim()
    if (!content) return
    let chatId = activeRef.current
    // undefined = keep the chat's current document; null = detach; string = attach
    const hasChange = explicitFileId !== undefined || pendingFile !== null
    const attach = explicitFileId !== undefined ? explicitFileId : (pendingFile?.fileId ?? null)
    if (chatId && sendingRef.current.has(chatId)) return

    if (!chatId) {
      try {
        const chat = await chatApi.createChat(null, { fileId: attach || undefined })
        chatId = chat.chatId
        fetchedAt.current.set(chatId, Date.now())
        setChats(prev => [chat, ...prev])
        setMessagesByChat(prev => ({ ...prev, [chatId]: [] }))
        activeRef.current = chatId
        navigate(`/ai/chat/${chatId}`, { replace: true })
      } catch (err) {
        report(`Couldn't start a chat: ${err.message}`)
        return
      }
    }

    const tempUser = { messageId: `tmp-u-${Date.now()}`, role: 'user', content, timestamp: new Date().toISOString(), pending: true }
    const tempAi = { messageId: `tmp-a-${Date.now()}`, role: 'assistant', content: '', timestamp: new Date().toISOString(), streaming: true }
    setChatMessages(chatId, prev => [...prev.filter(m => !m.failed), tempUser, tempAi])
    markSending(chatId, true)
    setPendingFile(null)

    // Batch token updates to one render per frame
    let buffer = ''
    let raf = 0
    const flush = () => {
      raf = 0
      const text = buffer
      setChatMessages(chatId, prev => prev.map(m => (m.messageId === tempAi.messageId ? { ...m, content: text } : m)))
    }
    const ctrl = new AbortController()
    streamAborts.current.set(chatId, ctrl)

    try {
      const res = await chatApi.sendMessage(chatId, {
        content,
        fileId: hasChange ? attach : undefined,
        signal: ctrl.signal,
        onToken: (t) => { buffer += t; if (!raf) raf = requestAnimationFrame(flush) }
      })
      cancelAnimationFrame(raf)
      setChatMessages(chatId, prev => prev.map(m =>
        m.messageId === tempUser.messageId ? res.userMessage : m.messageId === tempAi.messageId ? res.assistantMessage : m))
      setChats(prev => {
        const cur = prev.find(c => c.chatId === chatId)
        const updated = { ...cur, chatId, title: res.title || cur?.title, fileId: res.fileId, fileName: res.fileName, updatedAt: res.assistantMessage.timestamp, messageCount: (cur?.messageCount || 0) + 2 }
        return [updated, ...prev.filter(c => c.chatId !== chatId)]
      })
      fetchedAt.current.set(chatId, Date.now())
      // The server refines the title in the background; pick it up shortly after.
      if ((chats.find(c => c.chatId === chatId)?.messageCount || 0) === 0) {
        setTimeout(() => chatApi.getUserChats().then(list => {
          const fresh = list.find(c => c.chatId === chatId)
          if (fresh) patchChat(chatId, { title: fresh.title })
        }).catch(() => {}), 2500)
      }
    } catch (err) {
      cancelAnimationFrame(raf)
      // Server only saves an exchange after a successful reply, so nothing was persisted.
      setChatMessages(chatId, prev => prev
        .filter(m => m.messageId !== tempAi.messageId)
        .map(m => (m.messageId === tempUser.messageId ? { ...m, pending: false, failed: true, error: err.cancelled ? 'Stopped' : err.message } : m)))
      if (!err.cancelled) report(err.message)
    } finally {
      streamAborts.current.delete(chatId)
      markSending(chatId, false)
    }
  }, [navigate, pendingFile, setChatMessages, patchChat, chats])

  const stop = useCallback(() => {
    const id = activeRef.current
    if (id) streamAborts.current.get(id)?.abort()
  }, [])

  const retry = useCallback((failedMsg) => {
    const id = activeRef.current
    if (!id) return
    setChatMessages(id, prev => prev.filter(m => m.messageId !== failedMsg.messageId))
    sendMessage(failedMsg.content)
  }, [sendMessage, setChatMessages])

  /** Attach a document to the current (or next) conversation; null detaches. */
  const attachFile = useCallback((file) => {
    setPendingFile(file ? { fileId: file.fileId, fileName: file.originalName || file.name } : { fileId: null, fileName: null })
  }, [])

  const renameChat = useCallback(async (chatId, title) => {
    const t = title.trim()
    if (!t) return
    const before = chats.find(c => c.chatId === chatId)?.title
    patchChat(chatId, { title: t })
    try { await chatApi.renameChat(null, chatId, t) } catch (err) { patchChat(chatId, { title: before }); report(`Rename failed: ${err.message}`) }
  }, [chats, patchChat])

  const togglePin = useCallback(async (chatId) => {
    const cur = chats.find(c => c.chatId === chatId)
    patchChat(chatId, { isPinned: !cur?.isPinned })
    try { await chatApi.pinChat(chatId, !cur?.isPinned) } catch (err) { patchChat(chatId, { isPinned: cur?.isPinned }); report(err.message) }
  }, [chats, patchChat])

  const deleteChat = useCallback(async (chatId) => {
    const snapshot = chats
    setChats(prev => prev.filter(c => c.chatId !== chatId))
    if (activeRef.current === chatId) navigate('/ai', { replace: true })
    try {
      await chatApi.deleteChat(null, chatId)
      setMessagesByChat(prev => { const n = { ...prev }; delete n[chatId]; return n })
      fetchedAt.current.delete(chatId)
    } catch (err) {
      setChats(snapshot)
      report(`Delete failed: ${err.message}`)
    }
  }, [chats, navigate])

  const activeChat = chats.find(c => c.chatId === activeChatId) || null
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? chats.filter(c => (c.title || '').toLowerCase().includes(q) || (c.fileName || '').toLowerCase().includes(q)) : chats
    return [...list].sort((a, b) => (Number(b.isPinned) - Number(a.isPinned)) || (b.updatedAt || '').localeCompare(a.updatedAt || ''))
  }, [chats, query])

  // Effective document: pending choice for next message overrides the chat's current one
  const attachedFile = pendingFile
    ? (pendingFile.fileId ? pendingFile : null)
    : activeChat?.fileId ? { fileId: activeChat.fileId, fileName: activeChat.fileName } : null

  return {
    chats: visible,
    groupedChats: groupChatsByDate(visible),
    chatsLoaded,
    activeChatId,
    activeChat,
    messages: (activeChatId && messagesByChat[activeChatId]) || [],
    isLoading: Boolean(activeChatId) && loadingChatId === activeChatId && !messagesByChat[activeChatId]?.length,
    isSending: Boolean(activeChatId) && sendingChatIds.has(activeChatId),
    attachedFile,
    attachFile,
    searchQuery: query,
    searchChats: setQuery,
    clearSearch: () => setQuery(''),
    startNewChat,
    selectChat: (id) => navigate(`/ai/chat/${id}`),
    sendMessage,
    stop,
    retry,
    renameChat,
    togglePin,
    deleteChat,
    refreshChats: loadChats,
  }
}

function groupChatsByDate(chats) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = 86400000
  const groups = { Pinned: [], Today: [], Yesterday: [], 'Previous 7 days': [], 'Previous 30 days': [], Older: [] }
  for (const c of chats) {
    if (c.isPinned) { groups.Pinned.push(c); continue }
    const d = new Date(c.updatedAt || c.createdAt || 0)
    if (d >= today) groups.Today.push(c)
    else if (d >= today - day) groups.Yesterday.push(c)
    else if (d >= today - 7 * day) groups['Previous 7 days'].push(c)
    else if (d >= today - 30 * day) groups['Previous 30 days'].push(c)
    else groups.Older.push(c)
  }
  return Object.fromEntries(Object.entries(groups).filter(([, v]) => v.length))
}
